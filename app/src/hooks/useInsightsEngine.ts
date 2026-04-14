import { useMemo } from 'react'
import type { LogEntry } from '../types'
import type { AgeBand } from '../lib/ageUtils'
import { getAgeBand } from '../lib/ageUtils'
import { getLocalDateString } from '../lib/formatters'
import {
  generateInsights,
  filterRecentlyUnseen,
  type InsightResult,
} from '../lib/insightRules'

export type PeriodOption =
  | 'today'
  | 'last_7'
  | 'last_15'
  | 'last_30'
  | 'current_month'
  | 'last_month'
  | 'all'

export interface PeriodSummary {
  feeds: number
  diapers: number
  sleepCycles: number
  totalBottleMl: number
  totalSleepMinutes: number
  isAverage: boolean
  periodLabel: string
  lastFeedTime?: number
  lastSleepTime?: number
  lastDiaperTime?: number
}

export interface DayTrend {
  date: string
  label: string
  feeds: number
  diapers: number
  sleepMinutes: number
  bottleMl: number
}

const FEED_IDS = new Set(['breast_left', 'breast_right', 'breast_both', 'bottle'])
const DIAPER_IDS = new Set(['diaper_wet', 'diaper_dirty'])
const SLEEP_EVENT_IDS = new Set(['sleep', 'wake', 'sleep_nap', 'sleep_awake'])

export const PERIOD_LABELS: Record<PeriodOption, string> = {
  today: 'Hoje',
  last_7: 'Últimos 7 dias',
  last_15: 'Últimos 15 dias',
  last_30: 'Últimos 30 dias',
  current_month: 'Mês atual',
  last_month: 'Mês passado',
  all: 'Tudo',
}

export const ALL_PERIODS: PeriodOption[] = [
  'today',
  'last_7',
  'last_15',
  'last_30',
  'current_month',
  'last_month',
  'all',
]

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function getPeriodRange(period: PeriodOption): { start: number; end: number } {
  const now = Date.now()
  const today = startOfDay(now)

  switch (period) {
    case 'today':
      return { start: today, end: now }
    case 'last_7':
      return { start: today - 6 * 86400000, end: now }
    case 'last_15':
      return { start: today - 14 * 86400000, end: now }
    case 'last_30':
      return { start: today - 29 * 86400000, end: now }
    case 'current_month': {
      const d = new Date()
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      return { start: d.getTime(), end: now }
    }
    case 'last_month': {
      const d = new Date()
      d.setMonth(d.getMonth() - 1)
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      return { start: d.getTime(), end: end.getTime() }
    }
    case 'all':
      return { start: 0, end: now }
    default:
      return { start: today, end: now }
  }
}

function computeSleepPairs(logs: LogEntry[]): { start: number; end: number }[] {
  const pairs: { start: number; end: number }[] = []

  // Logs com duration (nap registrado com tempo)
  logs
    .filter((l) => l.eventId.startsWith('sleep') && l.duration && l.duration > 0)
    .forEach((l) => {
      pairs.push({ start: l.timestamp - l.duration! * 60000, end: l.timestamp })
    })

  // Pares sleep → wake
  const sorted = [...logs]
    .filter((l) => SLEEP_EVENT_IDS.has(l.eventId))
    .sort((a, b) => a.timestamp - b.timestamp)
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]
    if (cur.eventId === 'sleep' || cur.eventId === 'sleep_nap') {
      if (cur.duration && cur.duration > 0) continue
      const wake = sorted
        .slice(i + 1)
        .find((l) => l.eventId === 'wake' || l.eventId === 'sleep_awake')
      pairs.push({
        start: cur.timestamp,
        end: wake ? wake.timestamp : Date.now(),
      })
    }
  }
  return pairs
}

export function getAvailablePeriods(logs: LogEntry[]): PeriodOption[] {
  const available: PeriodOption[] = []
  for (const period of ALL_PERIODS) {
    const { start, end } = getPeriodRange(period)
    const periodLogs = logs.filter((l) => l.timestamp >= start && l.timestamp <= end)
    const uniqueDays = new Set(
      periodLogs.map((l) => getLocalDateString(new Date(l.timestamp)))
    )

    // Regras de disponibilidade baseadas em dias mínimos com dados
    const minDays: Record<PeriodOption, number> = {
      today: 1,
      last_7: 1,
      last_15: 2,
      last_30: 5,
      current_month: 1,
      last_month: 1,
      all: 1,
    }

    if (uniqueDays.size >= minDays[period]) available.push(period)
  }
  return available
}

