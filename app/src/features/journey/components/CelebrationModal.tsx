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

interface Confetti {
  id: number
  left: number
  delay: number
  duration: number
  color: string
  size: number
}

const CONFETTI_COLORS = ['#b79fff', '#ff96b9', '#ffd86e', '#7dffba']

function makeConfetti(count: number): Confetti[] {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 1.2 + Math.random() * 0.8,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 5 + Math.floor(Math.random() * 5),
  }))
}

/**
 * Celebração nível MEDIUM — modal centralizado com spring delight,
 * confetti discreto (20 peças), haptic heavy+success em 2 camadas.
 *
 * Disparado quando um achievement de nível `medium` é destravado
 * (first_log, first_week, first_caregiver, hundred_entries,
 * first_shared_report, first_month_in_app).
 *
 * Não é fullscreen — tem backdrop escuro 70% mas o card é centralizado
 * e dismissable. User pode fechar ou tocar "Ver jornada" pra ir pro sheet.
 */
export default function CelebrationModal({
  achievement,
  onClose,
  onViewJourney,
}: Props) {
  const seal = SEALS[achievement.seal]
  const pieces = useMemo(() => makeConfetti(20), [])
  useSheetBackClose(true, onClose)

  useEffect(() => {
    hapticHeavy()
    const t = setTimeout(() => hapticSuccess(), 180)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Conquista desbloqueada: ${achievement.label}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Confetti layer */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-[-20px] block rounded-sm confetti-fall-medium"
            style={{
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 1.5}px`,
              background: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes confetti-fall-medium {
          0%   { transform: translate3d(0, -20px, 0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate3d(0, 80vh, 0) rotate(420deg); opacity: 0; }
        }
        .confetti-fall-medium {
          animation-name: confetti-fall-medium;
          animation-timing-function: cubic-bezier(.35,.2,.4,1);
          animation-fill-mode: forwards;
        }
      `}</style>

      {/* Card centralizado */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={spring.delight}
        className="relative z-10 w-full max-w-sm bg-surface-container-highest rounded-md p-6 border-t-2 border-primary-fixed shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
      >
        {/* Selo no topo */}
        <div className="flex flex-col items-center">
          <span
            className="text-5xl mb-1 leading-none"
            aria-hidden
            title={seal.description}
          >
            {seal.emoji}
          </span>
          <span className="font-label text-[11px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-4">
            {seal.label}
          </span>

          {/* Emoji do achievement em destaque */}
          <motion.span
            className="text-7xl leading-none mb-3"
            aria-hidden
            initial={{ scale: 0.4, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...spring.delight, delay: 0.1 }}
          >
            {achievement.emoji}
          </motion.span>

          <h2 className="font-headline text-xl font-bold text-on-surface text-center leading-tight mb-1">
            {achievement.label}
          </h2>
          <p className="font-label text-sm text-on-surface-variant text-center leading-relaxed mb-5 max-w-xs">
            {achievement.description}
          </p>

          <div className="flex gap-2 w-full">
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
      </motion.div>
    </div>
  )
}
