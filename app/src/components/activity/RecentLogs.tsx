import { Link } from 'react-router-dom'
import type { LogEntry, Member } from '../../types'
import { DEFAULT_EVENTS } from '../../lib/constants'
import { formatTime } from '../../lib/formatters'

interface Props {
  logs: LogEntry[]
  members: Record<string, Member>
  onEdit?: (log: LogEntry) => void
}

const dotColorMap: Record<string, string> = {
  tertiary: 'bg-tertiary',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
}

export default function RecentLogs({ logs, members, onEdit }: Props) {
  const recent = [...logs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

  if (recent.length === 0) {
    return (
      <section className="px-5 mt-6">
        <p className="text-center text-on-surface-variant font-label text-sm py-8">
          Nenhum registro ainda. Toque nos botões acima para começar.
        </p>
      </section>
    )
  }

  return (
    <section className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-headline text-base font-bold text-on-surface">
          Últimos registros
        </h2>
        <Link
          to="/history"
          className="font-label text-xs text-primary font-medium"
        >
          Ver tudo →
        </Link>
      </div>

      <div className="space-y-1">
        {recent.map((log) => {
          const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
          if (!event) return null
          const dotColor = dotColorMap[event.color] ?? 'bg-primary'

          const memberName = log.createdBy ? members[log.createdBy]?.displayName : undefined

          return (
            <div
              key={log.id}
              onClick={() => onEdit?.(log)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-lg bg-surface-container${onEdit ? ' cursor-pointer active:bg-surface-container-high transition-colors' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
              {event.emoji ? (
                <span className="text-base leading-none">{event.emoji}</span>
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant text-base">
                  {event.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <span className="font-body text-sm text-on-surface">
                  {event.label}
                  {log.ml ? ` — ${log.ml}ml` : ''}
                </span>
                {memberName && (
                  <p className="font-label text-[10px] text-on-surface-variant truncate">
                    por {memberName}
                  </p>
                )}
              </div>
              <span className="font-label text-xs text-on-surface-variant">
                {formatTime(new Date(log.timestamp))}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
