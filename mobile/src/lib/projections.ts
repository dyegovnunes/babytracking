import type { LogEntry, EventType, IntervalConfig, Projection, EventCategory } from '../types'

export function getNextProjection(
  logs: LogEntry[],
  category: EventCategory,
  intervals: Record<string, IntervalConfig>,
  events: EventType[],
): Projection | null {
  const relevant = logs.filter((l) => {
    const event = events.find((e) => e.id === l.eventId)
    return event?.category === category
  })

  if (!relevant.length) return null

  const sorted = [...relevant].sort((a, b) => b.timestamp - a.timestamp)
  const last = sorted[0]
  const interval = intervals[category]
  if (!interval) return null

  const nextTime = new Date(last.timestamp + interval.minutes * 60000)
  const warnTime = new Date(last.timestamp + interval.warn * 60000)
  const now = Date.now()

  const lastEvent = events.find((e) => e.id === last.eventId)

  return {
    label: interval.label,
    time: nextTime,
    isOverdue: nextTime.getTime() < now,
    isWarning: warnTime.getTime() < now && nextTime.getTime() >= now,
    lastEvent: lastEvent?.label ?? '',
    lastTime: new Date(last.timestamp),
  }
}
