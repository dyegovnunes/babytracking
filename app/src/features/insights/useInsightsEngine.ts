import { useMemo } from 'react'
import type { LogEntry } from '../../types'
import type { AgeBand } from '../../lib/ageUtils'
import { getAgeBand } from '../../lib/ageUtils'
import { getLocalDateString } from '../../lib/formatters'
import {
  generateInsights,
  type InsightResult,
  type InsightContext,
} from './insightRules'

export type PeriodOption =
  | 'today'
  | 'yesterday'
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
  yesterday: 'Ontem',
  last_7: 'Últimos 7 dias',
  last_15: 'Últimos 15 dias',
  last_30: 'Últimos 30 dias',
  current_month: 'Mês atual',
  last_month: 'Mês passado',
  all: 'Tudo',
}

export const ALL_PERIODS: PeriodOption[] = [
  'today',
  'yesterday',
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
    case 'yesterday':
      return { start: today - 86400000, end: today - 1 }
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

  // Logs com duration explícita (sonecas pré-registradas com tempo)
  logs
    .filter(
      (l) =>
        (l.eventId === 'sleep' || l.eventId === 'sleep_nap') &&
        typeof l.duration === 'number' &&
        l.duration > 0,
    )
    .forEach((l) => {
      pairs.push({ start: l.timestamp - l.duration! * 60000, end: l.timestamp })
    })

  // Pares sleep → wake — máquina de estado linear (evita dois sleeps
  // consecutivos dividirem o mesmo wake e duplicarem minutos).
  const sorted = [...logs]
    .filter((l) => {
      if (l.eventId === 'wake' || l.eventId === 'sleep_awake') return true
      if (l.eventId === 'sleep' || l.eventId === 'sleep_nap') {
        return !(typeof l.duration === 'number' && l.duration > 0)
      }
      return false
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  let currentSleep: number | null = null
  for (const l of sorted) {
    const isSleep = l.eventId === 'sleep' || l.eventId === 'sleep_nap'
    if (isSleep) {
      if (currentSleep === null) currentSleep = l.timestamp
    } else {
      if (currentSleep !== null) {
        if (l.timestamp > currentSleep) {
          pairs.push({ start: currentSleep, end: l.timestamp })
        }
        currentSleep = null
      }
    }
  }
  if (currentSleep !== null) {
    pairs.push({ start: currentSleep, end: Date.now() })
  }
  return pairs
}

/**
 * Clipa um par contra uma janela. Retorna null se não houver sobreposição.
 */
function clipPair(
  p: { start: number; end: number },
  start: number,
  end: number,
): { start: number; end: number } | null {
  const s = Math.max(p.start, start)
  const e = Math.min(p.end, end)
  if (e <= s) return null
  return { start: s, end: e }
}

/**
 * Pares de sono restritos à janela [start, end]. Usa o histórico completo
 * para achar o wake correspondente (mesmo fora do período) e depois clipa,
 * evitando que um sono que atravessa a meia-noite produza horas fantasmas.
 */
function computeSleepPairsInWindow(
  logs: LogEntry[],
  start: number,
  end: number,
): { start: number; end: number }[] {
  const all = computeSleepPairs(logs)
  const out: { start: number; end: number }[] = []
  for (const p of all) {
    const c = clipPair(p, start, end)
    if (c) out.push(c)
  }
  return out
}

export function getAvailablePeriods(logs: LogEntry[]): PeriodOption[] {
  if (logs.length === 0) return []

  const now = Date.now()
  const today = startOfDay(now)
  const oldestTs = logs.reduce((min, l) => (l.timestamp < min ? l.timestamp : min), logs[0].timestamp)
  // Number of calendar days covered (inclusive) from oldest log to today
  const dataSpanDays = Math.floor((today - startOfDay(oldestTs)) / 86400000) + 1

  const hasLogsIn = (start: number, end: number) =>
    logs.some((l) => l.timestamp >= start && l.timestamp <= end)

  const available: PeriodOption[] = []

  // Today: só aparece se há log de hoje
  if (hasLogsIn(today, now)) available.push('today')

  // Ontem: só aparece se há log de ontem
  if (hasLogsIn(today - 86400000, today - 1)) available.push('yesterday')

  // Janelas deslizantes: só aparecem quando a janela inteira está coberta pelos dados
  if (dataSpanDays >= 7) available.push('last_7')
  if (dataSpanDays >= 15) available.push('last_15')
  if (dataSpanDays >= 30) available.push('last_30')

  // Mês atual: só aparece se há logs no mês atual
  const curMonth = new Date()
  curMonth.setDate(1)
  curMonth.setHours(0, 0, 0, 0)
  if (hasLogsIn(curMonth.getTime(), now)) available.push('current_month')

  // Mês passado: só aparece se há logs no mês passado
  const lmStart = new Date()
  lmStart.setMonth(lmStart.getMonth() - 1)
  lmStart.setDate(1)
  lmStart.setHours(0, 0, 0, 0)
  const lmEnd = new Date(lmStart.getFullYear(), lmStart.getMonth() + 1, 0, 23, 59, 59, 999)
  if (hasLogsIn(lmStart.getTime(), lmEnd.getTime())) available.push('last_month')

  // Tudo: sempre disponível se há qualquer log
  available.push('all')

  return available
}

export function useInsightsEngine(
  logs: LogEntry[],
  birthDate: string | undefined,
  period: PeriodOption,
  quietHours?: { start: number; end: number },
) {
  const nightStart = quietHours?.start ?? 22
  const nightEnd = quietHours?.end ?? 7
  return useMemo(() => {
    const band: AgeBand = birthDate ? getAgeBand(birthDate) : 'beyond'
    const { start, end } = getPeriodRange(period)
    const periodLogs = logs.filter((l) => l.timestamp >= start && l.timestamp <= end)
    const isSingleDay = period === 'today' || period === 'yesterday'

    // Count unique days in period (timezone-safe)
    const uniqueDays = new Set(
      periodLogs.map((l) => getLocalDateString(new Date(l.timestamp)))
    ).size
    const divisor = isSingleDay ? 1 : Math.max(uniqueDays, 1)

    const feeds = periodLogs.filter((l) => FEED_IDS.has(l.eventId))
    const diapers = periodLogs.filter((l) => DIAPER_IDS.has(l.eventId))
    // Pares clipados à janela — usa o histórico completo para achar wakes
    // fora do período (um sono que cruza a meia-noite não deve dobrar).
    const sleepPairs = computeSleepPairsInWindow(logs, start, end)
    const totalSleepMin = sleepPairs.reduce(
      (s, p) => s + (p.end - p.start) / 60000,
      0
    )
    const totalBottleMl = periodLogs
      .filter((l) => l.eventId === 'bottle')
      .reduce((s, l) => s + (l.ml ?? 0), 0)

    const lastFeed = isSingleDay
      ? feeds.sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
      : undefined
    const lastDiaper = isSingleDay
      ? diapers.sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
      : undefined
    const sleepWake = isSingleDay
      ? periodLogs
          .filter((l) => SLEEP_EVENT_IDS.has(l.eventId))
          .sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp
      : undefined

    const periodSummary: PeriodSummary = {
      feeds: isSingleDay ? feeds.length : Math.round((feeds.length / divisor) * 10) / 10,
      diapers: isSingleDay
        ? diapers.length
        : Math.round((diapers.length / divisor) * 10) / 10,
      sleepCycles: isSingleDay
        ? sleepPairs.length
        : Math.round((sleepPairs.length / divisor) * 10) / 10,
      totalBottleMl: isSingleDay
        ? Math.round(totalBottleMl)
        : Math.round(totalBottleMl / divisor),
      totalSleepMinutes: isSingleDay
        ? Math.round(totalSleepMin)
        : Math.round(totalSleepMin / divisor),
      isAverage: !isSingleDay,
      periodLabel: PERIOD_LABELS[period],
      lastFeedTime: lastFeed,
      lastSleepTime: sleepWake,
      lastDiaperTime: lastDiaper,
    }

    // Insights (calculated over a window matching period, but always see full log history for pattern detection)
    const periodDaysNum =
      period === 'today' || period === 'yesterday'
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

    const PHRASE_MAP: Record<PeriodOption, string> = {
      today: 'hoje',
      yesterday: 'ontem',
      last_7: 'nos últimos 7 dias',
      last_15: 'nos últimos 15 dias',
      last_30: 'nos últimos 30 dias',
      current_month: 'neste mês',
      last_month: 'no mês passado',
      all: 'em todo o período',
    }

    const ctx: InsightContext = {
      start,
      end,
      phrase: PHRASE_MAP[period],
      periodLabel: PERIOD_LABELS[period],
      dayCount: periodDaysNum,
      isSingleDay,
      isPartialDay: period === 'today',
      nightStart,
      nightEnd,
    }

    // Na página de Insights não aplicamos a rotação de 48h: o usuário veio
    // aqui justamente para ver os insights, então não devemos esconder nada.
    const insights: InsightResult[] = generateInsights(logs, band, ctx, birthDate)

    // Week trends — sempre últimos 7 dias. Usa pares clipados por dia
    // para atribuir corretamente sono que cruza a meia-noite.
    const weekTrends: DayTrend[] = []
    const now = Date.now()
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(now - i * 86400000)
      const dayEnd = dayStart + 86400000
      const dayLogs = logs.filter(
        (l) => l.timestamp >= dayStart && l.timestamp < dayEnd
      )
      const daySleepPairs = computeSleepPairsInWindow(logs, dayStart, dayEnd)
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
  }, [logs, birthDate, period, nightStart, nightEnd])
}
