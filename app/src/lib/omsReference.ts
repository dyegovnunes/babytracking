/**
 * Tabelas de referência OMS/WHO para crescimento infantil 0–24 meses.
 * Valores aproximados do WHO Child Growth Standards (2006).
 * Fonte: https://www.who.int/tools/child-growth-standards
 *
 * Estrutura de cada linha: [ageMonths, p3, p15, p50, p85, p97]
 */

export type GrowthType = 'weight' | 'height'
export type BabyGender = 'boy' | 'girl'

// ── Peso (kg) ───────────────────────────────────────────────────────────────

const OMS_WEIGHT_BOY: number[][] = [
  [0,  2.5, 2.9, 3.3, 3.8, 4.3],
  [1,  3.4, 3.9, 4.5, 5.1, 5.7],
  [2,  4.3, 4.9, 5.6, 6.3, 7.0],
  [3,  5.0, 5.7, 6.4, 7.2, 8.0],
  [4,  5.6, 6.3, 7.0, 7.9, 8.7],
  [5,  6.0, 6.7, 7.5, 8.4, 9.3],
  [6,  6.4, 7.1, 7.9, 8.8, 9.7],
  [7,  6.7, 7.4, 8.3, 9.2, 10.2],
  [8,  6.9, 7.7, 8.6, 9.6, 10.6],
  [9,  7.1, 7.9, 8.9, 9.9, 10.9],
  [10, 7.4, 8.2, 9.2, 10.2, 11.3],
  [11, 7.6, 8.4, 9.4, 10.5, 11.6],
  [12, 7.8, 8.7, 9.6, 10.8, 11.9],
  [15, 8.3, 9.2, 10.3, 11.6, 12.8],
  [18, 8.8, 9.8, 11.0, 12.3, 13.7],
  [21, 9.3, 10.3, 11.6, 13.0, 14.5],
  [24, 9.7, 10.8, 12.2, 13.7, 15.3],
]

const OMS_WEIGHT_GIRL: number[][] = [
  [0,  2.4, 2.8, 3.2, 3.7, 4.2],
  [1,  3.2, 3.6, 4.2, 4.8, 5.5],
  [2,  3.9, 4.5, 5.1, 5.9, 6.6],
  [3,  4.5, 5.2, 5.8, 6.7, 7.5],
  [4,  5.0, 5.7, 6.4, 7.3, 8.2],
  [5,  5.4, 6.1, 6.9, 7.8, 8.8],
  [6,  5.7, 6.5, 7.3, 8.3, 9.3],
  [7,  6.0, 6.8, 7.6, 8.7, 9.8],
  [8,  6.3, 7.0, 8.0, 9.1, 10.2],
  [9,  6.5, 7.3, 8.2, 9.4, 10.6],
  [10, 6.7, 7.5, 8.5, 9.7, 11.0],
  [11, 6.9, 7.7, 8.7, 10.0, 11.3],
  [12, 7.0, 7.9, 9.0, 10.3, 11.7],
  [15, 7.6, 8.5, 9.7, 11.1, 12.5],
  [18, 8.1, 9.1, 10.4, 11.9, 13.5],
  [21, 8.6, 9.7, 11.1, 12.7, 14.5],
  [24, 9.0, 10.2, 11.5, 13.2, 15.1],
]

// ── Altura (cm) ─────────────────────────────────────────────────────────────

const OMS_HEIGHT_BOY: number[][] = [
  [0,  46.1, 47.9, 49.9, 51.8, 53.4],
  [1,  50.8, 52.8, 54.7, 56.7, 58.6],
  [2,  54.4, 56.4, 58.4, 60.4, 62.4],
  [3,  57.3, 59.4, 61.4, 63.5, 65.5],
  [4,  59.7, 61.8, 63.9, 66.0, 68.0],
  [5,  61.7, 63.8, 65.9, 68.0, 70.1],
  [6,  63.3, 65.5, 67.6, 69.8, 72.0],
  [7,  64.8, 67.0, 69.2, 71.5, 73.7],
  [8,  66.2, 68.4, 70.6, 72.9, 75.2],
  [9,  67.5, 69.7, 72.0, 74.3, 76.7],
  [10, 68.7, 71.0, 73.3, 75.7, 78.1],
  [11, 69.9, 72.2, 74.5, 77.0, 79.4],
  [12, 71.0, 73.4, 75.8, 78.2, 80.6],
  [15, 73.9, 76.5, 79.1, 81.7, 84.3],
  [18, 76.5, 79.2, 82.0, 84.7, 87.4],
  [21, 78.9, 81.7, 84.6, 87.5, 90.4],
  [24, 81.1, 84.1, 87.1, 90.0, 93.0],
]

