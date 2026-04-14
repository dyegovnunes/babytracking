export type AgeBand =
  | 'newborn'       // 0 a 4 semanas (0 a 27 dias)
  | 'early'         // 1 a 3 meses (28 a 90 dias)
  | 'growing'       // 3 a 6 meses (91 a 181 dias)
  | 'weaning'       // 6 a 9 meses (182 a 273 dias)
  | 'active'        // 9 a 12 meses (274 a 364 dias)
  | 'toddler_early' // 12 a 18 meses (365 a 547 dias)
  | 'toddler'       // 18 a 24 meses (548 a 729 dias)
  | 'beyond'        // 24m+

export function getAgeBand(birthDate: string): AgeBand {
  const days = Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000)
  if (days < 28) return 'newborn'
  if (days < 91) return 'early'
  if (days < 182) return 'growing'
  if (days < 274) return 'weaning'
  if (days < 365) return 'active'
  if (days < 548) return 'toddler_early'
  if (days < 730) return 'toddler'
  return 'beyond'
}

export function getHighlightedEvents(band: AgeBand): string[] {
  const map: Record<AgeBand, string[]> = {
    newborn:       ['breast_left', 'breast_right', 'breast_both', 'sleep', 'wake'],
    early:         ['breast_left', 'breast_right', 'breast_both', 'sleep', 'wake'],
    growing:       ['sleep', 'wake', 'breast_left', 'breast_right'],
    weaning:       ['sleep', 'wake', 'bottle'],
    active:        ['sleep', 'wake', 'bottle'],
    toddler_early: ['sleep', 'wake'],
    toddler:       ['sleep', 'wake'],
    beyond:        [],
  }
  return map[band] ?? []
}

interface WelcomeContent {
  paragraph: string
  features: { icon: string; title: string; desc: string }[]
}

export function getWelcomeContent(
  band: AgeBand,
  babyName: string,
  gender: 'boy' | 'girl',
): WelcomeContent {
  const pronoun = gender === 'girl' ? 'a' : 'o'
  const doPronoun = gender === 'girl' ? 'da' : 'do'
  const readyPronoun = gender === 'girl' ? 'pronta' : 'pronto'

  const featureFirst = {
    icon: '📋',
    title: 'Controle a rotina',
    desc: `Controle todo o dia ${doPronoun} ${babyName} com apenas 1 clique`,
  }

  const map: Record<AgeBand, WelcomeContent> = {
    newborn: {
      paragraph: 'Recem-nascidos precisam comer a cada 2 ou 3 horas, dia e noite. Registre por alguns dias e o Yaya identifica o padrao. Mais rapido do que parece.',
      features: [
        featureFirst,
        { icon: '🌙', title: 'Padroes de sono', desc: 'O Yaya aprende o ritmo do seu bebe' },
        { icon: '🌱', title: 'Salto em andamento', desc: 'Acompanhe essa fase de desenvolvimento' },
      ],
    },
    early: {
      paragraph: `Entre 1 e 3 meses, os padroes de sono comecam a surgir. Registre por alguns dias e o Yaya te mostra quando ${babyName} esta ${readyPronoun} para dormir.`,
      features: [
        featureFirst,
        { icon: '🌙', title: 'Previsao de sono', desc: `Descubra quando el${pronoun} esta ${readyPronoun} para dormir` },
        { icon: '🌊', title: 'Salto chegando', desc: 'Fique por dentro do desenvolvimento' },
      ],
    },
    growing: {
      paragraph: 'Nessa fase, a maioria dos bebes comeca a dormir periodos mais longos. Registre o sono por uma semana e o Yaya identifica o horario ideal.',
      features: [
        featureFirst,
        { icon: '🌙', title: 'Sono em evolucao', desc: 'Veja como o padrao muda semana a semana' },
        { icon: '🎭', title: 'Salto ativo', desc: 'Entenda o que esta acontecendo agora' },
      ],
    },
    weaning: {
      paragraph: '6 meses e o inicio da introducao alimentar. O padrao de sono e alimentacao vao mudar bastante. O Yaya acompanha essa transicao com voce.',
      features: [
        featureFirst,
        { icon: '🌙', title: 'Sono em transicao', desc: 'Acompanhe as mudancas dessa fase' },
        { icon: '🌍', title: 'Salto chegando', desc: 'Prepare-se para mais descobertas' },
      ],
    },
    active: {
      paragraph: 'Entre 9 e 12 meses, muitos bebes migram para 2 sonecas por dia. Registre o sono e o Yaya identifica quando essa transicao esta acontecendo.',
      features: [
        featureFirst,
        { icon: '🌙', title: 'Transicao de sonecas', desc: 'De 3 para 2 sonecas: o Yaya detecta' },
        { icon: '🔄', title: 'Salto ativo', desc: 'Entenda o comportamento atual' },
      ],
    },
    toddler_early: {
      paragraph: 'No primeiro aninho, muitos bebes transitam para uma soneca so. O Yaya acompanha essa mudanca e te avisa quando o padrao se estabilizar.',
      features: [
        featureFirst,
        { icon: '🌙', title: 'Transicao para 1 soneca', desc: 'O Yaya detecta quando chega a hora' },
        { icon: '🎯', title: 'Salto chegando', desc: 'A autonomia vai explodir em breve' },
      ],
    },
    toddler: {
      paragraph: `Entre 18 e 24 meses, o sono noturno fica mais estavel, mas a hora de dormir pode virar uma batalha. Registre para encontrar o horario ideal.`,
      features: [
        featureFirst,
        { icon: '🌙', title: 'Hora de dormir', desc: `Descubra o horario ideal para ${babyName}` },
        { icon: '🌟', title: 'Salto ativo', desc: 'O maior salto da infancia. Saiba o que esperar' },
      ],
    },
    beyond: {
      paragraph: `O Yaya acompanha criancas de qualquer idade. Registre a rotina ${doPronoun} ${babyName} e acompanhe padroes de sono, alimentacao e cuidados.`,
      features: [
        featureFirst,
        { icon: '🌙', title: 'Padroes de sono', desc: 'Acompanhe a rotina de sono' },
        { icon: '📊', title: 'Historico completo', desc: 'Tudo registrado para consultas e acompanhamento' },
      ],
    },
  }

  return map[band]
}

