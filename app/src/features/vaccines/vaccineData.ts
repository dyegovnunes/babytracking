/**
 * Catálogo de vacinas (client-side).
 *
 * Este array espelha o conteúdo da tabela `vaccines` no Supabase
 * (ver `supabase/migrations/20260414_vaccines.sql`). A tabela do banco
 * existe para dar FK integrity aos registros em `baby_vaccines` — mas para
 * renderizar a caderneta usamos o array abaixo, sem latência.
 *
 * Regra: se mudar um, mude o outro. O código (`code`) é a chave estável.
 */

export type VaccineSource = 'PNI' | 'SBP'

/**
 * Status derivado de uma vacina para um bebê.
 *
 *   applied  — usuário marcou como aplicada
 *   skipped  — usuário decidiu que NÃO vai aplicar (ex: SBP opcional)
 *   future   — bebê ainda não atingiu a idade recomendada
 *   can_take — já atingiu, ainda não aplicada, dentro da janela
 *   overdue  — atingiu idade + 30 dias sem marcar nada
 */
export type VaccineStatus =
  | 'applied'
  | 'skipped'
  | 'can_take'
  | 'overdue'
  | 'future'

/** Estado persistido da vacina no baby_vaccines (antes de derivar o status). */
export type BabyVaccineStatus = 'applied' | 'skipped'

export interface Vaccine {
  code: string
  name: string
  shortName: string
  protectsAgainst: string
  doseLabel: string
  doseNumber: number
  totalDoses: number
  recommendedAgeDays: number
  source: VaccineSource
  /**
   * Vacina do calendário obrigatório (PNI) vs complementar/opcional (SBP).
   * Eixo independente de `source` pra dar flexibilidade futura — ex: se
   * algum dia quisermos marcar Influenza como "recomendada" mesmo sendo PNI.
   */
  isMandatory: boolean
  note?: string
  sortOrder: number
}

export interface BabyVaccine {
  id: string
  babyId: string
  vaccineId: string
  vaccineCode: string
  /** null quando status === 'skipped' ou quando foi auto-registrada sem data */
  appliedAt: string | null
  status: BabyVaccineStatus
  location: string | null
  batchNumber: string | null
  recordedBy: string | null
  createdAt: string
  /** true quando marcada automaticamente pelo sistema (sem confirmação do pai) */
  autoRegistered: boolean
}

// -------------------------------------------------------------------------
// Dados do calendário
// -------------------------------------------------------------------------

