import type { AgeBand } from './ageUtils'

export type MilestoneCategory =
  | 'motor'
  | 'cognitivo'
  | 'social'
  | 'linguagem'
  | 'alimentacao'
  | 'autonomia'
  | 'motor_fino'
  | 'comunicacao'

export interface Milestone {
  id?: string
  code: string
  name: string
  description: string
  emoji: string
  category: MilestoneCategory
  typicalAgeDaysMin: number
  typicalAgeDaysMax: number
  ageBand: AgeBand
  sortOrder: number
}

export interface BabyMilestone {
  id: string
  babyId: string
  milestoneId: string
  milestoneCode: string
  achievedAt: string // YYYY-MM-DD
  photoUrl: string | null
  note: string | null
  recordedBy: string | null
  createdAt: string
}

export const MILESTONES: Milestone[] = [
  // ---- newborn (0-2 meses) ----
  { code: 'fixes_gaze',       name: 'Fixa o olhar em rostos',              description: 'O bebê olha diretamente para o rosto de quem está perto.',         emoji: '👀', category: 'cognitivo', typicalAgeDaysMin: 15,  typicalAgeDaysMax: 45,  ageBand: 'newborn', sortOrder: 1 },
  { code: 'first_smile',      name: 'Primeiro sorriso social',             description: 'O primeiro sorriso intencional, em resposta a um rosto ou voz.',   emoji: '😊', category: 'social',    typicalAgeDaysMin: 35,  typicalAgeDaysMax: 56,  ageBand: 'newborn', sortOrder: 2 },
  { code: 'tracks_objects',   name: 'Segue objetos com os olhos',          description: 'Acompanha um objeto em movimento com o olhar.',                    emoji: '👁️', category: 'cognitivo', typicalAgeDaysMin: 45,  typicalAgeDaysMax: 75,  ageBand: 'newborn', sortOrder: 3 },
  { code: 'lifts_head_brief', name: 'Levanta a cabeça brevemente',         description: 'Quando de barriga, levanta a cabeça por alguns segundos.',         emoji: '💪', category: 'motor',     typicalAgeDaysMin: 15,  typicalAgeDaysMax: 45,  ageBand: 'newborn', sortOrder: 4 },
  // ---- early (2-4 meses) ----
  { code: 'holds_head_steady',name: 'Sustenta a cabeça firme',             description: 'Mantém a cabeça firme e estável sem apoio.',                       emoji: '💪', category: 'motor',     typicalAgeDaysMin: 60,  typicalAgeDaysMax: 105, ageBand: 'early',   sortOrder: 5 },
  { code: 'laughs_aloud',     name: 'Ri alto (gargalhada)',                description: 'A primeira gargalhada verdadeira.',                                emoji: '😂', category: 'social',    typicalAgeDaysMin: 90,  typicalAgeDaysMax: 120, ageBand: 'early',   sortOrder: 6 },
  { code: 'grasps_objects',   name: 'Agarra objetos com a mão',            description: 'Pega e segura objetos intencionalmente.',                          emoji: '🤲', category: 'motor',     typicalAgeDaysMin: 90,  typicalAgeDaysMax: 120, ageBand: 'early',   sortOrder: 7 },
  { code: 'pushes_up_arms',   name: 'Apoia-se nos braços (barriga)',       description: 'De barriga, levanta o tronco apoiando nos braços.',                emoji: '🏋️', category: 'motor',     typicalAgeDaysMin: 90,  typicalAgeDaysMax: 120, ageBand: 'early',   sortOrder: 8 },
  // ---- growing (4-6 meses) ----
  { code: 'rolls_over',       name: 'Rola de barriga',                     description: 'Rola de barriga para cima ou vice-versa.',                         emoji: '🔄', category: 'motor',     typicalAgeDaysMin: 120, typicalAgeDaysMax: 165, ageBand: 'growing', sortOrder: 9 },
  { code: 'mouths_objects',   name: 'Leva objetos à boca',                 description: 'Explora objetos levando-os à boca.',                               emoji: '👄', category: 'motor',     typicalAgeDaysMin: 120, typicalAgeDaysMax: 150, ageBand: 'growing', sortOrder: 10 },
  { code: 'babbles',          name: 'Balbucia sons (ba-ba, da-da)',        description: 'Produz sequências de sons com consoantes.',                        emoji: '🗣️', category: 'linguagem', typicalAgeDaysMin: 150, typicalAgeDaysMax: 180, ageBand: 'growing', sortOrder: 11 },
  { code: 'sits_supported',   name: 'Senta com apoio',                     description: 'Consegue sentar quando apoiado por almofadas ou mãos.',            emoji: '🪑', category: 'motor',     typicalAgeDaysMin: 150, typicalAgeDaysMax: 180, ageBand: 'growing', sortOrder: 12 },
  { code: 'recognizes_name',  name: 'Reconhece o próprio nome',            description: 'Vira a cabeça ou reage quando chamam pelo nome.',                  emoji: '👂', category: 'cognitivo', typicalAgeDaysMin: 150, typicalAgeDaysMax: 180, ageBand: 'growing', sortOrder: 13 },
  // ---- weaning (6-9 meses) ----
  { code: 'sits_unsupported', name: 'Senta sem apoio',                     description: 'Senta firme sozinho, sem precisar de apoio.',                      emoji: '🧘', category: 'motor',     typicalAgeDaysMin: 180, typicalAgeDaysMax: 210, ageBand: 'weaning', sortOrder: 14 },
  { code: 'transfers_hands',  name: 'Transfere objetos entre as mãos',     description: 'Passa um objeto de uma mão para a outra.',                         emoji: '🤹', category: 'motor',     typicalAgeDaysMin: 195, typicalAgeDaysMax: 225, ageBand: 'weaning', sortOrder: 15 },
  { code: 'stranger_anxiety', name: 'Estranha pessoas desconhecidas',      description: 'Demonstra desconforto ou choro com pessoas que não conhece.',      emoji: '😟', category: 'social',    typicalAgeDaysMin: 210, typicalAgeDaysMax: 255, ageBand: 'weaning', sortOrder: 16 },
  { code: 'crawls',           name: 'Engatinha (ou se arrasta)',           description: 'Se locomove pelo chão, engatinhando ou se arrastando.',            emoji: '🐛', category: 'motor',     typicalAgeDaysMin: 240, typicalAgeDaysMax: 285, ageBand: 'weaning', sortOrder: 17 },
  { code: 'pincer_grasp',     name: 'Usa pinça (polegar + indicador)',     description: 'Pega objetos pequenos usando o polegar e o indicador.',            emoji: '🤏', category: 'motor_fino',typicalAgeDaysMin: 240, typicalAgeDaysMax: 285, ageBand: 'weaning', sortOrder: 18 },
  { code: 'first_solids',     name: 'Primeiros alimentos sólidos',         description: 'Início da introdução alimentar.',                                  emoji: '🥑', category: 'alimentacao',typicalAgeDaysMin: 180,typicalAgeDaysMax: 195, ageBand: 'weaning', sortOrder: 19 },
  // ---- active (9-12 meses) ----
  { code: 'stands_supported', name: 'Fica em pé com apoio',                description: 'Fica em pé segurando em móveis ou nas mãos de alguém.',            emoji: '🧍', category: 'motor',     typicalAgeDaysMin: 270, typicalAgeDaysMax: 315, ageBand: 'active',  sortOrder: 20 },
  { code: 'says_mama_papa',   name: 'Fala mamã ou papá com intenção',      description: 'Usa mamã ou papá direcionado à pessoa certa.',                     emoji: '🗨️', category: 'linguagem', typicalAgeDaysMin: 300, typicalAgeDaysMax: 345, ageBand: 'active',  sortOrder: 21 },
  { code: 'claps_waves',      name: 'Bate palmas / dá tchau',              description: 'Imita gestos sociais como bater palmas e dar tchau.',              emoji: '👋', category: 'social',    typicalAgeDaysMin: 270, typicalAgeDaysMax: 315, ageBand: 'active',  sortOrder: 22 },
  { code: 'cruises',          name: 'Anda com apoio (cruzeiro)',           description: 'Caminha segurando nos móveis.',                                    emoji: '🚶', category: 'motor',     typicalAgeDaysMin: 330, typicalAgeDaysMax: 365, ageBand: 'active',  sortOrder: 23 },
  { code: 'first_steps',      name: 'Primeiros passos sozinho',            description: 'Dá os primeiros passos sem apoio. Um momento inesquecível!',       emoji: '👣', category: 'motor',     typicalAgeDaysMin: 345, typicalAgeDaysMax: 395, ageBand: 'active',  sortOrder: 24 },
  { code: 'drinks_cup',       name: 'Bebe no copo com ajuda',              description: 'Consegue beber líquidos de um copo com assistência.',              emoji: '🥤', category: 'motor',     typicalAgeDaysMin: 300, typicalAgeDaysMax: 365, ageBand: 'active',  sortOrder: 25 },
  // ---- toddler_early (12-18 meses) ----
  { code: 'walks_steady',     name: 'Anda sozinho com firmeza',            description: 'Caminha com equilíbrio e confiança.',                              emoji: '🚶', category: 'motor',     typicalAgeDaysMin: 395, typicalAgeDaysMax: 460, ageBand: 'toddler_early', sortOrder: 26 },
  { code: 'speaks_5_words',   name: 'Fala 5 a 10 palavras',                description: 'Vocabulário de pelo menos 5 palavras reconhecíveis.',              emoji: '💬', category: 'linguagem', typicalAgeDaysMin: 365, typicalAgeDaysMax: 460, ageBand: 'toddler_early', sortOrder: 27 },
  { code: 'stacks_2_blocks',  name: 'Empilha 2 blocos',                    description: 'Consegue empilhar dois blocos sem derrubar.',                      emoji: '🧱', category: 'motor_fino',typicalAgeDaysMin: 425, typicalAgeDaysMax: 490, ageBand: 'toddler_early', sortOrder: 28 },
  { code: 'points_wants',     name: 'Aponta para o que quer',              description: 'Usa o dedo indicador para mostrar o que deseja.',                  emoji: '☝️', category: 'comunicacao',typicalAgeDaysMin: 365,typicalAgeDaysMax: 425, ageBand: 'toddler_early', sortOrder: 29 },
  { code: 'eats_hands',       name: 'Come sozinho com as mãos',            description: 'Pega alimentos e leva à boca de forma independente.',              emoji: '🍽️', category: 'alimentacao',typicalAgeDaysMin: 365,typicalAgeDaysMax: 425, ageBand: 'toddler_early', sortOrder: 30 },
  { code: 'scribbles',        name: 'Rabisca com giz',                     description: 'Segura um giz ou lápis e faz rabiscos no papel.',                  emoji: '✏️', category: 'motor_fino',typicalAgeDaysMin: 460, typicalAgeDaysMax: 545, ageBand: 'toddler_early', sortOrder: 31 },
  // ---- toddler (18-24 meses) ----
  { code: 'runs_unstable',    name: 'Corre (instável)',                    description: 'Corre com passos curtos, ainda sem muito equilíbrio.',             emoji: '🏃', category: 'motor',     typicalAgeDaysMin: 545, typicalAgeDaysMax: 610, ageBand: 'toddler', sortOrder: 32 },
  { code: 'combines_words',   name: 'Combina 2 palavras',                  description: 'Junta duas palavras: quero água, mamãe vem.',                      emoji: '💬', category: 'linguagem', typicalAgeDaysMin: 545, typicalAgeDaysMax: 610, ageBand: 'toddler', sortOrder: 33 },
  { code: 'stacks_4_blocks',  name: 'Empilha 4+ blocos',                   description: 'Empilha quatro ou mais blocos.',                                   emoji: '🧱', category: 'motor_fino',typicalAgeDaysMin: 610, typicalAgeDaysMax: 670, ageBand: 'toddler', sortOrder: 34 },
  { code: 'imitates_chores',  name: 'Imita atividades domésticas',         description: 'Brinca de varrer, cozinhar ou limpar, imitando adultos.',          emoji: '🧹', category: 'social',    typicalAgeDaysMin: 545, typicalAgeDaysMax: 730, ageBand: 'toddler', sortOrder: 35 },
  { code: 'climbs_stairs',    name: 'Sobe escadas com apoio',              description: 'Sobe degraus segurando no corrimão ou na mão de alguém.',          emoji: '🪜', category: 'motor',     typicalAgeDaysMin: 610, typicalAgeDaysMax: 730, ageBand: 'toddler', sortOrder: 36 },
  { code: 'potty_interest',   name: 'Desfralde: demonstra interesse',      description: 'Mostra curiosidade pelo banheiro ou avisa quando está sujo.',      emoji: '🚽', category: 'autonomia', typicalAgeDaysMin: 670, typicalAgeDaysMax: 730, ageBand: 'toddler', sortOrder: 37 },
]

