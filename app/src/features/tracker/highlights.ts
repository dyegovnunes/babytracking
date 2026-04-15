import type { DevelopmentLeap, Milestone } from '../milestones'
import {
  getActiveLeap,
  getUpcomingLeap,
  MILESTONES,
  getNextMilestoneForHome,
} from '../milestones'
import type { Vaccine, VaccineStatus } from '../vaccines'
import type { MedicationHomeAlert } from '../medications'

/**
 * Sistema de "Destaques da Home" (Highlights).
 *
 * Cada destaque vira um chip na strip horizontal da TrackerPage.
 * Quando o usuário toca, abre um bottom sheet com as ações:
 * - Fechar: mantém o chip ativo (comportamento padrão)
 * - Dispensar: oculta por N dias (localStorage)
 * - Ver mais: navega para uma página (ou abre um modal customizado)
 *
 * Para adicionar uma nova feature (vacinas, remédios, etc.), basta criar
 * um novo tipo e adicioná-lo em `collectHighlights`.
 */

export type HighlightType =
  | 'leap_active'
  | 'leap_upcoming'
  | 'milestone'
  | 'vaccine_overdue'
  | 'vaccine_upcoming'
  | 'medication_overdue'
  | 'medication_due_soon'

export interface Highlight {
  /** ID único estável, usado como chave do chip e do dismissal no localStorage */
  id: string
  type: HighlightType
  /** Emoji mostrado no chip (32px círculo colorido) */
  emoji: string
  /** Label pequena acima do título — ex: "SALTO 5", "PRÓXIMO MARCO" */
  kicker: string
  /** Título curto do chip (1 linha, ~24 chars) — ex: "Mundo da causa" */
  title: string
  /** Acento de cor do chip (token Tailwind ou hex) */
  accent: 'primary' | 'tertiary' | 'warning' | 'success'
  /** Quantos dias o usuário fica sem ver esse chip após "Dispensar" */
  dismissDays: number
  /**
   * Payload específico por tipo — usado dentro do sheet e das ações "Ver mais".
   * Discriminated union permite ao sheet renderizar conteúdo customizado.
   */
  data:
    | { type: 'leap_active'; leap: DevelopmentLeap; birthDate: string }
    | { type: 'leap_upcoming'; leap: DevelopmentLeap; weeksUntil: number; birthDate: string }
    | { type: 'milestone'; milestone: Milestone }
    | {
        type: 'vaccine_overdue'
        vaccine: Vaccine
        overdueBy: number
        /** Total de OUTRAS vacinas atrasadas além dessa (ex: +2) */
        othersCount: number
        /** Nomes das outras (para o sheet listar) */
        otherNames: string[]
      }
    | {
        type: 'vaccine_upcoming'
        vaccine: Vaccine
        daysUntil: number
        othersCount: number
        otherNames: string[]
      }
    | {
        type: 'medication_overdue'
        /** Primeiro medicamento atrasado (o mais urgente). */
        primary: MedicationHomeAlert
        /** Quantos outros medicamentos também estão atrasados. */
        othersCount: number
        /** Nomes dos outros atrasados. */
        otherNames: string[]
      }
    | {
        type: 'medication_due_soon'
        primary: MedicationHomeAlert
        othersCount: number
        otherNames: string[]
      }
}

// ---------- Dismissal (localStorage) ----------

function dismissKey(h: Pick<Highlight, 'type' | 'id'>): string {
  // Mantém compatibilidade com chaves antigas:
  // - Saltos usavam `leap_dismissed_${id}` (7 dias)
  // - Marcos usavam `milestone_dismissed_${code}` (14 dias)
  if (h.type === 'leap_active' || h.type === 'leap_upcoming') {
    return `leap_dismissed_${h.id}`
  }
  if (h.type === 'milestone') {
    return `milestone_dismissed_${h.id}`
  }
  if (h.type === 'vaccine_overdue' || h.type === 'vaccine_upcoming') {
    return `vaccine_highlight_dismissed_${h.id}`
  }
  if (
    h.type === 'medication_overdue' ||
    h.type === 'medication_due_soon'
  ) {
    return `medication_highlight_dismissed_${h.id}`
  }
  return `highlight_dismissed_${h.type}_${h.id}`
}

