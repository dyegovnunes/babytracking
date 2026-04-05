import { useMemo } from 'react'
import type { LogEntry } from '../types'

export interface DaySummary {
  feeds: number
  diapers: number
  sleepCycles: number
  totalBottleMl: number
  totalSleepMinutes: number
}

export interface FeedingPattern {
  avgIntervalMinutes: number
  totalBottleMl: number
  breastCount: number
  bottleCount: number
}

export interface SleepPattern {
  totalMinutes: number
  napCount: number
  avgNapMinutes: number
  longestNapMinutes: number
}

export interface DayTrend {
  date: string
  label: string
  feeds: number
  diapers: number
  sleepMinutes: number
  bottleMl: number
}

export interface InsightsData {
  todaySummary: DaySummary
  feedingPattern: FeedingPattern
  sleepPattern: SleepPattern
  weekTrends: DayTrend[]
}

const FEED_IDS = new Set(['breast_left', 'breast_right', 'breast_both', 'bottle'])
const BREAST_IDS = new Set(['breast_left', 'breast_right', 'breast_both'])
const DIAPER_IDS = new Set(['diaper_wet', 'diaper_dirty'])

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function computeSleepPairs(logs: LogEntry[]): { start: number; end: number }[] {
  const sorted = [...logs]
    .filter((l) => l.eventId === 'sleep' || l.eventId === 'wake')
    .sort((a, b) => a.timestamp - b.timestamp)

  const pairs: { start: number; end: number }[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventId === 'sleep') {
      const wake = sorted.slice(i + 1).find((l) => l.eventId === 'wake')
      pairs.push({
        start: sorted[i].timestamp,
        end: wake ? wake.timestamp : Date.now(),
      })
    }
  }
  return pairs
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
}

export function useInsights(logs: LogEntry[]): InsightsData {
  return useMemo(() => {
    const now = Date.now()
    const todayStart = startOfDay(now)
    const todayLogs = logs.filter((l) => l.timestamp >= todayStart)

    // Today summary
    const todayFeeds = todayLogs.filter((l) => FEED_IDS.has(l.eventId))
    const todayDiapers = todayLogs.filter((l) => DIAPER_IDS.has(l.eventId))
    const todaySleepPairs = computeSleepPairs(todayLogs)
    const todayBottleMl = todayLogs
      .filter((l) => l.eventId === 'bottle')
      .reduce((sum, l) => sum + (l.ml ?? 0), 0)
    const todaySleepMinutes = todaySleepPairs.reduce(
      (sum, p) => sum + (p.end - p.start) / 60000,
      0,
    )

    const todaySummary: DaySummary = {
      feeds: todayFeeds.length,
      diapers: todayDiapers.length,
      sleepCycles: todaySleepPairs.length,
      totalBottleMl: todayBottleMl,
      totalSleepMinutes: Math.round(todaySleepMinutes),
    }

    // Feeding pattern (last 24h for better accuracy)
    const last24h = logs.filter((l) => l.timestamp >= now - 86400000)
    const feedsLast24h = last24h
      .filter((l) => FEED_IDS.has(l.eventId))
      .sort((a, b) => a.timestamp - b.timestamp)

    let avgIntervalMinutes = 0
    if (feedsLast24h.length >= 2) {
      const intervals: number[] = []
      for (let i = 1; i < feedsLast24h.length; i++) {
        intervals.push((feedsLast24h[i].timestamp - feedsLast24h[i - 1].timestamp) / 60000)
      }
      avgIntervalMinutes = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length)
    }

    const feedingPattern: FeedingPattern = {
      avgIntervalMinutes,
      totalBottleMl: todayBottleMl,
      breastCount: todayFeeds.filter((l) => BREAST_IDS.has(l.eventId)).length,
      bottleCount: todayFeeds.filter((l) => l.eventId === 'bottle').length,
    }

    // Sleep pattern
    const sleepPairs = computeSleepPairs(todayLogs)
    const napDurations = sleepPairs.map((p) => (p.end - p.start) / 60000)

    const sleepPattern: SleepPattern = {
      totalMinutes: Math.round(napDurations.reduce((a, b) => a + b, 0)),
      napCount: sleepPairs.length,
      avgNapMinutes: napDurations.length > 0
        ? Math.round(napDurations.reduce((a, b) => a + b, 0) / napDurations.length)
        : 0,
      longestNapMinutes: napDurations.length > 0
        ? Math.round(Math.max(...napDurations))
        : 0,
    }

    // Week trends
    const weekTrends: DayTrend[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(now - i * 86400000)
      const dayEnd = dayStart + 86400000
      const dateStr = new Date(dayStart).toISOString().slice(0, 10)
      const dayLogs = logs.filter((l) => l.timestamp >= dayStart && l.timestamp < dayEnd)
      const daySleepPairs = computeSleepPairs(dayLogs)

      weekTrends.push({
        date: dateStr,
        label: getDayLabel(dateStr),
        feeds: dayLogs.filter((l) => FEED_IDS.has(l.eventId)).length,
        diapers: dayLogs.filter((l) => DIAPER_IDS.has(l.eventId)).length,
        sleepMinutes: Math.round(
          daySleepPairs.reduce((sum, p) => sum + (p.end - p.start) / 60000, 0),
        ),
        bottleMl: dayLogs
          .filter((l) => l.eventId === 'bottle')
          .reduce((sum, l) => sum + (l.ml ?? 0), 0),
      })
    }

    return { todaySummary, feedingPattern, sleepPattern, weekTrends }
  }, [logs])
}
