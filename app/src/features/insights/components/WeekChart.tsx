import { useState } from 'react'
import type { DayTrend } from '../useInsightsEngine'

interface Props {
  trends: DayTrend[]
}

type Metric = 'feeds' | 'diapers' | 'sleepMinutes'

const metrics: { key: Metric; label: string; emoji: string }[] = [
  { key: 'feeds', label: 'Amamentações', emoji: '🤱' },
  { key: 'diapers', label: 'Fraldas', emoji: '💧' },
  { key: 'sleepMinutes', label: 'Sono (min)', emoji: '🌙' },
]

export default function WeekChart({ trends }: Props) {
  const [metric, setMetric] = useState<Metric>('feeds')

  const values = trends.map((t) => t[metric])
  const max = Math.max(...values, 1)

  return (
    <div className="bg-surface-container rounded-md p-4">
      <h3 className="font-headline text-sm font-bold text-on-surface mb-3">
        Últimos 7 dias
      </h3>

      <div className="flex gap-1.5 mb-4">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            className={`flex-1 py-1.5 rounded-md font-label text-[10px] font-semibold transition-colors ${
              metric === m.key
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-stretch justify-between gap-1.5 h-36">
        {trends.map((day, i) => {
          const value = day[metric]
          const pct = max > 0 ? (value / max) * 100 : 0
          const isToday = i === trends.length - 1

          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 h-full"
            >
              <span className="font-label text-[9px] text-on-surface-variant font-semibold h-3">
                {value > 0 ? value : ''}
              </span>
              <div className="w-full flex-1 flex items-end min-h-0">
                <div
                  className={`w-full rounded-t-md transition-all ${
                    isToday ? 'bg-primary' : 'bg-primary/40'
                  }`}
                  style={{
                    height: value > 0 ? `${Math.max(pct, 8)}%` : '0%',
                  }}
                />
              </div>
              <span
                className={`font-label text-[9px] ${
                  isToday ? 'text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                {day.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
