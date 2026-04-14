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

/**
 * Contexto de período passado ao motor de insights. O motor deve usar
 * exclusivamente esta janela para produzir os insights, permitindo que a
 * página de Insights mostre informações coerentes com o período escolhido
 * pelo usuário (hoje, ontem, últimos 7 dias, etc).
 */
export interface InsightContext {
  /** Início do período em ms */
  start: number
  /** Fim do período em ms (inclusivo) */
  end: number
  /** Rótulo curto usado em copy ("hoje", "ontem", "nos últimos 7 dias") */
  phrase: string
  /** Rótulo absoluto usado em títulos ("Hoje", "Ontem", "Últimos 7 dias") */
  periodLabel: string
  /** Número de dias que o período cobre (1 para hoje/ontem, 7 para last_7...) */
  dayCount: number
  /** É um período de apenas um dia (hoje ou ontem)? */
  isSingleDay: boolean
  /** É o dia de hoje em andamento (dia parcial)? */
  isPartialDay: boolean
  /**
   * Janela "noturna" configurada pelos pais (quiet hours). `nightStart` e
   * `nightEnd` são horas inteiras 0-23. Por padrão 22-7. Suporta wraparound
   * (nightStart > nightEnd significa que a noite atravessa a meia-noite).
   */
  nightStart: number
  nightEnd: number
}

// ---- Helper constants ----
const FEED_IDS = new Set(['breast_left', 'breast_right', 'breast_both', 'bottle'])
const DIAPER_IDS = new Set(['diaper_wet', 'diaper_dirty'])

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Constrói pares de início/fim de sono a partir dos logs. Usa uma máquina
 * de estado linear para parear sleep↔wake (evita que dois sleeps seguidos
 * sem um wake entre eles acabem dividindo o mesmo wake e dupliquem
 * minutos de sono).
 */
function computeSleepPairs(logs: LogEntry[]): { start: number; end: number }[] {
  const pairs: { start: number; end: number }[] = []

  // 1. Logs com duration explícita (sonecas registradas com tempo pronto)
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

  // 2. Sleep→wake em modo toggle (sem duration). Máquina de estado linear.
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
      // Dois sleeps consecutivos sem wake → mantém o primeiro início,
      // ignora o segundo para não duplicar.
      if (currentSleep === null) currentSleep = l.timestamp
    } else {
      // wake / sleep_awake
      if (currentSleep !== null) {
        if (l.timestamp > currentSleep) {
          pairs.push({ start: currentSleep, end: l.timestamp })
        }
        currentSleep = null
      }
      // wake órfão (sem sleep correspondente) é descartado
    }
  }
  // Ainda dormindo: fecha o par com "agora"
  if (currentSleep !== null) {
    pairs.push({ start: currentSleep, end: Date.now() })
  }

  return pairs
}

/** Conta dias distintos com pelo menos um registro dentro do intervalo */
function countDaysWithData(logs: LogEntry[], start: number, end: number): number {
  const days = new Set<string>()
  logs.forEach((l) => {
    if (l.timestamp >= start && l.timestamp <= end) {
      days.add(getLocalDateString(new Date(l.timestamp)))
    }
  })
  return days.size
}

/**
 * Retorna a interseção entre um par de sono e uma janela [start, end].
 * Se não há sobreposição, retorna null.
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
 * Calcula pares de sono que caem dentro da janela [start, end]. Diferente
 * de `computeSleepPairs(periodLogs)`, este método usa TODOS os logs para
 * encontrar o wake correspondente a cada sleep (mesmo se ele caiu fora do
 * período) e depois clipa cada par à janela escolhida. Isso evita que um
 * sono noturno que atravessa a meia-noite dobre de tamanho quando o wake
 * é filtrado por acidente.
 */
