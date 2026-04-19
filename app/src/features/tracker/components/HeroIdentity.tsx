import { useState } from 'react'
import { useTimer } from '../../../hooks/useTimer'
import { useAppState } from '../../../contexts/AppContext'
import { useAuth } from '../../../contexts/AuthContext'
import { formatTime } from '../../../lib/formatters'
import BabySwitcher from '../../../components/ui/BabySwitcher'
import StreakBadge from './StreakBadge'
import { hapticLight } from '../../../lib/haptics'
import type { StreakData } from '../../../lib/streak'
import { getGreeting, type GreetingTone } from '../../../lib/greeting'
import JourneyBadge from '../../journey/components/JourneyBadge'

interface HeroIdentityProps {
  streak?: StreakData | null;
}

// Cores do eyebrow por tom — night usa índigo claro pra sinalizar
// madrugada sem competir com primary/tertiary. Demais tons seguem
// a paleta lavender-muted já definida (metadata neutra).
const TONE_CLASSES: Record<GreetingTone, string> = {
  morning: 'text-on-surface-variant',
  day: 'text-on-surface-variant',
  dusk: 'text-on-surface-variant',
  night: 'text-indigo-300 dark:text-indigo-300',
}

export default function HeroIdentity({ streak }: HeroIdentityProps) {
  const now = useTimer()
  const { baby, babies, members, quietHours } = useAppState()
  const { user } = useAuth()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  if (!baby) return null

  const hasMultiple = babies.length > 1

  // Parent name: busca pelo user_id atual em members; fallback vazio.
  const parentFirstName = user ? members[user.id]?.displayName : undefined
  const greeting = getGreeting(now, parentFirstName, baby.name, quietHours)

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
      <section className="px-5 pt-4 pb-2" data-tone={greeting.tone}>
        {greeting.salutation && (
          <p
            className={`font-label text-[10px] font-semibold uppercase tracking-[0.12em] mb-1.5 ${TONE_CLASSES[greeting.tone]}`}
          >
            {greeting.salutation}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenSwitcher}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer active:opacity-80 transition-opacity bg-transparent border-0 p-0 text-left"
          >
            {avatar}
            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden">
              {/*
                Nome completo sem truncate — idade saiu da home por não
                ser relevante aqui. Se houver múltiplos bebês, o caret
                aparece colado no nome pra abrir o BabySwitcher.
              */}
              <span className="font-headline text-base font-bold text-on-surface">
                {baby.name}
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
        {/* JourneyBadge: pill sutil abaixo do nome quando há marcos novos */}
        <div className="mt-2 min-h-[1px]">
          <JourneyBadge />
        </div>
      </section>

      {switcherOpen && (
        <BabySwitcher onClose={() => setSwitcherOpen(false)} />
      )}
    </>
  )
}
