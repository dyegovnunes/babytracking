import { useMemo, useState, useRef, useEffect } from 'react'
import type { Highlight } from '../../lib/highlights'
import { hapticLight } from '../../lib/haptics'
import HighlightSheet from './HighlightSheet'

interface Props {
  highlights: Highlight[]
  babyName: string
  babyGender?: 'boy' | 'girl'
  birthDate: string
  /** Chamado quando o usuário dispensa (ou quando "Ver mais" navega) — para forçar recoleta */
  onChange: () => void
}

/**
 * Seção "Acompanhe a jornada do {name}" — strip horizontal de destaques.
 *
 * - Se não há highlights ativos, não renderiza nada.
 * - Marquee lento para a esquerda (CSS keyframes), pausa quando o usuário
 *   interage (touch/hover) e retoma após soltar.
 * - Cada chip abre um bottom sheet com ações Fechar · Dispensar · Ver mais.
 */
export default function HighlightsStrip({ highlights, babyName, babyGender, birthDate, onChange }: Props) {
  const [openHighlight, setOpenHighlight] = useState<Highlight | null>(null)
  const [paused, setPaused] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => highlights, [highlights])

  // Duplicamos o conteúdo para permitir loop seamless
  const loop = useMemo(() => [...visible, ...visible], [visible])

  // Pausa automática quando o usuário toca / hover
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    let resumeTimer: ReturnType<typeof setTimeout> | null = null
    const handlePause = () => {
      setPaused(true)
      if (resumeTimer) clearTimeout(resumeTimer)
    }
    const handleResume = () => {
      if (resumeTimer) clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => setPaused(false), 2500)
    }
    el.addEventListener('touchstart', handlePause, { passive: true })
    el.addEventListener('touchend', handleResume, { passive: true })
    el.addEventListener('mouseenter', handlePause)
    el.addEventListener('mouseleave', handleResume)
    return () => {
      el.removeEventListener('touchstart', handlePause)
      el.removeEventListener('touchend', handleResume)
      el.removeEventListener('mouseenter', handlePause)
      el.removeEventListener('mouseleave', handleResume)
      if (resumeTimer) clearTimeout(resumeTimer)
    }
  }, [])

  if (visible.length === 0) return null

  return (
    <>
      <section className="mt-6">
        <div className="px-5 mb-3 flex items-baseline justify-between">
          <h2 className="font-headline text-base font-bold text-on-surface">
            Acompanhe a jornada {babyGender === 'girl' ? 'da' : 'do'} {babyName}
          </h2>
          <span className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
            {visible.length} destaque{visible.length > 1 ? 's' : ''}
          </span>
        </div>

        <div
          ref={scrollerRef}
          className="overflow-hidden relative"
          style={{
            maskImage:
              'linear-gradient(to right, transparent 0, black 20px, black calc(100% - 20px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0, black 20px, black calc(100% - 20px), transparent 100%)',
          }}
        >
          <div
            className="flex gap-2 w-max py-1"
            style={{
              animation: `highlight-marquee ${Math.max(visible.length, 1) * 14}s linear infinite`,
              animationPlayState: paused ? 'paused' : 'running',
              paddingLeft: '20px',
              paddingRight: '20px',
            }}
          >
            {loop.map((h, i) => (
              <HighlightChip
                key={`${h.type}_${h.id}_${i}`}
                highlight={h}
                onClick={() => {
                  hapticLight()
                  setOpenHighlight(h)
                }}
              />
            ))}
          </div>
        </div>

        <style>{`
          @keyframes highlight-marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {openHighlight && (
        <HighlightSheet
          highlight={openHighlight}
          babyName={babyName}
          babyGender={babyGender}
          birthDate={birthDate}
          onClose={() => setOpenHighlight(null)}
          onDismissed={() => {
            setOpenHighlight(null)
            onChange()
          }}
          onNavigated={() => {
            setOpenHighlight(null)
            onChange()
          }}
        />
      )}
    </>
  )
}

// ---------- Chip ----------

const ACCENT_BG: Record<Highlight['accent'], string> = {
  primary: 'bg-primary/10 border-primary/20',
  tertiary: 'bg-tertiary/10 border-tertiary/20',
  warning: 'bg-yellow-500/10 border-yellow-500/20',
  success: 'bg-green-500/10 border-green-500/20',
}

const ACCENT_TEXT: Record<Highlight['accent'], string> = {
  primary: 'text-primary',
  tertiary: 'text-tertiary',
  warning: 'text-yellow-400',
  success: 'text-green-400',
}

const ACCENT_DOT: Record<Highlight['accent'], string> = {
  primary: 'bg-primary/15',
  tertiary: 'bg-tertiary/15',
  warning: 'bg-yellow-500/15',
  success: 'bg-green-500/15',
}

function HighlightChip({
  highlight,
  onClick,
}: {
  highlight: Highlight
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border ${ACCENT_BG[highlight.accent]} shrink-0 min-w-[168px] max-w-[220px] active:scale-[0.97] transition-transform text-left`}
    >
      <div className={`w-9 h-9 rounded-full ${ACCENT_DOT[highlight.accent]} flex items-center justify-center shrink-0`}>
        <span className="text-lg leading-none">{highlight.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-label text-[9px] font-bold uppercase tracking-wider leading-tight ${ACCENT_TEXT[highlight.accent]}`}>
          {highlight.kicker}
        </p>
        <p className="font-headline text-xs font-bold text-on-surface truncate leading-tight mt-0.5">
          {highlight.title}
        </p>
      </div>
    </button>
  )
}