function computeSleepPairsInWindow(
  logs: LogEntry[],
  start: number,
  end: number,
): { start: number; end: number }[] {
  const all = computeSleepPairs(logs)
  const clipped: { start: number; end: number }[] = []
  for (const p of all) {
    const c = clipPair(p, start, end)
    if (c) clipped.push(c)
  }
  return clipped
}

/**
 * Determina se um instante cai no período noturno configurado pelos pais
 * (quiet hours). Suporta wraparound (night atravessa a meia-noite).
 */
function isNightHour(ts: number, nightStart: number, nightEnd: number): boolean {
  const h = new Date(ts).getHours()
  if (nightStart === nightEnd) return false
  if (nightStart > nightEnd) {
    // Noite cruza a meia-noite (ex.: 22-7): noite = [22..24) ∪ [0..7)
    return h >= nightStart || h < nightEnd
  }
  // Mesmo dia (raro): noite = [nightStart..nightEnd)
  return h >= nightStart && h < nightEnd
}

/**
 * Divide pares de sono em diurno e noturno respeitando o quietHours do
 * usuário. Para pares que atravessam o limite dia→noite, faz o split minuto
 * a minuto via sub-janelas para máxima precisão.
 */
function splitDayNight(
  pairs: { start: number; end: number }[],
  nightStart: number,
  nightEnd: number,
) {
  let dayMin = 0
  let nightMin = 0

  for (const p of pairs) {
    // Sub-amostra o par em passos de 5min e classifica cada slice. Simples,
    // tolerante a pares que cruzam qualquer limite (início do dia, início
    // da noite, múltiplos dias, etc).
    const STEP = 5 * 60000
    for (let t = p.start; t < p.end; t += STEP) {
      const slice = Math.min(STEP, p.end - t) / 60000
      if (isNightHour(t, nightStart, nightEnd)) nightMin += slice
      else dayMin += slice
    }
  }
  return { dayMin, nightMin }
}

/**
 * Gera os insights para um período específico. O motor sempre recebe TODOS os
 * logs (para análises que dependem de histórico, como tendências), mas usa o
 * `ctx` para delimitar a janela principal de cada insight.
 */
