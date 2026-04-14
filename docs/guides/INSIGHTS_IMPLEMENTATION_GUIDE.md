# Yaya — Insights Redesign: Guia de Implementação para Claude Code

**Versão:** 1.0 | **Data:** 2026-04-13

> **INSTRUÇÕES:** Este documento contém TUDO que você precisa para implementar o redesign da página de Insights no Yaya Baby. Leia o documento inteiro antes de começar. Execute na ordem dos steps. Para detalhes de produto (regras, tipos de insight, referências), consulte `INSIGHTS_REDESIGN_SPEC.md`.

---

## Contexto do Projeto

- **Stack:** React 19 + Vite + TypeScript + Capacitor (iOS/Android) + Supabase
- **Monetização:** RevenueCat (entitlement: `yaya_plus`), hook `usePremium()`
- **Design tokens:** globals.css (Manrope headline, Plus Jakarta Sans label, cores do tema)
- **AgeBand:** já implementado em `app/src/lib/ageUtils.ts` (8 faixas: newborn → beyond)

---

## Mapa do que JÁ EXISTE (não recriar)

### Arquivos que serão MODIFICADOS:
| Arquivo | O que faz | O que muda |
|---------|-----------|------------|
| `app/src/pages/InsightsPage.tsx` | Página de insights atual | Reescrever completamente |
| `app/src/components/insights/DaySummaryCard.tsx` | Cards 3-col de resumo | Adicionar horário último registro + label período |
| `app/src/hooks/useInsights.ts` | Cálculos de insights | Substituir por `useInsightsEngine.ts` |

### Arquivos que serão MANTIDOS sem alteração:
| Arquivo | O que faz |
|---------|-----------|
| `app/src/components/insights/WeekChart.tsx` | Gráfico de 7 dias. Move para baixo dos insights, Yaya+ only |
| `app/src/contexts/AppContext.tsx` | State global (logs, baby, intervals) |
| `app/src/hooks/usePremium.ts` | Hook `isPremium` |
| `app/src/components/ui/PaywallModal.tsx` | Modal paywall |
| `app/src/lib/ageUtils.ts` | AgeBand, getAgeBand() |

### Arquivos que serão REMOVIDOS da InsightsPage (componentes autônomos desnecessários):
- `app/src/components/insights/FeedingInsights.tsx` — dados migram para InsightCards
- `app/src/components/insights/SleepInsights.tsx` — dados migram para InsightCards

### O que NÃO existe (precisa criar):
- ❌ `app/src/components/insights/PeriodDropdown.tsx`
- ❌ `app/src/components/insights/InsightCard.tsx`
- ❌ `app/src/components/insights/InsightList.tsx`
- ❌ `app/src/components/insights/InsightPaywallBanner.tsx`
- ❌ `app/src/hooks/useInsightsEngine.ts`
- ❌ `app/src/lib/insightRules.ts`
- ❌ `app/src/lib/referenceData.ts`

---

## STEP 1 — Dados de referência: `referenceData.ts`

**Objetivo:** Tabelas OMS/AAP/SBP de sono, amamentação, janelas de vigília por faixa etária.

### Criar: `app/src/lib/referenceData.ts`

