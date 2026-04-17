/**
 * Projeções de medicamento pra home. Regra:
 * - Doses **atrasadas** (até 24h pra trás) aparecem com tratamento vermelho
 *   pra o pai confirmar "Dei a dose" sem sair da home.
 * - Próximas doses agendadas aparecem 1h antes (laranja).
 *
 * As overdues ficam também no alert da `HighlightsStrip` — é complemento,
 * não duplicação: o alert é passivo, a projeção é acionável.
 */

import type { Medication, MedicationDayStatus } from '../medications/medicationData'
import { OVERDUE_EXPIRY_MINUTES } from '../medications/medicationUtils'

/** Janela de antecedência pra mostrar cards de dose futura. */
const MEDICATION_LOOKAHEAD_MS = 60 * 60 * 1000 // 1 hora

export interface MedicationProjection {
  medication: Medication
  /** Slot alvo "HH:mm". */
  slotTime: string
  /** Horário do slot como Date de hoje. */
  scheduledAt: Date
  /** Minutos até a dose. Negativo = atrasado. */
  minutesUntil: number
  /** True quando `minutesUntil < 0` (dose agendada já passou). */
  isOverdue: boolean
}

/**
 * Dado os dayStatuses das medicações ativas, retorna doses pendentes
 * próximas (≤1h) ou atrasadas (até 24h). Ordena overdues primeiro
 * (mais atrasada no topo).
 */
export function getMedicationProjections(
  dayStatuses: MedicationDayStatus[],
  now: Date = new Date(),
): MedicationProjection[] {
  const out: MedicationProjection[] = []

  for (const status of dayStatuses) {
    if (!status.nextPendingTime) continue

    const [h, m] = status.nextPendingTime.split(':').map((v) => parseInt(v, 10))
    if (isNaN(h) || isNaN(m)) continue

    const scheduledAt = new Date(now)
    scheduledAt.setHours(h, m, 0, 0)

    const minutesUntil = Math.floor((scheduledAt.getTime() - now.getTime()) / 60000)

    // Passado: só até OVERDUE_EXPIRY (24h). Doses de ontem não entram.
    if (minutesUntil < -OVERDUE_EXPIRY_MINUTES) continue
    // Futuro: só até 1h (janela pra eventos com horário fixo).
    if (scheduledAt.getTime() - now.getTime() > MEDICATION_LOOKAHEAD_MS) continue

    out.push({
      medication: status.medication,
      slotTime: status.nextPendingTime,
      scheduledAt,
      minutesUntil,
      isOverdue: minutesUntil < 0,
    })
  }

  // Overdues primeiro (mais atrasada no topo); depois próximas (por proximidade).
  out.sort((a, b) => {
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1
    if (a.isOverdue) return a.minutesUntil - b.minutesUntil // mais negativo primeiro
    return a.minutesUntil - b.minutesUntil // menor positivo primeiro
  })
  return out
}