export function isDismissed(h: Pick<Highlight, 'type' | 'id'>, dismissDays: number): boolean {
  try {
    const raw = localStorage.getItem(dismissKey(h))
    if (!raw) return false
    const ts = parseInt(raw, 10)
    if (isNaN(ts)) return false
    return Date.now() - ts < dismissDays * 86400000
  } catch {
    return false
  }
}

export function dismissHighlight(h: Pick<Highlight, 'type' | 'id'>): void {
  try {
    localStorage.setItem(dismissKey(h), Date.now().toString())
  } catch {
    // localStorage unavailable — noop
  }
}

// ---------- Collector ----------

interface CollectOpts {
  birthDate: string | undefined
  achievedCodes: Set<string>
  ageDays: number
  /**
   * Vacinas (opcional — se não passado, ignora esse tipo de destaque).
   * `vaccines` é a lista completa (VACCINES) e `vaccineStatus` é o Map
   * código → status calculado em `useVaccines`.
   */
  vaccines?: readonly Vaccine[]
  vaccineStatus?: Map<string, VaccineStatus>
  /**
   * Alertas de medicamentos do dia (opcional — se não passado ou vazio,
   * ignora esse tipo de destaque). Vem de `useMedications().homeAlerts`,
   * já ordenado por prioridade (overdue primeiro).
   */
  medicationAlerts?: readonly MedicationHomeAlert[]
  /**
   * Tick numérico para forçar o coletor a reavaliar (ex: depois de dispensar).
   * O valor em si não importa, só precisa mudar.
   */
  reactivityTick?: number
}

/**
 * Retorna a lista de destaques ativos e não-dispensados, ordenados por prioridade.
 * Ordem atual: salto ativo > vacina atrasada > próximo marco > vacina próxima > próximo salto.
 */
export function collectHighlights({
  birthDate,
  achievedCodes,
  ageDays,
  vaccines,
  vaccineStatus,
  medicationAlerts,
  reactivityTick,
}: CollectOpts): Highlight[] {
  void reactivityTick // só pra invalidar memos quando o tick mudar
  if (!birthDate) return []

  const out: Highlight[] = []

  // 1. Salto ativo
  const activeLeap = getActiveLeap(birthDate)
  if (activeLeap) {
    const h: Highlight = {
      id: String(activeLeap.id),
      type: 'leap_active',
      emoji: '⚡',
      kicker: `SALTO ${activeLeap.id}`,
      title: activeLeap.name,
      accent: 'primary',
      dismissDays: 7,
      data: { type: 'leap_active', leap: activeLeap, birthDate },
    }
    if (!isDismissed(h, h.dismissDays)) out.push(h)
  }

  // 2. Medicamento atrasado (urgente) — vai antes da vacina porque é ação
  //    imediata do dia. Apenas overdue aqui; due_soon fica depois dos marcos.
  const medOverdueHighlight = pickMedicationOverdueHighlight(medicationAlerts)
  if (medOverdueHighlight) out.push(medOverdueHighlight)

  // 3. Vacinas — no máximo 1 destaque por ciclo. Prioridade:
  //    atrasada (mandatória) > próxima (mandatória, dentro de 14 dias)
  //    Só considera mandatórias para não poluir a home com SBP opcional.
  const vaccineHighlight = pickVaccineHighlight({
    vaccines,
    vaccineStatus,
    ageDays,
  })
  if (vaccineHighlight) out.push(vaccineHighlight)

  // 4. Próximo marco (só se existir e estiver "dentro da janela")
  const nextMilestone = getNextMilestoneForHome(
    achievedCodes,
    ageDays,
    new Set(
      MILESTONES.filter((m) => isDismissed({ type: 'milestone', id: m.code }, 14)).map((m) => m.code),
    ),
  )
  if (nextMilestone) {
    out.push({
      id: nextMilestone.code,
      type: 'milestone',
      emoji: nextMilestone.emoji,
      kicker: 'PRÓXIMO MARCO',
      title: nextMilestone.name,
      accent: 'tertiary',
      dismissDays: 14,
      data: { type: 'milestone', milestone: nextMilestone },
    })
  }

  // 5. Medicamento com dose chegando (due_soon) — ação suave, vem depois
  //    dos marcos para não competir com chips mais informativos.
  const medDueSoonHighlight = pickMedicationDueSoonHighlight(medicationAlerts)
  if (medDueSoonHighlight) out.push(medDueSoonHighlight)

  // 6. Salto próximo (só se não tiver ativo e estiver a ≤2 semanas)
  if (!activeLeap) {
    const upcoming = getUpcomingLeap(birthDate)
    if (upcoming && upcoming.weeksUntil <= 2) {
      const h: Highlight = {
        id: `${upcoming.leap.id}_upcoming`,
        type: 'leap_upcoming',
        emoji: '🌊',
        kicker: `SALTO ${upcoming.leap.id}`,
        title: `Chega em ${upcoming.weeksUntil}sem`,
        accent: 'warning',
        dismissDays: 7,
        data: {
          type: 'leap_upcoming',
          leap: upcoming.leap,
          weeksUntil: upcoming.weeksUntil,
          birthDate,
        },
      }
      if (!isDismissed(h, h.dismissDays)) out.push(h)
    }
  }

  return out
}