```typescript
import type { AgeBand } from './ageUtils'

/** Referência de sono total diário em minutos (OMS) */
export const SLEEP_REFERENCE: Record<AgeBand, { min: number; max: number; source: string }> = {
  newborn:       { min: 840, max: 1020, source: 'OMS' },    // 14-17h
  early:         { min: 840, max: 1020, source: 'OMS' },    // 14-17h
  growing:       { min: 720, max: 900,  source: 'OMS' },    // 12-15h
  weaning:       { min: 720, max: 900,  source: 'OMS' },    // 12-15h
  active:        { min: 720, max: 840,  source: 'OMS' },    // 12-14h
  toddler_early: { min: 660, max: 840,  source: 'OMS' },    // 11-14h
  toddler:       { min: 660, max: 840,  source: 'OMS' },    // 11-14h
  beyond:        { min: 600, max: 780,  source: 'OMS' },    // 10-13h
}

/** Referência de janela de vigília em minutos (AAP) */
export const WAKE_WINDOW: Record<AgeBand, { min: number; max: number; source: string }> = {
  newborn:       { min: 30,  max: 60,  source: 'AAP' },
  early:         { min: 45,  max: 90,  source: 'AAP' },
  growing:       { min: 90,  max: 150, source: 'AAP' },
  weaning:       { min: 150, max: 180, source: 'AAP' },
  active:        { min: 180, max: 240, source: 'AAP' },
  toddler_early: { min: 240, max: 300, source: 'AAP' },
  toddler:       { min: 300, max: 360, source: 'AAP' },
  beyond:        { min: 300, max: 420, source: 'AAP' },
}

/** Referência de amamentações por dia (SBP) */
export const FEEDS_REFERENCE: Record<AgeBand, { min: number; max: number; source: string }> = {
  newborn:       { min: 8,  max: 12, source: 'SBP' },
  early:         { min: 8,  max: 12, source: 'SBP' },
  growing:       { min: 6,  max: 8,  source: 'SBP' },
  weaning:       { min: 5,  max: 7,  source: 'SBP' },
  active:        { min: 4,  max: 6,  source: 'SBP' },
  toddler_early: { min: 3,  max: 5,  source: 'SBP' },
  toddler:       { min: 3,  max: 4,  source: 'SBP' },
  beyond:        { min: 3,  max: 4,  source: 'SBP' },
}

/** Fraldas mínimas por dia (primeiros meses) */
export const MIN_DIAPERS: Record<AgeBand, number> = {
  newborn: 6, early: 6, growing: 5, weaning: 4,
  active: 4, toddler_early: 3, toddler: 3, beyond: 3,
}

/** Formatação de minutos para exibição */
export function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, '0')}`
}

export function formatMinutesRange(ref: { min: number; max: number }): string {
  return `${formatMinutes(ref.min)} a ${formatMinutes(ref.max)}`
}
```

---

## STEP 2 — Regras de insights: `insightRules.ts`

**Objetivo:** Todas as regras de geração de insights, organizadas por tipo.

### Criar: `app/src/lib/insightRules.ts`

```typescript
import type { AgeBand } from './ageUtils'
import type { LogEntry } from '../types'
import { SLEEP_REFERENCE, FEEDS_REFERENCE, WAKE_WINDOW, MIN_DIAPERS, formatMinutes, formatMinutesRange } from './referenceData'

export type InsightType = 'reference' | 'pattern' | 'celebration' | 'alert'

export interface InsightResult {
  id: string
  emoji: string
  title: string
  body: string
  source?: string
  type: InsightType
  priority: number      // 1 = highest
  minDataDays: number
}

// ---- Helper constants ----
const FEED_IDS = new Set(['breast_left', 'breast_right', 'breast_both', 'bottle'])
const BREAST_IDS = new Set(['breast_left', 'breast_right', 'breast_both'])
const DIAPER_IDS = new Set(['diaper_wet', 'diaper_dirty'])

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ---- Sleep pair computation (reused from useInsights) ----
function computeSleepPairs(logs: LogEntry[]): { start: number; end: number }[] {
  const sorted = [...logs]
    .filter(l => l.eventId === 'sleep' || l.eventId === 'wake')
    .sort((a, b) => a.timestamp - b.timestamp)
  const pairs: { start: number; end: number }[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventId === 'sleep') {
      const wake = sorted.slice(i + 1).find(l => l.eventId === 'wake')
      pairs.push({ start: sorted[i].timestamp, end: wake ? wake.timestamp : Date.now() })
    }
  }
  return pairs
}

