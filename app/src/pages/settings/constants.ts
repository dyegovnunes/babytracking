export interface IntervalPreset {
  label: string
  minutes: number
  warn: number
}

export const FEED_PRESETS: IntervalPreset[] = [
  { label: '2h', minutes: 120, warn: 100 },
  { label: '2h30', minutes: 150, warn: 120 },
  { label: '3h', minutes: 180, warn: 150 },
  { label: '4h', minutes: 240, warn: 200 },
]

export const DIAPER_PRESETS: IntervalPreset[] = [
  { label: '1h30', minutes: 90, warn: 70 },
  { label: '2h', minutes: 120, warn: 90 },
  { label: '3h', minutes: 180, warn: 150 },
]

export const SLEEP_NAP_PRESETS: IntervalPreset[] = [
  { label: '30min', minutes: 30, warn: 25 },
  { label: '45min', minutes: 45, warn: 35 },
  { label: '1h', minutes: 60, warn: 50 },
  { label: '1h30', minutes: 90, warn: 75 },
  { label: '2h', minutes: 120, warn: 100 },
]

export const SLEEP_AWAKE_PRESETS: IntervalPreset[] = [
  { label: '1h', minutes: 60, warn: 45 },
  { label: '1h30', minutes: 90, warn: 70 },
  { label: '2h', minutes: 120, warn: 100 },
  { label: '2h30', minutes: 150, warn: 120 },
  { label: '3h', minutes: 180, warn: 150 },
]

export const MAX_BATH_HOURS = 4
