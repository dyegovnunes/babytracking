/**
 * Lógica pura de medicamentos.
 *
 * Nada aqui toca Supabase, React ou DOM — são funções de cálculo que
 * recebem `now: Date` como parâmetro para serem 100% testáveis.
 */

import type {
  Medication,
  MedicationAlert,
  MedicationDayStatus,
  MedicationDoseStatus,
  MedicationLog,
} from './medicationData'
import { getLocalDateString } from '../../lib/formatters'

/** Minutos de tolerância: acima disso, uma dose vira "overdue". */
export const OVERDUE_MINUTES = 30
/** Minutos antes do horário que dispara o "due_soon". */
export const DUE_SOON_MINUTES = 15
/** Após quantos minutos um overdue para de disparar alerta (silencia a home). */
export const OVERDUE_EXPIRY_MINUTES = 24 * 60

// -------------------------------------------------------------------------
// Compute schedule times (puro)
// -------------------------------------------------------------------------

/**
 * Gera a lista de horários a partir do primeiro horário + intervalo.
 *
 * Exemplos:
 * - firstTime="08:00", hours=8  → ["08:00","16:00","00:00"]
 * - firstTime="08:00", hours=6  → ["08:00","14:00","20:00","02:00"]
 * - firstTime="09:00", hours=24 → ["09:00"]
 *
 * Retorna ordenado por hora (ascendente) — se o primeiro horário for 14:00
 * e o intervalo for 12h, retorna ["02:00","14:00"].
 */
export function computeScheduleTimes(
  firstTime: string,
  frequencyHours: number,
): string[] {
  const [hStr, mStr] = firstTime.split(':')
  const startH = parseInt(hStr, 10)
  const startM = parseInt(mStr, 10)
  if (
    isNaN(startH) ||
    isNaN(startM) ||
    !Number.isFinite(frequencyHours) ||
    frequencyHours <= 0
  ) {
    return []
  }

  // Quantas doses cabem em 24h (arredondando pra baixo; se der exato, é esse)
  // Ex: 24/8=3, 24/6=4, 24/24=1
  const dosesPerDay = Math.max(1, Math.floor(24 / frequencyHours))
  const out: string[] = []
  const startMinutes = startH * 60 + startM
  for (let i = 0; i < dosesPerDay; i++) {
    const totalMin = (startMinutes + i * frequencyHours * 60) % (24 * 60)
    const h = Math.floor(totalMin / 60)
    const m = Math.round(totalMin - h * 60)
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  out.sort((a, b) => a.localeCompare(b))
  // Dedup (caso frequência estranha crie colisões)
  return Array.from(new Set(out))
}

// -------------------------------------------------------------------------
// Day status (puro)
// -------------------------------------------------------------------------

/** "HH:mm" a partir de um Date. */
function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Diferença em minutos entre um horário "HH:mm" e um Date (positiva = futuro). */
function minutesFromNowToTime(time: string, now: Date): number {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10))
  const nowTotal = now.getHours() * 60 + now.getMinutes()
  const target = h * 60 + m
  return target - nowTotal
}

/**
 * Constrói o status diário de um medicamento: horários, quem deu o quê,
 * próximo pendente, progresso.
 *
 * - `logs` deve conter apenas os logs DAQUELE medicamento DO DIA atual
 *   (mas a função é defensiva e filtra de novo).
 * - `membersById` mapeia `user_id → displayName` (dos membros do bebê).
 *   Usado para popular `administeredByName`.
 * - `now` é a referência pra calcular progresso (dias) e "próximo pendente".
 */
