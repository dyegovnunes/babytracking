import type { EventType, LogEntry } from '../../types'
import ActivityButton from './ActivityButton'

interface Props {
  events: EventType[]
  logs: LogEntry[]
  onLog: (eventId: string) => void
}

export default function ActivityGrid({ events, logs, onLog }: Props) {
  function getLastLog(eventId: string): LogEntry | undefined {
    return [...logs]
      .filter((l) => l.eventId === eventId)
      .sort((a, b) => b.timestamp - a.timestamp)[0]
  }

  return (
    <section className="px-5">
      <div className="grid grid-cols-3 gap-3">
        {events.map((event) => (
          <ActivityButton
            key={event.id}
            event={event}
            lastLog={getLastLog(event.id)}
            onPress={() => onLog(event.id)}
          />
        ))}
      </div>
    </section>
  )
}
