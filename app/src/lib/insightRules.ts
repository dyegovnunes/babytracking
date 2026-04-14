import type { AgeBand } from './ageUtils'
import type { LogEntry } from '../types'
import { getLocalDateString } from './formatters'
import {
  SLEEP_REFERENCE,
  FEEDS_REFERENCE,
  formatMinutes,
  formatMinutesRange,
} from './referenceData'

export type InsightType = 'reference' | 'pattern' | 'celebration' | 'alert'

export interface InsightResult {
  id: string
  emoji: string
  title: string
  body: string
  source?: string
  type: InsightType
  priority: number // 1 = highest
  minDataDays: number
}

// ---- Helper constants ----
const FEED_IDS = new Set(['breast_left', 'breast_right', 'breast_both', 'bottle'])
const DIAPER_IDS = new Set(['diaper_wet', 'diaper_dirty'])

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Build sleep start/end pairs from logs (duration-based events or sleep/wake toggles) */
function computeSleepPairs(logs: LogEntry[]): { start: number; end: number }[] {
  const pairs: { start: number; end: number }[] = []

  // 1. Logs com duration (ex: nap registrado com tempo)
  logs
    .filter((l) => l.eventId.startsWith('sleep') && l.duration && l.duration > 0)
    .forEach((l) => {
      pairs.push({ start: l.timestamp - l.duration! * 60000, end: l.timestamp })
    })

  // 2. Pares sleep → wake (modo toggle)
  const sorted = [...logs]
    .filter((l) => l.eventId === 'sleep' || l.eventId === 'wake' || l.eventId === 'sleep_nap' || l.eventId === 'sleep_awake')
    .sort((a, b) => a.timestamp - b.timestamp)

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]
    if (cur.eventId === 'sleep' || cur.eventId === 'sleep_nap') {
      if (cur.duration && cur.duration > 0) continue // já contabilizado acima
      const wake = sorted.slice(i + 1).find((l) => l.eventId === 'wake' || l.eventId === 'sleep_awake')
      pairs.push({
        start: cur.timestamp,
        end: wake ? wake.timestamp : Date.now(),
      })
    }
  }

  return pairs
}

function getDaysWithData(logs: LogEntry[], periodDays: number): number {
  const start = Date.now() - periodDays * 86400000
  const days = new Set<string>()
  logs.forEach((l) => {
    if (l.timestamp >= start) {
      days.add(getLocalDateString(new Date(l.timestamp)))
    }
  })
  return days.size
}

/**
 * Gera todos os insights possíveis baseado nos logs e faixa etária.
 * Retorna array filtrado (dados suficientes) e ordenado por prioridade.
 */
