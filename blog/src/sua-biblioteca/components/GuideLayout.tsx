// GuideLayout — topbar + sidebar + main com reading mode togglable.
// Gerencia state global do leitor: seção atual, sidebar mobile open,
// reading mode, mapa de progresso.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import type { Guide, GuideSection, GuideProgress } from '../../types'
import GuideTopbar from './GuideTopbar'
import GuideSidebar from './GuideSidebar'
import SectionRenderer from './SectionRenderer'

interface Props {
  guide: Guide
  sections: GuideSection[]
  userId: string
}

const STORAGE_KEY_LAST_SECTION = (guideId: string) => `yaya_reader_last_section_${guideId}`

export default function GuideLayout({ guide, sections, userId }: Props) {
  // Sequência hierárquica de leitura: cada part vem antes das suas filhas, na
  // ordem editorial. Sem isso, .order('order_index') do Supabase intercala
  // parts e sections no mesmo nível e o "próximo" pula entre partes.
  // Resultado: [Introdução, sub_intro_1, sub_intro_2, Parte 1, 1.1, 1.2, ..., Parte 2, 2.1, ...]
  const flatSections = useMemo(() => {
    const parts = sections
      .filter(s => s.parent_id === null)
      .sort((a, b) => a.order_index - b.order_index)
    const childrenByParent = new Map<string, typeof sections>()
    for (const s of sections) {
      if (s.parent_id) {
        const list = childrenByParent.get(s.parent_id) ?? []
        list.push(s)
        childrenByParent.set(s.parent_id, list)
      }
    }
    const ordered: typeof sections = []
    for (const part of parts) {
      ordered.push(part)
      const children = (childrenByParent.get(part.id) ?? [])
        .sort((a, b) => a.order_index - b.order_index)
      ordered.push(...children)
    }
    // Sections órfãs (sem parent e que não são parts já no array) — fallback
    for (const s of sections) {
      if (!ordered.includes(s)) ordered.push(s)
    }
    return ordered
  }, [sections])

  const firstSectionId = flatSections[0]?.id ?? null

  // Resume reading: tenta voltar pra última seção lida (localStorage)
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return firstSectionId
    const saved = localStorage.getItem(STORAGE_KEY_LAST_SECTION(guide.id))
    if (saved && flatSections.some(s => s.id === saved)) return saved
    return firstSectionId
  })

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [readingMode, setReadingMode] = useState(false)
  const [progressMap, setProgressMap] = useState<Record<string, GuideProgress>>({})
  const mainRef = useRef<HTMLElement>(null)

  // Salva última seção visitada
  useEffect(() => {
    if (currentSectionId) {
      localStorage.setItem(STORAGE_KEY_LAST_SECTION(guide.id), currentSectionId)
    }
  }, [currentSectionId, guide.id])

  // Carrega progresso de todas as seções pra alimentar a sidebar
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase
        .from('guide_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('guide_id', guide.id)
      if (cancelled || !data) return
      const map: Record<string, GuideProgress> = {}
      for (const p of data) map[p.section_id] = p
      setProgressMap(map)
    }
    load()
    return () => { cancelled = true }
  }, [userId, guide.id])

  // Atalhos de teclado: J/K (próxima/anterior), F (reading mode), ESC (fecha sidebar)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Não dispara dentro de inputs
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return

      const idx = flatSections.findIndex(s => s.id === currentSectionId)
      if (e.key === 'j' || e.key === 'ArrowRight') {
        if (idx < flatSections.length - 1) goToSection(flatSections[idx + 1].id)
      } else if (e.key === 'k' || e.key === 'ArrowLeft') {
        if (idx > 0) goToSection(flatSections[idx - 1].id)
      } else if (e.key === 'f') {
        setReadingMode(m => !m)
      } else if (e.key === 'Escape') {
        if (sidebarOpen) setSidebarOpen(false)
        else if (readingMode) setReadingMode(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flatSections, currentSectionId, sidebarOpen, readingMode])

  // Ao mudar de seção, scroll pro topo e fecha sidebar mobile
  const goToSection = useCallback((id: string) => {
    setCurrentSectionId(id)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const currentSection = flatSections.find(s => s.id === currentSectionId) ?? flatSections[0]
  const currentIdx = flatSections.findIndex(s => s.id === currentSection?.id)
  const totalSections = flatSections.filter(s => s.type !== 'part').length
  const completedCount = Object.values(progressMap).filter(p => p.completed).length
  const overallProgress = totalSections > 0 ? completedCount / totalSections : 0

  function onProgressUpdate(sectionId: string, partial: Partial<GuideProgress>) {
    setProgressMap(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {} as GuideProgress), ...partial, section_id: sectionId, user_id: userId, guide_id: guide.id },
    }))
  }

  return (
    <div className={`reader-root ${readingMode ? 'reading-mode' : ''}`}>
      <GuideTopbar
        guide={guide}
        currentSection={currentSection}
        overallProgress={overallProgress}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        onToggleReadingMode={() => setReadingMode(m => !m)}
        readingMode={readingMode}
      />

      <GuideSidebar
        guide={guide}
        sections={flatSections}
        currentSectionId={currentSection?.id ?? null}
        progressMap={progressMap}
        onSelectSection={goToSection}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main
        ref={mainRef}
        className="reader-main"
        style={{
          marginLeft: 0,
          paddingTop: 80,
          paddingBottom: 120,
          paddingLeft: 24,
          paddingRight: 24,
          transition: 'margin-left 0.25s ease',
          minHeight: '100vh',
        }}
      >
        {currentSection ? (
          <SectionRenderer
            key={currentSection.id}
            guide={guide}
            section={currentSection}
            allSections={flatSections}
            currentIdx={currentIdx}
            userId={userId}
            onNavigate={goToSection}
            onProgressUpdate={onProgressUpdate}
            mainRef={mainRef}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--r-text-muted)', padding: 80 }}>
            Sem seções publicadas ainda.
          </div>
        )}
      </main>

      <style>{`
        /* Sidebar fixa em desktop */
        @media (min-width: 1024px) {
          .reader-main {
            margin-left: 320px !important;
            padding-left: 48px !important;
            padding-right: 48px !important;
          }
        }
      `}</style>
    </div>
  )
}
