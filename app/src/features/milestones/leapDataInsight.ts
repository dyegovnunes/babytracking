import type { LogEntry } from '../../types'
import type { DevelopmentLeap } from './developmentLeaps'

// Event IDs (mesmos usados em insightRules.ts)
const FEED_IDS = new Set(['breast_left', 'breast_right', 'breast_both', 'bottle'])
const DIAPER_IDS = new Set(['diaper_wet', 'diaper_dirty'])
const SLEEP_START_IDS = new Set(['sleep', 'sleep_nap'])

export interface LeapInsight {
  feedsDelta: number | null    // variação % (ex: 0.38 = +38%)
  sleepDelta: number | null    // variação % (negativo = diminuiu)
  diapersDelta: number | null  // variação %
  feedsText: string | null
  sleepText: string | null
  diapersText: string | null
  leapDaysElapsed: number
  leapTotalDays: number
}

interface PeriodStats {
  feedsPerDay: number
  sleepMinPerDay: number
  diapersPerDay: number
  daysWithData: number
}

const MS_PER_DAY = 86400000

function getDateOnly(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function computeStats(logs: LogEntry[], startMs: number, endMs: number): PeriodStats | null {
  const periodLogs = logs.filter(l => l.timestamp >= startMs && l.timestamp < endMs)

  // Agrupar por dia para contar dias com dados
  const daySet = new Set<string>()
  let feeds = 0
  let sleepMin = 0
  let diapers = 0

  for (const l of periodLogs) {
    daySet.add(getDateOnly(l.timestamp))
    if (FEED_IDS.has(l.eventId)) feeds++
    if (DIAPER_IDS.has(l.eventId)) diapers++
    if (SLEEP_START_IDS.has(l.eventId) && l.duration) sleepMin += l.duration
  }

  const daysWithData = daySet.size
  if (daysWithData < 3) return null

  return {
    feedsPerDay: feeds / daysWithData,
    sleepMinPerDay: sleepMin / daysWithData,
    diapersPerDay: diapers / daysWithData,
    daysWithData,
  }
}

function formatDelta(delta: number, label: string): string {
  const pct = Math.round(Math.abs(delta) * 100)
  if (pct < 5) return `${label} estáveis, sem variação significativa.`
  const direction = delta > 0 ? 'a mais' : 'a menos'
  return `${pct}% ${direction} ${label}.`
}

function formatSleepDelta(delta: number): string {
  const pct = Math.round(Math.abs(delta) * 100)
  if (pct < 5) return 'Sono estável, sem variação significativa.'
  return delta < 0
    ? `Sono diminuiu ${pct}%. Normal durante saltos.`
    : `Sono aumentou ${pct}%.`
}

/**
 * Calcula as variações nos registros durante um salto comparado com a semana anterior.
 * Retorna null se não houver dados suficientes (< 3 dias em qualquer período).
 */
export function getLeapDataInsight(
  logs: LogEntry[],
  birthDate: string,
  leap: DevelopmentLeap,
): LeapInsight | null {
  const birthMs = new Date(birthDate).getTime()
  const now = Date.now()

  const leapStartMs = birthMs + leap.weekStart * 7 * MS_PER_DAY
  // Para salto ativo: usa hoje como fim; para passado: usa weekEnd
  const leapEndMs = Math.min(birthMs + (leap.weekEnd + 1) * 7 * MS_PER_DAY, now)

  // Período de referência: 7 dias antes do início do salto
  const refStartMs = leapStartMs - 7 * MS_PER_DAY
  const refEndMs = leapStartMs

  // Se o salto ainda não começou, não há dados
  if (leapStartMs > now) return null

  const refStats = computeStats(logs, refStartMs, refEndMs)
  const leapStats = computeStats(logs, leapStartMs, leapEndMs)

  if (!refStats || !leapStats) return null

  const safeDelta = (leap: number, ref: number): number | null => {
    if (ref === 0 && leap === 0) return null
    if (ref === 0) return null // evita divisão por zero
    return (leap - ref) / ref
  }

  const feedsDelta = safeDelta(leapStats.feedsPerDay, refStats.feedsPerDay)
  const sleepDelta = safeDelta(leapStats.sleepMinPerDay, refStats.sleepMinPerDay)
  const diapersDelta = safeDelta(leapStats.diapersPerDay, refStats.diapersPerDay)

  const leapDaysElapsed = Math.max(0, Math.floor((Math.min(now, leapEndMs) - leapStartMs) / MS_PER_DAY))
  const leapTotalDays = (leap.weekEnd - leap.weekStart + 1) * 7

  return {
    feedsDelta,
    sleepDelta,
    diapersDelta,
    feedsText: feedsDelta !== null ? formatDelta(feedsDelta, 'nas amamentações') : null,
    sleepText: sleepDelta !== null ? formatSleepDelta(sleepDelta) : null,
    diapersText: diapersDelta !== null ? formatDelta(diapersDelta, 'nas fraldas') : null,
    leapDaysElapsed,
    leapTotalDays,
  }
}
