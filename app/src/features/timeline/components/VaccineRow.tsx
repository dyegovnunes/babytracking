import type { BabyVaccine } from '../../vaccines/vaccineData'
import { formatTime } from '../../../lib/formatters'
import { hapticLight } from '../../../lib/haptics'

interface Props {
  vaccine: BabyVaccine
  displayName: string
  /** Click handler — parent monta a sheet leve (VaccineTimelineSheet). */
  onClick?: (vaccine: BabyVaccine) => void
}

/**
 * Row de vacina aplicada. Borda lateral azul sinaliza a categoria "saúde".
 * Tap chama callback que abre a sheet leve (info + ações rápidas) sem navegar.
 */
export default function VaccineRow({ vaccine, displayName, onClick }: Props) {
  // applied_at agora é TIMESTAMPTZ (hora preservada do click real).
  const ts = vaccine.appliedAt ? new Date(vaccine.appliedAt) : new Date(vaccine.createdAt)

  const handleClick = () => {
    if (!onClick) return
    hapticLight()
    onClick(vaccine)
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full text-left py-3 pl-3 pr-4 rounded-md bg-surface-container border-l-4 border-blue-500 active:bg-surface-container-high transition-colors"
    >
      <div className="flex flex-col items-center gap-1 w-10 shrink-0">
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          {formatTime(ts)}
        </span>
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
      </div>

      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-500/15 text-blue-400">
        <span className="material-symbols-outlined text-lg">vaccines</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-on-surface truncate">
          {displayName}
        </p>
        {vaccine.location && (
          <p className="font-label text-xs text-on-surface-variant truncate">
            {vaccine.location}
          </p>
        )}
      </div>

      <span className="material-symbols-outlined text-on-surface-variant/50 text-base">
        chevron_right
      </span>
    </button>
  )
}
