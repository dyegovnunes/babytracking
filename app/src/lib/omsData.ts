/**
 * Dados OMS weight-for-age e length-for-age
 * Percentis: p3, p15, p50, p85, p97
 * Idade: 0 a 24 meses (mensal)
 * Separado por sexo
 * Fonte: WHO Child Growth Standards
 */

export interface OMSDataPoint {
  months: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

// Peso (kg) — MENINOS
export const WEIGHT_BOYS: OMSDataPoint[] = [
  { months: 0, p3: 2.5, p15: 2.9, p50: 3.3, p85: 3.9, p97: 4.4 },
  { months: 1, p3: 3.4, p15: 3.9, p50: 4.5, p85: 5.1, p97: 5.8 },
  { months: 2, p3: 4.3, p15: 4.9, p50: 5.6, p85: 6.3, p97: 7.1 },
  { months: 3, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.2, p97: 8.0 },
  { months: 4, p3: 5.6, p15: 6.2, p50: 7.0, p85: 7.8, p97: 8.7 },
  { months: 5, p3: 6.0, p15: 6.7, p50: 7.5, p85: 8.4, p97: 9.3 },
  { months: 6, p3: 6.4, p15: 7.1, p50: 7.9, p85: 8.8, p97: 9.8 },
  { months: 7, p3: 6.7, p15: 7.4, p50: 8.3, p85: 9.2, p97: 10.3 },
  { months: 8, p3: 6.9, p15: 7.7, p50: 8.6, p85: 9.6, p97: 10.7 },
  { months: 9, p3: 7.1, p15: 7.9, p50: 8.9, p85: 9.9, p97: 11.0 },
  { months: 10, p3: 7.4, p15: 8.1, p50: 9.2, p85: 10.2, p97: 11.4 },
  { months: 11, p3: 7.6, p15: 8.4, p50: 9.4, p85: 10.5, p97: 11.7 },
  { months: 12, p3: 7.7, p15: 8.6, p50: 9.6, p85: 10.8, p97: 12.0 },
  { months: 15, p3: 8.3, p15: 9.2, p50: 10.3, p85: 11.5, p97: 12.8 },
  { months: 18, p3: 8.8, p15: 9.8, p50: 10.9, p85: 12.2, p97: 13.7 },
  { months: 21, p3: 9.3, p15: 10.3, p50: 11.5, p85: 12.9, p97: 14.5 },
  { months: 24, p3: 9.7, p15: 10.8, p50: 12.2, p85: 13.6, p97: 15.3 },
];

// Peso (kg) — MENINAS
export const WEIGHT_GIRLS: OMSDataPoint[] = [
  { months: 0, p3: 2.4, p15: 2.8, p50: 3.2, p85: 3.7, p97: 4.2 },
  { months: 1, p3: 3.2, p15: 3.6, p50: 4.2, p85: 4.8, p97: 5.5 },
  { months: 2, p3: 3.9, p15: 4.5, p50: 5.1, p85: 5.8, p97: 6.6 },
  { months: 3, p3: 4.5, p15: 5.2, p50: 5.8, p85: 6.6, p97: 7.5 },
  { months: 4, p3: 5.0, p15: 5.7, p50: 6.4, p85: 7.3, p97: 8.2 },
  { months: 5, p3: 5.4, p15: 6.1, p50: 6.9, p85: 7.8, p97: 8.8 },
  { months: 6, p3: 5.7, p15: 6.5, p50: 7.3, p85: 8.2, p97: 9.3 },
  { months: 7, p3: 6.0, p15: 6.8, p50: 7.6, p85: 8.6, p97: 9.8 },
  { months: 8, p3: 6.3, p15: 7.0, p50: 7.9, p85: 9.0, p97: 10.2 },
  { months: 9, p3: 6.5, p15: 7.3, p50: 8.2, p85: 9.3, p97: 10.5 },
  { months: 10, p3: 6.7, p15: 7.5, p50: 8.5, p85: 9.6, p97: 10.9 },
  { months: 11, p3: 6.9, p15: 7.7, p50: 8.7, p85: 9.9, p97: 11.2 },
  { months: 12, p3: 7.0, p15: 7.9, p50: 8.9, p85: 10.1, p97: 11.5 },
  { months: 15, p3: 7.6, p15: 8.5, p50: 9.6, p85: 10.9, p97: 12.4 },
  { months: 18, p3: 8.1, p15: 9.1, p50: 10.2, p85: 11.6, p97: 13.2 },
  { months: 21, p3: 8.6, p15: 9.6, p50: 10.9, p85: 12.4, p97: 14.2 },
  { months: 24, p3: 9.0, p15: 10.2, p50: 11.5, p85: 13.2, p97: 15.1 },
];

// Comprimento (cm) — MENINOS
export const LENGTH_BOYS: OMSDataPoint[] = [
  { months: 0, p3: 46.1, p15: 47.9, p50: 49.9, p85: 51.8, p97: 53.7 },
  { months: 1, p3: 50.8, p15: 52.4, p50: 54.7, p85: 56.7, p97: 58.6 },
  { months: 2, p3: 54.4, p15: 56.0, p50: 58.4, p85: 60.6, p97: 62.4 },
  { months: 3, p3: 57.3, p15: 59.0, p50: 61.4, p85: 63.5, p97: 65.5 },
  { months: 4, p3: 59.7, p15: 61.4, p50: 63.9, p85: 66.0, p97: 68.0 },
  { months: 5, p3: 61.7, p15: 63.4, p50: 65.9, p85: 68.0, p97: 70.1 },
  { months: 6, p3: 63.3, p15: 65.1, p50: 67.6, p85: 69.8, p97: 71.9 },
  { months: 9, p3: 67.5, p15: 69.4, p50: 72.0, p85: 74.2, p97: 76.5 },
  { months: 12, p3: 71.0, p15: 73.0, p50: 75.7, p85: 78.1, p97: 80.5 },
  { months: 15, p3: 74.1, p15: 76.2, p50: 79.1, p85: 81.7, p97: 84.2 },
  { months: 18, p3: 76.9, p15: 79.1, p50: 82.3, p85: 85.0, p97: 87.7 },
  { months: 24, p3: 81.7, p15: 84.1, p50: 87.8, p85: 90.9, p97: 93.9 },
];

// Comprimento (cm) — MENINAS
export const LENGTH_GIRLS: OMSDataPoint[] = [
  { months: 0, p3: 45.4, p15: 47.3, p50: 49.1, p85: 51.0, p97: 52.9 },
  { months: 1, p3: 49.8, p15: 51.5, p50: 53.7, p85: 55.6, p97: 57.6 },
  { months: 2, p3: 53.0, p15: 54.7, p50: 57.1, p85: 59.1, p97: 61.1 },
  { months: 3, p3: 55.6, p15: 57.3, p50: 59.8, p85: 61.9, p97: 64.0 },
  { months: 4, p3: 57.8, p15: 59.5, p50: 62.1, p85: 64.3, p97: 66.4 },
  { months: 5, p3: 59.6, p15: 61.4, p50: 64.0, p85: 66.2, p97: 68.5 },
  { months: 6, p3: 61.2, p15: 63.0, p50: 65.7, p85: 68.0, p97: 70.3 },
  { months: 9, p3: 65.3, p15: 67.3, p50: 70.1, p85: 72.6, p97: 75.0 },
  { months: 12, p3: 68.9, p15: 71.0, p50: 74.0, p85: 76.4, p97: 78.9 },
  { months: 15, p3: 72.0, p15: 74.1, p50: 77.5, p85: 80.2, p97: 82.7 },
  { months: 18, p3: 74.9, p15: 77.1, p50: 80.7, p85: 83.6, p97: 86.5 },
  { months: 24, p3: 80.0, p15: 82.5, p50: 86.4, p85: 89.6, p97: 92.5 },
];

export function getOMSWeight(gender: 'boy' | 'girl'): OMSDataPoint[] {
  return gender === 'boy' ? WEIGHT_BOYS : WEIGHT_GIRLS;
}

export function getOMSLength(gender: 'boy' | 'girl'): OMSDataPoint[] {
  return gender === 'boy' ? LENGTH_BOYS : LENGTH_GIRLS;
}

/**
 * Calcula percentil aproximado dado valor, idade e sexo
 */
export function getPercentile(
  type: 'weight' | 'height',
  value: number,
  ageMonths: number,
  gender: 'boy' | 'girl'
): string {
  const data = type === 'weight' ? getOMSWeight(gender) : getOMSLength(gender);

  // Encontrar o ponto OMS mais próximo da idade
  let closest = data[0];
  let minDiff = Infinity;
  for (const point of data) {
    const diff = Math.abs(point.months - ageMonths);
    if (diff < minDiff) {
      minDiff = diff;
      closest = point;
    }
  }

  if (value <= closest.p3) return '<p3';
  if (value <= closest.p15) return '~p10';
  if (value <= closest.p50) return '~p25-50';
  if (value <= closest.p85) return '~p50-85';
  if (value <= closest.p97) return '~p85-97';
  return '>p97';
}

/**
 * Retorna a faixa de referência OMS para ganho de peso semanal pela idade (em gramas)
 */
export function getWeeklyWeightGainReference(ageMonths: number): { min: number; max: number } {
  if (ageMonths <= 3) return { min: 150, max: 200 };
  if (ageMonths <= 6) return { min: 100, max: 150 };
  if (ageMonths <= 12) return { min: 60, max: 100 };
  return { min: 40, max: 80 };
}
