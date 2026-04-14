import { useState, useRef, useEffect } from 'react'
import { hapticLight } from '../../lib/haptics'
import { ALL_PERIODS, PERIOD_LABELS, type PeriodOption } from '../../hooks/useInsightsEngine'

interface Props {
  selected: PeriodOption
  available: PeriodOption[]
  onChange: (period: PeriodOption) => void
}

export default function PeriodDropdown({ selected, available, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          hapticLight()
          setOpen(!open)
        }}
        className="flex items-center gap-1.5 bg-white/[0.06] rounded-xl px-3 py-2 font-label text-xs font-semibold text-on-surface-variant active:scale-95 transition-transform"
      >
        {PERIOD_LABELS[selected]}
        <span className="material-symbols-outlined text-sm">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#0d0a27] rounded-xl border border-white/10 shadow-xl z-30 min-w-[180px] overflow-hidden">
          {ALL_PERIODS.map((p) => {
            const isAvailable = available.includes(p)
            const isSelected = p === selected
            return (
              <button
                key={p}
                type="button"
                disabled={!isAvailable}
                onClick={() => {
                  if (!isAvailable) return
                  hapticLight()
                  onChange(p)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 font-label text-sm transition-colors ${
                  isSelected
                    ? 'bg-primary/15 text-primary font-semibold'
                    : isAvailable
                    ? 'text-on-surface hover:bg-white/[0.04]'
                    : 'text-on-surface-variant/30 cursor-not-allowed'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
