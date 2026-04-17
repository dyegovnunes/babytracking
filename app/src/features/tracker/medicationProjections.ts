/**
 * Projeções de medicamento pra home. Regra: aparece na home SÓ quando falta
 * ≤ 1h pra dose agendada. Doses atrasadas (overdue) **não** entram aqui —
 * elas continuam aparecendo no alert da `HighlightsStrip` (decisão de
 * produto: overdue deve ser urgente, não pulável).
 */

import type { Medication, MedicationDayStatus } from '../medications/medicationData'

/** Janela de antecedência pra mostrar cards de medicamento. */
const MEDICATION_LOOKAHEAD_MS = 60 * 60 * 1000 // 1 hora

export interface MedicationProjection {
  medication: Medication
  /** Slot alvo "HH:mm". */
  slotTime: string
  /** Horário do slot como Date de hoje. */
  scheduledAt: Date
  /** Minutos até a dose (sempre >= 0 — overdues não entram). */
  minutesUntil: number
}

/**
 * Dado os dayStatuses das medicações ativas, retorna as próximas doses
 * que caem na janela de 1h. Ordenado por proximidade (mais perto primeiro).
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

    // Só janela de 1h no futuro. Overdues (minutesUntil < 0) vão pra HighlightsStrip.
    if (minutesUntil < 0) continue
    if (scheduledAt.getTime() - now.getTime() > MEDICATION_LOOKAHEAD_MS) continue

    out.push({
      medication: status.medication,
      slotTime: status.nextPendingTime,
      scheduledAt,
      minutesUntil,
    })
  }

  out.sort((a, b) => a.minutesUntil - b.minutesUntil)
  return out
}