export function getDefaultIntervals(babyId: string, birthDate: string) {
  const band = getAgeBand(birthDate)

  const base = {
    bath: { minutes: 0, warn: 15, mode: 'scheduled' as const, scheduled_hours: '[18]' },
  }

  const intervals: Record<AgeBand, Record<string, { minutes: number; warn: number; mode?: 'interval' | 'scheduled'; scheduled_hours?: string | null }>> = {
    newborn: {
      feed: { minutes: 120, warn: 90 },
      diaper: { minutes: 90, warn: 60 },
      sleep_nap: { minutes: 45, warn: 30 },
      sleep_awake: { minutes: 60, warn: 45 },
    },
    early: {
      feed: { minutes: 150, warn: 120 },
      diaper: { minutes: 100, warn: 75 },
      sleep_nap: { minutes: 60, warn: 45 },
      sleep_awake: { minutes: 90, warn: 70 },
    },
    growing: {
      feed: { minutes: 180, warn: 150 },
      diaper: { minutes: 120, warn: 90 },
      sleep_nap: { minutes: 90, warn: 70 },
      sleep_awake: { minutes: 120, warn: 90 },
    },
    weaning: {
      feed: { minutes: 210, warn: 180 },
      diaper: { minutes: 120, warn: 90 },
      sleep_nap: { minutes: 90, warn: 75 },
      sleep_awake: { minutes: 150, warn: 120 },
    },
    active: {
      feed: { minutes: 210, warn: 180 },
      diaper: { minutes: 120, warn: 90 },
      sleep_nap: { minutes: 90, warn: 75 },
      sleep_awake: { minutes: 180, warn: 150 },
    },
    toddler_early: {
      feed: { minutes: 240, warn: 210 },
      diaper: { minutes: 120, warn: 90 },
      sleep_nap: { minutes: 120, warn: 90 },
      sleep_awake: { minutes: 240, warn: 210 },
    },
    toddler: {
      feed: { minutes: 0, warn: 0 },
      diaper: { minutes: 120, warn: 90 },
      sleep_nap: { minutes: 120, warn: 90 },
      sleep_awake: { minutes: 300, warn: 270 },
    },
    beyond: {
      feed: { minutes: 180, warn: 150 },
      diaper: { minutes: 120, warn: 90 },
      sleep_nap: { minutes: 90, warn: 75 },
      sleep_awake: { minutes: 120, warn: 100 },
    },
  }

  const bandIntervals = intervals[band]

  return [
    ...Object.entries(bandIntervals).map(([category, config]) => ({
      baby_id: babyId,
      category,
      minutes: config.minutes,
      warn: config.warn,
      mode: config.mode ?? 'interval',
      scheduled_hours: config.scheduled_hours ?? null,
    })),
    {
      baby_id: babyId,
      category: 'bath',
      minutes: base.bath.minutes,
      warn: base.bath.warn,
      mode: base.bath.mode,
      scheduled_hours: base.bath.scheduled_hours,
    },
  ]
}
