// SectionRenderer — renderiza UMA seção dependendo do tipo:
//   part      → ChapterOpener (capa grande, título serif XL, "Comece a ler")
//   linear    → markdown rendered + handlers de highlight
//   quiz      → entry point pra QuizFullscreen
//   checklist → ChecklistRenderer
// Inclui: navegação prev/next, "marcar como concluída", auto-progress

import { useEffect, useState, useRef } from 'react'
import type { Guide, GuideSection, GuideProgress } from '../../types'
import { renderSectionMarkdown } from '../lib/markdownRenderer'
import { useReadingProgress } from '../lib/useReadingProgress'
import ChapterOpener from './ChapterOpener'
import ChecklistRenderer from './ChecklistRenderer'
import QuizFullscreen from './QuizFullscreen'
import HighlightLayer from './HighlightLayer'
import NoteDrawer from './NoteDrawer'

interface Props {
  guide: Guide
  section: GuideSection
  allSections: GuideSection[]
  currentIdx: number
  userId: string
  onNavigate: (id: string) => void
  onProgressUpdate: (sectionId: string, partial: Partial<GuideProgress>) => void
  mainRef: React.RefObject<HTMLElement | null>
}

export default function SectionRenderer({
  guide, section, allSections, currentIdx, userId, onNavigate, onProgressUpdate, mainRef,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [completedAnimating, setCompletedAnimating] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  const { markCompleted } = useReadingProgress({
    userId,
    guideId: guide.id,
    sectionId: section.id,
    containerRef: mainRef,
  })

  // Marca seção como visitada (last_seen_at) ao montar
  useEffect(() => {
    onProgressUpdate(section.id, { last_seen_at: new Date().toISOString() })
  }, [section.id])

  async function handleMarkCompleted() {
    setCompletedAnimating(true)
    await markCompleted()
    onProgressUpdate(section.id, { completed: true, completed_at: new Date().toISOString() })
    // Haptic feedback (mobile)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([15, 30, 15]) } catch { /* ignore */ }
    }
    setTimeout(() => setCompletedAnimating(false), 1800)
  }

  const prev = currentIdx > 0 ? allSections[currentIdx - 1] : null
  const next = currentIdx < allSections.length - 1 ? allSections[currentIdx + 1] : null

  // ── Render por tipo ──────────────────────────────────────────────────────

  if (section.type === 'part') {
    return (
      <ChapterOpener
        section={section}
        onContinue={() => next && onNavigate(next.id)}
      />
    )
  }

  return (
    <div className="reader-content" ref={contentRef}>
      {/* Header da seção */}
      <header style={{ marginBottom: 32 }}>
        {section.estimated_minutes && (
          <div style={{
            fontSize: 12, color: 'var(--r-text-subtle)',
            letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600,
            marginBottom: 8,
          }}>
            <span className="material-symbols-outlined align-middle" style={{ fontSize: 14, verticalAlign: 'middle' }}>schedule</span>
            {' '}{section.estimated_minutes} min de leitura
          </div>
        )}
        <h1 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: '2.5em',
          fontWeight: 700,
          fontVariationSettings: '"opsz" 72, "SOFT" 30',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--r-text)',
          margin: '0 0 0.4em',
        }}>
          {section.title}
        </h1>
      </header>

      {/* Markdown content */}
      {section.content_md && (
        <div
          dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(section.content_md) }}
        />
      )}

      {/* Quiz entry */}
      {section.type === 'quiz' && (
        <QuizFullscreen
          section={section}
          guide={guide}
          userId={userId}
          onComplete={() => { handleMarkCompleted(); next && setTimeout(() => onNavigate(next.id), 300) }}
        />
      )}

      {/* Checklist */}
      {section.type === 'checklist' && (
        <ChecklistRenderer section={section} userId={userId} />
      )}

      {/* Highlights overlay (text selection popover) */}
      <HighlightLayer
        sectionId={section.id}
        userId={userId}
        contentRef={contentRef}
      />

      {/* Notas */}
      <NoteDrawer
        sectionId={section.id}
        userId={userId}
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
      />

      {/* Footer da seção: botão "marcar concluída" + navegação prev/next */}
      <div style={{ marginTop: 64, paddingTop: 32, borderTop: '1px solid var(--r-border)' }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 16, marginBottom: 32,
        }}>
          <button
            onClick={handleMarkCompleted}
            disabled={completedAnimating}
            style={{
              padding: '14px 28px',
              borderRadius: 999,
              border: '1px solid var(--r-accent)',
              background: completedAnimating ? 'var(--r-accent)' : 'transparent',
              color: completedAnimating ? '#0d0a27' : 'var(--r-accent)',
              fontFamily: 'inherit',
              fontSize: 14,
              fontWeight: 700,
              cursor: completedAnimating ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.3s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {completedAnimating ? 'check_circle' : 'task_alt'}
            </span>
            {completedAnimating ? 'Concluída! 💜' : 'Marcar como concluída'}
          </button>
          <p style={{ fontSize: 12, color: 'var(--r-text-subtle)', margin: 0 }}>
            Ou rola até o final pra avançar pra próxima seção
          </p>
        </div>

        <div className="reader-actions" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          maxWidth: 700,
          margin: '0 auto',
        }}>
          {prev ? (
            <button onClick={() => onNavigate(prev.id)} style={navBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--r-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Anterior</div>
                <div style={{ fontSize: 13, color: 'var(--r-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prev.title}</div>
              </div>
            </button>
          ) : <div />}
          {next ? (
            <button onClick={() => onNavigate(next.id)} style={{ ...navBtn, justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--r-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Próxima</div>
                <div style={{ fontSize: 13, color: 'var(--r-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.title}</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          ) : <div />}
        </div>
      </div>

      {/* Floating Action Button mobile — abre notas */}
      <button
        onClick={() => setNoteOpen(true)}
        className="reader-fab"
        aria-label="Abrir notas"
        style={{
          position: 'fixed',
          bottom: 'max(20px, env(safe-area-inset-bottom))',
          right: 20,
          width: 52, height: 52,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--r-accent)',
          color: '#0d0a27',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(183,159,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 25,
          transition: 'opacity 0.4s',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 24 }}>edit_note</span>
      </button>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '14px 16px',
  background: 'var(--r-surface)',
  border: '1px solid var(--r-border)',
  borderRadius: 12,
  cursor: 'pointer',
  color: 'var(--r-text-muted)',
  fontFamily: 'inherit',
  textAlign: 'left',
  transition: 'background 0.15s, border-color 0.15s',
}
