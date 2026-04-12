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

export const DEVELOPMENT_LEAPS: DevelopmentLeap[] = [
  {
    id: 1, weekStart: 5, weekEnd: 6,
    name: 'Sensacoes', subtitle: 'O mundo fica mais nitido',
    pushText: 'Salto de desenvolvimento se aproximando (~semana 5). {name} pode ficar mais agitado. Normal!',
    description: 'O bebe comeca a perceber o mundo de forma mais intensa. Sensacoes que antes eram neutras agora chamam atencao.',
    whatToExpect: ['Mais choroso e grudento', 'Pode querer mamar mais', 'Sono pode ficar mais agitado', 'Duracao: ~1 semana'],
    tips: ['Acolha — nao e manha, e desenvolvimento', 'Ofereca o peito/mamadeira com mais frequencia se pedir', 'Nao se assuste com mudanca no padrao de sono'],
    registroImpact: 'Amamentacoes podem aumentar 20-30%. Sono pode diminuir.',
  },
  {
    id: 2, weekStart: 8, weekEnd: 9,
    name: 'Padroes', subtitle: 'Reconhecendo repeticoes',
    pushText: 'Salto 2 chegando. Pode haver mudanca no sono e na amamentacao.',
    description: 'O bebe comeca a reconhecer padroes simples — mao, objetos, sons repetidos.',
    whatToExpect: ['Observa as proprias maos', 'Pode ficar mais agitado', 'Sono e amamentacao irregulares', 'Duracao: ~2 semanas'],
    tips: ['Brinquedos de alto contraste ajudam', 'Paciencia com a irregularidade da rotina', 'Vai passar — registre tudo para comparar depois'],
    registroImpact: 'Intervalos de amamentacao podem ficar irregulares. Normal.',
  },
  {
    id: 3, weekStart: 12, weekEnd: 13,
    name: 'Transicoes suaves', subtitle: 'Movimentos mais fluidos',
    pushText: 'Salto 3 se aproximando. Movimentos mais suaves e curiosidade aumentando.',
    description: 'Os movimentos ficam mais suaves e controlados. O bebe interage mais com o ambiente.',
    whatToExpect: ['Pega objetos com mais intencao', 'Movimentos mais controlados', 'Pode recusar dormir por curiosidade', 'Duracao: ~1 semana'],
    tips: ['Ofereca objetos para segurar', 'Ambiente calmo para sonecas — muita estimulacao atrapalha', 'Registre mudancas no sono — pode melhorar logo depois'],
    registroImpact: 'Sonecas podem ficar mais curtas temporariamente.',
  },
  {
    id: 4, weekStart: 19, weekEnd: 23,
    name: 'Eventos', subtitle: 'O salto mais longo',
    pushText: 'Salto 4 e um dos maiores. Pode durar ate 5 semanas. Paciencia!',
    description: 'O maior e mais desafiador salto dos primeiros meses. O bebe entende sequencias de eventos.',
    whatToExpect: ['Muito mais choroso e clingy', 'Sono pode piorar significativamente', 'Pode recusar colo de outras pessoas', 'Duracao: ate 5 semanas (o mais longo)'],
    tips: ['Esse e o mais dificil — peca ajuda', 'Manter registros ajuda a ver que vai melhorar', 'O Yaya mostra a tendencia: confie nos dados'],
    registroImpact: 'Sono pode diminuir 2-3h/dia. Amamentacoes podem dobrar. Fraldas geralmente estaveis.',
  },
  {
    id: 5, weekStart: 26, weekEnd: 28,
    name: 'Relacoes', subtitle: 'Entendendo distancia',
    pushText: 'Salto 5. {name} comeca a entender distancia e pode estranhar.',
    description: 'O bebe compreende que objetos e pessoas existem mesmo quando nao ve. Inicio da ansiedade de separacao.',
    whatToExpect: ['Ansiedade de separacao (estranha)', 'Chora quando voce sai do campo de visao', 'Pode ter dificuldade para dormir sozinho', 'Duracao: ~3 semanas'],
    tips: ['Brincadeiras de esconder e aparecer ajudam', 'Despedidas curtas e consistentes', 'Nao saia "escondido" — gera mais ansiedade'],
    registroImpact: 'Sono noturno pode ficar mais fragmentado.',
  },
  {
    id: 6, weekStart: 37, weekEnd: 39,
    name: 'Categorias', subtitle: 'Agrupando o mundo',
    pushText: 'Salto 6. Agrupando objetos, reconhecendo padroes.',
    description: 'O bebe comeca a categorizar: animais, comida, pessoas. Compara objetos.',
    whatToExpect: ['Examina objetos com mais atencao', 'Pode ficar frustrado ao nao conseguir algo', 'Mais birras', 'Duracao: ~4 semanas'],
    tips: ['Nomear categorias ajuda: "isso e uma fruta"', 'Paciencia com a frustracao', 'Bons registros agora ajudam na introducao alimentar'],
    registroImpact: 'Se em IA, pode recusar alimentos que antes aceitava. Temporario.',
  },
  {
    id: 7, weekStart: 46, weekEnd: 48,
    name: 'Sequencias', subtitle: 'Primeiras "conversas"',
    pushText: 'Salto 7. Sequencias de acoes e primeira "conversa".',
    description: 'O bebe entende que acoes tem consequencias em sequencia. Tenta "conversar" e imitar.',
    whatToExpect: ['Imita acoes simples', 'Faz barulhos com intencao', 'Tenta fazer coisas "por conta"', 'Duracao: ~5 semanas'],
    tips: ['Converse e responda os sons do bebe', 'Deixe tentar sozinho (com supervisao)', 'Rotina consistente ajuda na seguranca'],
    registroImpact: 'Rotina pode ficar mais previsivel apos o salto.',
  },
  {
    id: 8, weekStart: 55, weekEnd: 58,
    name: 'Programas', subtitle: 'Personalidade aparecendo',
    pushText: 'Salto 8. Birras, decisoes proprias, personalidade aparecendo.',
    description: 'O bebe tenta "programar" suas acoes. Quer fazer do jeito dele. Birras sao normais.',
    whatToExpect: ['Birras frequentes', 'Quer fazer tudo sozinho', 'Testa limites constantemente', 'Duracao: ~4 semanas'],
    tips: ['De opcoes em vez de ordens ("quer a azul ou a vermelha?")', 'Birras nao sao manha — e frustracao legitima', 'Manter rotina e ainda mais importante agora'],
    registroImpact: 'Alimentacao pode ficar seletiva. Sono geralmente estavel.',
  },
  {
    id: 9, weekStart: 64, weekEnd: 67,
    name: 'Principios', subtitle: 'Negociacao e empatia',
    pushText: 'Salto 9. Negociacao, humor, empatia emergindo.',
    description: 'A crianca comeca a entender principios: justo/injusto, meu/seu, regras.',
    whatToExpect: ['Negocia e argumenta', 'Mostra empatia (abraca quem esta triste)', 'Testa regras para entender limites', 'Duracao: ~5 semanas'],
    tips: ['Explique as razoes (mesmo que simplifique)', 'Celebre demonstracoes de empatia', 'Consistencia: regra e regra'],
    registroImpact: 'Rotina geralmente estavel. Bom momento para revisar habitos.',
  },
  {
    id: 10, weekStart: 75, weekEnd: 78,
    name: 'Sistemas', subtitle: 'Pensamento abstrato',
    pushText: 'Salto 10. Pensamento abstrato, faz de conta, criatividade.',
    description: 'O ultimo grande salto. A crianca ja pensa de forma abstrata: faz de conta, imaginacao, criatividade.',
    whatToExpect: ['Brincadeiras de faz de conta', 'Perguntas sobre "por que?"', 'Imaginacao ativa (amigos imaginarios)', 'Duracao: ~4 semanas'],
    tips: ['Incentive o faz de conta', 'Responda os "por que" com paciencia', 'Parabens — voce passou por todos os saltos!'],
    registroImpact: 'Rotina estavel. Bom momento para o Yaya gerar relatorio de evolucao completo.',
  },
];

/**
 * Retorna o salto ativo baseado na idade do bebe em semanas
 */
export function getActiveLeap(birthDate: string): DevelopmentLeap | null {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageWeeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86400000));

  return DEVELOPMENT_LEAPS.find(
    leap => ageWeeks >= leap.weekStart - 1 && ageWeeks <= leap.weekEnd + 1
  ) || null;
}

/**
 * Retorna o proximo salto que ainda nao comecou
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
