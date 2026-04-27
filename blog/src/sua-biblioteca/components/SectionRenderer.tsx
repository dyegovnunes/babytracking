// SectionRenderer — renderiza UMA seção dependendo do tipo:
//   part      → ChapterOpener (capa grande, título serif XL, "Comece a ler")
//   linear    → markdown rendered + handlers de highlight + InteractiveChecklist
//                (se data.checklist_items existir)
//   quiz      → entry point pra QuizFullscreen
//   checklist → InteractiveChecklist (variant card)
// Inclui: navegação prev/next, "marcar como concluída", auto-progress,
//          toast de milestone

import { useEffect, useState, useRef, useCallback } from 'react'
import type { Guide, GuideSection, GuideProgress } from '../../types'
import { renderSectionMarkdown } from '../lib/markdownRenderer'
import { useReadingProgress } from '../lib/useReadingProgress'
import type { GuideMilestone } from '../lib/useMilestones'
import ChapterOpener from './ChapterOpener'
import InteractiveChecklist, { type ChecklistItem } from './InteractiveChecklist'
import QuizFullscreen from './QuizFullscreen'
import HighlightLayer from './HighlightLayer'
import NoteDrawer from './NoteDrawer'
import NpsBlock from './NpsBlock'

interface Props {
  guide: Guide
  section: GuideSection
  allSections: GuideSection[]
  currentIdx: number
  userId: string
  isCompleted?: boolean
  onNavigate: (id: string) => void
  onProgressUpdate: (sectionId: string, partial: Partial<GuideProgress>) => void
  mainRef: React.RefObject<HTMLElement | null>
  /** Registra milestone manualmente (ex: 'first-highlight', 'first-note').
   *  GuideLayout passa o `record` do useMilestones hook. */
  recordMilestone?: (type: GuideMilestone['type'], ref?: string, metadata?: Record<string, unknown>) => Promise<unknown>
}

const COUNTDOWN_SECONDS = 3

