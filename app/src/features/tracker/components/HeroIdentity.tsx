import { useState } from 'react'
import { useTimer } from '../../../hooks/useTimer'
import { useAppState } from '../../../contexts/AppContext'
import { formatTime, formatAge } from '../../../lib/formatters'
import BabySwitcher from '../../../components/ui/BabySwitcher'
import StreakBadge from './StreakBadge'
import { hapticLight } from '../../../lib/haptics'
import type { StreakData } from '../../../lib/streak'

interface HeroIdentityProps {
  streak?: StreakData | null;
}

export default function HeroIdentity({ streak }: HeroIdentityProps) {
  const now = useTimer()
  const { baby, babies } = useAppState()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  if (!baby) return null

  const hasMultiple = babies.length > 1

  const avatar = baby.photoUrl ? (
    <img
      src={baby.photoUrl}
      alt={baby.name}
      className="w-9 h-9 rounded-full object-cover"
    />
  ) : (
    <div className="w-9 h-9 rounded-full bg-primary-container/30 flex items-center justify-center">
      <span className="text-lg leading-none">
        {baby.gender === 'girl' ? '👧' : '👦'}
      </span>
    </div>
  )

  function handleOpenSwitcher() {
    hapticLight()
    setSwitcherOpen(true)
  }

  return (
    <>
      <section className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenSwitcher}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer active:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left"
          >
            {avatar}
            <div className="flex-1 min-w-0 flex items-baseline gap-1.5 overflow-hidden">
              <span className="font-headline text-base font-bold text-on-surface truncate shrink">
                {baby.name}
              </span>
              <span className="text-on-surface-variant font-label text-xs whitespace-nowrap shrink-0">
                · {formatAge(baby.birthDate)}
              </span>
              {hasMultiple && (
                <span className="material-symbols-outlined text-on-surface-variant text-base shrink-0">
                  expand_more
                </span>
              )}
            </div>
          </button>
          {streak && <StreakBadge streak={streak} />}
          <span className="font-headline text-xl font-extrabold text-on-surface tracking-tight">
            {formatTime(now)}
          </span>
        </div>
      </section>

      {switcherOpen && (
        <BabySwitcher onClose={() => setSwitcherOpen(false)} />
      )}
    </>
  )
}
