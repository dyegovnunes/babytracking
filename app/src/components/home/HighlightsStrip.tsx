import { useMemo, useState } from 'react'
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
 * Strip horizontal de destaques para a home.
 *
 * - Se não há highlights ativos, não renderiza nada (libera espaço pro grid).
 * - Cada chip abre um bottom sheet com ações Fechar · Dispensar · Ver mais.
 * - Scroll horizontal sem scrollbar visível.
 */
export default function HighlightsStrip({ highlights, babyName, babyGender, birthDate, onChange }: Props) {
  const [openHighlight, setOpenHighlight] = useState<Highlight | null>(null)

  const visible = useMemo(() => highlights, [highlights])

  if (visible.length === 0) return null

  return (
    <>
      <section className="mt-3">
        <div
          className="flex gap-2 px-5 overflow-x-auto scrollbar-none"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {visible.map((h) => (
            <HighlightChip
              key={`${h.type}_${h.id}`}
              highlight={h}
              onClick={() => {
                hapticLight()
                setOpenHighlight(h)
              }}
            />
          ))}
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
      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${ACCENT_BG[highlight.accent]} shrink-0 min-w-[168px] max-w-[220px] active:scale-[0.97] transition-transform text-left`}
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
