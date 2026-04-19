import type { SealKey } from './seals'

/**
 * Registry de achievements da jornada-v1.
 *
 * 16 marcos em 3 camadas temporais (Começo / Explorador / Marco).
 * Cada um tem um nível de celebração (micro/medium/big) que determina
 * como o unlock aparece na tela.
 *
 * Backend (edge function `achievement-checker`) avalia os triggers e
 * insere em `app_achievements`. Client consome daqui pra:
 *   - Mostrar label/emoji/seal no sheet e nos cards
 *   - Decidir qual celebração disparar ao detectar novo unlock
 */

export type AchievementScope = 'user' | 'baby'

/** Nível de celebração quando o achievement é desbloqueado. */
export type CelebrationLevel = 'micro' | 'medium' | 'big'

export interface AchievementDef {
  key: string
  scope: AchievementScope
  seal: SealKey
  label: string
  emoji: string
  /** Descrição curta mostrada no sheet e na celebração. */
  description: string
  celebration: CelebrationLevel
  /**
   * Hint pro user de COMO destravar. Não aparece em locked (cria
   * curiosidade), mas aparece em unlocked como "por que ganhei?".
   */
  howTo: string
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // -------- Camada 1 · Começo --------
  {
    key: 'first_log',
    scope: 'baby',
    seal: 'begin',
    label: 'Primeiro registro',
    emoji: '✨',
    description: 'Sua rotina começou aqui.',
    celebration: 'medium',
    howTo: 'Registrar qualquer evento pela 1ª vez',
  },
  {
    key: 'three_different_kinds',
    scope: 'baby',
    seal: 'begin',
    label: 'Rotina completa',
    emoji: '🎯',
    description: 'Alimentação, sono e fralda — tudo no mapa.',
    celebration: 'micro',
    howTo: 'Registrar ao menos um de cada: alimentação + sono + fralda',
  },
  {
    key: 'first_full_day',
    scope: 'baby',
    seal: 'begin',
    label: 'Dia inteiro acompanhado',
    emoji: '🌤️',
    description: 'Manhã, tarde e noite — um dia todo documentado.',
    celebration: 'micro',
    howTo: 'Registrar algo em cada turno do mesmo dia',
  },

  // -------- Camada 2 · Explorador --------
  {
    key: 'discovered_insights',
    scope: 'user',
    seal: 'explorer',
    label: 'Padrões revelados',
    emoji: '📊',
    description: 'Você descobriu os insights do Yaya.',
    celebration: 'micro',
    howTo: 'Abrir a aba Insights',
  },
  {
    key: 'discovered_milestones',
    scope: 'user',
    seal: 'explorer',
    label: 'Desenvolvimento em foco',
    emoji: '🎯',
    description: 'Marcos de desenvolvimento ao seu alcance.',
    celebration: 'micro',
    howTo: 'Abrir a página de marcos',
  },
  {
    key: 'discovered_vaccines',
    scope: 'user',
    seal: 'explorer',
    label: 'Caderneta na mão',
    emoji: '💉',
    description: 'Caderneta de vacinas acessível a qualquer hora.',
    celebration: 'micro',
    howTo: 'Abrir a página de vacinas',
  },
  {
    key: 'discovered_leaps',
    scope: 'user',
    seal: 'explorer',
    label: 'Entendi os saltos',
    emoji: '⚡',
    description: 'Conhecendo as fases do desenvolvimento.',
    celebration: 'micro',
    howTo: 'Abrir a página de saltos',
  },
  {
    key: 'discovered_medications',
    scope: 'user',
    seal: 'explorer',
    label: 'Controle de medicamentos',
    emoji: '💊',
    description: 'Horários e doses sem sair do aplicativo.',
    celebration: 'micro',
    howTo: 'Abrir a página de medicamentos',
  },

  // -------- Camada 3 · Marco --------
  {
    key: 'first_week',
    scope: 'user',
    seal: 'milestone',
    label: 'Primeira semana completa',
    emoji: '📅',
    description: 'Sete dias com o Yaya do seu lado.',
    celebration: 'medium',
    howTo: 'Manter o streak por 7 dias',
  },
  {
    key: 'ten_feeds',
    scope: 'baby',
    seal: 'milestone',
    label: '10 amamentações registradas',
    emoji: '🤱',
    description: 'Rotina ganhando consistência.',
    celebration: 'micro',
    howTo: 'Registrar 10 amamentações (peito ou mamadeira)',
  },
  {
    key: 'first_caregiver',
    scope: 'user',
    seal: 'milestone',
    label: 'Cuidado compartilhado',
    emoji: '👥',
    description: 'Alguém mais cuida junto com você.',
    celebration: 'medium',
    howTo: 'Convidar um cuidador',
  },
  {
    key: 'baby_one_month',
    scope: 'baby',
    seal: 'milestone',
    label: '1 mês do bebê',
    emoji: '🎂',
    description: 'Um mês inteiro com seu pequeno.',
    celebration: 'big',
    howTo: 'Bebê completou 30 dias de vida',
  },
  {
    key: 'hundred_entries',
    scope: 'baby',
    seal: 'milestone',
    label: '100 momentos registrados',
    emoji: '💯',
    description: 'Uma biblioteca de memórias construída com cuidado.',
    celebration: 'medium',
    howTo: 'Acumular 100 registros',
  },
  {
    key: 'first_full_night',
    scope: 'baby',
    seal: 'milestone',
    label: 'Primeira noite inteira',
    emoji: '🌙',
    description: 'Aquela noite em que vocês dormiram de verdade.',
    celebration: 'big',
    howTo: 'Registrar um sono contínuo de 6h ou mais',
  },
  {
    key: 'thirty_days_streak',
    scope: 'user',
    seal: 'milestone',
    label: '30 dias de cuidado',
    emoji: '🔥',
    description: 'Um mês sem falhar um dia de atenção.',
    celebration: 'big',
    howTo: 'Manter o streak por 30 dias',
  },
  {
    key: 'first_shared_report',
    scope: 'user',
    seal: 'milestone',
    label: 'Pediatra no bolso',
    emoji: '📋',
    description: 'Relatório completo a um tap de distância.',
    celebration: 'medium',
    howTo: 'Gerar seu primeiro relatório compartilhável',
  },
] as const

export type AchievementKey = typeof ACHIEVEMENTS[number]['key']

/** Lookup O(1) por key. Não expõe o array pra evitar mutação. */
const byKey = new Map(ACHIEVEMENTS.map((a) => [a.key, a]))

export function getAchievement(key: string): AchievementDef | undefined {
  return byKey.get(key)
}

/** Usado pra agrupar no Sheet/JourneySection. */
export function achievementsBySeal(seal: SealKey): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.seal === seal)
}
