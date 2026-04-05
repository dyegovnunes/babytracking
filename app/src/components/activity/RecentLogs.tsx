import { Link } from 'react-router-dom'
import type { LogEntry } from '../../types'
import { DEFAULT_EVENTS } from '../../lib/constants'
import { formatTime } from '../../lib/formatters'

interface Props {
  logs: LogEntry[]
}

const dotColorMap: Record<string, string> = {
  tertiary: 'bg-tertiary',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
}

export default function RecentLogs({ logs }: Props) {
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

          return (
            <div
              key={log.id}
              className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-surface-container"
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
              <span className="material-symbols-outlined text-on-surface-variant text-base">
                {event.icon}
              </span>
              <span className="flex-1 font-body text-sm text-on-surface">
                {event.label}
                {log.ml ? ` — ${log.ml}ml` : ''}
              </span>
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
