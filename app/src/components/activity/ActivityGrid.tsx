import { useMemo } from 'react'
import type { EventType, LogEntry } from '../../types'
import ActivityButton from './ActivityButton'

interface Props {
  events: EventType[]
  logs: LogEntry[]
  onLog: (eventId: string) => void
}

export default function ActivityGrid({ events, logs, onLog }: Props) {
  const { lastLogByEvent, mostRecentEventId, breastLeftLog, breastRightLog } = useMemo(() => {
    const byEvent: Record<string, LogEntry> = {}
    let mostRecent: LogEntry | undefined

    for (const log of logs) {
      const existing = byEvent[log.eventId]
      if (!existing || log.timestamp > existing.timestamp) {
        byEvent[log.eventId] = log
      }
      if (!mostRecent || log.timestamp > mostRecent.timestamp) {
        mostRecent = log
      }
    }

    return {
      lastLogByEvent: byEvent,
      mostRecentEventId: mostRecent?.eventId,
      breastLeftLog: byEvent['breast_left'],
      breastRightLog: byEvent['breast_right'],
    }
  }, [logs])

  function getBothBreastsLog(eventId: string): LogEntry | undefined {
    if (eventId === 'breast_left') return breastRightLog
    if (eventId === 'breast_right') return breastLeftLog
    return undefined
  }

  return (
    <section className="px-5">
      <div className="grid grid-cols-3 gap-3">
        {events.map((event) => (
          <ActivityButton
            key={event.id}
            event={event}
            lastLog={lastLogByEvent[event.id]}
            onPress={() => onLog(event.id)}
            isMostRecent={event.id === mostRecentEventId}
            bothBreastsLog={getBothBreastsLog(event.id)}
          />
        ))}
      </div>
    </section>
  )
}
