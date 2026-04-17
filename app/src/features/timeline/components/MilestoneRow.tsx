import { useNavigate } from 'react-router-dom'
import type { BabyMilestone } from '../../milestones/milestoneData'
import { formatTime } from '../../../lib/formatters'
import { hapticLight } from '../../../lib/haptics'

interface Props {
  milestone: BabyMilestone
  displayName: string
}

/**
 * Row de marco atingido. Borda lateral roxa (primary) sinaliza a categoria.
 * Tap navega pra `/marcos`.
 */
export default function MilestoneRow({ milestone, displayName }: Props) {
  const navigate = useNavigate()
  const ts = milestone.achievedAt ? new Date(milestone.achievedAt) : null

  const handleClick = () => {
    hapticLight()
    navigate('/marcos')
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 w-full text-left py-3 pl-3 pr-4 rounded-md bg-surface-container border-l-4 border-primary active:bg-surface-container-high transition-colors"
    >
      <div className="flex flex-col items-center gap-1 w-10 shrink-0">
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          {ts ? formatTime(ts) : '—'}
        </span>
        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
      </div>

      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-primary/15 text-primary">
        <span className="material-symbols-outlined text-lg">celebration</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-on-surface truncate">
          {displayName}
        </p>
        {milestone.note && (
          <p className="font-label text-xs text-on-surface-variant truncate">
            {milestone.note}
          </p>
        )}
      </div>

      <span className="material-symbols-outlined text-on-surface-variant/50 text-base">
        chevron_right
      </span>
    </button>
  )
}
