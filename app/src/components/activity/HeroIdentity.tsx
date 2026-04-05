import { useTimer } from '../../hooks/useTimer'
import { useAppState } from '../../contexts/AppContext'
import { formatTime, formatDateLong, formatAge } from '../../lib/formatters'

export default function HeroIdentity() {
  const now = useTimer()
  const { baby } = useAppState()

  return (
    <section className="text-center py-6 px-5">
      {baby && (
        <div className="inline-flex items-center gap-2 bg-surface-container rounded-full px-4 py-1.5 mb-4">
          <span className="material-symbols-outlined text-primary text-base">
            child_care
          </span>
          <span className="font-label text-sm text-on-surface font-medium">
            {baby.name}
          </span>
          <span className="text-on-surface-variant font-label text-xs">
            {formatAge(baby.birthDate)}
          </span>
        </div>
      )}
      <div className="font-headline text-5xl font-extrabold text-on-surface tracking-tight">
        {formatTime(now)}
      </div>
      <p className="font-label text-sm text-on-surface-variant mt-1 capitalize">
        {formatDateLong(now)}
      </p>
    </section>
  )
}
