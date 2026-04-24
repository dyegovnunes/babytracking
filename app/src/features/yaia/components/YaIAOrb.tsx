import { motion } from 'framer-motion'
import { prefersReducedMotion } from '../../../lib/motion'

/**
 * Orb da yaIA — identidade visual reutilizável.
 *
 * Usado no header, empty state, typing indicator e avatar das bubbles.
 * Estrutura em 3 camadas: halo externo (glow blur), orb com gradiente
 * roxo→rosa, logo Yaya no centro.
 *
 * Breathing = animação sutil contínua. Pulsing = acelera quando IA responde.
 */

type OrbSize = 'sm' | 'md' | 'lg'

interface YaIAOrbProps {
  size?: OrbSize
  breathing?: boolean
  pulsing?: boolean
  className?: string
}

const SIZES: Record<OrbSize, { px: number; logoPct: number; haloPx: number }> = {
  sm: { px: 28, logoPct: 0.6, haloPx: 4 },
  md: { px: 44, logoPct: 0.6, haloPx: 8 },
  lg: { px: 96, logoPct: 0.62, haloPx: 14 },
}

export default function YaIAOrb({
  size = 'md',
  breathing = true,
  pulsing = false,
  className = '',
}: YaIAOrbProps) {
  const dims = SIZES[size]
  const reduceMotion = prefersReducedMotion()
  const animate = !reduceMotion && (breathing || pulsing)
  // Pulsing acelera ritmo e escala um pouco mais.
  const duration = pulsing ? 1.5 : 3
  const scaleTo = pulsing ? 1.09 : 1.06

  const logoSize = Math.round(dims.px * dims.logoPct)

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: dims.px, height: dims.px }}
      animate={animate ? { scale: [1, scaleTo, 1] } : undefined}
      transition={
        animate
          ? { duration, repeat: Infinity, ease: 'easeInOut' }
          : undefined
      }
      aria-hidden
    >
      {/* Halo externo — gradiente radial roxo→rosa difuso. */}
      <motion.span
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(107,78,201,0.45) 0%, rgba(212,165,165,0.22) 55%, transparent 100%)',
          filter: `blur(${dims.haloPx}px)`,
          transform: 'scale(1.25)',
        }}
        animate={animate ? { opacity: [0.7, 1, 0.7] } : undefined}
        transition={
          animate
            ? { duration, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
      />

      {/* Orb principal — gradiente sólido primary→tertiary, com brilho superior. */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.25) 0%, transparent 45%), linear-gradient(135deg, #7856d3 0%, #6b4ec9 40%, #c48ea8 100%)',
          boxShadow:
            '0 8px 24px rgba(107,78,201,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      />

      {/* Ring sutil pra separar do fundo. */}
      <span className="absolute inset-0 rounded-full ring-1 ring-white/15" />

      {/* Logo Yaya no centro. */}
      <img
        src="./landing/symbol-light.png"
        alt=""
        width={logoSize}
        height={logoSize}
        className="relative z-10 select-none pointer-events-none"
        style={{
          width: logoSize,
          height: logoSize,
          filter:
            'drop-shadow(0 0 6px rgba(255,255,255,0.4)) drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
        }}
        draggable={false}
      />
    </motion.div>
  )
}
