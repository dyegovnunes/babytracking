import type { SleepPattern } from '../../hooks/useInsights'

interface Props {
  pattern: SleepPattern
}

function formatMinutes(min: number): string {
  if (min === 0) return '0min'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m}min`
}

export default function SleepInsights({ pattern }: Props) {
  // Proportion of 24h spent sleeping
  const sleepPct = Math.min((pattern.totalMinutes / 1440) * 100, 100)
  const awakePct = 100 - sleepPct

  return (
    <div className="bg-surface-container rounded-md p-4">
      <h3 className="font-headline text-sm font-bold text-on-surface mb-3">
        🌙 Sono
      </h3>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-headline text-3xl font-extrabold text-on-surface">
          {formatMinutes(pattern.totalMinutes)}
        </span>
        <span className="font-label text-xs text-on-surface-variant">
          de sono hoje
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div>
          <p className="font-label text-[10px] text-on-surface-variant">Cochilos</p>
          <p className="font-headline text-lg font-bold text-on-surface">
            {pattern.napCount}
          </p>
        </div>
        <div>
          <p className="font-label text-[10px] text-on-surface-variant">Média</p>
          <p className="font-headline text-lg font-bold text-on-surface">
            {pattern.avgNapMinutes > 0 ? formatMinutes(pattern.avgNapMinutes) : '—'}
          </p>
        </div>
        <div>
          <p className="font-label text-[10px] text-on-surface-variant">Maior</p>
          <p className="font-headline text-lg font-bold text-on-surface">
            {pattern.longestNapMinutes > 0 ? formatMinutes(pattern.longestNapMinutes) : '—'}
          </p>
        </div>
      </div>

      {pattern.totalMinutes > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-label text-[10px] text-on-surface-variant">
              Dormindo
            </span>
            <span className="font-label text-[10px] text-on-surface-variant">
              Acordado
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface-container-high overflow-hidden flex">
            <div
              className="bg-primary rounded-l-full transition-all"
              style={{ width: `${sleepPct}%` }}
            />
            <div
              className="bg-surface-container-highest rounded-r-full transition-all"
              style={{ width: `${awakePct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
