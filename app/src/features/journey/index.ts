/**
 * Barrel exports do módulo `features/journey/`.
 *
 * Só expõe o que consumidores externos precisam. Componentes internos
 * (CelebrationModal, AchievementCard, etc) ficam encapsulados.
 */

export { ACHIEVEMENTS, getAchievement, achievementsBySeal } from './achievements'
export type {
  AchievementDef,
  AchievementKey,
  AchievementScope,
  CelebrationLevel,
} from './achievements'

export { SEALS } from './seals'
export type { SealKey, Seal } from './seals'

export { DISCOVERY_HINTS, renderHintCopy, selectActiveHint } from './hints'
export type { DiscoveryHint, HintContext } from './hints'
