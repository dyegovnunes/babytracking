import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { AchievementDef } from '../achievements'
import { SEALS } from '../seals'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticHeavy, hapticSuccess } from '../../../lib/haptics'
import { spring } from '../../../lib/motion'

interface Props {
  achievement: AchievementDef
  onClose: () => void
  onViewJourney: () => void
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

/**
 * Celebração nível BIG — fullscreen imersivo reusando a mesma estrutura
 * visual de MilestoneCelebration. Confetti denso (60 peças, 3s), ícone
 * com spring milestone bouncy, 8 estrelinhas radiais, haptic em 2 camadas.
 *
 * Disparado só pros 3 marcos de VIDA: baby_one_month, first_full_night,
 * thirty_days_streak. Esses merecem pausa emocional fullscreen.
 */
export default function BigCelebration({
  achievement,
  onClose,
  onViewJourney,
}: Props) {
  const seal = SEALS[achievement.seal]
  const pieces = useMemo(() => makeConfetti(60), [])
  const sparkles = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2
        return {
          id: i,
          x: Math.cos(angle) * 120,
          y: Math.sin(angle) * 120,
          delay: 0.1 + i * 0.03,
        }
      }),
    [],
  )
  useSheetBackClose(true, onClose)

  useEffect(() => {
    hapticHeavy()
    const t = setTimeout(() => hapticSuccess(), 180)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] bg-background/98 backdrop-blur-sm flex flex-col overflow-y-auto">
      {/* Confetti layer */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-[-24px] block rounded-sm confetti-fall-big"
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

      <style>{`
        @keyframes confetti-fall-big {
          0%   { transform: translate3d(0,-30px,0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate3d(0,105vh,0) rotate(720deg); opacity: 0; }
        }
        .confetti-fall-big {
          animation-name: confetti-fall-big;
          animation-timing-function: cubic-bezier(.35,.2,.4,1);
          animation-fill-mode: forwards;
        }
      `}</style>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center relative z-10">
        <span className="font-label text-xs uppercase tracking-[0.2em] text-tertiary font-bold mb-3">
          Parabéns!
        </span>

        {/* Selo grande no topo */}
        <span
          className="text-3xl mb-1 leading-none opacity-80"
          aria-hidden
          title={seal.description}
        >
          {seal.emoji}
        </span>
        <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4">
          {seal.label}
        </span>

        {/* Ícone com spring milestone (bouncy) + estrelinhas emergindo */}
        <div className="relative my-5">
          <motion.div
            initial={{ scale: 0.2, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={spring.milestone}
          >
            <div className="text-8xl leading-none">{achievement.emoji}</div>
          </motion.div>
          <div className="absolute inset-0 pointer-events-none">
            {sparkles.map((s) => (
              <motion.span
                key={s.id}
                aria-hidden
                className="absolute top-1/2 left-1/2 text-lg"
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.3 }}
                animate={{
                  x: s.x,
                  y: s.y,
                  opacity: [0, 1, 0],
                  scale: [0.3, 1, 0.6],
                }}
                transition={{ duration: 0.9, delay: s.delay, ease: 'easeOut' }}
              >
                ✨
              </motion.span>
            ))}
          </div>
        </div>

        <h2 className="font-headline text-2xl font-extrabold text-primary mb-1 leading-tight max-w-xs">
          {achievement.label}
        </h2>
        <p className="font-body text-sm text-on-surface/80 leading-relaxed max-w-xs">
          {achievement.description}
        </p>
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
          onClick={onViewJourney}
          className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label font-bold text-sm"
        >
          Ver jornada
        </button>
      </div>
    </div>
  )
}