// ---------- Vaccine picker ----------

/** Janela em dias para considerar uma vacina "upcoming" (próxima). */
const VACCINE_UPCOMING_WINDOW = 14

/**
 * Escolhe no máximo 1 destaque de vacina:
 *   - Prioridade 1: vacina atrasada (mandatória) — a mais antiga/vencida há mais tempo.
 *   - Prioridade 2: vacina upcoming (mandatória) — a mais próxima dentro de 14 dias.
 * Só considera mandatórias (PNI), para não encher a home com SBP opcional.
 * Respeita localStorage de dismissal.
 */
function pickVaccineHighlight(opts: {
  vaccines?: readonly Vaccine[]
  vaccineStatus?: Map<string, VaccineStatus>
  ageDays: number
}): Highlight | null {
  const { vaccines, vaccineStatus, ageDays } = opts
  if (!vaccines || !vaccineStatus) return null

  // ---------- Overdue ----------
  // Coleta TODAS as atrasadas (qualquer source, qualquer mandatory).
  // Escolhe a "principal" (preferencialmente mandatória, depois a mais vencida).
  // O resto vira +X no título.
  const allOverdue: Array<{ vaccine: Vaccine; overdueBy: number }> = []
  for (const v of vaccines) {
    if (vaccineStatus.get(v.code) !== 'overdue') continue
    allOverdue.push({ vaccine: v, overdueBy: ageDays - v.recommendedAgeDays })
  }
  if (allOverdue.length > 0) {
    // Prioridade: mandatória primeiro; dentro disso, mais vencida primeiro
    allOverdue.sort((a, b) => {
      if (a.vaccine.isMandatory !== b.vaccine.isMandatory) {
        return a.vaccine.isMandatory ? -1 : 1
      }
      return b.overdueBy - a.overdueBy
    })
    const main = allOverdue[0]
    const others = allOverdue.slice(1)
    const title =
      others.length > 0
        ? `${main.vaccine.name} +${others.length}`
        : main.vaccine.name
    const h: Highlight = {
      id: `overdue_${main.vaccine.code}`,
      type: 'vaccine_overdue',
      emoji: '💉',
      kicker:
        allOverdue.length === 1
          ? 'VACINA ATRASADA'
          : `${allOverdue.length} ATRASADAS`,
      title,
      accent: 'warning',
      dismissDays: 3,
      data: {
        type: 'vaccine_overdue',
        vaccine: main.vaccine,
        overdueBy: main.overdueBy,
        othersCount: others.length,
        otherNames: others.map((o) => o.vaccine.name),
      },
    }
    if (!isDismissed(h, h.dismissDays)) return h
  }

  // ---------- Upcoming ----------
  // Qualquer vacina com status 'can_take' OU 'future' dentro da janela.
  const allUpcoming: Array<{ vaccine: Vaccine; daysUntil: number }> = []
  for (const v of vaccines) {
    const status = vaccineStatus.get(v.code)
    if (status !== 'future' && status !== 'can_take') continue
    const daysUntil = v.recommendedAgeDays - ageDays
    if (daysUntil > VACCINE_UPCOMING_WINDOW) continue
    if (daysUntil < -VACCINE_UPCOMING_WINDOW) continue // sanity
    allUpcoming.push({ vaccine: v, daysUntil })
  }
  if (allUpcoming.length > 0) {
    // Prioridade: mandatória primeiro; dentro disso, mais próxima (menor |daysUntil|)
    allUpcoming.sort((a, b) => {
      if (a.vaccine.isMandatory !== b.vaccine.isMandatory) {
        return a.vaccine.isMandatory ? -1 : 1
      }
      return Math.abs(a.daysUntil) - Math.abs(b.daysUntil)
    })
    const main = allUpcoming[0]
    const others = allUpcoming.slice(1)
    const title =
      others.length > 0
        ? `${main.vaccine.name} +${others.length}`
        : main.vaccine.name
    const h: Highlight = {
      id: `upcoming_${main.vaccine.code}`,
      type: 'vaccine_upcoming',
      emoji: '💉',
      kicker:
        allUpcoming.length === 1
          ? 'PRÓXIMA VACINA'
          : `${allUpcoming.length} PRÓXIMAS`,
      title,
      accent: 'primary',
      dismissDays: 7,
      data: {
        type: 'vaccine_upcoming',
        vaccine: main.vaccine,
        daysUntil: main.daysUntil,
        othersCount: others.length,
        otherNames: others.map((o) => o.vaccine.name),
      },
    }
    if (!isDismissed(h, h.dismissDays)) return h
  }

  return null
}

