import type { LogEntry } from '../../types'
import type { CaregiverShift } from '../tracker/useCaregiverShift'
import type { BabyVaccine } from '../vaccines/vaccineData'
import type { BabyMilestone } from '../milestones/milestoneData'
import type { MedicationLog, Medication } from '../medications/medicationData'

/**
 * Item unificado da timeline. Cada variante traz seu payload próprio
 * e é discriminada por `kind`. Timestamp é sempre ms (normalizado pelo
 * useTimeline).
 *
 * Regra de ouro: só entra na timeline quem tem **timestamp real de
 * ocorrência**. Vacina sem applied_at, marco sem achieved_at, etc.
 * ficam fora — a feature continua sendo a fonte de verdade pra status
 * "ainda não aconteceu".
 */
export type TimelineItem =
  | { kind: 'log'; id: string; ts: number; pairedLog?: LogEntry; data: LogEntry }
  | { kind: 'shift'; id: string; ts: number; data: CaregiverShift }
  | {
      kind: 'vaccine'
      id: string
      ts: number
      data: BabyVaccine
      /** Nome legível (ex: "BCG (1ª dose)"). Resolvido no agregador. */
      displayName: string
    }
  | {
      kind: 'milestone'
      id: string
      ts: number
      data: BabyMilestone
      /** Nome legível do marco (ex: "Primeira palavra"). */
      displayName: string
    }
  | {
      kind: 'medication'
      id: string
      ts: number
      data: MedicationLog
      /** Medicação pai (pra exibir nome + dose). Resolvido no agregador. */
      medication: Medication
    }

export type TimelineFilter = 'all' | 'activities' | 'health' | 'milestones' | 'meals'
