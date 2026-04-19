/**
 * Registry de DiscoveryHints — sugestões contextuais da próxima feature
 * pro usuário descobrir. Aparecem num slot único abaixo do ActivityGrid
 * na home, nunca mais que 1 por vez.
 *
 * Seleção:
 *   1. Filtra por `condition(ctx)` → só hints cujas regras batem com
 *      o estado atual do user
 *   2. Exclui os já dismissed em `dismissed_hints`
 *   3. Pega o de menor `priority` (10 = mais urgente, 60 = menos)
 *   4. Renderiza
 *
 * Dismiss é forever — se o user fechou, respeita.
 */

export interface HintContext {
  babyName: string
  babyAgeDays: number
  totalLogs: number
  /** Features já abertas — consulta user_feature_seen. */
  featuresSeen: Set<string>
  hasVaccineRecord: boolean
  hasCaregiver: boolean
  hasSharedReport: boolean
  isInLeap: boolean
  isPremium: boolean
}

export interface DiscoveryHint {
  key: string
  priority: number
  /** Texto mostrado. `{babyName}` e `{totalLogs}` são substituídos. */
  copy: string
  cta: { label: string; path: string }
  condition: (ctx: HintContext) => boolean
}

export const DISCOVERY_HINTS: readonly DiscoveryHint[] = [
  {
    key: 'try_vaccines',
    priority: 10,
    copy: 'Caderneta do {babyName} está esperando. Ver vacinas?',
    cta: { label: 'Ver vacinas', path: '/vacinas' },
    condition: (ctx) =>
      ctx.babyAgeDays >= 14 &&
      !ctx.featuresSeen.has('vaccines') &&
      !ctx.hasVaccineRecord,
  },
  {
    key: 'try_milestones',
    priority: 15,
    copy: 'Primeiros marcos do {babyName} te esperam.',
    cta: { label: 'Ver marcos', path: '/marcos' },
    condition: (ctx) =>
      ctx.babyAgeDays >= 30 && !ctx.featuresSeen.has('milestones'),
  },
  {
    key: 'try_insights',
    priority: 20,
    copy: '{totalLogs} registros já dão padrões. Seus insights estão prontos.',
    cta: { label: 'Ver insights', path: '/insights' },
    condition: (ctx) =>
      ctx.totalLogs >= 15 && !ctx.featuresSeen.has('insights'),
  },
  {
    key: 'try_leaps',
    priority: 25,
    copy: '{babyName} pode estar num salto. Veja o que esperar.',
    cta: { label: 'Ver saltos', path: '/saltos' },
    condition: (ctx) => ctx.isInLeap && !ctx.featuresSeen.has('leaps'),
  },
  {
    key: 'try_caregiver',
    priority: 30,
    copy: 'Divida os registros com quem cuida junto.',
    cta: { label: 'Convidar', path: '/profile#caregivers' },
    condition: (ctx) => ctx.totalLogs >= 30 && !ctx.hasCaregiver,
  },
  {
    key: 'try_shared_report',
    priority: 40,
    copy: 'Consulta próxima? Gere um relatório pro pediatra.',
    cta: { label: 'Criar relatório', path: '/profile#shared-reports' },
    condition: (ctx) => ctx.totalLogs >= 50 && !ctx.hasSharedReport,
  },
  {
    key: 'try_medications',
    priority: 50,
    copy: 'Controle horários e doses de medicamentos.',
    cta: { label: 'Ver medicamentos', path: '/medicamentos' },
    condition: (ctx) =>
      ctx.totalLogs >= 40 && !ctx.featuresSeen.has('medications'),
  },
  {
    key: 'try_mgm',
    priority: 60,
    copy: 'Indique amigos e ganhe dias de Yaya+.',
    cta: { label: 'Conhecer', path: '/yaya-plus' },
    condition: (ctx) => !ctx.isPremium && !ctx.featuresSeen.has('yaya_plus'),
  },
] as const

/**
 * Substitui placeholders `{babyName}` e `{totalLogs}` na copy.
 * Mantém simples — se precisar de mais campos, considera template literal
 * no call site.
 */
export function renderHintCopy(
  hint: DiscoveryHint,
  ctx: { babyName: string; totalLogs: number },
): string {
  return hint.copy
    .replace('{babyName}', ctx.babyName)
    .replace('{totalLogs}', String(ctx.totalLogs))
}

/**
 * Seleciona o hint ativo dado o contexto e os já dismissed.
 * Retorna null quando nenhum hint se aplica.
 */
export function selectActiveHint(
  ctx: HintContext,
  dismissedKeys: Set<string>,
): DiscoveryHint | null {
  const eligible = DISCOVERY_HINTS.filter(
    (h) => !dismissedKeys.has(h.key) && h.condition(ctx),
  ).sort((a, b) => a.priority - b.priority)
  return eligible[0] ?? null
}
