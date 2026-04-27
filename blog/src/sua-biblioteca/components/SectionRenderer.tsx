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

const COUNTDOWN_SECONDS = 3

export default function SectionRenderer({
  guide, section, allSections, currentIdx, userId, onNavigate, onProgressUpdate, mainRef,
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
              color: completedAnimating ? 'var(--r-on-accent)' : 'var(--r-accent)',
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
            <button onClick={() => { stopCountdown(); onNavigate(prev.id) }} style={navBtn}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
              <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--r-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Anterior</div>
                <div style={{ fontSize: 13, color: 'var(--r-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prev.title}</div>
              </div>
            </button>
          ) : <div />}
          {next ? (
            <button onClick={() => { stopCountdown(); onNavigate(next.id) }} style={{ ...navBtn, justifyContent: 'flex-end' }}>
              <div style={{ textAlign: 'right', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--r-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Próxima</div>
                <div style={{ fontSize: 13, color: 'var(--r-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{next.title}</div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
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
          color: 'var(--r-on-accent)',
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

// ── Countdown card ───────────────────────────────────────────────────────
// Card destaque centralizado anunciando navegação automática pra próxima
// seção. Layout vertical com hierarquia: ring grande + número + título +
// botões centralizados. Background com gradient sutil do accent pra dar
// presença visual sem competir com o conteúdo.

function CountdownSnackbar({
  seconds, total, nextTitle, onCancel, onSkip,
}: {
  seconds: number
  total: number
  nextTitle: string
  onCancel: () => void
  onSkip: () => void
}) {
  // Anel: começa cheio (3s = 100%) e esvazia até 0 em sync com os ticks.
  // Transição linear de 1s segue o intervalo do timer.
  const progress = seconds / total
  const ringRadius = 22
  const circumference = 2 * Math.PI * ringRadius
  const offset = circumference * (1 - progress)

  return (
    <div
      role="status"
      aria-live="polite"
      className="countdown-card"
      style={{
        position: 'fixed',
        bottom: 'calc(max(20px, env(safe-area-inset-bottom)) + 16px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 28,
        width: 'min(420px, calc(100vw - 32px))',
        padding: '20px 22px 18px',
        background: 'var(--r-overlay)',
        backdropFilter: 'blur(24px)',
        border: '1px solid var(--r-border-strong)',
        borderRadius: 18,
        boxShadow: '0 18px 48px var(--r-shadow), 0 0 0 1px color-mix(in srgb, var(--r-accent) 12%, transparent) inset',
        textAlign: 'center',
        animation: 'countdown-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      }}
    >
      {/* Halo de gradiente sutil de fundo */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 18,
          background: 'radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--r-accent) 18%, transparent) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative' }}>
        {/* Anel SVG grande com número decrescente no centro */}
        <div style={{
          position: 'relative',
          width: 56,
          height: 56,
          margin: '0 auto 10px',
        }}>
          <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="28" cy="28" r={ringRadius}
              fill="none"
              stroke="color-mix(in srgb, var(--r-accent) 14%, transparent)"
              strokeWidth="3"
            />
            <circle
              cx="28" cy="28" r={ringRadius}
              fill="none"
              stroke="var(--r-accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 700, color: 'var(--r-accent)',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Fraunces, serif',
            fontVariationSettings: '"opsz" 72',
          }}>
            {seconds}
          </div>
        </div>

        {/* Eyebrow + título da próxima */}
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--r-accent)',
          marginBottom: 4,
        }}>
          Próxima leitura
        </div>
        <div style={{
          fontFamily: 'Fraunces, serif',
          fontVariationSettings: '"opsz" 32, "SOFT" 20',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: 'var(--r-text-strong)',
          lineHeight: 1.3,
          marginBottom: 16,
          padding: '0 8px',
          textWrap: 'balance' as never,
        }}>
          {nextTitle}
        </div>

        {/* Botões centralizados — espelham o estilo do "marcar como concluída" */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <button
            onClick={onCancel}
            aria-label="Cancelar navegação automática"
            style={{
              background: 'transparent',
              border: '1px solid var(--r-border)',
              color: 'var(--r-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              padding: '10px 18px',
              borderRadius: 999,
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--r-surface-strong)'
              e.currentTarget.style.color = 'var(--r-text)'
              e.currentTarget.style.borderColor = 'var(--r-border-strong)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--r-text-muted)'
              e.currentTarget.style.borderColor = 'var(--r-border)'
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
              fontSize: 13,
              fontWeight: 700,
              padding: '10px 20px',
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--r-accent-glow)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--r-accent)'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Ir agora
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes countdown-in {
          from { opacity: 0; transform: translate(-50%, 24px) scale(0.96); }
          to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
    </div>
  )
}