const OMS_HEIGHT_GIRL: number[][] = [
  [0,  45.6, 47.3, 49.1, 51.0, 52.7],
  [1,  49.8, 51.7, 53.7, 55.6, 57.6],
  [2,  53.0, 55.0, 57.1, 59.1, 61.1],
  [3,  55.8, 57.8, 59.8, 61.9, 63.9],
  [4,  57.8, 59.9, 62.1, 64.2, 66.3],
  [5,  59.6, 61.8, 64.0, 66.2, 68.4],
  [6,  61.2, 63.5, 65.7, 68.0, 70.2],
  [7,  62.7, 65.0, 67.3, 69.6, 72.0],
  [8,  64.0, 66.4, 68.7, 71.1, 73.5],
  [9,  65.3, 67.7, 70.1, 72.6, 75.0],
  [10, 66.5, 69.0, 71.5, 74.0, 76.5],
  [11, 67.7, 70.2, 72.8, 75.3, 77.9],
  [12, 68.9, 71.4, 74.0, 76.6, 79.2],
  [15, 72.0, 74.8, 77.5, 80.3, 83.1],
  [18, 74.9, 77.8, 80.7, 83.6, 86.5],
  [21, 77.5, 80.6, 83.7, 86.8, 89.9],
  [24, 80.0, 83.3, 86.4, 89.6, 92.9],
]

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Interpola linearmente entre dois pontos da tabela */
function lerp(age: number, row1: number[], row2: number[], col: number): number {
  const t = (age - row1[0]) / (row2[0] - row1[0])
  return row1[col] + t * (row2[col] - row1[col])
}

/** Retorna [p3, p15, p50, p85, p97] para uma idade em meses */
function getPercentiles(age: number, table: number[][]): [number, number, number, number, number] {
  const clamped = Math.min(Math.max(age, 0), 24)
  for (let i = 0; i < table.length - 1; i++) {
    if (clamped >= table[i][0] && clamped <= table[i + 1][0]) {
      return [
        lerp(clamped, table[i], table[i + 1], 1),
        lerp(clamped, table[i], table[i + 1], 2),
        lerp(clamped, table[i], table[i + 1], 3),
        lerp(clamped, table[i], table[i + 1], 4),
        lerp(clamped, table[i], table[i + 1], 5),
      ]
    }
  }
  const last = table[table.length - 1]
  return [last[1], last[2], last[3], last[4], last[5]]
}

// ── API pública ──────────────────────────────────────────────────────────────

export type PercentileBand = 'below_p3' | 'p3_p15' | 'p15_p85' | 'p85_p97' | 'above_p97'

export interface PercentileResult {
  /** Rótulo curto: "percentil ~65" ou "abaixo do percentil 3" */
  label: string
  /** Texto interpretativo para exibição ao usuário */
  comment: string
  band: PercentileBand
}

/**
 * Calcula a faixa de percentil aproximada e retorna texto interpretativo
 * para peso ou altura, baseado nas tabelas OMS 0–24 meses.
 *
 * @param value Valor medido (kg para peso, cm para altura)
 * @param ageMonths Idade em meses no momento da medição
 * @param gender Gênero do bebê (default: 'boy' para cálculo neutro)
 * @param type 'weight' | 'height'
 * @returns null se a idade estiver fora do alcance (>30 meses)
 */
export function getPercentileResult(
  value: number,
  ageMonths: number,
  gender: BabyGender | undefined,
  type: GrowthType,
): PercentileResult | null {
  if (ageMonths < 0 || ageMonths > 30) return null

  const g = gender ?? 'boy'
  const table =
    type === 'weight'
      ? (g === 'girl' ? OMS_WEIGHT_GIRL : OMS_WEIGHT_BOY)
      : (g === 'girl' ? OMS_HEIGHT_GIRL : OMS_HEIGHT_BOY)

  const effectiveAge = Math.min(ageMonths, 24)
  const [p3, p15, p50, p85, p97] = getPercentiles(effectiveAge, table)
  const tLabel = type === 'weight' ? 'Peso' : 'Altura'

  if (value < p3) {
    return {
      label: 'abaixo do percentil 3',
      comment: `${tLabel} abaixo do percentil 3 (referência OMS). Vale verificar com o pediatra.`,
      band: 'below_p3',
    }
  }
  if (value < p15) {
    const pct = Math.round(3 + ((value - p3) / (p15 - p3)) * 12)
    return {
      label: `percentil ~${pct}`,
      comment: `${tLabel} na faixa baixa (percentil ~${pct}, referência OMS). Dentro do esperado, mas vale acompanhar.`,
      band: 'p3_p15',
    }
  }
  if (value <= p85) {
    const pct = Math.round(15 + ((value - p15) / (p85 - p15)) * 70)
    return {
      label: `percentil ~${pct}`,
      comment: `${tLabel} dentro do esperado para a idade (percentil ~${pct}, referência OMS).`,
      band: 'p15_p85',
    }
  }
  if (value <= p97) {
    const pct = Math.round(85 + ((value - p85) / (p97 - p85)) * 12)
    return {
      label: `percentil ~${pct}`,
      comment: `${tLabel} na faixa alta (percentil ~${pct}, referência OMS). Crescimento saudável.`,
      band: 'p85_p97',
    }
  }
  // Usado p50 só para evitar lint; já foi coberto pelo else implícito
  void p50
  return {
    label: 'acima do percentil 97',
    comment: `${tLabel} acima do percentil 97 (referência OMS). Vale verificar com o pediatra.`,
    band: 'above_p97',
  }
}

/**
 * Calcula a idade em meses entre duas datas.
 * Usa média de 30.4375 dias/mês para consistência com a tabela OMS.
 */
export function ageInMonthsAt(birthDate: string, measuredAt: string): number {
  const birth = new Date(birthDate).getTime()
  const measured = new Date(measuredAt).getTime()
  return Math.max(0, (measured - birth) / (30.4375 * 86400000))
}
