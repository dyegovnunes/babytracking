import type { LogEntry } from '../../types'
import { DEFAULT_EVENTS } from '../../lib/constants'
import { formatTime } from '../../lib/formatters'

interface Props {
  log: LogEntry
  onEdit: (log: LogEntry) => void
}

const dotColorMap: Record<string, string> = {
  tertiary: 'bg-tertiary',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
}

const iconBgMap: Record<string, string> = {
  tertiary: 'bg-tertiary/15 text-tertiary',
  primary: 'bg-primary/15 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
}

export default function TimelineEntry({ log, onEdit }: Props) {
  const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
  if (!event) return null

  const dotColor = dotColorMap[event.color] ?? 'bg-primary'
  const iconBg = iconBgMap[event.color] ?? 'bg-primary/15 text-primary'

  return (
    <button
      onClick={() => onEdit(log)}
      className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-lg bg-surface-container active:bg-surface-container-high transition-colors"
    >
      <div className="flex flex-col items-center gap-1 w-10 shrink-0">
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          {formatTime(new Date(log.timestamp))}
        </span>
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      </div>

      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {event.emoji ? (
          <span className="text-lg leading-none">{event.emoji}</span>
        ) : (
          <span className="material-symbols-outlined text-lg">
            {event.icon}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-on-surface">
          {event.label}
        </p>
        {log.ml && (
          <p className="font-label text-xs text-primary">{log.ml} ml</p>
        )}
        {log.notes && (
          <p className="font-label text-xs text-on-surface-variant truncate">{log.notes}</p>
        )}
      </div>

      <span className="material-symbols-outlined text-on-surface-variant/50 text-base">
        edit
      </span>
    </button>
  )
}
