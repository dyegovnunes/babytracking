// MilestoneToast — toast efêmero pra marcos pequenos (first-highlight,
// first-note, 5-highlights, etc). NÃO usado pra part-completed nem
// guide-completed (esses têm modal/tela dedicada).
//
// Aparece no topo, fade-in + auto-dismiss em 4s. Só um por vez (queue).

import { useState, useEffect, useRef } from 'react'
import { MILESTONE_TOAST_COPY } from '../lib/milestoneCopy'
import type { GuideMilestone, GuideMilestoneType } from '../lib/useMilestones'

interface Props {
  /** Milestone novo a exibir; quando muda, dispara nova animação. */
  milestone: GuideMilestone | null
  onDismiss: () => void
}

const AUTO_DISMISS_MS = 4000

export default function MilestoneToast({ milestone, onDismiss }: Props) {
  const [visible, setVisible] = useState(false)
  const dismissTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!milestone) return
    setVisible(true)

    if (dismissTimer.current) window.clearTimeout(dismissTimer.current)
    dismissTimer.current = window.setTimeout(() => {
      setVisible(false)
      // Aguarda animação out antes de chamar onDismiss
      setTimeout(onDismiss, 250)
    }, AUTO_DISMISS_MS)

    return () => {
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current)
    }
  }, [milestone, onDismiss])

  if (!milestone) return null

  // Filtra: só mostra toast pra tipos pequenos (não part/guide-completed)
  if (milestone.type === 'part-completed' || milestone.type === 'guide-completed') {
    return null
  }

  const copy = MILESTONE_TOAST_COPY[milestone.type as GuideMilestoneType]
  if (!copy) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 72px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px 12px 14px',
        background: 'color-mix(in srgb, var(--r-accent) 14%, var(--r-overlay))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid color-mix(in srgb, var(--r-accent) 45%, transparent)',
        borderRadius: 14,
        boxShadow: '0 10px 28px color-mix(in srgb, var(--r-accent) 22%, transparent), 0 2px 8px var(--r-shadow)',
        maxWidth: 'min(420px, calc(100vw - 32px))',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s, transform 0.25s',
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
        animation: visible ? 'milestone-toast-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both' : 'none',
      }}
    >
      {/* Ícone com fundo accent sutil */}
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 22,
          color: 'var(--r-accent)',
          background: 'color-mix(in srgb, var(--r-accent) 15%, transparent)',
          padding: 8,
          borderRadius: 10,
          flex: '0 0 auto',
        }}
      >
        {copy.icon}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'Manrope, system-ui, sans-serif',
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: '-0.01em',
          color: 'var(--r-text-strong)',
          lineHeight: 1.25,
        }}>
          {copy.title}
        </div>
        {copy.body && (
          <div style={{
            fontSize: 12,
            color: 'var(--r-text-muted)',
            marginTop: 2,
            lineHeight: 1.4,
          }}>
            {copy.body}
          </div>
        )}
      </div>

      <style>{`
        @keyframes milestone-toast-in {
          from { opacity: 0; transform: translate(-50%, -12px) scale(0.97); }
          to   { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
      `}</style>
    </div>
  )
}
