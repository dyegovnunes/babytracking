import { useNavigate } from 'react-router-dom'
import type { MedicationLog, Medication } from '../../medications/medicationData'
import { formatTime } from '../../../lib/formatters'
import { hapticLight } from '../../../lib/haptics'

interface Props {
  log: MedicationLog
  medication: Medication
}

/**
 * Row de dose de medicamento administrada. Borda lateral laranja sinaliza
 * a categoria. Tap navega pra `/medicamentos`.
 */
export default function MedicationRow({ log, medication }: Props) {
  const navigate = useNavigate()
  const ts = new Date(log.administeredAt)

  const handleClick = () => {
    hapticLight()
    navigate('/medicamentos')
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full text-left py-3 pl-3 pr-4 rounded-md bg-surface-container border-l-4 border-amber-500 active:bg-surface-container-high transition-colors"
    >
      <div className="flex flex-col items-center gap-1 w-10 shrink-0">
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          {formatTime(ts)}
        </span>
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
      </div>

      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-amber-500/15 text-amber-400">
        <span className="material-symbols-outlined text-lg">medication</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-on-surface truncate">
          {medication.name}
        </p>
        <p className="font-label text-xs text-on-surface-variant truncate">
          {medication.dosage}
        </p>
        {log.notes && (
          <p className="font-label text-xs text-on-surface-variant truncate">
            {log.notes}
          </p>
        )}
      </div>

      <span className="material-symbols-outlined text-on-surface-variant/50 text-base">
        chevron_right
      </span>
    </button>
  )
}
