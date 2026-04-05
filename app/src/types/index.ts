export type EventCategory = 'feed' | 'diaper' | 'sleep' | 'care'

export interface EventType {
  id: string
  label: string
  icon: string
  badge?: string          // Letter overlay (E, D, E+D) — i18n key
  emoji?: string          // Emoji fallback for icons without good Material Symbol
  color: string
  category: EventCategory
  hasAmount?: boolean
  hasDuration?: boolean
}

export interface LogEntry {
  id: string
  eventId: string
  timestamp: number
  ml?: number
  duration?: number
  notes?: string
  createdBy?: string
}

export interface IntervalConfig {
  label: string
  minutes: number
  warn: number
}

export interface Baby {
  id: string
  name: string
  birthDate: string
  photoUrl?: string
}

export interface Member {
  userId: string
  displayName: string
  role: string
}

export interface Projection {
  label: string
  time: Date
  isOverdue: boolean
  isWarning: boolean
  lastEvent: string
  lastTime: Date
}
