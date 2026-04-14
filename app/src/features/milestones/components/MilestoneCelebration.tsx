import { useEffect, useMemo, useState } from 'react'
import type { Milestone } from '../milestoneData'
import { formatAgeAtDate } from '../milestoneData'
import { hapticSuccess } from '../../../lib/haptics'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  milestone: Milestone
  babyName: string
  achievedAt: string
  birthDate: string
  photoUrl?: string | null
  note?: string | null
  onClose: () => void
  onShare: () => void
}

interface ConfettiPiece {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  rotate: number
  size: number
}

const COLORS = ['#b79fff', '#7dffba', '#ff96b9', '#ffd86e', '#80e6ff']

function makeConfetti(count: number): ConfettiPiece[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.6 + Math.random() * 1.2,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotate: Math.random() * 360,
    size: 6 + Math.floor(Math.random() * 7),
  }))
}

export default function MilestoneCelebration({
  milestone,
  babyName,
  achievedAt,
  birthDate,
  photoUrl,
  note,
  onClose,
  onShare,
}: Props) {
  const [showConfetti, setShowConfetti] = useState(true)
  const pieces = useMemo(() => makeConfetti(60), [])
  useSheetBackClose(true, onClose)

  useEffect(() => {
    hapticSuccess()
    const t = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(t)
  }, [])

  const ageLabel = formatAgeAtDate(birthDate, achievedAt)
  const dateLabel = new Date(achievedAt + 'T12:00:00').toLocaleDateString(
    'pt-BR',
    { day: '2-digit', month: 'long', year: 'numeric' },
  )

  return (
    <div className="fixed inset-0 z-[60] bg-background/98 backdrop-blur-sm flex flex-col overflow-y-auto">
      {/* Confetti layer */}
      {showConfetti && (
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {pieces.map((p) => (
            <span
              key={p.id}
              className="absolute top-[-24px] block rounded-sm confetti-fall"
              style={{
                left: `${p.left}%`,
                width: `${p.size}px`,
                height: `${p.size * 1.6}px`,
                background: p.color,
                transform: `rotate(${p.rotate}deg)`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translate3d(0,-30px,0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate3d(0,105vh,0) rotate(720deg); opacity: 0; }
        }
        .confetti-fall { animation-name: confetti-fall; animation-timing-function: cubic-bezier(.35,.2,.4,1); animation-fill-mode: forwards; }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10">
        <span className="font-label text-xs uppercase tracking-[0.2em] text-tertiary font-bold mb-3">
          Parabéns!
        </span>
        <h2 className="font-headline text-2xl font-bold text-on-surface mb-1 leading-tight">
          {babyName} alcançou
        </h2>

        {photoUrl ? (
          <div className="my-5 w-40 h-40 rounded-full overflow-hidden border-4 border-tertiary/40 shadow-xl">
            <img
              src={photoUrl}
              alt={milestone.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="my-5 text-8xl">{milestone.emoji}</div>
        )}

        <h3 className="font-headline text-xl font-extrabold text-primary mb-1 leading-tight">
          {milestone.name}
        </h3>
        <p className="font-label text-sm text-on-surface-variant mb-1">
          Com {ageLabel}
        </p>
        <p className="font-label text-xs text-on-surface-variant/60 mb-4">
          {dateLabel}
        </p>

        {note && (
          <p className="font-body italic text-sm text-on-surface/80 max-w-xs leading-relaxed">
            “{note}”
          </p>
        )}
      </div>

      <div className="relative z-10 px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex-1 py-3 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-sm flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">share</span>
          Compartilhar
        </button>
      </div>
    </div>
  )
}