export function generateInsights(
  logs: LogEntry[],
  band: AgeBand,
  ctx: InsightContext,
): InsightResult[] {
  const now = Date.now()
  const insights: InsightResult[] = []

  const sleepRef = SLEEP_REFERENCE[band]
  const feedsRef = FEEDS_REFERENCE[band]

  const periodLogs = logs.filter((l) => l.timestamp >= ctx.start && l.timestamp <= ctx.end)
  const daysWithData = countDaysWithData(logs, ctx.start, ctx.end)

  // =====================================================================
  // TIPO 1 — Sono: comparação com a referência
  // =====================================================================

  // Usa o histórico completo para parear sleep↔wake (um sono que atravessa
  // a meia-noite precisa encontrar seu wake mesmo que ele esteja fora da
  // janela do período) e depois clipa cada par à janela.
  const sleepPairs = computeSleepPairsInWindow(logs, ctx.start, ctx.end)
  const totalSleepMin = sleepPairs.reduce(
    (s, p) => s + (p.end - p.start) / 60000,
    0,
  )

  if (sleepPairs.length >= 1 && totalSleepMin > 0) {
    if (ctx.isPartialDay) {
      // Dia em andamento: NÃO comparar com referência diária (é óbvio que
      // está abaixo antes do dia acabar). Mostrar apenas o acumulado.
      insights.push({
        id: 'sleep_partial_today',
        emoji: '🌙',
        title: 'Sono até agora',
        body: `${formatMinutes(totalSleepMin)} de sono registrados hoje em ${sleepPairs.length} ${
          sleepPairs.length === 1 ? 'soneca' : 'sonecas'
        }. A referência para o dia completo é ${formatMinutesRange(sleepRef)}.`,
        source: sleepRef.source,
        type: 'reference',
        priority: 3,
        minDataDays: 1,
      })
    } else if (ctx.isSingleDay) {
      // Dia completo (ontem): pode comparar com a referência diária
      const status =
        totalSleepMin < sleepRef.min
          ? 'abaixo'
          : totalSleepMin > sleepRef.max
          ? 'acima'
          : 'dentro'
      const comment =
        status === 'abaixo'
          ? ' Um pouco abaixo da média, mas cada bebê tem seu ritmo.'
          : status === 'acima'
          ? ' Acima da média — ótimo descanso!'
          : ' Dentro do esperado!'
      insights.push({
        id: `sleep_ref_${ctx.periodLabel}`,
        emoji: '🌙',
        title: `Sono total ${ctx.phrase}`,
        body: `${formatMinutes(totalSleepMin)} registrados. A referência para essa faixa é ${formatMinutesRange(sleepRef)} por dia.${comment}`,
        source: sleepRef.source,
        type: 'reference',
        priority: 3,
        minDataDays: 1,
      })
    } else {
      // Período multi-dia: comparar a MÉDIA por dia com a referência
      const avgSleepPerDay = totalSleepMin / Math.max(daysWithData, 1)
      const status =
        avgSleepPerDay < sleepRef.min
          ? 'abaixo'
          : avgSleepPerDay > sleepRef.max
          ? 'acima'
          : 'dentro'
      const comment =
        status === 'abaixo'
          ? ' A média está um pouco abaixo; cada bebê tem seu ritmo.'
          : status === 'acima'
          ? ' Média acima do esperado, ótimo descanso!'
          : ' Média dentro do esperado!'
      insights.push({
        id: `sleep_ref_${ctx.periodLabel}`,
        emoji: '🌙',
        title: `Sono médio ${ctx.phrase}`,
        body: `Média de ${formatMinutes(avgSleepPerDay)} de sono por dia (${daysWithData} ${daysWithData === 1 ? 'dia' : 'dias'} com registros). Referência: ${formatMinutesRange(sleepRef)} por dia.${comment}`,
        source: sleepRef.source,
        type: 'reference',
        priority: 3,
        minDataDays: 2,
      })
    }
  }

  // =====================================================================
  // TIPO 2 — Amamentação: comparação com a referência
  // =====================================================================

  const feeds = periodLogs.filter((l) => FEED_IDS.has(l.eventId))
  if (feeds.length >= 1) {
    if (ctx.isPartialDay) {
      // Hoje em andamento — comparação proporcional (por hora do dia)
      const todayStart = startOfDay(now)
      const elapsedH = Math.max((now - todayStart) / 3600000, 0.5)
      const expectedByNow = (feedsRef.min + feedsRef.max) / 2 * (elapsedH / 24)
      const diff = feeds.length - expectedByNow
      let comment = ''
      if (diff > 1.5) {
        comment = ' Acima do ritmo esperado para esta hora — ótimo!'
      } else if (diff < -1.5) {
        comment = ` Abaixo do ritmo esperado para esta hora do dia (esperado ~${Math.round(expectedByNow)} até agora).`
      } else {
        comment = ' Dentro do ritmo esperado para esta hora do dia.'
      }
      insights.push({
        id: 'feeds_partial_today',
        emoji: '🤱',
        title: 'Amamentações até agora',
        body: `${feeds.length} ${feeds.length === 1 ? 'amamentação registrada' : 'amamentações registradas'} hoje. Referência para o dia completo: ${feedsRef.min} a ${feedsRef.max}.${comment}`,
        source: feedsRef.source,
        type: 'reference',
        priority: 4,
        minDataDays: 1,
      })
    } else if (ctx.isSingleDay) {
      const inRange = feeds.length >= feedsRef.min && feeds.length <= feedsRef.max
      insights.push({
        id: `feeds_ref_${ctx.periodLabel}`,
        emoji: '🤱',
        title: `Amamentações ${ctx.phrase}`,
        body: `${feeds.length} ${feeds.length === 1 ? 'amamentação registrada' : 'amamentações registradas'}. A referência é ${feedsRef.min} a ${feedsRef.max} por dia.${inRange ? ' Dentro do esperado!' : ''}`,
        source: feedsRef.source,
        type: 'reference',
        priority: 4,
        minDataDays: 1,
      })
    } else {
      const avgPerDay = feeds.length / Math.max(daysWithData, 1)
      const inRange = avgPerDay >= feedsRef.min && avgPerDay <= feedsRef.max
      insights.push({
        id: `feeds_ref_${ctx.periodLabel}`,
        emoji: '🤱',
        title: `Amamentações ${ctx.phrase}`,
        body: `Média de ${(Math.round(avgPerDay * 10) / 10).toString().replace('.', ',')} amamentações por dia (${feeds.length} no total). Referência: ${feedsRef.min} a ${feedsRef.max} por dia.${inRange ? ' Dentro do esperado!' : ''}`,
        source: feedsRef.source,
        type: 'reference',
        priority: 4,
        minDataDays: 2,
      })
    }
  }

  // =====================================================================
  // TIPO 3 — Padrões e tendências (somente para períodos multi-dia)
  // =====================================================================

  if (!ctx.isSingleDay && daysWithData >= 5) {
    // Confusão dia/noite (0-3m): analisa os últimos 3 dias do período
    if (band === 'newborn' || band === 'early') {
      const windowStart = Math.max(ctx.start, ctx.end - 3 * 86400000)
      const pairs3 = computeSleepPairsInWindow(logs, windowStart, ctx.end)
      const { dayMin, nightMin } = splitDayNight(pairs3, ctx.nightStart, ctx.nightEnd)
      if (dayMin > nightMin && nightMin > 0) {
        insights.push({
          id: 'day_night_confusion',
          emoji: '🌙',
          title: 'Confusão dia e noite',
          body: `Nos últimos 3 dias do período, o sono diurno (${formatMinutes(dayMin / 3)}/dia) está maior que o noturno (${formatMinutes(nightMin / 3)}/dia). Isso é comum nos primeiros meses e se resolve naturalmente.`,
          type: 'pattern',
          priority: 2,
          minDataDays: 5,
        })
      }
    }

    // Intervalo entre amamentações aumentando (compara 1a vs 2a metade)
    const mid = (ctx.start + ctx.end) / 2
    const firstHalfFeeds = feeds
      .filter((l) => l.timestamp < mid)
      .sort((a, b) => a.timestamp - b.timestamp)
    const secondHalfFeeds = feeds
      .filter((l) => l.timestamp >= mid)
      .sort((a, b) => a.timestamp - b.timestamp)

    const avgInterval = (list: LogEntry[]) => {
      if (list.length < 2) return 0
      let sum = 0
      for (let i = 1; i < list.length; i++) {
        sum += list[i].timestamp - list[i - 1].timestamp
      }
      return sum / (list.length - 1) / 60000
    }
    const avg1 = avgInterval(firstHalfFeeds)
    const avg2 = avgInterval(secondHalfFeeds)
    if (avg1 > 0 && avg2 > avg1 * 1.15) {
      insights.push({
        id: 'feed_interval_increasing',
        emoji: '🤱',
        title: 'Intervalo entre amamentações aumentando',
        body: `O intervalo médio passou de ${formatMinutes(avg1)} para ${formatMinutes(avg2)} ao longo do período. O bebê pode estar mamando com mais eficiência.`,
        type: 'pattern',
        priority: 3,
        minDataDays: 5,
      })
    }

    // Maior bloco de sono noturno crescendo (compara 1a vs 2a metade)
    const getMaxNightSleep = (s: number, e: number) => {
      const windowPairs = computeSleepPairsInWindow(logs, s, e)
      const nightPairs = windowPairs.filter((p) =>
        isNightHour(p.start, ctx.nightStart, ctx.nightEnd),
      )
      return nightPairs.length > 0
        ? Math.max(...nightPairs.map((p) => (p.end - p.start) / 60000))
        : 0
    }
    const firstHalfNight = getMaxNightSleep(ctx.start, mid)
    const secondHalfNight = getMaxNightSleep(mid, ctx.end + 1)
    if (firstHalfNight > 0 && secondHalfNight > firstHalfNight * 1.15 && secondHalfNight > 120) {
      insights.push({
        id: 'longest_night_growing',
        emoji: '🌟',
        title: 'Maior bloco de sono noturno crescendo',
        body: `O maior período de sono noturno passou de ${formatMinutes(firstHalfNight)} para ${formatMinutes(secondHalfNight)}. O ritmo circadiano está se formando!`,
        type: 'pattern',
        priority: 3,
        minDataDays: 5,
      })
    }
  }

  // =====================================================================
  // TIPO 4 — Comemorações
  // =====================================================================

  // Consistência de registros (apenas períodos multi-dia)
  if (!ctx.isSingleDay && daysWithData >= 5 && ctx.dayCount >= 7) {
    insights.push({
      id: `data_streak_${ctx.periodLabel}`,
      emoji: '🏆',
      title: 'Consistência',
      body: `${daysWithData} dias com registros ${ctx.phrase}. Manter o acompanhamento faz toda a diferença!`,
      type: 'celebration',
      priority: 5,
      minDataDays: 5,
    })
  }

  // Ritmo circadiano se formando (para bebês de 1m+)
  if ((band === 'early' || band === 'growing') && sleepPairs.length >= 2) {
    const { dayMin, nightMin } = splitDayNight(sleepPairs, ctx.nightStart, ctx.nightEnd)
    const divisor = ctx.isSingleDay ? 1 : Math.max(daysWithData, 1)
    const dayAvg = dayMin / divisor
    const nightAvg = nightMin / divisor
    if (nightAvg > dayAvg && nightAvg > 0 && dayAvg > 0) {
      insights.push({
        id: `circadian_forming_${ctx.periodLabel}`,
        emoji: '🌙',
        title: 'Ritmo circadiano se formando',
        body: ctx.isSingleDay
          ? `Sono noturno (${formatMinutes(nightAvg)}) maior que o diurno (${formatMinutes(dayAvg)}). O corpo está começando a diferenciar dia e noite!`
          : `Em média ${formatMinutes(nightAvg)} de sono noturno vs ${formatMinutes(dayAvg)} diurno por dia. O corpo está diferenciando dia e noite!`,
        type: 'celebration',
        priority: 5,
        minDataDays: 1,
      })
    }
  }

  // =====================================================================
  // TIPO 5 — Alertas (SEMPRE baseados em HOJE; só aparecem para 'hoje')
  // =====================================================================

  if (ctx.isPartialDay && (band === 'newborn' || band === 'early')) {
    const todayStart = startOfDay(now)
    const todayLogs = logs.filter((l) => l.timestamp >= todayStart)

    // Intervalo longo sem amamentar (dia, RN)
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

    // Poucas fraldas hoje (aviso só a partir das 16h)
    const todayDiapers = todayLogs.filter((l) => DIAPER_IDS.has(l.eventId)).length
    const currentHour = new Date().getHours()
    if (todayDiapers < 4 && currentHour >= 16) {
      insights.push({
        id: 'few_diapers',
        emoji: '⚠️',
        title: 'Poucas fraldas hoje',
        body: `Apenas ${todayDiapers} ${todayDiapers === 1 ? 'fralda registrada' : 'fraldas registradas'} até agora. Para recém-nascidos, o esperado é pelo menos 6 por dia.`,
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

// =========================================================================
// Rotação de 48h (usada apenas por home banners, NÃO pela página de Insights)
// =========================================================================
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
