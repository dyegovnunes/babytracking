// GuideSidebar — índice hierárquico do guia.
// Desktop: sticky 320px à esquerda. Mobile: drawer slide-in com backdrop.
// Suporta swipe pra esquerda (touch) pra fechar — gesto natural de drawer.

import { useMemo, useRef, useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { Guide, GuideSection, GuideProgress } from '../../types'

interface HighlightRow {
  id: string
  section_id: string
  anchor_text: string
  note_md: string | null
  created_at: string
}

interface Props {
  guide: Guide
  sections: GuideSection[]
  currentSectionId: string | null
  progressMap: Record<string, GuideProgress>
  onSelectSection: (id: string) => void
  open: boolean
  onClose: () => void
  userId?: string
}

const SWIPE_CLOSE_THRESHOLD = 60   // px de drag pra esquerda dispara fechar
const SWIPE_VELOCITY_THRESHOLD = 0.4 // px/ms — flick rápido também fecha

export default function GuideSidebar({
  guide, sections, currentSectionId, progressMap, onSelectSection, open, onClose, userId,
}: Props) {
  // Agrupa seções por parent (parts no topo, filhas dentro)
  const parts = useMemo(() => sections.filter(s => s.parent_id === null), [sections])
  const childrenOf = (parentId: string) =>
    sections.filter(s => s.parent_id === parentId).sort((a, b) => a.order_index - b.order_index)

  // Calcula progresso geral
  const totalReadable = sections.filter(s => s.type !== 'part' && s.type !== 'flashcards').length
  const completed = Object.values(progressMap).filter(p => p.completed).length
  const progressPct = totalReadable > 0 ? Math.round(completed / totalReadable * 100) : 0

  // Anotações (highlights com anchor_text)
  const [highlights, setHighlights] = useState<HighlightRow[]>([])
  const [notesOpen, setNotesOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Busca anotações sempre que o painel é expandido (não apenas quando a sidebar abre),
  // garantindo que highlights salvos nessa sessão apareçam imediatamente
  useEffect(() => {
    if (!userId || !notesOpen) return
    let cancelled = false
    const allIds = sections.map(s => s.id)
    if (allIds.length === 0) return
    supabase
      .from('guide_highlights')
      .select('id, section_id, anchor_text, note_md, created_at')
      .eq('user_id', userId)
      .in('section_id', allIds)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setHighlights(data as HighlightRow[])
      })
    return () => { cancelled = true }
  }, [userId, notesOpen, sections])

  async function handleDeleteHighlight(id: string) {
    await supabase.from('guide_highlights').delete().eq('id', id)
    setHighlights(prev => prev.filter(h => h.id !== id))
  }

  async function handleSaveEdit(id: string) {
    setSavingEdit(true)
    await supabase.from('guide_highlights').update({ note_md: editNote.trim() || null }).eq('id', id)
    setHighlights(prev => prev.map(h => h.id === id ? { ...h, note_md: editNote.trim() || null } : h))
    setSavingEdit(false)
    setEditingId(null)
  }

  // ── Swipe-to-close (mobile) ─────────────────────────────────────────
  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  function onTouchStart(e: React.TouchEvent<HTMLElement>) {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY, t: Date.now() }
    setDragOffset(0)
  }
  function onTouchMove(e: React.TouchEvent<HTMLElement>) {
    if (!touchStart.current) return
    const t = e.touches[0]
    const dx = t.clientX - touchStart.current.x
    const dy = t.clientY - touchStart.current.y
    // Só captura como swipe horizontal se o movimento é mais horizontal que vertical
    // (senão atrapalha scroll vertical da lista)
    if (Math.abs(dy) > Math.abs(dx) * 1.2) return
    if (dx < 0) {
      // Drag pra esquerda: aplica offset visual em real-time (até -100% da largura)
      setDragOffset(Math.max(dx, -360))
    } else {
      setDragOffset(0)
    }
  }
  function onTouchEnd() {
    if (!touchStart.current) return
    const elapsed = Date.now() - touchStart.current.t
    const velocity = Math.abs(dragOffset) / Math.max(elapsed, 1)
    const shouldClose =
      dragOffset < -SWIPE_CLOSE_THRESHOLD ||
      (dragOffset < -20 && velocity > SWIPE_VELOCITY_THRESHOLD)
    setDragOffset(0)
    touchStart.current = null
    if (shouldClose) onClose()
  }

  // Calcula transform com base em open + drag em andamento
  const transformValue = open
    ? dragOffset !== 0
      ? `translateX(${dragOffset}px)`
      : 'translateX(0)'
    : 'translateX(-100%)'

  // Backdrop opacidade segue o drag (feedback visual durante o gesto)
  const backdropOpacity = open
    ? dragOffset < 0
      ? Math.max(0, 1 - Math.abs(dragOffset) / 320)
      : 1
    : 0

  return (
    <>
      {/* Backdrop mobile — opacidade reativa ao swipe */}
      {open && (
        <div
          onClick={onClose}
          className="reader-sidebar-backdrop"
          style={{
            position: 'fixed', inset: 0,
            background: `rgba(0,0,0,${0.45 * backdropOpacity})`,
            backdropFilter: `blur(${4 * backdropOpacity}px)`,
            WebkitBackdropFilter: `blur(${4 * backdropOpacity}px)`,
            zIndex: 40,
            transition: dragOffset === 0 ? 'background 0.2s, backdrop-filter 0.2s' : 'none',
          }}
        />
      )}

      <aside
        className="reader-sidebar"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'fixed',
          top: 0, bottom: 0, left: 0,
          width: 320,
          maxWidth: '88vw',
          background: 'var(--r-overlay)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--r-border)',
          padding: 'calc(env(safe-area-inset-top, 0px) + 64px) 0 calc(env(safe-area-inset-bottom, 0px) + 24px)',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          transform: transformValue,
          // Sem transition durante drag (segue o dedo); transition rápida
          // quando o dedo sai (snap back ou close)
          transition: dragOffset === 0
            ? 'transform 0.25s ease, opacity 0.4s'
            : 'none',
          zIndex: 50,
          touchAction: 'pan-y',         /* permite scroll vertical mas captura horizontal */
        }}
      >
        {/* Header com info do guia */}
        <div className="reader-sidebar-header" style={{ padding: '0 20px 18px', borderBottom: '1px solid var(--r-border)' }}>
          {guide.cover_image_url && (
            <img
              src={guide.cover_image_url}
              alt={guide.title}
              className="reader-sidebar-cover"
              style={{
                width: '100%',
                aspectRatio: '16/10',          /* mais "wide" pra cover de livro digital */
                objectFit: 'cover',
                borderRadius: 10,
                marginBottom: 14,
                border: '1px solid var(--r-border)',
              }}
            />
          )}
          <div style={{
            fontSize: 11, color: 'var(--r-text-subtle)', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontWeight: 600, marginBottom: 4,
          }}>
            Sua Biblioteca
          </div>
          <h2 style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontSize: 18,
            fontWeight: 800,
            margin: 0,
            color: 'var(--r-text-strong)',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
          }}>
            {guide.title}
          </h2>
          {guide.subtitle && (
            <p style={{ fontSize: 13, color: 'var(--r-text-muted)', margin: '6px 0 0', lineHeight: 1.5 }}>
              {guide.subtitle}
            </p>
          )}

          {/* Progresso geral */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--r-text-muted)', marginBottom: 6 }}>
              <span>Seu progresso</span>
              <span style={{ color: 'var(--r-accent)', fontWeight: 600 }}>{progressPct}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(183,159,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'linear-gradient(90deg, var(--r-accent), var(--r-accent-glow))',
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Lista de partes/seções */}
        <nav style={{ padding: '12px 10px 24px' }}>
          {parts.map((part) => {
            const partChildren = childrenOf(part.id)
            // Parte está "concluída" se todas as suas seções legíveis (exceto
            // flashcards que não têm progresso rastreável) estiverem concluídas.
            const readableChildren = partChildren.filter(s => s.type !== 'flashcards')
            const isPartCompleted = readableChildren.length > 0 &&
              readableChildren.every(child => progressMap[child.id]?.completed === true)
            // Parte "iniciada" se ao menos um filho tiver progresso
            const isPartStarted = partChildren.some(child => !!progressMap[child.id])
            // Monta um progress sintético pra o SectionItem da part
            const partProgress = isPartCompleted
              ? { completed: true, section_id: part.id, user_id: '', guide_id: '' } as typeof progressMap[string]
              : isPartStarted
                ? { completed: false, section_id: part.id, user_id: '', guide_id: '' } as typeof progressMap[string]
                : undefined

            return (
              <div key={part.id} style={{ marginBottom: 18 }}>
                <SectionItem
                  section={part}
                  isPart
                  isCurrent={part.id === currentSectionId}
                  progress={partProgress}
                  onSelect={() => onSelectSection(part.id)}
                />
                {partChildren.length > 0 && (
                  <div style={{ marginLeft: 8, marginTop: 4 }}>
                    {partChildren.map(child => (
                      <SectionItem
                        key={child.id}
                        section={child}
                        isCurrent={child.id === currentSectionId}
                        progress={progressMap[child.id]}
                        onSelect={() => onSelectSection(child.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {parts.length === 0 && sections.map(s => (
            <SectionItem
              key={s.id}
              section={s}
              isCurrent={s.id === currentSectionId}
              progress={progressMap[s.id]}
              onSelect={() => onSelectSection(s.id)}
            />
          ))}
        </nav>

        {/* Painel "Suas anotações" */}
        <div style={{ borderTop: '1px solid var(--r-border)', padding: '0 10px 8px' }}>
          <button
            onClick={() => setNotesOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '14px 12px',
              background: 'transparent', border: 'none',
              cursor: 'pointer', fontFamily: 'inherit',
              color: 'var(--r-text-muted)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--r-accent)' }}>
              bookmark
            </span>
            <span style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--r-text-subtle)' }}>
              Suas anotações {highlights.length > 0 && `(${highlights.length})`}
            </span>
            <span className="material-symbols-outlined" style={{ fontSize: 16, transition: 'transform 0.2s', transform: notesOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
              expand_more
            </span>
          </button>

          {notesOpen && (
            <div style={{ paddingBottom: 8 }}>
              {highlights.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--r-text-subtle)', padding: '4px 12px 12px', margin: 0 }}>
                  Selecione um trecho do texto para salvar sua primeira anotação.
                </p>
              ) : (
                highlights.map(h => {
                  const sec = sections.find(s => s.id === h.section_id)
                  const isEditing = editingId === h.id
                  return (
                    <div
                      key={h.id}
                      style={{
                        marginBottom: 6,
                        background: 'var(--r-surface)',
                        border: '1px solid var(--r-border)',
                        borderRadius: 10,
                        overflow: 'hidden',
                        fontFamily: 'inherit',
                      }}
                    >
                      {/* Cabeçalho clicável: vai para a seção */}
                      <button
                        onClick={() => { onSelectSection(h.section_id); onClose() }}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '10px 12px 8px',
                          background: 'transparent', border: 'none',
                          cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {sec && (
                          <div style={{ fontSize: 10, color: 'var(--r-accent)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                            {sec.title}
                          </div>
                        )}
                        <div style={{
                          fontSize: 12, fontStyle: 'italic', color: 'var(--r-text-muted)',
                          background: 'color-mix(in srgb, var(--r-accent) 8%, transparent)',
                          borderRadius: 6, padding: '4px 8px',
                          lineHeight: 1.4,
                        }}>
                          "{h.anchor_text.length > 70 ? h.anchor_text.slice(0, 67) + '…' : h.anchor_text}"
                        </div>
                      </button>

                      {/* Área de anotação */}
                      {isEditing ? (
                        <div style={{ padding: '0 10px 10px' }}>
                          <textarea
                            autoFocus
                            value={editNote}
                            onChange={e => setEditNote(e.target.value)}
                            rows={2}
                            style={{
                              width: '100%', padding: '7px 9px',
                              background: 'var(--r-surface-strong)',
                              border: '1px solid var(--r-accent)',
                              borderRadius: 7, color: 'var(--r-text)',
                              fontFamily: 'inherit', fontSize: 12,
                              lineHeight: 1.5, resize: 'none', outline: 'none',
                              boxSizing: 'border-box', marginBottom: 7,
                            }}
                          />
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--r-border)', background: 'transparent', color: 'var(--r-text-muted)', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveEdit(h.id)}
                              disabled={savingEdit}
                              style={{ padding: '5px 10px', borderRadius: 6, border: 'none', background: 'var(--r-accent)', color: 'var(--r-on-accent)', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: savingEdit ? 0.6 : 1 }}
                            >
                              {savingEdit ? 'Salvando…' : 'Salvar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '0 10px 8px' }}>
                          {h.note_md && (
                            <div style={{ fontSize: 12, color: 'var(--r-text)', lineHeight: 1.4, marginBottom: 6 }}>
                              {h.note_md}
                            </div>
                          )}
                          {/* Ações */}
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => { setEditingId(h.id); setEditNote(h.note_md ?? '') }}
                              title="Editar anotação"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--r-border)', background: 'transparent', color: 'var(--r-text-muted)', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteHighlight(h.id)}
                              title="Excluir anotação"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 6, border: '1px solid var(--r-border)', background: 'transparent', color: 'var(--r-text-muted)', fontFamily: 'inherit', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>delete</span>
                              Excluir
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </aside>

      <style>{`
        @media (min-width: 1024px) {
          .reader-sidebar {
            transform: translateX(0) !important;
          }
          .reader-sidebar-backdrop {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}

function SectionItem({
  section, isPart, isCurrent, progress, onSelect,
}: {
  section: GuideSection
  isPart?: boolean
  isCurrent: boolean
  progress: GuideProgress | undefined
  onSelect: () => void
}) {
  const isCompleted = progress?.completed === true
  const isStarted = !!progress
  const isBonus = section.type === 'quiz'
  const isChecklist = section.type === 'checklist'
  const isSpecial = isBonus || isChecklist

  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: isPart || isSpecial ? '12px 12px' : '10px 12px 10px 26px',
        marginBottom: isSpecial ? 8 : 2,
        background: isCurrent
          ? 'color-mix(in srgb, var(--r-accent) 14%, transparent)'
          : isSpecial
            ? 'color-mix(in srgb, var(--r-accent) 7%, var(--r-surface))'
            : 'transparent',
        border: isSpecial
          ? `1px solid color-mix(in srgb, var(--r-accent) ${isCurrent ? 45 : 22}%, transparent)`
          : 'none',
        borderRadius: isSpecial ? 10 : 8,
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        fontFamily: 'inherit',
        transition: 'background 0.15s',
        minHeight: 44,
      }}
      onMouseEnter={e => {
        if (!isCurrent) e.currentTarget.style.background = isSpecial
          ? 'color-mix(in srgb, var(--r-accent) 12%, var(--r-surface))'
          : 'var(--r-surface-strong)'
      }}
      onMouseLeave={e => {
        if (!isCurrent) e.currentTarget.style.background = isSpecial
          ? 'color-mix(in srgb, var(--r-accent) 7%, var(--r-surface))'
          : 'transparent'
      }}
    >
      {/* Ícone especial para quiz/checklist ou indicador de progresso */}
      <span style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22 }}>
        {isBonus ? (
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--r-accent)' }}>auto_awesome</span>
        ) : isChecklist ? (
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--r-accent)' }}>checklist</span>
        ) : isCompleted ? (
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#70e09a' }}>check_circle</span>
        ) : isStarted ? (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--r-accent)', opacity: 0.7 }} />
        ) : (
          <span style={{ width: 7, height: 7, borderRadius: '50%', border: '1px solid var(--r-border)' }} />
        )}
      </span>

      {/* Title + badge + minutes */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {isSpecial && (
          <div style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--r-accent)', marginBottom: 3,
          }}>
            {isBonus ? 'Bônus exclusivo' : 'Ferramenta interativa'}
          </div>
        )}
        <div style={{
          fontFamily: isPart || isSpecial ? 'Manrope, system-ui, sans-serif' : 'Plus Jakarta Sans, system-ui, sans-serif',
          fontSize: isPart ? 12 : isSpecial ? 13 : 13.5,
          fontWeight: isPart || isSpecial ? 800 : isCurrent ? 600 : 500,
          color: isCurrent ? 'var(--r-accent)' : isPart || isSpecial ? 'var(--r-text-strong)' : 'var(--r-text)',
          letterSpacing: isPart ? '0.06em' : 'normal',
          textTransform: isPart ? 'uppercase' as const : 'none' as const,
          lineHeight: 1.35,
        }}>
          {section.title}
        </div>
        {section.estimated_minutes && (
          <div style={{ fontSize: 11, color: 'var(--r-text-subtle)', marginTop: 2 }}>
            {section.estimated_minutes} min
          </div>
        )}
      </div>

      {/* Barra ativa à esquerda */}
      {isCurrent && (
        <span style={{
          position: 'absolute',
          left: -2, top: 8, bottom: 8,
          width: 3,
          background: 'var(--r-accent)',
          borderRadius: 2,
        }} />
      )}
    </button>
  )
}
