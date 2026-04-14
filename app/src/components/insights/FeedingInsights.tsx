import type { FeedingPattern } from '../../hooks/useInsights'

interface Props {
  pattern: FeedingPattern
}

function formatInterval(minutes: number): string {
  if (minutes === 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, '0')}`
}

export default function FeedingInsights({ pattern }: Props) {
  const total = pattern.breastCount + pattern.bottleCount
  const breastPct = total > 0 ? (pattern.breastCount / total) * 100 : 0
  const bottlePct = total > 0 ? (pattern.bottleCount / total) * 100 : 0

  return (
    <div className="bg-surface-container rounded-md p-4">
      <h3 className="font-headline text-sm font-bold text-on-surface mb-3">
        🤱 Alimentação
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
            Intervalo médio
          </p>
          <p className="font-headline text-xl font-bold text-on-surface">
            {pattern.avgIntervalMinutes > 0
              ? `a cada ${formatInterval(pattern.avgIntervalMinutes)}`
              : '—'}
          </p>
        </div>
        <div>
          <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wider">
            Mamadeira hoje
          </p>
          <p className="font-headline text-xl font-bold text-on-surface">
            {pattern.totalBottleMl > 0 ? `${pattern.totalBottleMl}ml` : '—'}
          </p>
        </div>
      </div>

      {total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-label text-[10px] text-on-surface-variant">
              Peito ({pattern.breastCount})
            </span>
            <span className="font-label text-[10px] text-on-surface-variant">
              Mamadeira ({pattern.bottleCount})
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden flex">
            {breastPct > 0 && (
              <div
                className="bg-tertiary rounded-l-full transition-all"
                style={{ width: `${breastPct}%` }}
              />
            )}
            {bottlePct > 0 && (
              <div
                className="bg-primary rounded-r-full transition-all"
                style={{ width: `${bottlePct}%` }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