export default function SectionRenderer({
  guide, section, allSections, currentIdx, userId, isCompleted, onNavigate, onProgressUpdate, mainRef,
  recordMilestone,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [completedAnimating, setCompletedAnimating] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownTimerRef = useRef<number | null>(null)

  const { markCompleted } = useReadingProgress({
    userId,
    guideId: guide.id,
    sectionId: section.id,
    containerRef: mainRef,
  })

  const prev = currentIdx > 0 ? allSections[currentIdx - 1] : null
  const next = currentIdx < allSections.length - 1 ? allSections[currentIdx + 1] : null

  // Marca seção como visitada (last_seen_at) ao montar
  useEffect(() => {
    onProgressUpdate(section.id, { last_seen_at: new Date().toISOString() })
  }, [section.id])

  // Limpa countdown quando navegar (manualmente ou outra forma) — evita
  // disparar navegação após o user já ter saído da seção
  useEffect(() => {
    return () => stopCountdown()
  }, [section.id])

  // ESC cancela countdown
  useEffect(() => {
    if (countdown === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') stopCountdown()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [countdown])

  function stopCountdown() {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current)
      countdownTimerRef.current = null
    }
    setCountdown(null)
  }

  function startCountdown() {
    if (!next) return
    setCountdown(COUNTDOWN_SECONDS)
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev === null) return null
        if (prev <= 1) {
          // Tempo acabou: navega
          if (countdownTimerRef.current) {
            window.clearInterval(countdownTimerRef.current)
            countdownTimerRef.current = null
          }
          // setTimeout 0 evita conflito com setState durante render
          setTimeout(() => onNavigate(next.id), 0)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleMarkCompleted() {
    setCompletedAnimating(true)
    await markCompleted()
    onProgressUpdate(section.id, { completed: true, completed_at: new Date().toISOString() })
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([15, 30, 15]) } catch { /* ignore */ }
    }
    setTimeout(() => {
      setCompletedAnimating(false)
      // Inicia countdown automático pra próxima seção (só se houver next)
      if (next) startCountdown()
    }, 1200)
  }

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
            letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 700,
            marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
            {section.estimated_minutes} min de leitura
          </div>
        )}
        <h1 style={{
          fontFamily: 'Fraunces, serif',
          fontSize: 'clamp(1.85rem, 6.5vw, 2.6em)',
          fontWeight: 700,
          fontVariationSettings: '"opsz" 72, "SOFT" 30',
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--r-text-strong)',
          margin: '0 0 0.4em',
          textWrap: 'balance' as never,
        }}>
          {section.title}
        </h1>
      </header>

      {/* Markdown content + StaticChecklistList inline */}
      {section.content_md && (() => {
        const data = section.data as { checklist_items?: ChecklistItem[]; items?: ChecklistItem[] } | null
        const list = data?.checklist_items ?? data?.items ?? []
        const html = renderSectionMarkdown(section.content_md)

        // Para type='linear' com checklist_items: injeta o card logo após o
        // heading h2/h3/h4 que contém "checklist" — antes do "Resumo em X pontos"
        if (section.type === 'linear' && list.length > 0) {
          const headingRegex = /(<h[234][^>]*>[^<]*checklist[^<]*<\/h[234]>)/i
          const match = headingRegex.exec(html)
          if (match) {
            const splitIdx = match.index + match[0].length
            const before = html.slice(0, splitIdx)
            const after = html.slice(splitIdx)
            return (
              <>
                <div dangerouslySetInnerHTML={{ __html: before }} />
                <StaticChecklistList items={list} />
                <div dangerouslySetInnerHTML={{ __html: after }} />
              </>
            )
          }
          // Sem heading "checklist" no markdown: renderiza após o conteúdo (fallback)
          return (
            <>
              <div dangerouslySetInnerHTML={{ __html: html }} />
              <StaticChecklistList items={list} />
            </>
          )
        }

        return <div dangerouslySetInnerHTML={{ __html: html }} />
      })()}

      {/* Tool link cards — ex: celebração da Conclusão com cards para quiz + checklist */}
      {(() => {
        const toolLinks = (section.data as { tool_links?: ToolLink[] } | null)?.tool_links
        if (!toolLinks || toolLinks.length === 0) return null
        return <ToolLinkCards links={toolLinks} onNavigate={onNavigate} />
      })()}

      {/* CTA de download do Yaya (seção de celebração da conclusão) */}
      {(section.data as Record<string, unknown> | null)?.show_yaya_cta && <YayaCtaBlock />}

      {/* NPS / avaliação do guia */}
      {(section.data as Record<string, unknown> | null)?.show_nps && (
        <NpsBlock guideId={guide.id} sectionId={section.id} userId={userId} />
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

      {/* Checklist interativo — só para type='checklist' (Checklist Mestre) */}
      {section.type === 'checklist' && (() => {
        const data = section.data as { checklist_items?: ChecklistItem[]; items?: ChecklistItem[]; footer_md?: string } | null
        const list = data?.checklist_items ?? data?.items ?? []
        if (list.length > 0) {
          return (
            <>
              <InteractiveChecklist
                items={list}
                sectionId={section.id}
                userId={userId}
                variant="card"
                onCompleted={() => recordMilestone?.('first-checklist-completed', section.id)}
              />
              {data?.footer_md && (
                <div
                  style={{ marginTop: 32 }}
                  dangerouslySetInnerHTML={{ __html: renderSectionMarkdown(data.footer_md) }}
                />
              )}
            </>
          )
        }
        return null
      })()}

      {/* Highlights overlay (text selection popover) */}
      <HighlightLayer
        sectionId={section.id}
        userId={userId}
        contentRef={contentRef}
        onHighlightSaved={() => recordMilestone?.('first-highlight')}
      />

      {/* Notas */}
      <NoteDrawer
        sectionId={section.id}
        userId={userId}
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        onNoteSaved={() => recordMilestone?.('first-note')}
      />

      {/* Footer da seção: botão "marcar concluída" + navegação prev/next */}
      <div style={{ marginTop: 'clamp(40px, 8vw, 64px)', paddingTop: 28, borderTop: '1px solid var(--r-border)' }}>
        {/* Ferramenta (checklist) e seções comemorativas não têm botão de conclusão */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 14, marginBottom: 28,
        }}>
          {(section.type === 'checklist' || (section.data as Record<string, unknown> | null)?.hide_completion_btn) ? null : (isCompleted || completedAnimating) ? (
            <div
              style={{
                padding: '13px 26px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--r-accent)',
                color: 'var(--r-on-accent)',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 8,
                minHeight: 44,
                maxWidth: '100%',
                boxShadow: '0 4px 16px color-mix(in srgb, var(--r-accent) 35%, transparent)',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: '"FILL" 1' }}>
                check_circle
              </span>
              Concluída! 💜
            </div>
          ) : (
            <button
              onClick={handleMarkCompleted}
              style={{
                padding: '13px 26px',
                borderRadius: 999,
                border: '1px solid var(--r-accent)',
                background: 'transparent',
                color: 'var(--r-accent)',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.3s',
                minHeight: 44,
                maxWidth: '100%',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>task_alt</span>
              Marcar como concluída
            </button>
          )}
          {section.type !== 'checklist' && !(section.data as Record<string, unknown> | null)?.hide_completion_btn && !isCompleted && (
            <p style={{ fontSize: 12, color: 'var(--r-text-subtle)', margin: 0 }}>
              Ou rola até o final pra avançar pra próxima seção
            </p>
          )}
        </div>

        <div className="reader-actions" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          maxWidth: 700,
          margin: '0 auto',
        }}>
          {prev ? (
            <button
              onClick={() => { stopCountdown(); onNavigate(prev.id) }}
              className="nav-btn-prev"
              style={navBtn}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18, flex: '0 0 auto' }}>arrow_back</span>
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--r-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Anterior</div>
                <div style={{ fontSize: 13, color: 'var(--r-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{prev.title}</div>
              </div>
            </button>
          ) : <div />}
          {next ? (
            <button
              onClick={() => { stopCountdown(); onNavigate(next.id) }}
              className="nav-btn-next"
              style={{ ...navBtn, justifyContent: 'flex-end' }}
            >
              <div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--r-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Próxima</div>
                <div style={{ fontSize: 13, color: 'var(--r-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{next.title}</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18, flex: '0 0 auto' }}>arrow_forward</span>
            </button>
          ) : <div />}
        </div>
      </div>

      {/* Countdown snackbar — aparece após marcar concluída e auto-navega */}
      {countdown !== null && next && (
        <CountdownSnackbar
          seconds={countdown}
          total={COUNTDOWN_SECONDS}
          nextTitle={next.title}
          onCancel={stopCountdown}
          onSkip={() => { stopCountdown(); onNavigate(next.id) }}
        />
      )}

      {/* Rodapé de disclaimer médico — aparece em toda seção de leitura */}
      <footer style={{
        marginTop: '3em',
        padding: '14px 0 4px',
        borderTop: '1px solid var(--r-border)',
        fontSize: 12,
        color: 'var(--r-text-subtle)',
        lineHeight: 1.7,
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
      }}>
        <strong style={{ color: 'var(--r-text-muted)' }}>O Yaya é uma plataforma de informação e acompanhamento, não um serviço médico.</strong>{' '}
        O conteúdo deste guia é baseado em diretrizes de organizações como OMS, SBP e AAP. Toda situação é individual — quando houver conflito entre o que você leu aqui e o que o seu médico orientou, siga o seu médico.
      </footer>

      {/* Floating Action Button mobile — abre notas. Esconde durante
          countdown pra não competir visualmente com o snackbar. */}
      <button
        onClick={() => setNoteOpen(true)}
        className="reader-fab"
        aria-label="Abrir notas desta seção"
        style={{
          position: 'fixed',
          bottom: 'calc(max(20px, env(safe-area-inset-bottom)) + 4px)',
          right: 16,
          width: 48, height: 48,
          borderRadius: '50%',
          border: 'none',
          background: 'var(--r-accent)',
          color: 'var(--r-on-accent)',
          cursor: 'pointer',
          boxShadow: '0 8px 22px color-mix(in srgb, var(--r-accent) 35%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 25,
          opacity: countdown !== null ? 0 : 1,
          pointerEvents: countdown !== null ? 'none' : 'auto',
          transition: 'opacity 0.25s',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>edit_note</span>
      </button>
    </div>
  )
}

// ── YayaCtaBlock ─────────────────────────────────��───────────────────────────
// CTA de download do Yaya na seção de conclusão (show_yaya_cta: true)

function YayaCtaBlock() {
  return (
    <div style={{
      marginTop: '2.5em',
      padding: '28px 24px',
      background: 'color-mix(in srgb, var(--r-accent) 8%, var(--r-surface))',
      border: '1px solid color-mix(in srgb, var(--r-accent) 28%, transparent)',
      borderRadius: 16,
      textAlign: 'center',
      fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
      <div style={{
        fontFamily: 'Manrope, system-ui, sans-serif',
        fontWeight: 800, fontSize: 18,
        color: 'var(--r-text-strong)',
        letterSpacing: '-0.01em',
        marginBottom: 8,
      }}>
        Sua Yaya+ gratuita está esperando
      </div>
      <p style={{
        fontSize: 14, color: 'var(--r-text-muted)', lineHeight: 1.65,
        maxWidth: 420, margin: '0 auto 24px',
      }}>
        Você ganhou 30 dias de Yaya+ com a compra do guia. Use para acompanhar sono, mamadas e fraldas — e chegar na primeira consulta do pediatra com tudo registrado.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a
          href="https://play.google.com/store/apps/details?id=app.yayababy"
          target="_blank" rel="noopener noreferrer"
          style={{
            padding: '12px 22px', borderRadius: 999,
            background: 'var(--r-accent)', color: 'var(--r-on-accent)',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 17 }}>android</span>
          Baixar no Android
        </a>
        <a
          href="https://apps.apple.com/br/app/yaya-bebe/id6741482602"
          target="_blank" rel="noopener noreferrer"
          style={{
            padding: '12px 22px', borderRadius: 999,
            border: '1.5px solid var(--r-accent)', color: 'var(--r-accent)',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'transparent',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 17 }}>apple</span>
          Baixar no iPhone
        </a>
      </div>
    </div>
  )
}

// Lista de checklist informativa (type='linear' com checklist_items) — não interativa
function StaticChecklistList({ items }: { items: ChecklistItem[] }) {
  return (
    <div style={{
      margin: '1.5em 0',
      background: 'var(--r-surface)',
      border: '1px solid var(--r-border)',
      borderRadius: 14,
      overflow: 'hidden',
      fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    }}>
      <div style={{
        padding: '10px 16px',
        background: 'color-mix(in srgb, var(--r-accent) 6%, transparent)',
        borderBottom: '1px solid var(--r-border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--r-accent)' }}>
          checklist
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--r-accent)' }}>
          Lista de verificação
        </span>
      </div>
      <ul style={{ listStyle: 'none', padding: '8px 0', margin: 0 }}>
        {items.map(item => (
          <li key={item.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '8px 16px',
            borderBottom: '1px solid var(--r-border)',
          }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 18, color: 'var(--r-text-muted)', flex: '0 0 auto', marginTop: 2 }}
            >
              check_box_outline_blank
            </span>
            <span style={{ fontSize: 14, color: 'var(--r-text)', lineHeight: 1.55 }}>
              {item.text}
              {item.required && (
                <span style={{
                  marginLeft: 8, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  color: 'var(--r-accent)', background: 'color-mix(in srgb, var(--r-accent) 12%, transparent)',
                  padding: '2px 7px', borderRadius: 999, textTransform: 'uppercase', verticalAlign: 'middle',
                }}>Essencial</span>
              )}
            </span>
          </li>
        ))}
      </ul>
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

// ── Countdown snackbar ───────────────────────────────────────────────────
// Pílula horizontal compacta, com tinta accent pra destacar do fundo dark
// (que era o problema da versão anterior — invisível). Centralizada sobre
// a ÁREA DE CONTEÚDO (não a viewport): no desktop, offset compensa a
// sidebar fixa de 320px; no mobile, true center.

function CountdownSnackbar({
  seconds, total, nextTitle, onCancel, onSkip,
}: {
  seconds: number
  total: number
  nextTitle: string
  onCancel: () => void
  onSkip: () => void
}) {
  const progress = seconds / total
  const circumference = 2 * Math.PI * 14
  const offset = circumference * (1 - progress)

  return (
    <div
      role="status"
      aria-live="polite"
      className="countdown-snackbar"
      style={{
        position: 'fixed',
        bottom: 'calc(max(20px, env(safe-area-inset-bottom)) + 84px)',
        // left e transform vêm do CSS abaixo (com media query pra desktop)
        zIndex: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 8px 8px 14px',
        // Tinta accent sobre o overlay = destaque sem ser gritante.
        // color-mix respeita light/dark theme automaticamente.
        background: 'color-mix(in srgb, var(--r-accent) 14%, var(--r-overlay))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid color-mix(in srgb, var(--r-accent) 45%, transparent)',
        borderRadius: 999,
        boxShadow: '0 10px 28px color-mix(in srgb, var(--r-accent) 22%, transparent), 0 2px 8px var(--r-shadow)',
        animation: 'countdown-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        maxWidth: 'calc(100vw - 32px)',
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
      }}
    >
      {/* Anel SVG com número no centro */}
      <div style={{ position: 'relative', width: 36, height: 36, flex: '0 0 auto' }}>
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="18" cy="18" r="14" fill="none" stroke="color-mix(in srgb, var(--r-accent) 22%, transparent)" strokeWidth="2.5" />
          <circle
            cx="18" cy="18" r="14" fill="none"
            stroke="var(--r-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: 'var(--r-accent)',
          fontFamily: 'Manrope, system-ui, sans-serif',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.02em',
        }}>
          {seconds}
        </div>
      </div>

      {/* Texto: "PRÓXIMA EM Ns" + título */}
      <div style={{
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        color: 'var(--r-text)',
        lineHeight: 1.3,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--r-accent)',
          marginBottom: 1,
        }}>
          Próxima em {seconds}s
        </div>
        <div style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontFamily: 'Manrope, system-ui, sans-serif',
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: 'var(--r-text-strong)',
          maxWidth: 240,
        }}>
          {nextTitle}
        </div>
      </div>

      <button
        onClick={onCancel}
        aria-label="Cancelar navegação automática"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--r-text-muted)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 600,
          padding: '8px 12px',
          borderRadius: 999,
          transition: 'background 0.15s, color 0.15s',
          flex: '0 0 auto',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--r-surface-strong)'
          e.currentTarget.style.color = 'var(--r-text)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--r-text-muted)'
        }}
      >
        Cancelar
      </button>

      <button
        onClick={onSkip}
        aria-label="Ir para próxima seção agora"
        style={{
          background: 'var(--r-accent)',
          border: 'none',
          color: 'var(--r-on-accent)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 700,
          padding: '8px 14px',
          borderRadius: 999,
          flex: '0 0 auto',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--r-accent-glow)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--r-accent)' }}
      >
        Ir agora
      </button>

      <style>{`
        /* Mobile/tablet: centralizado na viewport (sidebar é drawer) */
        .countdown-snackbar {
          left: 50%;
        }
        /* Desktop ≥1024px: sidebar fixa de 320px ocupa a esquerda, então o
           "centro" da área de conteúdo é deslocado 160px à direita do
           50% da viewport. */
        @media (min-width: 1024px) {
          .countdown-snackbar {
            left: calc(50% + 160px);
          }
        }
        /* O translateX(-50%) é aplicado via animation (translate(-50%, …))
           com fill-mode: both, então o estado final do keyframe persiste. */
        @keyframes countdown-in {
          from { opacity: 0; transform: translate(-50%, 16px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}

// ── ToolLinkCards ────────────────────────────────────────────────────────────

interface ToolLink {
  section_id: string
  title: string
  description: string
  icon: string
}

function ToolLinkCards({ links, onNavigate }: { links: ToolLink[]; onNavigate: (id: string) => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 14,
      margin: '2em 0',
    }}>
      {links.map(link => (
        <button
          key={link.section_id}
          onClick={() => onNavigate(link.section_id)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
            padding: '18px 20px',
            background: 'color-mix(in srgb, var(--r-accent) 6%, var(--r-surface))',
            border: '1px solid color-mix(in srgb, var(--r-accent) 28%, transparent)',
            borderRadius: 14,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            transition: 'background 0.2s, border-color 0.2s, transform 0.15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--r-accent) 12%, var(--r-surface))'
            e.currentTarget.style.transform = 'translateY(-2px)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'color-mix(in srgb, var(--r-accent) 6%, var(--r-surface))'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          <span className="material-symbols-outlined" style={{
            fontSize: 28, color: 'var(--r-accent)',
            fontVariationSettings: '"FILL" 0',
          }}>
            {link.icon}
          </span>
          <div>
            <div style={{
              fontFamily: 'Manrope, system-ui, sans-serif',
              fontWeight: 800, fontSize: 14,
              color: 'var(--r-text-strong)',
              letterSpacing: '-0.01em',
              marginBottom: 4,
            }}>
              {link.title}
            </div>
            <div style={{ fontSize: 13, color: 'var(--r-text-muted)', lineHeight: 1.5 }}>
              {link.description}
            </div>
          </div>
          <div style={{
            marginTop: 'auto',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, fontWeight: 700, color: 'var(--r-accent)',
            letterSpacing: '0.02em',
          }}>
            Acessar
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
          </div>
        </button>
      ))}
    </div>
  )
}