/** Labels amigáveis para a categoria (exibição) */
export const CATEGORY_LABEL: Record<MilestoneCategory, string> = {
  motor: 'Motor',
  motor_fino: 'Motor fino',
  cognitivo: 'Cognitivo',
  social: 'Social',
  linguagem: 'Linguagem',
  comunicacao: 'Comunicação',
  alimentacao: 'Alimentação',
  autonomia: 'Autonomia',
}

/** Ordem oficial das faixas etárias para agrupamento na timeline */
export const AGE_BAND_ORDER: AgeBand[] = [
  'newborn',
  'early',
  'growing',
  'weaning',
  'active',
  'toddler_early',
  'toddler',
  'beyond',
]

export const AGE_BAND_LABEL: Record<AgeBand, string> = {
  newborn: '0 a 2 meses',
  early: '2 a 4 meses',
  growing: '4 a 6 meses',
  weaning: '6 a 9 meses',
  active: '9 a 12 meses',
  toddler_early: '12 a 18 meses',
  toddler: '18 a 24 meses',
  beyond: '24+ meses',
}

/**
 * Retorna o próximo marco não-registrado para o card na home.
 * Janela: idade atual - 30d até idade atual + 60d.
 * Prioridade: mais próximo da idade atual.
 */
export function getNextMilestoneForHome(
  achievedCodes: Set<string>,
  ageDays: number,
  dismissedCodes?: Set<string>
): Milestone | null {
  const candidates = MILESTONES.filter(
    (m) =>
      !achievedCodes.has(m.code) &&
      !dismissedCodes?.has(m.code) &&
      m.typicalAgeDaysMin <= ageDays + 60 &&
      m.typicalAgeDaysMax >= ageDays - 30
  )

  candidates.sort((a, b) => {
    const midA = (a.typicalAgeDaysMin + a.typicalAgeDaysMax) / 2
    const midB = (b.typicalAgeDaysMin + b.typicalAgeDaysMax) / 2
    return Math.abs(midA - ageDays) - Math.abs(midB - ageDays)
  })

  return candidates[0] || null
}

