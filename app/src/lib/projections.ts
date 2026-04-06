import type { LogEntry, EventType, IntervalConfig, Projection } from '../types'

/**
 * Get next projection for interval-based categories (feed, diaper, sleep_nap, sleep_awake)
 */
export function getNextProjection(
  logs: LogEntry[],
  category: string,
  intervals: Record<string, IntervalConfig>,
  events: EventType[],
): Projection | null {
  const interval = intervals[category]
  if (!interval) return null

  // Bath uses scheduled mode
  if (interval.mode === 'scheduled') {
    return getBathProjection(logs, interval, events)
  }

  // Sleep categories need special handling
  if (category === 'sleep_nap') {
    return getSleepNapProjection(logs, interval, events)
  }
  if (category === 'sleep_awake') {
    return getSleepAwakeProjection(logs, interval, events)
  }

  // Standard interval-based projection (feed, diaper)
  const eventCategory = category === 'feed' ? 'feed' : category === 'diaper' ? 'diaper' : category
  const relevant = logs.filter((l) => {
    const event = events.find((e) => e.id === l.eventId)
    return event?.category === eventCategory
  })

  if (!relevant.length) return null

  const sorted = [...relevant].sort((a, b) => b.timestamp - a.timestamp)
  const last = sorted[0]

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

/**
 * Sleep Nap projection: triggered when baby falls asleep (event 'sleep')
 * Predicts when baby should wake up.
 * Only active when baby is currently sleeping.
 */
function getSleepNapProjection(
  logs: LogEntry[],
  interval: IntervalConfig,
  events: EventType[],
): Projection | null {
  // Get all sleep-category events
  const sleepEvents = logs.filter((l) => {
    const event = events.find((e) => e.id === l.eventId)
    return event?.category === 'sleep'
  })

  if (!sleepEvents.length) return null

  const sorted = [...sleepEvents].sort((a, b) => b.timestamp - a.timestamp)
  const lastEvent = sorted[0]
  const lastEventType = events.find((e) => e.id === lastEvent.eventId)

  // Only show nap projection if baby is currently sleeping (last event was 'sleep'/'dormiu')
  if (lastEventType?.id !== 'sleep') return null

  const nextTime = new Date(lastEvent.timestamp + interval.minutes * 60000)
  const warnTime = new Date(lastEvent.timestamp + interval.warn * 60000)
  const now = Date.now()

  return {
    label: interval.label,
    time: nextTime,
    isOverdue: nextTime.getTime() < now,
    isWarning: warnTime.getTime() < now && nextTime.getTime() >= now,
    lastEvent: 'Dormiu',
    lastTime: new Date(lastEvent.timestamp),
  }
}

/**
 * Sleep Awake projection: triggered when baby wakes up (event 'wake')
 * Predicts when baby should go to sleep next.
 * Only active when baby is currently awake.
 */
function getSleepAwakeProjection(
  logs: LogEntry[],
  interval: IntervalConfig,
  events: EventType[],
): Projection | null {
  const sleepEvents = logs.filter((l) => {
    const event = events.find((e) => e.id === l.eventId)
    return event?.category === 'sleep'
  })

  if (!sleepEvents.length) return null

  const sorted = [...sleepEvents].sort((a, b) => b.timestamp - a.timestamp)
  const lastEvent = sorted[0]
  const lastEventType = events.find((e) => e.id === lastEvent.eventId)

  // Only show awake projection if baby is currently awake (last event was 'wake'/'acordou')
  if (lastEventType?.id !== 'wake') return null

  const nextTime = new Date(lastEvent.timestamp + interval.minutes * 60000)
  const warnTime = new Date(lastEvent.timestamp + interval.warn * 60000)
  const now = Date.now()

  return {
    label: interval.label,
    time: nextTime,
    isOverdue: nextTime.getTime() < now,
    isWarning: warnTime.getTime() < now && nextTime.getTime() >= now,
    lastEvent: 'Acordou',
    lastTime: new Date(lastEvent.timestamp),
  }
}

/**
 * Bath projection: scheduled mode
 * Shows next scheduled bath time. Warns `warn` minutes before.
 */
function getBathProjection(
  logs: LogEntry[],
  interval: IntervalConfig,
  events: EventType[],
): Projection | null {
  const hours = interval.scheduledHours
  if (!hours || hours.length === 0) return null

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Check which baths were already done today
  const todayBathLogs = logs.filter((l) => {
    const event = events.find((e) => e.id === l.eventId)
    return event?.id === 'bath' && l.timestamp >= todayStart.getTime()
  })

  // Find next upcoming scheduled time
  const sortedHours = [...hours].sort((a, b) => a - b)

  for (const hour of sortedHours) {
    const scheduledTime = new Date(todayStart.getTime() + hour * 60 * 60000)

    // Check if this time slot already had a bath (within 1 hour window)
    const alreadyDone = todayBathLogs.some((l) => {
      const diff = Math.abs(l.timestamp - scheduledTime.getTime())
      return diff < 60 * 60000 // within 1 hour
    })

    if (alreadyDone) continue

    // If this time is still upcoming (or recently passed)
    const warnTime = new Date(scheduledTime.getTime() - interval.warn * 60000)

    // Find last bath overall
    const allBaths = logs.filter((l) => {
      const event = events.find((e) => e.id === l.eventId)
      return event?.id === 'bath'
    })
    const lastBath = allBaths.length > 0
      ? [...allBaths].sort((a, b) => b.timestamp - a.timestamp)[0]
      : null

    // Format the scheduled time for label
    const hourStr = hour.toString().padStart(2, '0')
    const label = `Banho às ${hourStr}:00`

    return {
      label,
      time: scheduledTime,
      isOverdue: scheduledTime.getTime() < now.getTime(),
      isWarning: warnTime.getTime() < now.getTime() && scheduledTime.getTime() >= now.getTime(),
      lastEvent: lastBath ? 'Banho' : '',
      lastTime: lastBath ? new Date(lastBath.timestamp) : new Date(),
    }
  }

  // All baths done today - show tomorrow's first
  if (sortedHours.length > 0) {
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60000)
    const nextTime = new Date(tomorrowStart.getTime() + sortedHours[0] * 60 * 60000)
    const hourStr = sortedHours[0].toString().padStart(2, '0')

    const allBaths = logs.filter((l) => {
      const event = events.find((e) => e.id === l.eventId)
      return event?.id === 'bath'
    })
    const lastBath = allBaths.length > 0
      ? [...allBaths].sort((a, b) => b.timestamp - a.timestamp)[0]
      : null

    return {
      label: `Banho às ${hourStr}:00 (amanhã)`,
      time: nextTime,
      isOverdue: false,
      isWarning: false,
      lastEvent: lastBath ? 'Banho' : '',
      lastTime: lastBath ? new Date(lastBath.timestamp) : new Date(),
    }
  }

  return null
}