export const VACCINES: Vaccine[] = [
  // Ao nascer
  { code: 'BCG', name: 'BCG', shortName: 'BCG', protectsAgainst: 'Tuberculose', doseLabel: 'Dose única', doseNumber: 1, totalDoses: 1, recommendedAgeDays: 0, source: 'PNI', isMandatory: true, sortOrder: 1 },
  { code: 'HEPB_BIRTH', name: 'Hepatite B', shortName: 'Hepatite B', protectsAgainst: 'Hepatite B', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 1, recommendedAgeDays: 0, source: 'PNI', note: 'Aplicada nas primeiras 12 horas de vida.', isMandatory: true, sortOrder: 2 },

  // 2 meses — PNI
  { code: 'PENTA_1', name: 'Pentavalente', shortName: 'Pentavalente', protectsAgainst: 'Difteria, Tétano, Coqueluche, Hib, Hepatite B', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 3, recommendedAgeDays: 60, source: 'PNI', isMandatory: true, sortOrder: 20 },
  { code: 'VIP_1', name: 'VIP (Poliomielite inativada)', shortName: 'Poliomielite', protectsAgainst: 'Poliomielite', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 4, recommendedAgeDays: 60, source: 'PNI', isMandatory: true, sortOrder: 21 },
  { code: 'ROTA_MONO_1', name: 'Rotavírus monovalente', shortName: 'Rotavírus', protectsAgainst: 'Rotavírus', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 2, recommendedAgeDays: 60, source: 'PNI', isMandatory: true, sortOrder: 22 },
  { code: 'VPC10_1', name: 'Pneumocócica 10-valente', shortName: 'Pneumo 10', protectsAgainst: 'Doenças pneumocócicas (10 sorotipos)', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 3, recommendedAgeDays: 60, source: 'PNI', isMandatory: true, sortOrder: 23 },
  { code: 'MENC_1', name: 'Meningocócica C', shortName: 'Meningo C', protectsAgainst: 'Meningite tipo C', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 3, recommendedAgeDays: 60, source: 'PNI', isMandatory: true, sortOrder: 24 },
  // 2 meses — SBP
  { code: 'VPC13_1', name: 'Pneumocócica 13-valente', shortName: 'Pneumo 13', protectsAgainst: 'Doenças pneumocócicas (13 sorotipos)', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 4, recommendedAgeDays: 60, source: 'SBP', note: 'Alternativa particular à VPC10 com maior cobertura.', isMandatory: false, sortOrder: 25 },
  { code: 'ROTA_PENTA_1', name: 'Rotavírus pentavalente', shortName: 'Rotavírus Penta', protectsAgainst: 'Rotavírus (5 sorotipos)', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 3, recommendedAgeDays: 60, source: 'SBP', note: 'Alternativa particular à monovalente com maior cobertura.', isMandatory: false, sortOrder: 26 },

  // 3 meses — SBP
  { code: 'MENB_1', name: 'Meningocócica B', shortName: 'Meningo B', protectsAgainst: 'Meningite tipo B', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 3, recommendedAgeDays: 90, source: 'SBP', note: 'Não disponível no SUS.', isMandatory: false, sortOrder: 30 },

  // 4 meses — PNI
  { code: 'PENTA_2', name: 'Pentavalente', shortName: 'Pentavalente', protectsAgainst: 'Difteria, Tétano, Coqueluche, Hib, Hepatite B', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 3, recommendedAgeDays: 120, source: 'PNI', isMandatory: true, sortOrder: 40 },
  { code: 'VIP_2', name: 'VIP (Poliomielite inativada)', shortName: 'Poliomielite', protectsAgainst: 'Poliomielite', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 4, recommendedAgeDays: 120, source: 'PNI', isMandatory: true, sortOrder: 41 },
  { code: 'ROTA_MONO_2', name: 'Rotavírus monovalente', shortName: 'Rotavírus', protectsAgainst: 'Rotavírus', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 2, recommendedAgeDays: 120, source: 'PNI', isMandatory: true, sortOrder: 42 },
  { code: 'VPC10_2', name: 'Pneumocócica 10-valente', shortName: 'Pneumo 10', protectsAgainst: 'Doenças pneumocócicas (10 sorotipos)', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 3, recommendedAgeDays: 120, source: 'PNI', isMandatory: true, sortOrder: 43 },
  { code: 'MENC_2', name: 'Meningocócica C', shortName: 'Meningo C', protectsAgainst: 'Meningite tipo C', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 3, recommendedAgeDays: 120, source: 'PNI', isMandatory: true, sortOrder: 44 },
  // 4 meses — SBP
  { code: 'VPC13_2', name: 'Pneumocócica 13-valente', shortName: 'Pneumo 13', protectsAgainst: 'Doenças pneumocócicas (13 sorotipos)', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 4, recommendedAgeDays: 120, source: 'SBP', isMandatory: false, sortOrder: 45 },
  { code: 'ROTA_PENTA_2', name: 'Rotavírus pentavalente', shortName: 'Rotavírus Penta', protectsAgainst: 'Rotavírus (5 sorotipos)', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 3, recommendedAgeDays: 120, source: 'SBP', isMandatory: false, sortOrder: 46 },

  // 5 meses — SBP
  { code: 'MENB_2', name: 'Meningocócica B', shortName: 'Meningo B', protectsAgainst: 'Meningite tipo B', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 3, recommendedAgeDays: 150, source: 'SBP', isMandatory: false, sortOrder: 50 },

  // 6 meses — PNI
  { code: 'PENTA_3', name: 'Pentavalente', shortName: 'Pentavalente', protectsAgainst: 'Difteria, Tétano, Coqueluche, Hib, Hepatite B', doseLabel: '3ª dose', doseNumber: 3, totalDoses: 3, recommendedAgeDays: 180, source: 'PNI', isMandatory: true, sortOrder: 60 },
  { code: 'VIP_3', name: 'VIP (Poliomielite inativada)', shortName: 'Poliomielite', protectsAgainst: 'Poliomielite', doseLabel: '3ª dose', doseNumber: 3, totalDoses: 4, recommendedAgeDays: 180, source: 'PNI', isMandatory: true, sortOrder: 61 },
  { code: 'INFLU_1', name: 'Influenza', shortName: 'Gripe', protectsAgainst: 'Gripe', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 2, recommendedAgeDays: 180, source: 'PNI', note: 'Campanha anual a partir dos 6 meses.', isMandatory: true, sortOrder: 62 },
  // 6 meses — SBP
  { code: 'VPC13_3', name: 'Pneumocócica 13-valente', shortName: 'Pneumo 13', protectsAgainst: 'Doenças pneumocócicas (13 sorotipos)', doseLabel: '3ª dose', doseNumber: 3, totalDoses: 4, recommendedAgeDays: 180, source: 'SBP', isMandatory: false, sortOrder: 63 },
  { code: 'ROTA_PENTA_3', name: 'Rotavírus pentavalente', shortName: 'Rotavírus Penta', protectsAgainst: 'Rotavírus (5 sorotipos)', doseLabel: '3ª dose', doseNumber: 3, totalDoses: 3, recommendedAgeDays: 180, source: 'SBP', isMandatory: false, sortOrder: 64 },
  { code: 'MENACWY_1', name: 'Meningocócica ACWY', shortName: 'Meningo ACWY', protectsAgainst: 'Meningite tipos A, C, W, Y', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 3, recommendedAgeDays: 180, source: 'SBP', note: 'Substitui a Meningo C com maior cobertura.', isMandatory: false, sortOrder: 65 },

  // 7 meses
  { code: 'INFLU_2', name: 'Influenza', shortName: 'Gripe', protectsAgainst: 'Gripe', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 2, recommendedAgeDays: 210, source: 'PNI', note: 'Segunda dose 30 dias após a primeira, apenas no primeiro ano.', isMandatory: true, sortOrder: 70 },

  // 9 meses
  { code: 'FEBRE_AMARELA', name: 'Febre Amarela', shortName: 'Febre Amarela', protectsAgainst: 'Febre Amarela', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 1, recommendedAgeDays: 270, source: 'PNI', note: 'Reforço aos 4 anos.', isMandatory: true, sortOrder: 90 },

  // 12 meses — PNI
  { code: 'SCR_1', name: 'Tríplice Viral (SCR)', shortName: 'Tríplice Viral', protectsAgainst: 'Sarampo, Caxumba, Rubéola', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 1, recommendedAgeDays: 360, source: 'PNI', isMandatory: true, sortOrder: 120 },
  { code: 'VPC10_REF', name: 'Pneumocócica 10-valente', shortName: 'Pneumo 10', protectsAgainst: 'Doenças pneumocócicas', doseLabel: 'Reforço', doseNumber: 3, totalDoses: 3, recommendedAgeDays: 360, source: 'PNI', isMandatory: true, sortOrder: 121 },
  { code: 'MENC_REF', name: 'Meningocócica C', shortName: 'Meningo C', protectsAgainst: 'Meningite tipo C', doseLabel: 'Reforço', doseNumber: 3, totalDoses: 3, recommendedAgeDays: 360, source: 'PNI', isMandatory: true, sortOrder: 122 },
  { code: 'VARICELA_1', name: 'Varicela', shortName: 'Varicela', protectsAgainst: 'Catapora', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 1, recommendedAgeDays: 360, source: 'PNI', isMandatory: true, sortOrder: 123 },
  // 12 meses — SBP
  { code: 'VPC13_REF', name: 'Pneumocócica 13-valente', shortName: 'Pneumo 13', protectsAgainst: 'Doenças pneumocócicas (13 sorotipos)', doseLabel: 'Reforço', doseNumber: 4, totalDoses: 4, recommendedAgeDays: 360, source: 'SBP', isMandatory: false, sortOrder: 124 },
  { code: 'MENB_REF', name: 'Meningocócica B', shortName: 'Meningo B', protectsAgainst: 'Meningite tipo B', doseLabel: 'Reforço', doseNumber: 3, totalDoses: 3, recommendedAgeDays: 360, source: 'SBP', isMandatory: false, sortOrder: 125 },
  { code: 'MENACWY_2', name: 'Meningocócica ACWY', shortName: 'Meningo ACWY', protectsAgainst: 'Meningite tipos A, C, W, Y', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 3, recommendedAgeDays: 360, source: 'SBP', isMandatory: false, sortOrder: 126 },
  { code: 'HEPA_SBP_1', name: 'Hepatite A', shortName: 'Hepatite A', protectsAgainst: 'Hepatite A', doseLabel: '1ª dose', doseNumber: 1, totalDoses: 2, recommendedAgeDays: 360, source: 'SBP', note: 'SBP recomenda 2 doses (12m e 18m).', isMandatory: false, sortOrder: 127 },

  // 15 meses — PNI
  { code: 'DTP_REF1', name: 'DTP', shortName: 'DTP', protectsAgainst: 'Difteria, Tétano, Coqueluche', doseLabel: '1º reforço', doseNumber: 1, totalDoses: 1, recommendedAgeDays: 450, source: 'PNI', isMandatory: true, sortOrder: 150 },
  { code: 'VIP_REF1', name: 'VIP (Poliomielite inativada)', shortName: 'Poliomielite', protectsAgainst: 'Poliomielite', doseLabel: '1º reforço', doseNumber: 4, totalDoses: 4, recommendedAgeDays: 450, source: 'PNI', isMandatory: true, sortOrder: 151 },
  { code: 'HEPA_PNI', name: 'Hepatite A', shortName: 'Hepatite A', protectsAgainst: 'Hepatite A', doseLabel: 'Dose única', doseNumber: 1, totalDoses: 1, recommendedAgeDays: 450, source: 'PNI', isMandatory: true, sortOrder: 152 },
  { code: 'TETRA_VIRAL', name: 'Tetra Viral (SCR-V)', shortName: 'Tetra Viral', protectsAgainst: 'Sarampo, Caxumba, Rubéola, Varicela', doseLabel: '2ª dose', doseNumber: 1, totalDoses: 1, recommendedAgeDays: 450, source: 'PNI', isMandatory: true, sortOrder: 153 },

  // 18 meses — SBP
  { code: 'HEPA_SBP_2', name: 'Hepatite A', shortName: 'Hepatite A', protectsAgainst: 'Hepatite A', doseLabel: '2ª dose', doseNumber: 2, totalDoses: 2, recommendedAgeDays: 540, source: 'SBP', note: 'Completa o esquema SBP de 2 doses.', isMandatory: false, sortOrder: 180 },
  { code: 'MENACWY_REF', name: 'Meningocócica ACWY', shortName: 'Meningo ACWY', protectsAgainst: 'Meningite tipos A, C, W, Y', doseLabel: 'Reforço', doseNumber: 3, totalDoses: 3, recommendedAgeDays: 540, source: 'SBP', isMandatory: false, sortOrder: 181 },
]

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

