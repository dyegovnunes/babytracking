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

/** Campos base compartilhados entre payloads (ex: marker de origem offline) */
export interface BasePayload {
  source?: 'offline'
}

/** Payload do evento "acordou" */
export interface WakePayload extends BasePayload {
  sleepDurationMinutes?: number
}

/** Payload de registro de refeição (armazenado em logs.payload jsonb) */
export interface MealPayload {
  food?: string
  method?: 'pureed' | 'blw' | 'mixed' | 'breast_plus_solid'
  acceptance?: 'loved' | 'accepted' | 'refused' | 'reaction'
  isNewFood?: boolean
  allergenKey?: string
  reactionNote?: string
}

/** Payload de registro de humor (armazenado em logs.payload jsonb) */
export interface MoodPayload {
  level: 1 | 2 | 3
  note?: string
}

/** Payload de registro de doença/sintomas (armazenado em logs.payload jsonb) */
export interface SickPayload {
  temp?: number           // graus Celsius
  symptoms?: string[]     // ids: 'fever' | 'cough' | 'runny_nose' | 'vomit' | 'diarrhea' | 'crying' | 'no_appetite' | 'other'
  note?: string
}

export interface LogEntry {
  id: string
  eventId: string
  timestamp: number
  ml?: number
  duration?: number
  notes?: string
  createdBy?: string
  payload?: MealPayload | MoodPayload | Record<string, unknown> | null
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
  quietHoursEnabled?: boolean
  quietHoursStart?: number
  quietHoursEnd?: number
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
  edit_routine?: boolean
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
