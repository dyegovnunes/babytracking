import type { DevelopmentLeap, Milestone } from '../features/milestones'
import {
  getActiveLeap,
  getUpcomingLeap,
  MILESTONES,
  getNextMilestoneForHome,
} from '../features/milestones'

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

export type HighlightType = 'leap_active' | 'leap_upcoming' | 'milestone'

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
   * Tick numérico para forçar o coletor a reavaliar (ex: depois de dispensar).
   * O valor em si não importa, só precisa mudar.
   */
  reactivityTick?: number
}

/**
 * Retorna a lista de destaques ativos e não-dispensados, ordenados por prioridade.
 * Ordem atual: salto ativo > próximo marco > próximo salto.
 */
export function collectHighlights({ birthDate, achievedCodes, ageDays, reactivityTick }: CollectOpts): Highlight[] {
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

  // 2. Próximo marco (só se existir e estiver "dentro da janela")
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

  // 3. Salto próximo (só se não tiver ativo e estiver a ≤2 semanas)
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