export function generateInsights(
  logs: LogEntry[],
  band: AgeBand,
  periodDays: number
): InsightResult[] {
  const daysWithData = getDaysWithData(logs, periodDays)
  const now = Date.now()
  const todayStart = startOfDay(now)
  const todayLogs = logs.filter((l) => l.timestamp >= todayStart)
  const insights: InsightResult[] = []

  const sleepRef = SLEEP_REFERENCE[band]
  const feedsRef = FEEDS_REFERENCE[band]

  // ---------- TYPE 1: Reference comparisons ----------

  // Sleep vs reference (hoje)
  const sleepPairsToday = computeSleepPairs(todayLogs)
  const todaySleepMin = sleepPairsToday.reduce(
    (s, p) => s + (p.end - p.start) / 60000,
    0
  )
  if (sleepPairsToday.length >= 1 && todaySleepMin > 0) {
    const status =
      todaySleepMin < sleepRef.min
        ? 'abaixo'
        : todaySleepMin > sleepRef.max
        ? 'acima'
        : 'dentro'
    const comment =
      status === 'abaixo'
        ? ' Um pouco abaixo, mas cada bebê tem seu ritmo.'
        : status === 'acima'
        ? ' Acima da média, ótimo descanso!'
        : ' Dentro do esperado!'
    insights.push({
      id: 'sleep_ref_today',
      emoji: '🌙',
      title: 'Sono total hoje',
      body: `${formatMinutes(todaySleepMin)} de sono registrado. A referência para essa faixa é ${formatMinutesRange(sleepRef)} por dia.${comment}`,
      source: sleepRef.source,
      type: 'reference',
      priority: 3,
      minDataDays: 1,
    })
  }

  // Feeds vs reference (hoje)
  const todayFeeds = todayLogs.filter((l) => FEED_IDS.has(l.eventId)).length
  if (todayFeeds >= 1) {
    const inRange = todayFeeds >= feedsRef.min && todayFeeds <= feedsRef.max
    insights.push({
      id: 'feeds_ref_today',
      emoji: '🤱',
      title: 'Amamentações hoje',
      body: `${todayFeeds} amamentações registradas. A referência é ${feedsRef.min} a ${feedsRef.max} por dia.${inRange ? ' Dentro do esperado!' : ''}`,
      source: feedsRef.source,
      type: 'reference',
      priority: 4,
      minDataDays: 1,
    })
  }

  // ---------- TYPE 2: Pattern detection ----------

  // Day/night confusion (0-3m)
  if (band === 'newborn' || band === 'early') {
    const last3Days = logs.filter((l) => l.timestamp >= now - 3 * 86400000)
    const pairs3d = computeSleepPairs(last3Days)
    let dayMin = 0
    let nightMin = 0
    pairs3d.forEach((p) => {
      const h = new Date(p.start).getHours()
      const dur = (p.end - p.start) / 60000
      if (h >= 7 && h < 22) dayMin += dur
      else nightMin += dur
    })
    if (dayMin > nightMin && daysWithData >= 3 && nightMin > 0) {
      insights.push({
        id: 'day_night_confusion',
        emoji: '🌙',
        title: 'Confusão dia e noite',
        body: `Nos últimos 3 dias, o sono diurno (${formatMinutes(dayMin / 3)}/dia) está maior que o noturno (${formatMinutes(nightMin / 3)}/dia). Isso é comum nos primeiros meses e se resolve naturalmente.`,
        type: 'pattern',
        priority: 2,
        minDataDays: 3,
      })
    }
  }

  // Feeding interval increasing
  if (daysWithData >= 5) {
    const week1Feeds = logs
      .filter(
        (l) =>
          FEED_IDS.has(l.eventId) &&
          l.timestamp >= now - 7 * 86400000 &&
          l.timestamp < now - 3.5 * 86400000
      )
      .sort((a, b) => a.timestamp - b.timestamp)
    const week2Feeds = logs
      .filter(
        (l) => FEED_IDS.has(l.eventId) && l.timestamp >= now - 3.5 * 86400000
      )
      .sort((a, b) => a.timestamp - b.timestamp)

    const avgInterval = (feeds: LogEntry[]) => {
      if (feeds.length < 2) return 0
      let sum = 0
      for (let i = 1; i < feeds.length; i++) {
        sum += feeds[i].timestamp - feeds[i - 1].timestamp
      }
      return sum / (feeds.length - 1) / 60000
    }

    const avg1 = avgInterval(week1Feeds)
    const avg2 = avgInterval(week2Feeds)

    if (avg1 > 0 && avg2 > avg1 * 1.15) {
      insights.push({
        id: 'feed_interval_increasing',
        emoji: '🤱',
        title: 'Intervalo entre amamentações aumentando',
        body: `O intervalo médio passou de ${formatMinutes(avg1)} para ${formatMinutes(avg2)} nos últimos dias. O bebê pode estar mamando com mais eficiência.`,
        type: 'pattern',
        priority: 3,
        minDataDays: 5,
      })
    }
  }

  // Longest night sleep growing
  if (daysWithData >= 5) {
    const getMaxNightSleep = (start: number, end: number) => {
      const nightPairs = computeSleepPairs(
        logs.filter((l) => l.timestamp >= start && l.timestamp < end)
      ).filter((p) => {
        const h = new Date(p.start).getHours()
        return h >= 20 || h < 7
      })
      return nightPairs.length > 0
        ? Math.max(...nightPairs.map((p) => (p.end - p.start) / 60000))
        : 0
    }
    const thisWeek = getMaxNightSleep(now - 3.5 * 86400000, now)
    const lastWeek = getMaxNightSleep(now - 7 * 86400000, now - 3.5 * 86400000)

    if (lastWeek > 0 && thisWeek > lastWeek * 1.15 && thisWeek > 120) {
      insights.push({
        id: 'longest_night_growing',
        emoji: '🌟',
        title: 'Maior bloco de sono noturno crescendo',
        body: `O maior período de sono noturno passou de ${formatMinutes(lastWeek)} para ${formatMinutes(thisWeek)}. O ritmo circadiano está se formando!`,
        type: 'pattern',
        priority: 3,
        minDataDays: 5,
      })
    }
  }

  // ---------- TYPE 3: Celebrations ----------

  if (daysWithData >= 7) {
    insights.push({
      id: `data_streak_${periodDays}`,
      emoji: '🏆',
      title: 'Consistência',
      body: `${daysWithData} dias com registros nos últimos ${periodDays} dias. Manter o acompanhamento faz toda a diferença!`,
      type: 'celebration',
      priority: 5,
      minDataDays: 7,
    })
  }

  // Night > Day (circadian forming)
  if (band === 'early' || band === 'growing') {
    let dayS = 0
    let nightS = 0
    sleepPairsToday.forEach((p) => {
      const h = new Date(p.start).getHours()
      const dur = (p.end - p.start) / 60000
      if (h >= 7 && h < 22) dayS += dur
      else nightS += dur
    })
    if (nightS > dayS && nightS > 0 && dayS > 0) {
      insights.push({
        id: 'circadian_forming',
        emoji: '🌙',
        title: 'Ritmo circadiano se formando',
        body: `Sono noturno (${formatMinutes(nightS)}) maior que o diurno (${formatMinutes(dayS)}). O corpo está começando a diferenciar dia e noite!`,
        type: 'celebration',
        priority: 5,
        minDataDays: 1,
      })
    }
  }

  // ---------- TYPE 4: Soft alerts ----------

  // Long gap without feeding (0-3m, daytime only)
  if (band === 'newborn' || band === 'early') {
    const recentFeeds = todayLogs
      .filter((l) => FEED_IDS.has(l.eventId))
      .sort((a, b) => b.timestamp - a.timestamp)
    if (recentFeeds.length > 0) {
      const hoursSinceLastFeed = (now - recentFeeds[0].timestamp) / 3600000
      const currentHour = new Date().getHours()
      if (hoursSinceLastFeed > 5 && currentHour >= 7 && currentHour < 22) {
        insights.push({
          id: 'long_feed_gap',
          emoji: '⚠️',
          title: 'Intervalo longo sem amamentar',
          body: `Já faz ${Math.round(hoursSinceLastFeed)}h desde a última amamentação durante o dia. Para recém-nascidos, o ideal é não ultrapassar 3 a 4h durante o dia.`,
          type: 'alert',
          priority: 1,
          minDataDays: 1,
        })
      }
    }
  }

  // Few diapers
  if (band === 'newborn' || band === 'early') {
    const todayDiapers = todayLogs.filter((l) => DIAPER_IDS.has(l.eventId)).length
    const currentHour = new Date().getHours()
    if (todayDiapers < 4 && currentHour >= 16) {
      insights.push({
        id: 'few_diapers',
        emoji: '⚠️',
        title: 'Poucas fraldas hoje',
        body: `Apenas ${todayDiapers} fralda${todayDiapers !== 1 ? 's' : ''} registrada${todayDiapers !== 1 ? 's' : ''} até agora. Para recém-nascidos, o esperado é pelo menos 6 por dia.`,
        type: 'alert',
        priority: 1,
        minDataDays: 1,
      })
    }
  }

  return insights
    .filter((i) => daysWithData >= i.minDataDays)
    .sort((a, b) => a.priority - b.priority)
}

// ---------- Rotation (48h) ----------
const SEEN_KEY_PREFIX = 'insight_seen_'
const ROTATION_MS = 48 * 3600 * 1000

/** Marca insights como vistos. Alerts nunca são persistidos — podem repetir. */
export function markInsightsSeen(ids: string[]) {
  const now = Date.now()
  ids.forEach((id) => {
    try {
      localStorage.setItem(SEEN_KEY_PREFIX + id, String(now))
    } catch {
      /* ignore quota */
    }
  })
}

/** Remove do array insights que já foram vistos em <48h. Mantém sempre os alerts. */
export function filterRecentlyUnseen(insights: InsightResult[]): InsightResult[] {
  const now = Date.now()
  return insights.filter((ins) => {
    if (ins.type === 'alert') return true
    try {
      const ts = localStorage.getItem(SEEN_KEY_PREFIX + ins.id)
      if (!ts) return true
      return now - parseInt(ts, 10) > ROTATION_MS
    } catch {
      return true
    }
  })
}
