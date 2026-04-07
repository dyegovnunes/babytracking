import type { LogEntry, EventType, IntervalConfig, Projection } from '../types'

export interface ProjectionOptions {
  pauseDuringSleep?: boolean
}

/**
 * Get next projection for any category.
 * Options.pauseDuringSleep: if true, returns null for feed/diaper when baby is sleeping.
 */
export function getNextProjection(
  logs: LogEntry[],
  category: string,
  intervals: Record<string, IntervalConfig>,
  events: EventType[],
  options?: ProjectionOptions,
): Projection | null {
  const interval = intervals[category]
  if (!interval) return null

  // Pause feed/diaper projections while baby is sleeping
  if (options?.pauseDuringSleep && (category === 'feed' || category === 'diaper')) {
    if (isBabySleeping(logs, events)) return null
  }

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
 * Check if baby is currently sleeping (last sleep-category event was 'sleep')
 */
function isBabySleeping(logs: LogEntry[], events: EventType[]): boolean {
  const sleepLogs = logs.filter((l) => {
    const event = events.find((e) => e.id === l.eventId)
    return event?.category === 'sleep'
  })
  if (sleepLogs.length === 0) return false

  const sorted = [...sleepLogs].sort((a, b) => b.timestamp - a.timestamp)
  const lastEventType = events.find((e) => e.id === sorted[0].eventId)
  return lastEventType?.id === 'sleep'
}

/**
 * Sleep Nap: triggered by 'sleep' event → predicts when baby should wake up.
 * Only active when baby is currently sleeping.
 */
function getSleepNapProjection(
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
 * Sleep Awake: triggered by 'wake' event → predicts when baby should sleep.
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
 * Bath projection: scheduled mode with nearest-slot matching.
 * Shows next UPCOMING scheduled bath. Skips past missed slots.
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

  // Today's bath logs
  const todayBathLogs = logs.filter((l) => {
    const event = events.find((e) => e.id === l.eventId)
    return event?.id === 'bath' && l.timestamp >= todayStart.getTime()
  })

  const sortedHours = [...hours].sort((a, b) => a - b)

  // Nearest-slot matching: each bath log today matches the closest scheduled slot
  const fulfilledHours = new Set<number>()
  for (const bathLog of todayBathLogs) {
    let nearestHour = sortedHours[0]
    let nearestDiff = Infinity
    for (const hour of sortedHours) {
      if (fulfilledHours.has(hour)) continue // already matched
      const scheduledMs = todayStart.getTime() + hour * 3600000
      const diff = Math.abs(bathLog.timestamp - scheduledMs)
      if (diff < nearestDiff) {
        nearestDiff = diff
        nearestHour = hour
      }
    }
    fulfilledHours.add(nearestHour)
  }

  // Find last bath overall (for display)
  const allBaths = logs.filter((l) => {
    const event = events.find((e) => e.id === l.eventId)
    return event?.id === 'bath'
  })
  const lastBath = allBaths.length > 0
    ? [...allBaths].sort((a, b) => b.timestamp - a.timestamp)[0]
    : null

  // Find next upcoming slot (skip fulfilled and past-missed)
  for (const hour of sortedHours) {
    if (fulfilledHours.has(hour)) continue // already done

    const scheduledTime = new Date(todayStart.getTime() + hour * 3600000)

    // If this slot is in the past and wasn't done, it was missed → skip
    if (scheduledTime.getTime() < now.getTime()) continue

    // Upcoming slot found
    const warnTime = new Date(scheduledTime.getTime() - interval.warn * 60000)
    const hourStr = hour.toString().padStart(2, '0')

    return {
      label: `Banho às ${hourStr}:00`,
      time: scheduledTime,
      isOverdue: false,
      isWarning: warnTime.getTime() < now.getTime(),
      lastEvent: lastBath ? 'Banho' : '',
      lastTime: lastBath ? new Date(lastBath.timestamp) : new Date(),
    }
  }

  // All slots done or missed today → show tomorrow's first
  if (sortedHours.length > 0) {
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 3600000)
    const nextTime = new Date(tomorrowStart.getTime() + sortedHours[0] * 3600000)
    const hourStr = sortedHours[0].toString().padStart(2, '0')

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
