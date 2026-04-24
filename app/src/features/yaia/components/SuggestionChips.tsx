import { hapticLight } from '../../../lib/haptics'

interface SuggestionChipsProps {
  suggestions: string[]
  disabled?: boolean
  onPick: (value: string) => void
}

export default function SuggestionChips({ suggestions, disabled, onPick }: SuggestionChipsProps) {
  if (!suggestions.length) return null
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {suggestions.map((s) => (
        <button
          key={s}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (disabled) return
            hapticLight()
            onPick(s)
          }}
          className="text-left text-[12px] rounded-full bg-primary/10 text-primary px-3 py-1.5 hover:bg-primary/15 active:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {s}
        </button>
      ))}
    </div>
  )
}