// ---------- Medication pickers ----------

/**
 * Escolhe (no máximo) 1 destaque de "medicamento atrasado".
 *
 * - `medicationAlerts` já vem ordenado por prioridade (overdue primeiro,
 *   dentro de overdue os mais atrasados primeiro).
 * - Pegamos o primeiro overdue como "main"; o resto dos overdue vira +X.
 * - ID do highlight é baseado no conjunto de medicamentos atrasados para
 *   que, quando o set mudar, o dismissal antigo não silencie o novo.
 * - Respeita localStorage de dismissal.
 */
function pickMedicationOverdueHighlight(
  medicationAlerts?: readonly MedicationHomeAlert[],
): Highlight | null {
  if (!medicationAlerts || medicationAlerts.length === 0) return null
  const overdue = medicationAlerts.filter((a) => a.alert.kind === 'overdue')
  if (overdue.length === 0) return null

  const main = overdue[0]
  const others = overdue.slice(1)
  const title =
    others.length > 0
      ? `${main.medicationName} +${others.length}`
      : main.medicationName

  // ID estável por conjunto: ordena os IDs e concatena. Assim, se um novo
  // remédio entrar em atraso, o dismissal antigo não apaga o novo destaque.
  const setId = overdue
    .map((a) => a.medicationId)
    .slice()
    .sort()
    .join('_')

  const h: Highlight = {
    id: `overdue_${setId}`,
    type: 'medication_overdue',
    emoji: '💊',
    kicker:
      overdue.length === 1
        ? 'REMÉDIO ATRASADO'
        : `${overdue.length} ATRASADOS`,
    title,
    accent: 'warning',
    dismissDays: 1, // um dia só, porque muda de estado rápido
    data: {
      type: 'medication_overdue',
      primary: main,
      othersCount: others.length,
      otherNames: others.map((o) => o.medicationName),
    },
  }
  if (isDismissed(h, h.dismissDays)) return null
  return h
}

/**
 * Escolhe (no máximo) 1 destaque de "dose chegando" (due_soon).
 *
 * Só dispara quando não há overdue — o overdue já toma o chip de alerta.
 * Chip mais suave, cor primary, dismissável por 1 dia.
 */
function pickMedicationDueSoonHighlight(
  medicationAlerts?: readonly MedicationHomeAlert[],
): Highlight | null {
  if (!medicationAlerts || medicationAlerts.length === 0) return null
  const dueSoon = medicationAlerts.filter((a) => a.alert.kind === 'due_soon')
  if (dueSoon.length === 0) return null

  const main = dueSoon[0]
  const others = dueSoon.slice(1)
  const title =
    others.length > 0
      ? `${main.medicationName} +${others.length}`
      : main.medicationName

  const setId = dueSoon
    .map((a) => a.medicationId)
    .slice()
    .sort()
    .join('_')

  const h: Highlight = {
    id: `due_soon_${setId}`,
    type: 'medication_due_soon',
    emoji: '💊',
    kicker:
      dueSoon.length === 1
        ? 'DOSE CHEGANDO'
        : `${dueSoon.length} DOSES CHEGANDO`,
    title,
    accent: 'primary',
    dismissDays: 1,
    data: {
      type: 'medication_due_soon',
      primary: main,
      othersCount: others.length,
      otherNames: others.map((o) => o.medicationName),
    },
  }
  if (isDismissed(h, h.dismissDays)) return null
  return h
}
