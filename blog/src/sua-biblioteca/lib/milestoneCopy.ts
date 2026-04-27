// milestoneCopy — microcopy contextual pros marcos do leitor.
// Tom inclusivo: 2ª pessoa do singular ("você"), evita gendered defaults.
// Público é diverso (mãe, pai, cuidador/a, doula, parceiro/a, avó).

import type { GuideSection } from '../../types'

export interface PartCelebrationCopy {
  eyebrow: string
  title: string
  microcopy: string
  ctaPrimary: string
  ctaSecondary: string
}

/**
 * Microcopy específica por parte do "Guia das Últimas Semanas".
 * Indexada pelo slug da parte (gerado pelo seed: `parte-N-...`).
 *
 * Fallback genérico cobre qualquer parte de qualquer guide futuro.
 */
const PART_COPY_BY_SLUG: Record<string, Omit<PartCelebrationCopy, 'ctaPrimary' | 'ctaSecondary'>> = {
  'parte-1-preparacao': {
    eyebrow: 'PARTE CONCLUÍDA',
    title: 'Você passou pela preparação',
    microcopy: 'Agora é o parto. Vamos pelo que esperar nas próximas horas.',
  },
  'parte-2-o-parto': {
    eyebrow: 'PARTE CONCLUÍDA',
    title: 'Você entendeu o que esperar',
    microcopy: 'Hora dos primeiros dias em casa com o bebê.',
  },
  'parte-3-primeiras-72-horas-em-casa': {
    eyebrow: 'PARTE CONCLUÍDA',
    title: 'Você passou pelo mais intenso',
    microcopy: 'Agora é a rotina das primeiras semanas — pequenos padrões começam a aparecer.',
  },
  'parte-4-primeiras-quatro-semanas-semana-a-semana': {
    eyebrow: 'PARTE CONCLUÍDA',
    title: 'Você concluiu o primeiro mês',
    microcopy: 'O bebê já sente seu cheiro, sua voz, seu jeito. Continue acompanhando no app.',
  },
  'introducao-voce-esta-quase-la': {
    eyebrow: 'INTRODUÇÃO CONCLUÍDA',
    title: 'Você entrou na biblioteca',
    microcopy: 'Vamos começar pela preparação para o parto.',
  },
}

const FALLBACK_PART: Omit<PartCelebrationCopy, 'ctaPrimary' | 'ctaSecondary'> = {
  eyebrow: 'PARTE CONCLUÍDA',
  title: 'Mais um capítulo concluído',
  microcopy: 'Continue no seu ritmo — cada parte se conecta à próxima.',
}

export function getPartCelebrationCopy(
  partSection: GuideSection | null | undefined,
  nextSection: GuideSection | null | undefined,
): PartCelebrationCopy {
  const base = (partSection?.slug && PART_COPY_BY_SLUG[partSection.slug]) || FALLBACK_PART
  return {
    ...base,
    ctaPrimary: nextSection ? `Continuar para ${nextSection.title}` : 'Voltar ao índice',
    ctaSecondary: 'Pausar por hoje',
  }
}

// ── Microcopy de toast por tipo de milestone ──────────────────────────────
export interface MilestoneToastCopy {
  icon: string  // Material Symbol name
  title: string
  body?: string
}

export const MILESTONE_TOAST_COPY: Record<string, MilestoneToastCopy> = {
  'first-highlight': {
    icon: 'auto_awesome',
    title: 'Primeiro destaque salvo',
    body: 'Seus highlights ficam guardados na sua biblioteca.',
  },
  'first-note': {
    icon: 'edit_note',
    title: 'Primeira nota salva',
    body: 'Suas anotações são privadas e ficam acessíveis a qualquer hora.',
  },
  '5-highlights': {
    icon: 'star',
    title: '5 trechos destacados',
  },
  '10-highlights': {
    icon: 'star',
    title: '10 trechos destacados',
    body: 'Você está marcando os pontos importantes pra revisitar.',
  },
  '20-highlights': {
    icon: 'star',
    title: '20 trechos destacados',
    body: 'Que biblioteca pessoal rica você está construindo.',
  },
  'first-checklist-completed': {
    icon: 'task_alt',
    title: 'Checklist completo',
    body: 'Mais um passo concreto da preparação resolvido.',
  },
  'all-checklists-completed': {
    icon: 'verified',
    title: 'Todos os checklists concluídos',
    body: 'Você está com tudo organizado.',
  },
  'quiz-completed': {
    icon: 'psychology',
    title: 'Quiz respondido',
    body: 'Suas seções recomendadas estão marcadas no índice.',
  },
}

// ── Copy da tela de conclusão do guia inteiro ─────────────────────────────
export interface GuideCompletionCopy {
  eyebrow: string
  title: string
  subtitle: string
  shareCaption: string
  ctaPrimary: string
  ctaSecondary: string
  ctaTertiary: string
}

export function getGuideCompletionCopy(guideTitle: string): GuideCompletionCopy {
  return {
    eyebrow: 'VOCÊ CONCLUIU 💜',
    title: guideTitle,
    subtitle: 'Você acompanhou cada etapa — da preparação ao primeiro mês com o bebê.',
    shareCaption: `Concluí o ${guideTitle} no Yaya 💜`,
    ctaPrimary: 'Continue cuidando da rotina no Yaya',
    ctaSecondary: 'Ver próximo guia',
    ctaTertiary: 'Voltar à leitura',
  }
}
