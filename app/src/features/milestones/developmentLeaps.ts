export interface DevelopmentLeap {
  id: number;
  weekStart: number;
  weekEnd: number;
  name: string;
  subtitle: string;
  pushText: string;
  description: string;
  whatToExpect: string[];
  tips: string[];
  registroImpact: string;
}

/**
 * Intervalos baseados na pesquisa de Frans X. Plooij & Hetty van de Rijt
 * sobre saltos cognitivos no primeiro ano de vida (1992–2017).
 * Semanas contadas a partir do nascimento (não da concepção).
 *
 * Os intervalos marcam a fase ativa do salto (tempestade + consolidação),
 * não o arco completo que inclui a fase de tranquilidade anterior.
 *
 * NOTA: Existe variação individual de ±1-2 semanas entre bebês.
 * As datas exibidas no app sempre aparecem com "aprox." para refletir isso.
 */
export const DEVELOPMENT_LEAPS: DevelopmentLeap[] = [
  {
    id: 1, weekStart: 5, weekEnd: 6,
    name: 'Sensações', subtitle: 'O mundo fica mais nítido',
    pushText: 'Salto de desenvolvimento se aproximando (~semana 6). {name} pode ficar mais agitado. Normal!',
    description: 'O bebê começa a perceber o mundo de forma mais intensa. Sensações que antes eram neutras agora chamam atenção.',
    whatToExpect: ['Mais choroso e grudento', 'Pode querer mamar mais', 'Sono pode ficar mais agitado', 'Duração: ~2 semanas'],
    tips: ['Acolha — não é manha, é desenvolvimento', 'Ofereça o peito/mamadeira com mais frequência se pedir', 'Não se assuste com mudança no padrão de sono'],
    registroImpact: 'Amamentações podem aumentar 20-30%. Sono pode diminuir.',
  },
  {
    id: 2, weekStart: 8, weekEnd: 9,
    name: 'Padrões', subtitle: 'Reconhecendo repetições',
    pushText: 'Salto 2 chegando. Pode haver mudança no sono e na amamentação.',
    description: 'O bebê começa a reconhecer padrões simples — mão, objetos, sons repetidos.',
    whatToExpect: ['Observa as próprias mãos', 'Pode ficar mais agitado', 'Sono e amamentação irregulares', 'Duração: ~2 semanas'],
    tips: ['Brinquedos de alto contraste ajudam', 'Paciência com a irregularidade da rotina', 'Vai passar — registre tudo para comparar depois'],
    registroImpact: 'Intervalos de amamentação podem ficar irregulares. Normal.',
  },
  {
    id: 3, weekStart: 12, weekEnd: 13,
    name: 'Transições suaves', subtitle: 'Movimentos mais fluidos',
    pushText: 'Salto 3 se aproximando. Movimentos mais suaves e curiosidade aumentando.',
    description: 'Os movimentos ficam mais suaves e controlados. O bebê interage mais com o ambiente.',
    whatToExpect: ['Pega objetos com mais intenção', 'Movimentos mais controlados', 'Pode recusar dormir por curiosidade', 'Duração: ~1 semana'],
    tips: ['Ofereça objetos para segurar', 'Ambiente calmo para sonecas — muita estimulação atrapalha', 'Registre mudanças no sono — pode melhorar logo depois'],
    registroImpact: 'Sonecas podem ficar mais curtas temporariamente.',
  },
  {
    id: 4, weekStart: 19, weekEnd: 23,
    name: 'Eventos', subtitle: 'O salto mais longo',
    pushText: 'Salto 4 é um dos maiores. Pode durar até 5 semanas. Paciência!',
    description: 'O maior e mais desafiador salto dos primeiros meses. O bebê entende sequências de eventos.',
    whatToExpect: ['Muito mais choroso e grudadinho', 'Sono pode piorar significativamente', 'Pode recusar colo de outras pessoas', 'Duração: até 5 semanas (o mais longo)'],
    tips: ['Esse é o mais difícil — peça ajuda', 'Manter registros ajuda a ver que vai melhorar', 'O Yaya mostra a tendência: confie nos dados'],
    registroImpact: 'Sono pode diminuir 2-3h/dia. Amamentações podem dobrar. Fraldas geralmente estáveis.',
  },
  {
    id: 5, weekStart: 26, weekEnd: 28,
    name: 'Relações', subtitle: 'Entendendo distância',
    pushText: 'Salto 5. {name} começa a entender distância e pode estranhar.',
    description: 'O bebê compreende que objetos e pessoas existem mesmo quando não vê. Início da ansiedade de separação.',
    whatToExpect: ['Ansiedade de separação (estranha)', 'Chora quando você sai do campo de visão', 'Pode ter dificuldade para dormir sozinho', 'Duração: ~3 semanas'],
    tips: ['Brincadeiras de esconder e aparecer ajudam', 'Despedidas curtas e consistentes', 'Não saia "escondido" — gera mais ansiedade'],
    registroImpact: 'Sono noturno pode ficar mais fragmentado.',
  },
  {
    id: 6, weekStart: 37, weekEnd: 39,
    name: 'Categorias', subtitle: 'Agrupando o mundo',
    pushText: 'Salto 6. Agrupando objetos, reconhecendo padrões.',
    description: 'O bebê começa a categorizar: animais, comida, pessoas. Compara objetos.',
    whatToExpect: ['Examina objetos com mais atenção', 'Pode ficar frustrado ao não conseguir algo', 'Mais birras', 'Duração: ~4 semanas'],
    tips: ['Nomear categorias ajuda: "isso é uma fruta"', 'Paciência com a frustração', 'Bons registros agora ajudam na introdução alimentar'],
    registroImpact: 'Se em introdução alimentar, pode recusar alimentos que antes aceitava. Temporário.',
  },
  {
    id: 7, weekStart: 46, weekEnd: 48,
    name: 'Sequências', subtitle: 'Primeiras "conversas"',
    pushText: 'Salto 7. Sequências de ações e primeira "conversa".',
    description: 'O bebê entende que ações têm consequências em sequência. Tenta "conversar" e imitar.',
    whatToExpect: ['Imita ações simples', 'Faz barulhos com intenção', 'Tenta fazer coisas "por conta"', 'Duração: ~5 semanas'],
    tips: ['Converse e responda os sons do bebê', 'Deixe tentar sozinho (com supervisão)', 'Rotina consistente ajuda na segurança'],
    registroImpact: 'Rotina pode ficar mais previsível após o salto.',
  },
  {
    id: 8, weekStart: 55, weekEnd: 58,
    name: 'Programas', subtitle: 'Personalidade aparecendo',
    pushText: 'Salto 8. Birras, decisões próprias, personalidade aparecendo.',
    description: 'O bebê tenta "programar" suas ações. Quer fazer do jeito dele. Birras são normais.',
    whatToExpect: ['Birras frequentes', 'Quer fazer tudo sozinho', 'Testa limites constantemente', 'Duração: ~4 semanas'],
    tips: ['Dê opções em vez de ordens ("quer a azul ou a vermelha?")', 'Birras não são manha — é frustração legítima', 'Manter rotina é ainda mais importante agora'],
    registroImpact: 'Alimentação pode ficar seletiva. Sono geralmente estável.',
  },
  {
    id: 9, weekStart: 64, weekEnd: 67,
    name: 'Princípios', subtitle: 'Negociação e empatia',
    pushText: 'Salto 9. Negociação, humor, empatia emergindo.',
    description: 'A criança começa a entender princípios: justo/injusto, meu/seu, regras.',
    whatToExpect: ['Negocia e argumenta', 'Mostra empatia (abraça quem está triste)', 'Testa regras para entender limites', 'Duração: ~5 semanas'],
    tips: ['Explique as razões (mesmo que simplifique)', 'Celebre demonstrações de empatia', 'Consistência: regra é regra'],
    registroImpact: 'Rotina geralmente estável. Bom momento para revisar hábitos.',
  },
  {
    id: 10, weekStart: 75, weekEnd: 78,
    name: 'Sistemas', subtitle: 'Pensamento abstrato',
    pushText: 'Salto 10. Pensamento abstrato, faz de conta, criatividade.',
    description: 'O último grande salto. A criança já pensa de forma abstrata: faz de conta, imaginação, criatividade.',
    whatToExpect: ['Brincadeiras de faz de conta', 'Perguntas sobre "por quê?"', 'Imaginação ativa (amigos imaginários)', 'Duração: ~4 semanas'],
    tips: ['Incentive o faz de conta', 'Responda os "por quê" com paciência', 'Parabéns — você passou por todos os saltos!'],
    registroImpact: 'Rotina estável. Bom momento para o Yaya gerar relatório de evolução completo.',
  },
];

/**
 * Retorna o salto ativo baseado na idade do bebê em semanas
 */
export function getActiveLeap(birthDate: string): DevelopmentLeap | null {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageWeeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86400000));

  // Buffer de +1 semana no início (prebuffer: avisa que o salto está chegando).
  // Sem buffer no final: um salto terminado não deve continuar aparecendo como ativo,
  // pois bloqueia a exibição do próximo salto (getUpcomingLeap só roda se !activeLeap).
  return DEVELOPMENT_LEAPS.find(
    leap => ageWeeks >= leap.weekStart - 1 && ageWeeks <= leap.weekEnd
  ) || null;
}

/**
 * Retorna o próximo salto que ainda não começou
 */
export function getUpcomingLeap(birthDate: string): { leap: DevelopmentLeap; weeksUntil: number } | null {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageWeeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86400000));

  const upcoming = DEVELOPMENT_LEAPS.find(leap => leap.weekStart > ageWeeks + 1);
  if (!upcoming) return null;

  return {
    leap: upcoming,
    weeksUntil: upcoming.weekStart - ageWeeks,
  };
}