// ---- Period helpers ----
function getLogsForPeriod(logs: LogEntry[], periodDays: number): LogEntry[] {
  const start = Date.now() - periodDays * 86400000
  return logs.filter(l => l.timestamp >= start)
}

function getDaysWithData(logs: LogEntry[], periodDays: number): number {
  const start = Date.now() - periodDays * 86400000
  const days = new Set<string>()
  logs.forEach(l => {
    if (l.timestamp >= start) {
      days.add(new Date(l.timestamp).toISOString().slice(0, 10))
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
  const periodLogs = getLogsForPeriod(logs, periodDays)
  const daysWithData = getDaysWithData(logs, periodDays)
  const now = Date.now()
  const todayStart = startOfDay(now)
  const todayLogs = logs.filter(l => l.timestamp >= todayStart)
  const insights: InsightResult[] = []

  const sleepRef = SLEEP_REFERENCE[band]
  const feedsRef = FEEDS_REFERENCE[band]

  // ---------- TYPE 1: Reference comparisons ----------

  // Sleep vs reference
  const sleepPairs = computeSleepPairs(todayLogs)
  const todaySleepMin = sleepPairs.reduce((s, p) => s + (p.end - p.start) / 60000, 0)
  if (sleepPairs.length >= 1) {
    const status = todaySleepMin < sleepRef.min ? 'abaixo' : todaySleepMin > sleepRef.max ? 'acima' : 'dentro'
    insights.push({
      id: `sleep_ref_${periodDays}`,
      emoji: '🌙',
      title: 'Sono total hoje',
      body: `${formatMinutes(todaySleepMin)} de sono registrado. A referência para essa faixa é ${formatMinutesRange(sleepRef)} por dia.${status === 'abaixo' ? ' Um pouco abaixo, mas cada bebê tem seu ritmo.' : status === 'acima' ? ' Acima da média, ótimo descanso!' : ' Dentro do esperado!'}`,
      source: sleepRef.source,
      type: 'reference',
      priority: 3,
      minDataDays: 1,
    })
  }

  // Feeds vs reference
  const todayFeeds = todayLogs.filter(l => FEED_IDS.has(l.eventId)).length
  if (todayFeeds >= 1) {
    const status = todayFeeds < feedsRef.min ? 'abaixo' : todayFeeds > feedsRef.max ? 'acima' : 'dentro'
    insights.push({
      id: `feeds_ref_${periodDays}`,
      emoji: '🤱',
      title: 'Amamentações hoje',
      body: `${todayFeeds} amamentações registradas. A referência é ${feedsRef.min} a ${feedsRef.max} por dia.${status === 'dentro' ? ' Dentro do esperado!' : ''}`,
      source: feedsRef.source,
      type: 'reference',
      priority: 4,
      minDataDays: 1,
    })
  }

  // ---------- TYPE 2: Pattern detection ----------

  // Day/night confusion (0-3m)
  if (band === 'newborn' || band === 'early') {
    const last3Days = logs.filter(l => l.timestamp >= now - 3 * 86400000)
    const pairs3d = computeSleepPairs(last3Days)
    let dayMin = 0, nightMin = 0
    pairs3d.forEach(p => {
      const h = new Date(p.start).getHours()
      const dur = (p.end - p.start) / 60000
      if (h >= 7 && h < 22) dayMin += dur; else nightMin += dur
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
    const week1Feeds = logs.filter(l => FEED_IDS.has(l.eventId) && l.timestamp >= now - 7 * 86400000 && l.timestamp < now - 3.5 * 86400000).sort((a, b) => a.timestamp - b.timestamp)
    const week2Feeds = logs.filter(l => FEED_IDS.has(l.eventId) && l.timestamp >= now - 3.5 * 86400000).sort((a, b) => a.timestamp - b.timestamp)

    const avgInterval = (feeds: LogEntry[]) => {
      if (feeds.length < 2) return 0
      let sum = 0
      for (let i = 1; i < feeds.length; i++) sum += feeds[i].timestamp - feeds[i - 1].timestamp
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
      const nightPairs = computeSleepPairs(logs.filter(l => l.timestamp >= start && l.timestamp < end))
        .filter(p => { const h = new Date(p.start).getHours(); return h >= 20 || h < 7 })
      return nightPairs.length > 0 ? Math.max(...nightPairs.map(p => (p.end - p.start) / 60000)) : 0
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

  // This can be expanded. Basic streak celebration:
  if (daysWithData >= 7) {
    insights.push({
      id: 'data_streak_7',
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
    const todayPairs = computeSleepPairs(todayLogs)
    let dayS = 0, nightS = 0
    todayPairs.forEach(p => {
      const h = new Date(p.start).getHours()
      const dur = (p.end - p.start) / 60000
      if (h >= 7 && h < 22) dayS += dur; else nightS += dur
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

  // Long gap without feeding (0-3m, daytime)
  if (band === 'newborn' || band === 'early') {
    const recentFeeds = todayLogs.filter(l => FEED_IDS.has(l.eventId)).sort((a, b) => b.timestamp - a.timestamp)
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
    const todayDiapers = todayLogs.filter(l => DIAPER_IDS.has(l.eventId)).length
    const currentHour = new Date().getHours()
    if (todayDiapers < 4 && currentHour >= 16) {
      insights.push({
        id: 'few_diapers',
        emoji: '⚠️',
        title: 'Poucas fraldas hoje',
        body: `Apenas ${todayDiapers} fraldas registradas e já passa das ${currentHour}h. Para recém-nascidos, o esperado é pelo menos 6 por dia.`,
        type: 'alert',
        priority: 1,
        minDataDays: 1,
      })
    }
  }

  // Filter by minimum data and sort by priority
  return insights
    .filter(i => daysWithData >= i.minDataDays)
    .sort((a, b) => a.priority - b.priority)
}
```

**NOTA:** Este é um ponto de partida com ~10 regras. Mais regras podem ser adicionadas incrementalmente seguindo o mesmo padrão. O spec completo em `INSIGHTS_REDESIGN_SPEC.md` lista todas as regras desejadas.

---

## STEP 3 — Hook: `useInsightsEngine.ts`

**Objetivo:** Substituir `useInsights.ts` com engine baseada em período e regras.

### Criar: `app/src/hooks/useInsightsEngine.ts`

```typescript
import { useMemo, useState } from 'react'
import type { LogEntry } from '../types'
import type { AgeBand } from '../lib/ageUtils'
import { getAgeBand } from '../lib/ageUtils'
import { generateInsights, type InsightResult } from '../lib/insightRules'

export type PeriodOption = 'today' | 'last_7' | 'last_15' | 'last_30' | 'current_month' | 'last_month' | 'all'

export interface PeriodSummary {
  feeds: number
  diapers: number
  sleepCycles: number
  totalBottleMl: number
  totalSleepMinutes: number
  isAverage: boolean       // true if showing daily averages (period > 1 day)
  periodLabel: string      // "Hoje", "Últimos 7 dias", etc.
  lastFeedTime?: number    // timestamp of last feed (only for "today")
  lastSleepTime?: number   // timestamp of last sleep/wake (only for "today")
  lastDiaperTime?: number  // timestamp of last diaper (only for "today")
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

const PERIOD_LABELS: Record<PeriodOption, string> = {
  today: 'Hoje',
  last_7: 'Últimos 7 dias',
  last_15: 'Últimos 15 dias',
  last_30: 'Últimos 30 dias',
  current_month: 'Mês atual',
  last_month: 'Mês passado',
  all: 'Tudo',
}

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
      return { start: now - 7 * 86400000, end: now }
    case 'last_15':
      return { start: now - 15 * 86400000, end: now }
    case 'last_30':
      return { start: now - 30 * 86400000, end: now }
    case 'current_month': {
      const d = new Date()
      d.setDate(1); d.setHours(0, 0, 0, 0)
      return { start: d.getTime(), end: now }
    }
    case 'last_month': {
      const d = new Date()
      d.setMonth(d.getMonth() - 1); d.setDate(1); d.setHours(0, 0, 0, 0)
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
  const sorted = [...logs]
    .filter(l => l.eventId === 'sleep' || l.eventId === 'wake')
    .sort((a, b) => a.timestamp - b.timestamp)
  const pairs: { start: number; end: number }[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventId === 'sleep') {
      const wake = sorted.slice(i + 1).find(l => l.eventId === 'wake')
      pairs.push({ start: sorted[i].timestamp, end: wake ? wake.timestamp : Date.now() })
    }
  }
  return pairs
}

export function getAvailablePeriods(logs: LogEntry[]): PeriodOption[] {
  const available: PeriodOption[] = []
  const periods: PeriodOption[] = ['today', 'last_7', 'last_15', 'last_30', 'current_month', 'last_month', 'all']

  for (const period of periods) {
    const { start, end } = getPeriodRange(period)
    const hasData = logs.some(l => l.timestamp >= start && l.timestamp <= end)
    if (hasData) available.push(period)
  }

  return available
}

export function useInsightsEngine(
  logs: LogEntry[],
  birthDate: string | undefined,
  period: PeriodOption
) {
  const band: AgeBand = birthDate ? getAgeBand(birthDate) : 'beyond'

  return useMemo(() => {
    const { start, end } = getPeriodRange(period)
    const periodLogs = logs.filter(l => l.timestamp >= start && l.timestamp <= end)
    const isToday = period === 'today'

    // Count unique days in period
    const uniqueDays = new Set(periodLogs.map(l => new Date(l.timestamp).toISOString().slice(0, 10))).size
    const divisor = isToday ? 1 : Math.max(uniqueDays, 1)

    const feeds = periodLogs.filter(l => FEED_IDS.has(l.eventId))
    const diapers = periodLogs.filter(l => DIAPER_IDS.has(l.eventId))
    const sleepPairs = computeSleepPairs(periodLogs)
    const totalSleepMin = sleepPairs.reduce((s, p) => s + (p.end - p.start) / 60000, 0)
    const totalBottleMl = periodLogs.filter(l => l.eventId === 'bottle').reduce((s, l) => s + (l.ml ?? 0), 0)

    // Last timestamps (only relevant for "today")
    const lastFeed = isToday ? feeds.sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp : undefined
    const lastDiaper = isToday ? diapers.sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp : undefined
    const sleepWake = isToday ? periodLogs.filter(l => l.eventId === 'sleep' || l.eventId === 'wake').sort((a, b) => b.timestamp - a.timestamp)[0]?.timestamp : undefined

    const periodSummary: PeriodSummary = {
      feeds: isToday ? feeds.length : Math.round(feeds.length / divisor * 10) / 10,
      diapers: isToday ? diapers.length : Math.round(diapers.length / divisor * 10) / 10,
      sleepCycles: isToday ? sleepPairs.length : Math.round(sleepPairs.length / divisor * 10) / 10,
      totalBottleMl: isToday ? totalBottleMl : Math.round(totalBottleMl / divisor),
      totalSleepMinutes: isToday ? Math.round(totalSleepMin) : Math.round(totalSleepMin / divisor),
      isAverage: !isToday,
      periodLabel: PERIOD_LABELS[period],
      lastFeedTime: lastFeed,
      lastSleepTime: sleepWake,
      lastDiaperTime: lastDiaper,
    }

    // Insights (always based on full log history, not just period)
    const periodDaysNum = period === 'today' ? 1 : period === 'last_7' ? 7 : period === 'last_15' ? 15 : period === 'last_30' ? 30 : 30
    const insights = generateInsights(logs, band, periodDaysNum)

    // Week trends (always last 7 days, regardless of period)
    const weekTrends: DayTrend[] = []
    const now = Date.now()
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(now - i * 86400000)
      const dayEnd = dayStart + 86400000
      const dateStr = new Date(dayStart).toISOString().slice(0, 10)
      const dayLogs = logs.filter(l => l.timestamp >= dayStart && l.timestamp < dayEnd)
      const daySleepPairs = computeSleepPairs(dayLogs)
      weekTrends.push({
        date: dateStr,
        label: new Date(dayStart).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        feeds: dayLogs.filter(l => FEED_IDS.has(l.eventId)).length,
        diapers: dayLogs.filter(l => DIAPER_IDS.has(l.eventId)).length,
        sleepMinutes: Math.round(daySleepPairs.reduce((s, p) => s + (p.end - p.start) / 60000, 0)),
        bottleMl: dayLogs.filter(l => l.eventId === 'bottle').reduce((s, l) => s + (l.ml ?? 0), 0),
      })
    }

    const availablePeriods = getAvailablePeriods(logs)

    return { periodSummary, insights, weekTrends, availablePeriods }
  }, [logs, birthDate, period, band])
}
```

---

## STEP 4 — Componente: `PeriodDropdown.tsx`

**Objetivo:** Dropdown de seleção de período, mesmo visual do Super Relatório.

### Criar: `app/src/components/insights/PeriodDropdown.tsx`

```typescript
import { useState, useRef, useEffect } from 'react'
import { hapticLight } from '../../lib/haptics'
import type { PeriodOption } from '../../hooks/useInsightsEngine'

const PERIOD_LABELS: Record<PeriodOption, string> = {
  today: 'Hoje',
  last_7: 'Últimos 7 dias',
  last_15: 'Últimos 15 dias',
  last_30: 'Últimos 30 dias',
  current_month: 'Mês atual',
  last_month: 'Mês passado',
  all: 'Tudo',
}

const ALL_PERIODS: PeriodOption[] = ['today', 'last_7', 'last_15', 'last_30', 'current_month', 'last_month', 'all']

interface Props {
  selected: PeriodOption
  available: PeriodOption[]
  onChange: (period: PeriodOption) => void
}

export default function PeriodDropdown({ selected, available, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { hapticLight(); setOpen(!open) }}
        className="flex items-center gap-1.5 bg-white/[0.06] rounded-xl px-3 py-2 font-label text-xs font-semibold text-on-surface-variant"
      >
        {PERIOD_LABELS[selected]}
        <span className="material-symbols-outlined text-sm">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-surface-container-highest rounded-xl border border-white/10 shadow-xl z-20 min-w-[180px] overflow-hidden">
          {ALL_PERIODS.map(p => {
            const isAvailable = available.includes(p)
            return (
              <button
                key={p}
                disabled={!isAvailable}
                onClick={() => {
                  if (!isAvailable) return
                  hapticLight()
                  onChange(p)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-2.5 font-label text-sm transition-colors ${
                  p === selected
                    ? 'bg-primary/15 text-primary font-semibold'
                    : isAvailable
                    ? 'text-on-surface hover:bg-white/[0.04]'
                    : 'text-on-surface-variant/30 cursor-not-allowed'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

---

## STEP 5 — Componente: `InsightCard.tsx`

**Objetivo:** Card individual de insight com visual por tipo.

### Criar: `app/src/components/insights/InsightCard.tsx`

```typescript
import type { InsightResult } from '../../lib/insightRules'

const TYPE_STYLES: Record<string, string> = {
  reference:   'border-white/5',
  pattern:     'border-primary/15 bg-primary/[0.03]',
  celebration: 'border-tertiary/15 bg-tertiary/[0.03]',
  alert:       'border-warning/20 bg-warning/[0.03]',
}

export default function InsightCard({ emoji, title, body, source, type }: InsightResult) {
  return (
    <div className={`rounded-xl p-4 border ${TYPE_STYLES[type] || TYPE_STYLES.reference} bg-surface-container`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{emoji}</span>
        <div className="flex-1 min-w-0">
          <h4 className="font-headline text-sm font-bold text-on-surface mb-1">{title}</h4>
          <p className="font-label text-sm text-on-surface-variant leading-relaxed">{body}</p>
          {source && (
            <p className="font-label text-[10px] text-on-surface-variant/50 mt-2">Fonte: {source}</p>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## STEP 6 — Componente: `InsightPaywallBanner.tsx`

**Objetivo:** Banner sutil entre insights free e premium.

### Criar: `app/src/components/insights/InsightPaywallBanner.tsx`

```typescript
interface Props {
  remainingCount: number
  onUpgrade: () => void
}

export default function InsightPaywallBanner({ remainingCount, onUpgrade }: Props) {
  return (
    <div className="rounded-xl p-4 text-center"
         style={{ background: 'linear-gradient(90deg, rgba(183,159,255,0.08), rgba(255,150,185,0.08))', border: '1px solid rgba(183,159,255,0.15)' }}>
      <p className="font-label text-sm text-on-surface-variant mb-2">
        Mais {remainingCount} insight{remainingCount > 1 ? 's' : ''} disponíve{remainingCount > 1 ? 'is' : 'l'} com Yaya+
      </p>
      <button
        onClick={onUpgrade}
        className="bg-primary text-surface font-label text-sm font-bold px-5 py-2 rounded-xl active:scale-95 transition-transform"
      >
        Conhecer Yaya+
      </button>
    </div>
  )
}
```

---

## STEP 7 — Atualizar `DaySummaryCard.tsx`

**Objetivo:** Adicionar horário do último registro e label de período.

### Editar: `app/src/components/insights/DaySummaryCard.tsx`

Alterar a interface Props para aceitar `PeriodSummary` em vez de `DaySummary`:

```typescript
import type { PeriodSummary } from '../../hooks/useInsightsEngine'

interface Props {
  summary: PeriodSummary
}
```

Alterar o título dinâmico:
```tsx
<h3 className="font-headline text-sm font-bold text-on-surface mb-3">
  {summary.isAverage ? `Média/dia (${summary.periodLabel.toLowerCase()})` : 'Resumo de hoje'}
</h3>
```

Adicionar horário do último registro abaixo de cada card (apenas no modo "Hoje"):
```tsx
{!summary.isAverage && summary.lastFeedTime && (
  <span className="font-label text-[9px] text-on-surface-variant/60">
    última às {new Date(summary.lastFeedTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
  </span>
)}
```

---

## STEP 8 — Reescrever `InsightsPage.tsx`

**Objetivo:** Nova página com dropdown, resumo, insights, banner, gráfico.

### Reescrever: `app/src/pages/InsightsPage.tsx`

```typescript
import { useState } from 'react'
import { useAppState } from '../contexts/AppContext'
import { useInsightsEngine, type PeriodOption } from '../hooks/useInsightsEngine'
import { usePremium } from '../hooks/usePremium'
import DaySummaryCard from '../components/insights/DaySummaryCard'
import PeriodDropdown from '../components/insights/PeriodDropdown'
import InsightCard from '../components/insights/InsightCard'
import InsightPaywallBanner from '../components/insights/InsightPaywallBanner'
import WeekChart from '../components/insights/WeekChart'
import { PaywallModal } from '../components/ui/PaywallModal'
import { AdBanner } from '../components/ui/AdBanner'

const FREE_INSIGHT_LIMIT = 2

export default function InsightsPage() {
  const { logs, baby, loading } = useAppState()
  const { isPremium } = usePremium()
  const [period, setPeriod] = useState<PeriodOption>('last_7')
  const [showPaywall, setShowPaywall] = useState(false)

  const { periodSummary, insights, weekTrends, availablePeriods } = useInsightsEngine(
    logs,
    baby?.birthDate,
    period
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="pb-4 page-enter">
        <section className="px-5 pt-6 pb-4">
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">Insights</h1>
          <p className="font-label text-sm text-on-surface-variant">Padrões e tendências</p>
        </section>
        <div className="flex flex-col items-center justify-center py-16 px-5">
          <span className="text-4xl mb-4">📊</span>
          <p className="text-center text-on-surface-variant font-label text-sm">
            Registre atividades para ver os insights do seu bebê.
          </p>
        </div>
      </div>
    )
  }

  const visibleInsights = isPremium ? insights : insights.slice(0, FREE_INSIGHT_LIMIT)
  const hiddenCount = isPremium ? 0 : Math.max(0, insights.length - FREE_INSIGHT_LIMIT)

  return (
    <div className="pb-4 page-enter">
      {/* Header with dropdown */}
      <section className="px-5 pt-6 pb-4 flex items-end justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">Insights</h1>
          <p className="font-label text-sm text-on-surface-variant">Padrões e tendências</p>
        </div>
        <PeriodDropdown selected={period} available={availablePeriods} onChange={setPeriod} />
      </section>

      <div className="px-5 space-y-4">
        {/* Period summary */}
        <DaySummaryCard summary={periodSummary} />

        {/* Insight cards */}
        {visibleInsights.map(insight => (
          <InsightCard key={insight.id} {...insight} />
        ))}

        {/* Paywall banner (free users, if there are hidden insights) */}
        {!isPremium && hiddenCount > 0 && (
          <InsightPaywallBanner remainingCount={hiddenCount} onUpgrade={() => setShowPaywall(true)} />
        )}

        {/* Week chart (Yaya+ only) */}
        {isPremium && weekTrends.length > 0 && (
          <WeekChart trends={weekTrends} />
        )}
      </div>

      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trigger="insights" />
      <AdBanner />
    </div>
  )
}
```

---

## STEP 9 — Limpeza

**Objetivo:** Remover imports e referências ao hook antigo.

1. O arquivo `app/src/hooks/useInsights.ts` pode ser mantido (não quebra nada), mas não será mais importado pela InsightsPage.
2. `FeedingInsights.tsx` e `SleepInsights.tsx` não são mais importados pela InsightsPage. Podem ser deletados ou mantidos para referência.
3. Verificar que nenhum outro arquivo importa `useInsights` (buscar com grep). Se só era usado na InsightsPage, está seguro.

---

## STEP 10 — Testar

1. **Dropdown:** verificar que as 7 opções aparecem, e as sem dados ficam desabilitadas (cinza)
2. **Período "Hoje":** verificar contadores absolutos + "última às HH:MM"
3. **Período "7 dias":** verificar que mostra "Média/dia" e valores com 1 decimal
4. **Insights:** verificar que pelo menos 1 insight aparece quando há dados
5. **Free vs Yaya+:** verificar que free vê max 2 insights + banner, Yaya+ vê todos + gráfico
6. **Paywall:** verificar que o banner abre PaywallModal ao clicar
7. **Empty state:** verificar que sem logs mostra a mensagem "Registre atividades..."
8. **WeekChart:** verificar que continua funcionando com as DayTrends
9. **Responsividade:** verificar em telas menores que o dropdown não corta

---

## Ordem de execução recomendada

1. STEP 1 (referenceData.ts) — dados base
2. STEP 2 (insightRules.ts) — regras de insights
3. STEP 3 (useInsightsEngine.ts) — hook novo
4. STEP 4 (PeriodDropdown.tsx) — componente dropdown
5. STEP 5 (InsightCard.tsx) — card de insight
6. STEP 6 (InsightPaywallBanner.tsx) — banner paywall
7. STEP 7 (DaySummaryCard.tsx) — atualizar com período
8. STEP 8 (InsightsPage.tsx) — reescrever página completa → testar tudo
9. STEP 9 (limpeza)
10. STEP 10 (testes)
