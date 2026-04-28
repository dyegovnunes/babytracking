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
  mode?: 'interval' | 'scheduled'
  scheduledHours?: number[]
  description?: string
}

export interface Baby {
  id: string
  name: string
  birthDate: string
  gender?: 'boy' | 'girl'
  photoUrl?: string
  isPremium: boolean
}

/** Baby com o papel do usuário logado — usado no seletor de bebê */
export interface BabyWithRole extends Baby {
  myRole: string
}

export interface CaregiverPermissions {
  show_milestones?: boolean
  show_leaps?: boolean
  show_vaccines?: boolean
  show_growth?: boolean
}

export interface Member {
  userId: string
  displayName: string
  role: string
  caregiverPermissions?: CaregiverPermissions
  welcomeShownAt?: string | null
}

export interface Projection {
  label: string
  time: Date
  isOverdue: boolean
  isWarning: boolean
  lastEvent: string
  lastTime: Date
}

/** Uma linha da tabela baby_grid_items — config de visibilidade do grid por bebê */
export interface GridItem {
  id: string
  eventId: string
  enabled: boolean
  sortOrder: number
  suggestedAt?: string | null
  acceptedAt?: string | null
  dismissedAt?: string | null
}
