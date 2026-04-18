/**
 * Presets de spring da Framer Motion + haptic sincronizado.
 *
 * Três níveis — escolha pela intenção, não pela duração:
 *
 *   - `subtle`    — taps em botões, toggles pequenos. Quase imperceptível,
 *                   feedback físico rápido. haptic light.
 *   - `delight`   — sheets abrindo, modals, swipe-dismiss. Movimento natural
 *                   com pouco bounce. haptic medium.
 *   - `milestone` — conquistas, marcos, celebrações. Bouncy, pede atenção.
 *                   haptic heavy.
 *
 * Uso com Framer:
 *   ```tsx
 *   import { motion } from 'framer-motion'
 *   import { spring } from '@/lib/motion'
 *
 *   <motion.button whileTap={{ scale: 0.95 }} transition={spring.subtle}>
 *   ```
 *
 * Uso com haptic sincronizado (dispara no mesmo frame):
 *   ```tsx
 *   import { triggerPreset } from '@/lib/motion'
 *
 *   onClick={() => { triggerPreset('subtle'); doThing() }}
 *   ```
 *
 * Reduced-motion: quando o usuário pede `prefers-reduced-motion: reduce`,
 * os springs ficam instantâneos (duration 0) e o haptic ainda dispara —
 * o feedback físico vale acessibilidade tanto quanto a animação visual.
 */

import { hapticLight, hapticMedium, hapticHeavy } from './haptics'

export type MotionPreset = 'subtle' | 'delight' | 'milestone'

/**
 * Spring configs por preset. Valores calibrados à mão pra "sentir" certo
 * em tela, não derivados matematicamente. Mexer aqui muda o tom do app.
 */
export const spring: Record<MotionPreset, {
  type: 'spring'
  stiffness: number
  damping: number
  mass?: number
}> = {
  subtle: { type: 'spring', stiffness: 400, damping: 25 },
  delight: { type: 'spring', stiffness: 260, damping: 20 },
  milestone: { type: 'spring', stiffness: 150, damping: 14, mass: 1.1 },
}

/**
 * Tween fallback usado quando o usuário pede reduced-motion — substitui
 * o spring por uma transição quase instantânea, mantendo o estado final
 * correto sem movimento perceptível.
 */
export const reducedMotion = { type: 'tween' as const, duration: 0 }

/**
 * Retorna true se o usuário pediu reduced-motion. Safe pra SSR/web-only —
 * `matchMedia` existe em qualquer browser moderno; em ambiente sem DOM
 * (improvável no Yaya, mas por segurança) o fallback é false.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Retorna o transition apropriado pro preset, respeitando reduced-motion.
 */
export function getTransition(preset: MotionPreset) {
  return prefersReducedMotion() ? reducedMotion : spring[preset]
}

/**
 * Dispara o haptic correspondente ao preset. Use pra sincronizar feedback
 * físico com a animação visual — ambos no mesmo frame.
 */
export function triggerPreset(preset: MotionPreset) {
  switch (preset) {
    case 'subtle':
      hapticLight()
      break
    case 'delight':
      hapticMedium()
      break
    case 'milestone':
      hapticHeavy()
      break
  }
}
