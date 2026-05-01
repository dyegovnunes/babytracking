import { useMemo } from 'react'
import type { LogEntry } from '../../types'
import type { CaregiverShift } from '../tracker/useCaregiverShift'
import type { BabyVaccine } from '../vaccines/vaccineData'
import type { BabyMilestone } from '../milestones/milestoneData'
import type { MedicationLog, Medication } from '../medications/medicationData'
import { VACCINES } from '../vaccines/vaccineData'
import { MILESTONES } from '../milestones/milestoneData'
import { detectBreastPairs } from './lib/detectBreastPairs'
import type { TimelineItem, TimelineFilter } from './types'

export interface TimelineInputs {
  logs: LogEntry[]
  shifts?: CaregiverShift[]
  vaccines?: BabyVaccine[]
  milestones?: BabyMilestone[]
  medicationLogs?: MedicationLog[]
  /** Medicações pai (pra resolver nome/dose por log). Pode ser parcial. */
  medications?: Medication[]
}

export interface UseTimelineResult {
  items: TimelineItem[]
  /** `hidden` + `pairs` do detectBreastPairs — expostos pra quem precisar. */
  breastPairs: Map<string, LogEntry>
}

/**
 * Hook puro. Recebe arrays já carregados (pelos callers — TrackerPage,
 * HistoryPage) e retorna TimelineItem[] ordenado por `ts` desc.
 *
 * Aplica também a detecção de pares de peito: quando left+right acontecem
 * em < 30min, o primeiro vira a row principal (com `pairedLog` preenchido)
 * e o segundo é ocultado.
 *
 * Regra de inclusão por tipo:
 * - log: sempre (com `timestamp`)
 * - shift: só submetidos (`submittedAt != null`)
 * - vaccine: só aplicadas com `appliedAt` preenchido (auto-registradas
 *   sem data ficam fora — não temos quando a vacina foi realmente dada)
 * - milestone: só atingidos com `achievedAt` (idem acima pra auto-registrados)
 * - medication log: sempre (sempre tem `administeredAt`)
 */
export function useTimeline(inputs: TimelineInputs): UseTimelineResult {
  return useMemo(() => {
    const {
      logs,
      shifts = [],
      vaccines = [],
      milestones = [],
      medicationLogs = [],
      medications = [],
    } = inputs

    // 1. Pares de peito — só afetam logs
    const { pairs, hidden } = detectBreastPairs(logs)

    // 2. Pares de sono: para cada "wake", encontra o "sleep" imediatamente anterior
    //    Usamos os timestamps reais — editar qualquer um dos dois atualiza a duração.
    const sleepPairs = new Map<string, LogEntry>()
    const sleepWakeLogs = logs
      .filter((l) => l.eventId === 'sleep' || l.eventId === 'wake')
      .sort((a, b) => a.timestamp - b.timestamp)
    for (let i = 0; i < sleepWakeLogs.length; i++) {
      const l = sleepWakeLogs[i]
      if (l.eventId === 'wake') {
        // Procura o "sleep" mais próximo antes deste "wake"
        const prev = sleepWakeLogs.slice(0, i).reverse().find((p) => p.eventId === 'sleep')
        if (prev) sleepPairs.set(l.id, prev)
      }
    }

    // 3. Montar todos os TimelineItems
    const items: TimelineItem[] = []

    for (const log of logs) {
      if (hidden.has(log.id)) continue
      items.push({
        kind: 'log',
        id: log.id,
        ts: log.timestamp,
        pairedLog: pairs.get(log.id),
        sleepLog: sleepPairs.get(log.id),
        data: log,
      })
    }

    for (const s of shifts) {
      if (!s.submittedAt) continue
      items.push({
        kind: 'shift',
        id: s.id,
        ts: new Date(s.submittedAt).getTime(),
        data: s,
      })
    }

    for (const v of vaccines) {
      if (v.status !== 'applied' || !v.appliedAt) continue
      const ref = VACCINES.find((vv) => vv.code === v.vaccineCode)
      const displayName = ref
        ? `${ref.shortName} (${ref.doseLabel})`
        : v.vaccineCode
      // applied_at agora é TIMESTAMPTZ — hora real preservada.
      items.push({
        kind: 'vaccine',
        id: v.id,
        ts: new Date(v.appliedAt).getTime(),
        data: v,
        displayName,
      })
    }

    for (const m of milestones) {
      if (!m.achievedAt) continue
      const ref = MILESTONES.find((mm) => mm.code === m.milestoneCode)
      const displayName = ref ? ref.name : m.milestoneCode
      items.push({
        kind: 'milestone',
        id: m.id,
        ts: new Date(m.achievedAt).getTime(),
        data: m,
        displayName,
      })
    }

    const medById = new Map<string, Medication>()
    for (const med of medications) medById.set(med.id, med)
    for (const mlog of medicationLogs) {
      const med = medById.get(mlog.medicationId)
      if (!med) continue // sem contexto de medicação (nome, dose), pula
      items.push({
        kind: 'medication',
        id: mlog.id,
        ts: new Date(mlog.administeredAt).getTime(),
        data: mlog,
        medication: med,
      })
    }

    items.sort((a, b) => b.ts - a.ts)

    return { items, breastPairs: pairs }
  }, [inputs])
}

/** Filtro categorial pra timeline. Mapeia `kind` → categoria. */
export function matchesFilter(item: TimelineItem, filter: TimelineFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'activities') return item.kind === 'log' || item.kind === 'shift'
  if (filter === 'health') return item.kind === 'vaccine' || item.kind === 'medication'
  if (filter === 'milestones') return item.kind === 'milestone'
  if (filter === 'meals') return item.kind === 'log' && (item.data as { eventId: string }).eventId === 'meal'
  return true
}
