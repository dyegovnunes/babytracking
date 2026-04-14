import type { AgeBand } from './ageUtils'

/** Referência de sono total diário em minutos (OMS) */
export const SLEEP_REFERENCE: Record<AgeBand, { min: number; max: number; source: string }> = {
  newborn:       { min: 840, max: 1020, source: 'OMS' }, // 14-17h
  early:         { min: 840, max: 1020, source: 'OMS' }, // 14-17h
  growing:       { min: 720, max: 900,  source: 'OMS' }, // 12-15h
  weaning:       { min: 720, max: 900,  source: 'OMS' }, // 12-15h
  active:        { min: 720, max: 840,  source: 'OMS' }, // 12-14h
  toddler_early: { min: 660, max: 840,  source: 'OMS' }, // 11-14h
  toddler:       { min: 660, max: 840,  source: 'OMS' }, // 11-14h
  beyond:        { min: 600, max: 780,  source: 'OMS' }, // 10-13h
}

/** Referência de janela de vigília em minutos (AAP) */
export const WAKE_WINDOW: Record<AgeBand, { min: number; max: number; source: string }> = {
  newborn:       { min: 30,  max: 60,  source: 'AAP' },
  early:         { min: 45,  max: 90,  source: 'AAP' },
  growing:       { min: 90,  max: 150, source: 'AAP' },
  weaning:       { min: 150, max: 180, source: 'AAP' },
  active:        { min: 180, max: 240, source: 'AAP' },
  toddler_early: { min: 240, max: 300, source: 'AAP' },
  toddler:       { min: 300, max: 360, source: 'AAP' },
  beyond:        { min: 300, max: 420, source: 'AAP' },
}

/** Referência de amamentações por dia (SBP) */
export const FEEDS_REFERENCE: Record<AgeBand, { min: number; max: number; source: string }> = {
  newborn:       { min: 8, max: 12, source: 'SBP' },
  early:         { min: 8, max: 12, source: 'SBP' },
  growing:       { min: 6, max: 8,  source: 'SBP' },
  weaning:       { min: 5, max: 7,  source: 'SBP' },
  active:        { min: 4, max: 6,  source: 'SBP' },
  toddler_early: { min: 3, max: 5,  source: 'SBP' },
  toddler:       { min: 3, max: 4,  source: 'SBP' },
  beyond:        { min: 3, max: 4,  source: 'SBP' },
}

/** Fraldas mínimas por dia (primeiros meses) */
export const MIN_DIAPERS: Record<AgeBand, number> = {
  newborn: 6, early: 6, growing: 5, weaning: 4,
  active: 4, toddler_early: 3, toddler: 3, beyond: 3,
}

/** Formatação de minutos para exibição (ex: 840 → "14h") */
export function formatMinutes(min: number): string {
  const rounded = Math.round(min)
  const h = Math.floor(rounded / 60)
  const m = rounded % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h${m.toString().padStart(2, '0')}`
}

export function formatMinutesRange(ref: { min: number; max: number }): string {
  return `${formatMinutes(ref.min)} a ${formatMinutes(ref.max)}`
}