interface VaccineUserState {
  /** Usuário marcou como aplicada. */
  applied?: boolean
  /** Usuário decidiu não aplicar. */
  skipped?: boolean
}

/**
 * Status derivado de uma vacina dado a idade do bebê (em dias),
 * a idade recomendada e o estado persistido (applied/skipped).
 *
 *   applied  → usuário marcou aplicada (prioridade máxima)
 *   skipped  → usuário resolveu não aplicar
 *   future   → bebê ainda não atingiu idade recomendada
 *   overdue  → idade >= recomendada + 30 dias, sem nenhuma marcação
 *   can_take → idade dentro da janela, sem marcação
 */
export function getVaccineStatus(
  ageDays: number,
  recommendedAgeDays: number,
  state: VaccineUserState | boolean,
  overdueThresholdDays: number = 30,
): VaccineStatus {
  // Compat: se chamado com `boolean`, tratamos como `{ applied }`
  const s: VaccineUserState =
    typeof state === 'boolean' ? { applied: state } : state

  if (s.applied) return 'applied'
  if (s.skipped) return 'skipped'
  if (ageDays < recommendedAgeDays) return 'future'
  if (ageDays >= recommendedAgeDays + overdueThresholdDays) return 'overdue'
  return 'can_take'
}

/**
 * Rótulo humano da faixa de idade (usado como header dos grupos).
 * "Ao nascer", "2 meses", "4 meses"...
 */
export function getAgeGroupLabel(recommendedAgeDays: number): string {
  if (recommendedAgeDays === 0) return 'Ao nascer'
  const months = Math.round(recommendedAgeDays / 30)
  return months === 1 ? '1 mês' : `${months} meses`
}

/**
 * Agrupa vacinas por faixa de idade preservando sortOrder dentro de cada grupo.
 * Retorna array ordenado por idade crescente.
 */
export function groupVaccinesByAge(
  vaccines: Vaccine[],
): Array<{ ageDays: number; label: string; vaccines: Vaccine[] }> {
  const map = new Map<number, Vaccine[]>()
  for (const v of vaccines) {
    const arr = map.get(v.recommendedAgeDays) ?? []
    arr.push(v)
    map.set(v.recommendedAgeDays, arr)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([ageDays, list]) => ({
      ageDays,
      label: getAgeGroupLabel(ageDays),
      vaccines: list.sort((a, b) => a.sortOrder - b.sortOrder),
    }))
}