/** Textos introdutórios por faixa etária para o card na home */
export const BAND_INTRO_TEXT: Record<string, string> = {
  newborn: 'Nas primeiras semanas, cada olhar é uma conquista.',
  early: 'Entre 1 e 3 meses, as respostas sociais começam a aparecer.',
  growing: 'Descobrindo o próprio corpo. Muita coisa nova!',
  weaning: 'Com 6 a 9 meses, a mobilidade muda tudo.',
  active: 'Quase andando! Os próximos marcos são inesquecíveis.',
  toddler_early: 'Palavras, passos firmes e muita personalidade.',
  toddler: 'De 18 a 24 meses: a autonomia explode.',
  beyond: 'Cada descoberta vira memória.',
}

/** Calcula idade em dias, meses e dias para exibição ("4 meses e 12 dias") */
export function formatAgeAtDate(birthDate: string, achievedAt: string): string {
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const [ay, am, ad] = achievedAt.split('-').map(Number)
  const birth = new Date(by, bm - 1, bd)
  const achieved = new Date(ay, am - 1, ad)
  const totalDays = Math.max(
    0,
    Math.floor((achieved.getTime() - birth.getTime()) / 86400000)
  )
  if (totalDays < 30) {
    return `${totalDays} dia${totalDays !== 1 ? 's' : ''}`
  }
  const months = Math.floor(totalDays / 30.44)
  const remainDays = Math.floor(totalDays - months * 30.44)
  const monthStr = `${months} ${months !== 1 ? 'meses' : 'mês'}`
  if (remainDays > 0) {
    return `${monthStr} e ${remainDays} dia${remainDays !== 1 ? 's' : ''}`
  }
  return monthStr
}
