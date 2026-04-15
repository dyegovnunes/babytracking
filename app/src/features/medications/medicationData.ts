/**
 * Tipos e constantes da feature Medicamentos.
 *
 * Nenhum acesso a Supabase nem a DOM aqui — tudo puro, fácil de testar.
 */

export type MedicationDurationType = 'continuous' | 'fixed'

export interface Medication {
  id: string
  babyId: string
  name: string
  dosage: string
  /** Intervalo em horas entre doses (ex: 24 para 1x/dia, 6 para a cada 6h) */
  frequencyHours: number
  /** Horários agendados do dia em "HH:mm" (ordenados) */
  scheduleTimes: string[]
  durationType: MedicationDurationType
  /** YYYY-MM-DD */
  startDate: string
  /** YYYY-MM-DD ou null (para continuous) */
  endDate: string | null
  notes: string | null
  isActive: boolean
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface MedicationLog {
  id: string
  medicationId: string
  babyId: string
  /** ISO timestamp completo (com timezone) */
  administeredAt: string
  administeredBy: string | null
  notes: string | null
  createdAt: string
}

/** Preset selecionável no form (frequência + label). */
export interface FrequencyPreset {
  key: string
  label: string
  hours: number
  /** Quantas doses por dia esse preset implica */
  dosesPerDay: number
}

export const FREQUENCY_PRESETS: FrequencyPreset[] = [
  { key: '1x', label: '1x por dia', hours: 24, dosesPerDay: 1 },
  { key: '12h', label: 'A cada 12h (2x/dia)', hours: 12, dosesPerDay: 2 },
  { key: '8h', label: 'A cada 8h (3x/dia)', hours: 8, dosesPerDay: 3 },
  { key: '6h', label: 'A cada 6h (4x/dia)', hours: 6, dosesPerDay: 4 },
  { key: '4h', label: 'A cada 4h (6x/dia)', hours: 4, dosesPerDay: 6 },
]

// -------------------------------------------------------------------------
// Tipos de input para criar/atualizar medicamentos
// -------------------------------------------------------------------------

export interface CreateMedicationInput {
  name: string
  dosage: string
  frequencyHours: number
  scheduleTimes: string[]
  durationType: MedicationDurationType
  startDate: string
  /** Obrigatório para `fixed`, ignorado para `continuous` */
  endDate?: string | null
  notes?: string | null
}

// -------------------------------------------------------------------------
// Status diário (o que o Card/AlertCard/AdminSheet consomem)
// -------------------------------------------------------------------------

export interface MedicationDoseStatus {
  /** "HH:mm" do horário agendado */
  time: string
  /** Log que cobriu esse horário, ou null se pendente */
  log: MedicationLog | null
  /** Nome (displayName) de quem administrou, ou null se ainda pendente / unknown */
  administeredByName: string | null
}

export type MedicationAlert =
  | { kind: 'overdue'; minutesLate: number; time: string }
  | { kind: 'due_soon'; minutesUntil: number; time: string }
  | null

export interface MedicationDayStatus {
  medication: Medication
  /** Uma entrada por horário agendado do dia */
  doses: MedicationDoseStatus[]
  /** Qtd de doses já dadas hoje */
  givenCount: number
  /** Total de doses do dia */
  totalCount: number
  /** Próximo horário pendente ("HH:mm"), ou null se todas foram dadas */
  nextPendingTime: string | null
  /** Estado do alerta (pro card da home e pro MedicationCard) */
  alert: MedicationAlert
  /** Progresso 0..1 para tratamentos fixos (dia X de N) */
  treatmentProgress: {
    dayIndex: number
    totalDays: number
    fraction: number
  } | null
}
