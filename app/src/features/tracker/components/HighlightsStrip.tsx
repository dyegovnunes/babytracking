import { useMemo, useState, useRef, useEffect } from 'react'
import type { Highlight } from '../highlights'
import { hapticLight } from '../../../lib/haptics'
import HighlightSheet from './HighlightSheet'

interface Props {
  highlights: Highlight[]
  babyName: string
  babyGender?: 'boy' | 'girl'
  birthDate: string
  /** Chamado quando o usuário dispensa (ou quando "Ver mais" navega) — para forçar recoleta */
  onChange: () => void
}

/** Quando há mais destaques que isto, o strip vira marquee (auto-scroll). */
const MARQUEE_THRESHOLD = 1
/** Pixels por segundo de auto-scroll. */
const MARQUEE_SPEED_PX_PER_SEC = 28
/** Tempo ocioso (ms) antes de retomar o auto-scroll após o usuário interagir. */
const RESUME_IDLE_MS = 2500

/**
 * Seção "Acompanhe a jornada do {name}" — strip horizontal de destaques.
 *
 * - Se não há highlights ativos, não renderiza nada.
 * - ≤ 2 destaques: mostra estaticamente, sem animação.
 * - > 2 destaques: duplica o conteúdo e faz auto-scroll lento para a esquerda
 *   via requestAnimationFrame (mexendo em scrollLeft). Isso convive com o
 *   scroll nativo, então o dedo pode arrastar normalmente a qualquer momento.
 *   Durante a interação o auto-scroll pausa, e retoma após 2.5s ocioso.
 * - Cada chip abre um bottom sheet com ações Fechar · Dispensar · Ver mais.
 */
export default function HighlightsStrip({ highlights, babyName, babyGender, birthDate, onChange }: Props) {
  const [openHighlight, setOpenHighlight] = useState<Highlight | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => highlights, [highlights])
  const shouldMarquee = visible.length > MARQUEE_THRESHOLD

  // Quando temos marquee, duplicamos os itens para permitir loop sem "pulo"
  const items = useMemo(
    () => (shouldMarquee ? [...visible, ...visible] : visible),
    [visible, shouldMarquee],
  )

  // Auto-scroll via requestAnimationFrame (convive com scroll nativo/touch)
  useEffect(() => {
    if (!shouldMarquee) return
    const el = scrollerRef.current
    if (!el) return

    let rafId = 0
    let lastTs = performance.now()
    let paused = false
    let resumeTimer: ReturnType<typeof setTimeout> | null = null
    /**
     * Acumulador fracionário. Em alguns browsers/WebViews, `scrollLeft` só
     * aceita valores inteiros — atribuir 0.3 vira 0 e o marquee fica eternamente
     * parado no 0. Acumulamos os px por fora e só atribuímos quando cruzamos
     * um inteiro.
     */
    let scrollAccum = 0

    const step = (now: number) => {
      const dt = (now - lastTs) / 1000
      lastTs = now
      if (!paused) {
        scrollAccum += MARQUEE_SPEED_PX_PER_SEC * dt
        if (scrollAccum >= 1) {
          const delta = Math.floor(scrollAccum)
          scrollAccum -= delta
          el.scrollLeft += delta
          // Loop seamless: quando passamos metade do conteúdo duplicado, volta
          const half = el.scrollWidth / 2
          if (half > 0 && el.scrollLeft >= half) {
            el.scrollLeft -= half
          }
        }
      }
      rafId = requestAnimationFrame(step)
    }

    const pause = () => {
      paused = true
      if (resumeTimer) clearTimeout(resumeTimer)
    }
    const scheduleResume = () => {
      if (resumeTimer) clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => {
        paused = false
        lastTs = performance.now()
      }, RESUME_IDLE_MS)
    }

    // Pausa em qualquer interação; retoma após idle
    el.addEventListener('touchstart', pause, { passive: true })
    el.addEventListener('touchend', scheduleResume, { passive: true })
    el.addEventListener('touchcancel', scheduleResume, { passive: true })
    el.addEventListener('mouseenter', pause)
    el.addEventListener('mouseleave', scheduleResume)
    el.addEventListener('wheel', () => {
      pause()
      scheduleResume()
    }, { passive: true })

    rafId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(rafId)
      if (resumeTimer) clearTimeout(resumeTimer)
      el.removeEventListener('touchstart', pause)
      el.removeEventListener('touchend', scheduleResume)
      el.removeEventListener('touchcancel', scheduleResume)
      el.removeEventListener('mouseenter', pause)
      el.removeEventListener('mouseleave', scheduleResume)
    }
  }, [shouldMarquee, visible.length])

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
          className="overflow-x-auto overflow-y-hidden scrollbar-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div className="flex gap-2 px-5 w-max py-1">
            {items.map((h, i) => (
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
          .scrollbar-none::-webkit-scrollbar { display: none; }
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
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md border ${ACCENT_BG[highlight.accent]} shrink-0 min-w-[168px] max-w-[220px] active:scale-[0.97] transition-transform text-left`}
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