export function getMedicationDayStatus(
  medication: Medication,
  logs: MedicationLog[],
  now: Date,
  membersById: Record<string, string>,
): MedicationDayStatus {
  const today = getLocalDateString(now)
  const schedule = [...medication.scheduleTimes].sort((a, b) =>
    a.localeCompare(b),
  )

  // Filtra os logs: só desse medicamento e só do dia corrente (local date)
  const todayLogs = logs
    .filter((l) => l.medicationId === medication.id)
    .filter((l) => {
      const d = new Date(l.administeredAt)
      return getLocalDateString(d) === today
    })
    .sort(
      (a, b) =>
        new Date(a.administeredAt).getTime() -
        new Date(b.administeredAt).getTime(),
    )

  // Matching log<->slot acontece em 2 passes:
  //
  //   PASS 1: binding explícito por slot_time. Quick-apply (e no futuro o admin
  //           sheet) grava `slot_time = "HH:mm"` junto com o log, então sabemos
  //           exatamente qual slot aquela dose cumpriu — sem janela de tempo.
  //
  //   PASS 2: fallback por proximidade de tempo, só para logs legados
  //           (`slotTime === null`). Janela de ±(frequencyHours/2) com piso de
  //           30min. Isso cobre doses registradas antes da migration 20260414d
  //           e doses "extras" criadas manualmente que caem perto de um slot.
  //
  // Logs sobrando (slot_time válido mas sem match, ou proximidade fora da
  // janela) viram `unmatched` e contam no `givenCount` como doses extras.
  const usedLogIds = new Set<string>()

  // ---- PASS 1: binding explícito ----
  const boundByTime = new Map<string, MedicationLog>()
  for (const log of todayLogs) {
    if (!log.slotTime) continue
    if (boundByTime.has(log.slotTime)) continue // primeiro log que bater ganha
    boundByTime.set(log.slotTime, log)
    usedLogIds.add(log.id)
  }

  // ---- PASS 2: fallback proximidade (só logs sem slotTime) ----
  const halfWindowMin =
    Math.max(medication.frequencyHours / 2, 0.5) * 60 // mínimo 30min
  const doses: MedicationDoseStatus[] = schedule.map((time) => {
    const bound = boundByTime.get(time) ?? null

    let picked: MedicationLog | null = bound
    if (!picked) {
      const [h, m] = time.split(':').map((v) => parseInt(v, 10))
      const targetMin = h * 60 + m
      let best: { log: MedicationLog; diff: number } | null = null
      for (const log of todayLogs) {
        if (usedLogIds.has(log.id)) continue
        if (log.slotTime) continue // só logs sem binding entram no fallback
        const ld = new Date(log.administeredAt)
        const lMin = ld.getHours() * 60 + ld.getMinutes()
        const diff = Math.abs(lMin - targetMin)
        if (diff > halfWindowMin) continue
        if (!best || diff < best.diff) best = { log, diff }
      }
      if (best) {
        picked = best.log
        usedLogIds.add(best.log.id)
      }
    }

    const name = picked?.administeredBy
      ? membersById[picked.administeredBy] ?? null
      : null

    return {
      time,
      log: picked,
      administeredByName: name,
    }
  })

  // Sobras: logs que não casaram com nenhum slot (ex: dose extra não-agendada)
  // Aparecem como entradas adicionais no fim, sem `time` padrão. Por ora,
  // só ignoramos no status do dia (mas contam no givenCount).
  const unmatched = todayLogs.filter((l) => !usedLogIds.has(l.id))

  const givenCount = doses.filter((d) => d.log !== null).length + unmatched.length
  const totalCount = schedule.length

  // Próximo horário pendente: primeira dose sem log, ordenada por horário,
  // considerando APENAS horários futuros ou dentro da janela de overdue.
  // Horários do dia anterior (que já passaram há mais de OVERDUE_EXPIRY) não
  // contam como pendentes hoje.
  const pendingDoses = doses.filter((d) => d.log === null)
  let nextPendingTime: string | null = null
  for (const d of pendingDoses) {
    const diff = minutesFromNowToTime(d.time, now)
    // futuro OU passado recente (até OVERDUE_EXPIRY)
    if (diff >= 0 || diff > -OVERDUE_EXPIRY_MINUTES) {
      nextPendingTime = d.time
      break
    }
  }
  if (!nextPendingTime && pendingDoses.length > 0) {
    nextPendingTime = pendingDoses[0].time
  }

  // Alert (overdue / due_soon / null)
  const alert = computeAlert(doses, now)

  // Progresso de tratamento fixo
  const treatmentProgress = computeTreatmentProgress(medication, now)

  return {
    medication,
    doses,
    givenCount,
    totalCount,
    nextPendingTime,
    alert,
    treatmentProgress,
  }
}

// -------------------------------------------------------------------------
// Alert state (puro)
// -------------------------------------------------------------------------

/**
 * Dado o conjunto de doses do dia, determina se o medicamento está em
 * estado de alerta:
 *
 * - `overdue`: alguma dose pendente passou de `OVERDUE_MINUTES` do horário
 *   (mas ainda dentro de `OVERDUE_EXPIRY_MINUTES`). Mais urgente.
 * - `due_soon`: próxima dose em até `DUE_SOON_MINUTES`.
 * - `null`: nada a mostrar.
 *
 * Overdue tem prioridade sobre due_soon. Quando há múltiplas overdue,
 * escolhemos a mais atrasada (maior `minutesLate`). Quando há múltiplas
 * due_soon, escolhemos a mais próxima.
 */
