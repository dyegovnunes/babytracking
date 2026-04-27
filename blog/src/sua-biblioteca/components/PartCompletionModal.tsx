// PartCompletionModal — comemoração sutil-premium ao concluir uma parte
// do guia. Estilo Spotify Wrapped reduzido: fade-in suave, hierarquia
// editorial, sem confetti.
//
// Trigger: useMilestones detecta novo INSERT type=part-completed e abre
// o modal passando o partId via prop. GuideLayout coordena.

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Guide, GuideSection } from '../../types'
import { getPartCelebrationCopy } from '../lib/milestoneCopy'

interface Props {
  /** ID da parte concluída (vem do milestone.ref) */
  partId: string | null
  guide: Guide
  allSections: GuideSection[]
  onClose: () => void
  onContinue: (nextSectionId: string) => void
}

interface PartStats {
  totalSections: number
  totalNotes: number
  totalHighlights: number
  estimatedMinutes: number
}

export default function PartCompletionModal({
  partId, guide, allSections, onClose, onContinue,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [stats, setStats] = useState<PartStats | null>(null)

  const part = partId ? allSections.find(s => s.id === partId) : null
  const partChildren = partId
    ? allSections.filter(s => s.parent_id === partId).sort((a, b) => a.order_index - b.order_index)
    : []

  // Próxima parte (se houver) — primeiro encontra index da parte atual
  const parts = allSections.filter(s => s.parent_id === null)
    .sort((a, b) => a.order_index - b.order_index)
  const partIdx = part ? parts.findIndex(p => p.id === part.id) : -1
  const nextPart = partIdx >= 0 && partIdx < parts.length - 1 ? parts[partIdx + 1] : null
  // Primeira seção pra continuar leitura: filha da próxima parte (se existir)
  // ou a própria próxima parte (se for o chapter opener)
  const nextSection = nextPart
    ? (allSections.find(s => s.parent_id === nextPart.id) ?? nextPart)
    : null

  const copy = getPartCelebrationCopy(part ?? null, nextSection ?? null)

  // Anima entrada
  useEffect(() => {
    if (!partId) return
    setVisible(false)
    requestAnimationFrame(() => {
      setVisible(true)
    })
  }, [partId])

  // Fetch stats da parte (notas + highlights + minutos)
  useEffect(() => {
    if (!partId || !part) return
    let cancelled = false

    async function load() {
      const childIds = partChildren.map(c => c.id)
      if (childIds.length === 0) {
        setStats({ totalSections: 0, totalNotes: 0, totalHighlights: 0, estimatedMinutes: 0 })
        return
      }

      const [{ count: notesCount }, { count: hlCount }] = await Promise.all([
        supabase.from('guide_notes').select('*', { count: 'exact', head: true })
          .in('section_id', childIds),
        supabase.from('guide_highlights').select('*', { count: 'exact', head: true })
          .in('section_id', childIds),
      ])

      if (cancelled) return

      const estimatedMinutes = partChildren.reduce(
        (sum, c) => sum + (c.estimated_minutes ?? 0), 0,
      )

      setStats({
        totalSections: partChildren.length,
        totalNotes: notesCount ?? 0,
        totalHighlights: hlCount ?? 0,
        estimatedMinutes,
      })
    }
    load()
    return () => { cancelled = true }
  }, [partId, part, partChildren])

  // ESC fecha
  useEffect(() => {
    if (!partId) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [partId])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 280)
  }

  function handleContinue() {
    if (!nextSection) {
      handleClose()
      return
    }
    setVisible(false)
    setTimeout(() => onContinue(nextSection.id), 200)
  }

  if (!partId || !part) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${copy.eyebrow}: ${copy.title}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'radial-gradient(ellipse 120% 60% at 50% 0%, color-mix(in srgb, var(--r-accent) 22%, transparent), transparent 70%), var(--r-overlay)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        display: 'flex',
        flexDirection: 'column',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Botão fechar discreto canto superior */}
      <button
        onClick={handleClose}
        aria-label="Fechar"
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
          right: 12,
          background: 'transparent',
          border: 'none',
          color: 'var(--r-text-muted)',
          cursor: 'pointer',
          padding: 10,
          borderRadius: 10,
          minWidth: 44,
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'inherit',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 22 }}>close</span>
      </button>

      {/* Cover da parte — com glow roxo atrás */}
      {part.cover_image_url && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '36vh',
            minHeight: 220,
            maxHeight: 400,
            overflow: 'hidden',
            flex: '0 0 auto',
          }}
        >
          {/* Glow roxo atrás da imagem */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            background: 'radial-gradient(ellipse 80% 100% at 50% 100%, color-mix(in srgb, var(--r-accent) 45%, transparent), transparent)',
          }} />
          <img
            src={part.cover_image_url}
            alt=""
            style={{
              position: 'relative', zIndex: 1,
              width: '100%', height: '100%', objectFit: 'cover',
              transform: visible ? 'scale(1)' : 'scale(1.06)',
              transition: 'transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0, zIndex: 2,
            background: 'linear-gradient(180deg, transparent 20%, var(--r-overlay) 100%)',
          }} />
        </div>
      )}

      {/* Partículas decorativas */}
      {visible && (
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
          {[...Array(10)].map((_, i) => (
            <span key={i} style={{
              position: 'absolute',
              width: 6 + (i % 3) * 3,
              height: 6 + (i % 3) * 3,
              borderRadius: '50%',
              background: `color-mix(in srgb, var(--r-accent) ${40 + i * 5}%, transparent)`,
              left: `${10 + i * 9}%`,
              bottom: `${10 + (i % 4) * 20}%`,
              animation: `part-particle-rise ${2.5 + i * 0.4}s ease-in ${i * 0.15}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Conteúdo central */}
      <div
        className="part-completion-content"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px 52px',
          textAlign: 'center',
          maxWidth: 640,
          margin: '0 auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--r-accent)',
            marginBottom: 14,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s',
          }}
        >
          {copy.eyebrow}
        </div>

        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontVariationSettings: '"opsz" 144, "SOFT" 60',
            fontSize: 'clamp(2.6rem, 7.5vw, 4.2rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: 'var(--r-text-strong)',
            margin: '0 0 20px',
            textWrap: 'balance' as never,
            opacity: visible ? 1 : 0,
            transform: visible ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(14px)',
            transition: 'opacity 0.55s ease 0.18s, transform 0.55s cubic-bezier(0.34, 1.3, 0.64, 1) 0.18s',
          }}
        >
          {copy.title}
        </h1>

        <p
          style={{
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--r-text-muted)',
            margin: '0 0 32px',
            maxWidth: 520,
            textWrap: 'balance' as never,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease 0.28s, transform 0.5s ease 0.28s',
          }}
        >
          {copy.microcopy}
        </p>

        {/* Stats grid */}
        {stats && stats.totalSections > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: 12,
              maxWidth: 480,
              width: '100%',
              marginBottom: 36,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.5s ease 0.38s, transform 0.5s ease 0.38s',
            }}
          >
            <Stat value={String(stats.totalSections)} label={stats.totalSections === 1 ? 'seção' : 'seções'} />
            <Stat value={`${stats.estimatedMinutes}`} label="min de leitura" />
            {(stats.totalNotes + stats.totalHighlights) > 0 && (
              <Stat
                value={String(stats.totalNotes + stats.totalHighlights)}
                label={stats.totalNotes + stats.totalHighlights === 1 ? 'marca pessoal' : 'marcas pessoais'}
              />
            )}
          </div>
        )}

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: '100%',
            maxWidth: 360,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 0.5s ease 0.48s, transform 0.5s ease 0.48s',
          }}
        >
          {nextSection && (
            <button
              onClick={handleContinue}
              style={{
                padding: '14px 22px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--r-accent)',
                color: 'var(--r-on-accent)',
                fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                minHeight: 48,
                transition: 'background 0.15s, transform 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--r-accent-glow)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--r-accent)' }}
            >
              {copy.ctaPrimary}
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
            </button>
          )}
          <button
            onClick={handleClose}
            style={{
              padding: '12px 22px',
              borderRadius: 999,
              border: '1px solid var(--r-border)',
              background: 'transparent',
              color: 'var(--r-text-muted)',
              fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 44,
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
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
            {copy.ctaSecondary}
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        background: 'color-mix(in srgb, var(--r-accent) 7%, var(--r-surface))',
        border: '1px solid color-mix(in srgb, var(--r-accent) 25%, var(--r-border))',
        borderRadius: 16,
        padding: '16px 12px',
        textAlign: 'center',
      }}
    >
      <div style={{
        fontFamily: 'Fraunces, serif',
        fontVariationSettings: '"opsz" 72, "SOFT" 40',
        fontSize: 32,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: 'var(--r-accent)',
        lineHeight: 1,
        marginBottom: 5,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        color: 'var(--r-text-muted)',
      }}>
        {label}
      </div>
    </div>
  )
}

// Keyframes injetadas no <head> uma vez
if (typeof document !== 'undefined' && !document.getElementById('part-completion-kf')) {
  const s = document.createElement('style')
  s.id = 'part-completion-kf'
  s.textContent = `
    @keyframes part-particle-rise {
      0%   { transform: translateY(0) scale(1); opacity: 0.7; }
      80%  { opacity: 0.4; }
      100% { transform: translateY(-60vh) scale(0.4); opacity: 0; }
    }
  `
  document.head.appendChild(s)
}
