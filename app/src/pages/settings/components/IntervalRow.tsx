import { useAppState, useAppDispatch, updateIntervals } from '../../../contexts/AppContext'
import type { IntervalPreset } from '../constants'
import { mToStr } from '../utils'

interface Props {
  cat: string
  icon: string
  label: string
  presets: IntervalPreset[]
  isOpen: boolean
  onToggle: () => void
  onOpenCustom: (cat: string) => void
  onSaved: () => void
  onError: () => void
}

/**
 * Expandable row to pick a preset or open the custom-interval modal.
 * The parent controls which row is expanded (one-at-a-time behavior).
 */
export default function IntervalRow({
  cat,
  icon,
  label,
  presets,
  isOpen,
  onToggle,
  onOpenCustom,
  onSaved,
  onError,
}: Props) {
  const { baby, intervals } = useAppState()
  const dispatch = useAppDispatch()
  const config = intervals[cat]
  if (!config) return null

  const handlePreset = async (p: IntervalPreset) => {
    if (!baby) return
    const updated = {
      ...intervals,
      [cat]: { ...intervals[cat], minutes: p.minutes, warn: p.warn },
    }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) onSaved()
    else onError()
  }

  return (
    <div className="bg-surface-container rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-surface-container-high transition-colors"
      >
        <span className="material-symbols-outlined text-on-surface-variant text-lg">{icon}</span>
        <span className="flex-1 text-left font-body text-sm text-on-surface">{label}</span>
        <span className="font-label text-sm text-primary font-semibold">{mToStr(config.minutes)}</span>
        <span
          className={`material-symbols-outlined text-on-surface-variant text-base transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-3 animate-fade-in">
          <div className="flex flex-wrap gap-2 mb-2">
            {presets.map((p) => (
              <button
                key={p.minutes}
                onClick={() => handlePreset(p)}
                className={`px-3.5 py-1.5 rounded-md font-label text-sm font-medium transition-colors ${
                  config.minutes === p.minutes
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-variant text-on-surface-variant'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => onOpenCustom(cat)}
            className="flex items-center gap-1.5 py-2.5 px-3.5 rounded-md bg-primary/10 active:bg-primary/20 min-h-[44px]"
          >
            <span className="material-symbols-outlined text-primary text-sm">edit</span>
            <span className="font-label text-xs text-primary font-medium">Personalizar</span>
          </button>
        </div>
      )}
    </div>
  )
}
