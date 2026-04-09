import type { DaySummary } from '../../hooks/useInsights'

interface Props {
  summary: DaySummary
}

const stats = [
  { key: 'feeds', emoji: '🤱', label: 'Amamentações', bg: 'bg-tertiary/10' },
  { key: 'diapers', emoji: '💧', label: 'Fraldas', bg: 'bg-secondary/10' },
  { key: 'sleepCycles', emoji: '🌙', label: 'Sonos', bg: 'bg-primary/10' },
] as const

export default function DaySummaryCard({ summary }: Props) {
  return (
    <div>
      <h3 className="font-headline text-sm font-bold text-on-surface mb-3">
        Resumo de hoje
      </h3>
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.key}
            className={`rounded-xl p-3.5 flex flex-col items-center gap-1.5 ${s.bg}`}
          >
            <span className="text-xl leading-none">{s.emoji}</span>
            <span className="font-headline text-2xl font-extrabold text-on-surface">
              {summary[s.key]}
            </span>
            <span className="font-label text-[10px] text-on-surface-variant">
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {summary.totalBottleMl > 0 && (
        <p className="font-label text-xs text-on-surface-variant mt-2 text-center">
          🍼 {summary.totalBottleMl}ml em mamadeira hoje
        </p>
      )}
    </div>
  )
}
