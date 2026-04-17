import { useNavigate } from 'react-router-dom'
import type { BabyVaccine } from '../../vaccines/vaccineData'
import { formatTime } from '../../../lib/formatters'
import { hapticLight } from '../../../lib/haptics'
import TimelinePill from './TimelinePill'

interface Props {
  vaccine: BabyVaccine
  displayName: string
}

/**
 * Row de vacina aplicada. Tap navega pra `/vacinas` (não edita inline —
 * vacina é gerida na feature).
 */
export default function VaccineRow({ vaccine, displayName }: Props) {
  const navigate = useNavigate()
  const ts = vaccine.appliedAt ? new Date(vaccine.appliedAt) : null

  const handleClick = () => {
    hapticLight()
    navigate('/vacinas')
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-md bg-surface-container active:bg-surface-container-high transition-colors"
    >
      <div className="flex flex-col items-center gap-1 w-10 shrink-0">
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          {ts ? formatTime(ts) : '—'}
        </span>
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
      </div>

      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-blue-500/15 text-blue-400">
        <span className="material-symbols-outlined text-lg">vaccines</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <TimelinePill variant="vaccine">Vacina</TimelinePill>
        </div>
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
