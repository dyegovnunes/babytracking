/**
 * Public API da feature Medicamentos.
 *
 * Consumidores fora desta pasta devem importar **só** deste barrel —
 * componentes internos (Card, Form, AdminSheet) são privados da feature.
 *
 * Exceção: `MedicationsPage` é carregado via `React.lazy` no App.tsx e por
 * isso é importado diretamente de `./MedicationsPage` (lazy precisa de
 * default export em um arquivo que aponte pro módulo). Ver App.tsx.
 */

export { useMedications } from './useMedications'
export type {
  AddMedicationResult,
  AdministerResult,
  MutationResult,
} from './useMedications'
export {
  computeScheduleTimes,
  getMedicationDayStatus,
  getHomeAlerts,
  formatDueSoon,
  formatOverdue,
  DUE_SOON_MINUTES,
  OVERDUE_MINUTES,
  OVERDUE_EXPIRY_MINUTES,
} from './medicationUtils'
export type { MedicationHomeAlert } from './medicationUtils'
export {
  FREQUENCY_PRESETS,
} from './medicationData'
export type {
  Medication,
  MedicationLog,
  MedicationDurationType,
  MedicationDayStatus,
  MedicationDoseStatus,
  MedicationAlert,
  CreateMedicationInput,
  FrequencyPreset,
} from './medicationData'