export function useInsightsEngine(
  logs: LogEntry[],
  birthDate: string | undefined,
  period: PeriodOption
) {
  return useMemo(() => {
    const band: AgeBand = birthDate ? getAgeBand(birthDate) : 'beyond'
    const { start, end } = getPeriodRange(period)
    const periodLogs = logs.filter((l) => l.timestamp >= start && l.timestamp <= end)
    const isToday = period === 'today'

    // Count unique days in period (timezone-safe)
    const uniqueDays = new Set(
      periodLogs.map((l) => getLocalDateString(new Date(l.timestamp)))
    ).size
    const divisor = isToday ? 1 : Math.max(uniqueDays, 1)

    const feeds = periodLogs.filter((l) => FEED_IDS.has(l.eventId))
    const diapers = periodLogs.filter((l) => DIAPER_IDS.has(l.eventId))
    const sleepPairs = computeSleepPairs(periodLogs)
    const totalSleepMin = sleepPairs.reduce(
      (s, p) => s + (p.end - p.start) / 60000,
      0
    )
    const totalBottleMl = periodLogs
      .filter((l) => l.eventId === 'bottle')
      .reduce((s, l) => s + (l.ml ?? 0), 0)

    const lastFeed = isToday
      ? feeds.sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
      : undefined
    const lastDiaper = isToday
      ? diapers.sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
      : undefined
    const sleepWake = isToday
      ? periodLogs
          .filter((l) => SLEEP_EVENT_IDS.has(l.eventId))
          .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
      : undefined

    const periodSummary: PeriodSummary = {
      feeds: isToday ? feeds.length : Math.round((feeds.length / divisor) * 10) / 10,
      diapers: isToday
        ? diapers.length
        : Math.round((diapers.length / divisor) * 10) / 10,
      sleepCycles: isToday
        ? sleepPairs.length
        : Math.round((sleepPairs.length / divisor) * 10) / 10,
      totalBottleMl: isToday
        ? Math.round(totalBottleMl)
        : Math.round(totalBottleMl / divisor),
      totalSleepMinutes: isToday
        ? Math.round(totalSleepMin)
        : Math.round(totalSleepMin / divisor),
      isAverage: !isToday,
      periodLabel: PERIOD_LABELS[period],
      lastFeedTime: lastFeed,
      lastSleepTime: sleepWake,
      lastDiaperTime: lastDiaper,
    }

    // Insights (calculated over a window matching period, but always see full log history for pattern detection)
    const periodDaysNum =
      period === 'today'
        ? 1
        : period === 'last_7'
        ? 7
        : period === 'last_15'
        ? 15
        : period === 'last_30'
        ? 30
        : period === 'current_month' || period === 'last_month'
        ? 30
        : 90
    const rawInsights: InsightResult[] = generateInsights(logs, band, periodDaysNum)
    // Remove insights vistos nas últimas 48h (exceto alerts)
    const insights = filterRecentlyUnseen(rawInsights)

    // Week trends — sempre últimos 7 dias
    const weekTrends: DayTrend[] = []
    const now = Date.now()
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(now - i * 86400000)
      const dayEnd = dayStart + 86400000
      const dayLogs = logs.filter(
        (l) => l.timestamp >= dayStart && l.timestamp < dayEnd
      )
      const daySleepPairs = computeSleepPairs(dayLogs)
      weekTrends.push({
        date: getLocalDateString(new Date(dayStart)),
        label: new Date(dayStart)
          .toLocaleDateString('pt-BR', { weekday: 'short' })
          .replace('.', ''),
        feeds: dayLogs.filter((l) => FEED_IDS.has(l.eventId)).length,
        diapers: dayLogs.filter((l) => DIAPER_IDS.has(l.eventId)).length,
        sleepMinutes: Math.round(
          daySleepPairs.reduce((s, p) => s + (p.end - p.start) / 60000, 0)
        ),
        bottleMl: dayLogs
          .filter((l) => l.eventId === 'bottle')
          .reduce((s, l) => s + (l.ml ?? 0), 0),
      })
    }

    const availablePeriods = getAvailablePeriods(logs)

    return { periodSummary, insights, weekTrends, availablePeriods }
  }, [logs, birthDate, period])
}
