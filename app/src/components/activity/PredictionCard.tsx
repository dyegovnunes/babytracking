import type { Projection } from '../../types'
import { formatTime, timeSince } from '../../lib/formatters'

interface Props {
  projection: Projection
}

export default function PredictionCard({ projection }: Props) {
  const statusColor = projection.isOverdue
    ? 'text-error'
    : projection.isWarning
      ? 'text-tertiary'
      : 'text-primary'

  const statusBg = projection.isOverdue
    ? 'bg-error/10'
    : projection.isWarning
      ? 'bg-tertiary/10'
      : 'bg-primary/10'

  const statusLabel = projection.isOverdue
    ? 'Atrasado'
    : projection.isWarning
      ? 'Em breve'
      : formatTime(projection.time)

  return (
    <div className={`${statusBg} rounded-lg p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusBg}`}>
        <span className={`material-symbols-outlined text-xl ${statusColor}`}>
          schedule
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-label text-xs text-on-surface-variant capitalize">
          {projection.label}
        </p>
        <p className={`font-headline text-sm font-bold ${statusColor}`}>
          {statusLabel}
        </p>
      </div>
      <div className="text-right">
        <p className="font-label text-[10px] text-on-surface-variant">
          Último: {projection.lastEvent}
        </p>
        <p className="font-label text-[10px] text-on-surface-variant">
          {timeSince(projection.lastTime.getTime())}
        </p>
      </div>
    </div>
  )
}