export function computeAlert(
  doses: MedicationDoseStatus[],
  now: Date,
): MedicationAlert {
  void formatClock // reservado para formatos futuros
  let overdue: { minutesLate: number; time: string } | null = null
  let dueSoon: { minutesUntil: number; time: string } | null = null

  for (const d of doses) {
    if (d.log !== null) continue // já foi dada
    const diff = minutesFromNowToTime(d.time, now)
    // Atrasada mas ainda "viva" (dentro de OVERDUE_EXPIRY)
    if (
      diff <= -OVERDUE_MINUTES &&
      diff > -OVERDUE_EXPIRY_MINUTES
    ) {
      const minutesLate = Math.abs(diff)
      if (!overdue || minutesLate > overdue.minutesLate) {
        overdue = { minutesLate, time: d.time }
      }
    } else if (diff >= 0 && diff <= DUE_SOON_MINUTES) {
      if (!dueSoon || diff < dueSoon.minutesUntil) {
        dueSoon = { minutesUntil: diff, time: d.time }
      }
    }
  }

  if (overdue) {
    return { kind: 'overdue', minutesLate: overdue.minutesLate, time: overdue.time }
  }
  if (dueSoon) {
    return { kind: 'due_soon', minutesUntil: dueSoon.minutesUntil, time: dueSoon.time }
  }
  return null
}

// -------------------------------------------------------------------------
// Treatment progress (puro)
// -------------------------------------------------------------------------

function computeTreatmentProgress(
  medication: Medication,
  now: Date,
): MedicationDayStatus['treatmentProgress'] {
  if (medication.durationType !== 'fixed' || !medication.endDate) return null
  const start = parseLocalDate(medication.startDate)
  const end = parseLocalDate(medication.endDate)
  const today = parseLocalDate(getLocalDateString(now))
  if (!start || !end || !today) return null
  const totalDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
  )
  const elapsed = Math.round((today.getTime() - start.getTime()) / 86400000) + 1
  const dayIndex = Math.min(Math.max(elapsed, 1), totalDays)
  return {
    dayIndex,
    totalDays,
    fraction: dayIndex / totalDays,
  }
}

function parseLocalDate(s: string): Date | null {
  const [y, m, d] = s.split('-').map((v) => parseInt(v, 10))
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

// -------------------------------------------------------------------------
// Agregação para a home (AlertCard)
// -------------------------------------------------------------------------

/**
 * Entrada resumida usada pelos highlights da TrackerPage (chip no strip).
 * Descreve um medicamento em estado de alerta e qual é o alert.
 */
export interface MedicationHomeAlert {
  medicationId: string
  medicationName: string
  alert: NonNullable<MedicationAlert>
}

/**
 * Dado o array de MedicationDayStatus (um por medicamento ativo), filtra
 * só os que têm alerta. Ordenado por prioridade: overdue primeiro, depois
 * due_soon (mais urgente primeiro em cada grupo).
 */
export function getHomeAlerts(
  statuses: MedicationDayStatus[],
): MedicationHomeAlert[] {
  const out: MedicationHomeAlert[] = []
  for (const s of statuses) {
    if (!s.alert) continue
    out.push({
      medicationId: s.medication.id,
      medicationName: s.medication.name,
      alert: s.alert,
    })
  }
  out.sort((a, b) => {
    // overdue > due_soon
    if (a.alert.kind !== b.alert.kind) {
      return a.alert.kind === 'overdue' ? -1 : 1
    }
    if (a.alert.kind === 'overdue' && b.alert.kind === 'overdue') {
      return b.alert.minutesLate - a.alert.minutesLate // mais atrasada primeiro
    }
    if (a.alert.kind === 'due_soon' && b.alert.kind === 'due_soon') {
      return a.alert.minutesUntil - b.alert.minutesUntil // mais próxima primeiro
    }
    return 0
  })
  return out
}

// -------------------------------------------------------------------------
// Formatação auxiliar
// -------------------------------------------------------------------------

/** "em 12min" / "em 1h" / "agora" */
export function formatDueSoon(minutesUntil: number): string {
  if (minutesUntil <= 0) return 'agora'
  if (minutesUntil < 60) return `em ${minutesUntil}min`
  const h = Math.floor(minutesUntil / 60)
  const m = minutesUntil % 60
  return m === 0 ? `em ${h}h` : `em ${h}h${m}m`
}

/** "há 12min" / "há 1h" */
export function formatOverdue(minutesLate: number): string {
  if (minutesLate < 60) return `há ${minutesLate}min`
  const h = Math.floor(minutesLate / 60)
  const m = minutesLate % 60
  return m === 0 ? `há ${h}h` : `há ${h}h${m}m`
}
