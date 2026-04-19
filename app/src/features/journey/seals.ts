/**
 * Três selos de categoria pros achievements da jornada-v1.
 *
 * **Não** são medalhas competitivas estilo Duolingo (bronze/silver/gold).
 * São símbolos sóbrios de **tipo de conquista**. Um achievement de
 * "descoberta" não é menor que um de "marco real" — são categorias
 * diferentes, ambos valem.
 *
 * Aparecem em:
 * - AchievementCard (canto inferior direito, 16px)
 * - CelebrationModal (destaque no topo, 48px)
 * - BigCelebration (label abaixo do emoji, 24px)
 */

export type SealKey = 'begin' | 'explorer' | 'milestone'

export interface Seal {
  key: SealKey
  emoji: string
  label: string
  /** Descrição curta — aparece em tooltips/details */
  description: string
  /** Cor de destaque usada em fundos sutis (tokens Tailwind). */
  colorToken: 'primary' | 'tertiary' | 'amber'
}

export const SEALS: Record<SealKey, Seal> = {
  begin: {
    key: 'begin',
    emoji: '🌱',
    label: 'Começo',
    description: 'Primeiros passos no acompanhamento.',
    colorToken: 'tertiary',
  },
  explorer: {
    key: 'explorer',
    emoji: '🔍',
    label: 'Explorador',
    description: 'Descobriu uma nova parte do app.',
    colorToken: 'primary',
  },
  milestone: {
    key: 'milestone',
    emoji: '🏅',
    label: 'Marco',
    description: 'Conquista real — de consistência ou de vida.',
    colorToken: 'amber',
  },
}
