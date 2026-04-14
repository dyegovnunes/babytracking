import type { PeriodSummary } from '../useInsightsEngine'
import { formatMinutes } from '../../../lib/referenceData'

interface Props {
  summary: PeriodSummary
}

type StatKey = 'feeds' | 'diapers' | 'sleepCycles'

const stats: { key: StatKey; emoji: string; label: string; bg: string; lastKey: keyof PeriodSummary }[] = [
  { key: 'feeds', emoji: '🤱', label: 'Amamentações', bg: 'bg-tertiary/10', lastKey: 'lastFeedTime' },
  { key: 'diapers', emoji: '💧', label: 'Fraldas', bg: 'bg-secondary/10', lastKey: 'lastDiaperTime' },
  { key: 'sleepCycles', emoji: '🌙', label: 'Sonos', bg: 'bg-primary/10', lastKey: 'lastSleepTime' },
]

function formatLastTime(ts?: number): string | null {
  if (!ts) return null
  const d = new Date(ts)
  return `última ${d
    .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h')}`
}

export default function DaySummaryCard({ summary }: Props) {
  const title = summary.isAverage
    ? `Média/dia · ${summary.periodLabel}`
    : 'Resumo de hoje'

  return (
    <div>
      <h3 className="font-headline text-sm font-bold text-on-surface mb-3">{title}</h3>
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => {
          const value = summary[s.key]
          const last = !summary.isAverage ? formatLastTime(summary[s.lastKey] as number | undefined) : null
          return (
            <div
              key={s.key}
              className={`rounded-md p-3 flex flex-col items-center gap-1 ${s.bg}`}
            >
              <span className="text-xl leading-none">{s.emoji}</span>
              <span className="font-headline text-2xl font-extrabold text-on-surface leading-none mt-1">
                {value}
              </span>
              <span className="font-label text-[10px] text-on-surface-variant">
                {s.label}
              </span>
              {last && (
                <span className="font-label text-[9px] text-on-surface-variant/60 mt-0.5">
                  {last}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 space-y-0.5 text-center">
        {summary.totalSleepMinutes > 0 && (
          <p className="font-label text-xs text-on-surface-variant">
            🌙 {formatMinutes(summary.totalSleepMinutes)}{' '}
            {summary.isAverage ? 'de sono/dia' : 'de sono hoje'}
          </p>
        )}
        {summary.totalBottleMl > 0 && (
          <p className="font-label text-xs text-on-surface-variant">
            🍼 {summary.totalBottleMl}ml{' '}
            {summary.isAverage ? 'em mamadeira/dia' : 'em mamadeira hoje'}
          </p>
        )}
      </div>
    </div>
  )
}
