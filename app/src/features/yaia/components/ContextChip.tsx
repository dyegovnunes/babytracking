import type { Baby } from '../../../types'
import { formatAge } from '../../../lib/formatters'

interface ContextChipProps {
  baby: Baby | null
}

export default function ContextChip({ baby }: ContextChipProps) {
  if (!baby?.name) return null
  const ageLabel = formatAge(baby.birthDate)
  return (
    <div className="flex items-center justify-center gap-1.5 py-1">
      <span className="material-symbols-outlined text-[12px] text-on-surface-variant/70">
        sensors
      </span>
      <span className="text-[11px] text-on-surface-variant/80">
        conversando sobre {baby.name}
        {ageLabel ? `, ${ageLabel}` : ''}
      </span>
    </div>
  )
}
