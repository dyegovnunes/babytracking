/**
 * Public API da feature Vaccines (Caderneta de Vacinas).
 *
 * Consumidores fora desta pasta devem importar **só** deste barrel —
 * componentes internos (VaccineRow, sheets etc.) são privados da feature.
 *
 * Exceção: `VaccinesPage` é carregado via `React.lazy` no App.tsx e por isso
 * é importado diretamente de `./VaccinesPage` (lazy precisa de default export
 * em um arquivo que aponte pro módulo). Ver App.tsx.
 */

export { useVaccines } from './useVaccines'
export type { ApplyVaccineInput, ApplyVaccineResult } from './useVaccines'
export {
  VACCINES,
  getVaccineStatus,
  groupVaccinesByAge,
  getAgeGroupLabel,
} from './vaccineData'
export type {
  Vaccine,
  BabyVaccine,
  VaccineSource,
  VaccineStatus,
} from './vaccineData'
