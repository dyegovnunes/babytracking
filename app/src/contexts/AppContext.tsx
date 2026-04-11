import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { LogEntry, IntervalConfig, Baby, Member } from '../types'
import { supabase } from '../lib/supabase'
import { DEFAULT_INTERVALS } from '../lib/constants'
import { useAuth } from './AuthContext'

interface AppState {
  logs: LogEntry[]
  intervals: Record<string, IntervalConfig>
  baby: Baby | null
  babies: Baby[]
  members: Record<string, Member>
  loading: boolean
  needsOnboarding: boolean
  pauseDuringSleep: boolean
  quietHours: { enabled: boolean; start: number; end: number }
}

type Action =
  | { type: 'SET_INITIAL'; logs: LogEntry[]; intervals: Record<string, IntervalConfig>; baby: Baby; babies: Baby[]; members: Record<string, Member> }
  | { type: 'SET_NO_BABY' }
  | { type: 'SET_LOADING' }
  | { type: 'ADD_LOG'; log: LogEntry }
  | { type: 'UPDATE_LOG'; log: LogEntry }
  | { type: 'DELETE_LOG'; id: string }
  | { type: 'SET_INTERVALS'; intervals: Record<string, IntervalConfig> }
  | { type: 'SET_BABY'; baby: Baby }
  | { type: 'SWITCH_BABY'; baby: Baby; logs: LogEntry[]; intervals: Record<string, IntervalConfig>; members: Record<string, Member> }
  | { type: 'UPDATE_MEMBER'; userId: string; role: string }
  | { type: 'REMOVE_MEMBER'; userId: string }
  | { type: 'CLEAR_LOGS' }
  | { type: 'SET_PAUSE_DURING_SLEEP'; value: boolean }
  | { type: 'SET_QUIET_HOURS'; value: { enabled: boolean; start: number; end: number } }

const initialState: AppState = {
  logs: [],
  intervals: DEFAULT_INTERVALS,
  baby: null,
  babies: [],
  members: {},
  loading: true,
  needsOnboarding: false,
  pauseDuringSleep: false,
  quietHours: { enabled: false, start: 22, end: 7 },
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_INITIAL':
      return { ...state, logs: action.logs, intervals: action.intervals, baby: action.baby, babies: action.babies, members: action.members, loading: false, needsOnboarding: false }
    case 'SET_NO_BABY':
      return { ...state, loading: false, needsOnboarding: true }
    case 'SET_LOADING':
      return { ...state, loading: true, needsOnboarding: false }
    case 'ADD_LOG':
      return { ...state, logs: [...state.logs, action.log] }
    case 'UPDATE_LOG':
      return { ...state, logs: state.logs.map((l) => (l.id === action.log.id ? action.log : l)) }
    case 'DELETE_LOG':
      return { ...state, logs: state.logs.filter((l) => l.id !== action.id) }
    case 'SET_INTERVALS':
      return { ...state, intervals: action.intervals }
    case 'SET_BABY':
      return { ...state, baby: action.baby }
    case 'SWITCH_BABY':
      return { ...state, baby: action.baby, logs: action.logs, intervals: action.intervals, members: action.members, pauseDuringSleep: false, quietHours: { enabled: false, start: 22, end: 7 } }
    case 'UPDATE_MEMBER':
      return { ...state, members: { ...state.members, [action.userId]: { ...state.members[action.userId], role: action.role } } }
    case 'REMOVE_MEMBER': {
      const { [action.userId]: _, ...rest } = state.members
      return { ...state, members: rest }
    }
    case 'CLEAR_LOGS':
      return { ...state, logs: [] }
    case 'SET_PAUSE_DURING_SLEEP':
      return { ...state, pauseDuringSleep: action.value }
    case 'SET_QUIET_HOURS':
      return { ...state, quietHours: action.value }
    default:
      return state
  }
}

const StateContext = createContext<AppState>(initialState)
const DispatchContext = createContext<React.Dispatch<Action>>(() => {})

export function useAppState() {
  return useContext(StateContext)
}

export function useAppDispatch() {
  return useContext(DispatchContext)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_NO_BABY' })
      return
    }

    // Reset to loading state immediately to prevent onboarding flash
    dispatch({ type: 'SET_LOADING' })

    async function load() {
      // Find all babies the user has access to
      const { data: memberships } = await supabase
        .from('baby_members')
        .select('baby_id')
        .eq('user_id', user!.id)

      if (!memberships || memberships.length === 0) {
        dispatch({ type: 'SET_NO_BABY' })
        return
      }

      const babyIds = memberships.map((m) => m.baby_id)

      // Pick active baby: localStorage preference or first
      const savedBabyId = localStorage.getItem('yaya_active_baby')
      const babyId = savedBabyId && babyIds.includes(savedBabyId) ? savedBabyId : babyIds[0]
      localStorage.setItem('yaya_active_baby', babyId)

      // Fetch all babies + active baby's data
      const [allBabiesRes, logsRes, intervalsRes, membersRes] = await Promise.all([
        supabase.from('babies').select('*').in('id', babyIds),
        supabase.from('logs').select('*').eq('baby_id', babyId).order('timestamp', { ascending: true }),
        supabase.from('interval_configs').select('*').eq('baby_id', babyId),
        supabase.from('baby_members').select('user_id, display_name, role').eq('baby_id', babyId),
      ])

      const allBabies: Baby[] = (allBabiesRes.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        birthDate: row.birth_date,
        gender: row.gender ?? undefined,
        photoUrl: row.photo_url,
      }))

      const baby = allBabies.find((b) => b.id === babyId)
      if (!baby) {
        dispatch({ type: 'SET_NO_BABY' })
        return
      }

      const logs: LogEntry[] = (logsRes.data ?? []).map((row) => ({
        id: row.id,
        eventId: row.event_id,
        timestamp: row.timestamp,
        ml: row.ml ?? undefined,
        duration: row.duration ?? undefined,
        notes: row.notes ?? undefined,
        createdBy: row.created_by ?? undefined,
      }))

      const members: Record<string, Member> = {}
      for (const row of membersRes.data ?? []) {
        members[row.user_id] = {
          userId: row.user_id,
          displayName: row.display_name || '',
          role: row.role,
        }
      }

      const intervals = { ...DEFAULT_INTERVALS }
      for (const row of intervalsRes.data ?? []) {
        const base = intervals[row.category] ?? { label: row.category, minutes: row.minutes, warn: row.warn }
        intervals[row.category] = {
          ...base,
          minutes: row.minutes,
          warn: row.warn,
          mode: row.mode ?? 'interval',
          scheduledHours: row.scheduled_hours ? JSON.parse(row.scheduled_hours) : undefined,
        }
      }

      dispatch({ type: 'SET_INITIAL', logs, intervals, baby, babies: allBabies, members })

      // Load notification preferences
      const { data: prefData } = await supabase
        .from('notification_prefs')
        .select('pause_during_sleep, quiet_enabled, quiet_start, quiet_end')
        .eq('user_id', user!.id)
        .eq('baby_id', babyId)
        .maybeSingle()

      if (prefData) {
        if (prefData.pause_during_sleep) {
          dispatch({ type: 'SET_PAUSE_DURING_SLEEP', value: true })
        }
        if (prefData.quiet_enabled) {
          dispatch({ type: 'SET_QUIET_HOURS', value: { enabled: true, start: prefData.quiet_start, end: prefData.quiet_end } })
        }
      }
    }

    load().catch(() => {
      dispatch({ type: 'SET_NO_BABY' })
    })
  }, [user])

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

// Helper: add log to Supabase + dispatch
export async function addLog(
  dispatch: React.Dispatch<Action>,
  eventId: string,
  babyId: string,
  ml?: number,
  userId?: string,
): Promise<LogEntry | null> {
  const timestamp = Date.now()

  const { data, error } = await supabase
    .from('logs')
    .insert({
      baby_id: babyId,
      event_id: eventId,
      timestamp,
      ml: ml ?? null,
      created_by: userId ?? null,
    })
    .select()
    .single()

  if (error || !data) return null

  const log: LogEntry = {
    id: data.id,
    eventId: data.event_id,
    timestamp: data.timestamp,
    ml: data.ml ?? undefined,
    createdBy: data.created_by ?? undefined,
  }

  dispatch({ type: 'ADD_LOG', log })
  return log
}

// Helper: update log in Supabase + dispatch
export async function updateLog(
  dispatch: React.Dispatch<Action>,
  log: LogEntry,
): Promise<boolean> {
  const { error } = await supabase
    .from('logs')
    .update({
      event_id: log.eventId,
      timestamp: log.timestamp,
      ml: log.ml ?? null,
      duration: log.duration ?? null,
      notes: log.notes ?? null,
    })
    .eq('id', log.id)

  if (error) return false

  dispatch({ type: 'UPDATE_LOG', log })
  return true
}

// Helper: delete log from Supabase + dispatch
export async function deleteLog(
  dispatch: React.Dispatch<Action>,
  id: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('logs')
    .delete()
    .eq('id', id)

  if (error) return false

  dispatch({ type: 'DELETE_LOG', id })
  return true
}

// Helper: update baby in Supabase + dispatch
export async function updateBaby(
  dispatch: React.Dispatch<Action>,
  baby: Baby,
): Promise<boolean> {
  const { error } = await supabase
    .from('babies')
    .update({
      name: baby.name,
      birth_date: baby.birthDate,
      gender: baby.gender ?? null,
      photo_url: baby.photoUrl ?? null,
    })
    .eq('id', baby.id)

  if (error) return false

  dispatch({ type: 'SET_BABY', baby })
  return true
}

// Helper: update intervals in Supabase + dispatch
export async function updateIntervals(
  dispatch: React.Dispatch<Action>,
  babyId: string,
  intervals: Record<string, IntervalConfig>,
): Promise<boolean> {
  const upserts = Object.entries(intervals).map(([category, config]) => ({
    baby_id: babyId,
    category,
    minutes: config.minutes,
    warn: config.warn,
    mode: config.mode ?? 'interval',
    scheduled_hours: config.scheduledHours ? JSON.stringify(config.scheduledHours) : null,
  }))

  const { error } = await supabase
    .from('interval_configs')
    .upsert(upserts, { onConflict: 'baby_id,category' })

  if (error) return false

  dispatch({ type: 'SET_INTERVALS', intervals })
  return true
}

// Helper: clear all logs from Supabase + dispatch
export async function clearAllLogs(
  dispatch: React.Dispatch<Action>,
  babyId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('logs')
    .delete()
    .eq('baby_id', babyId)

  if (error) return false

  dispatch({ type: 'CLEAR_LOGS' })
  return true
}

// Helper: update member role
export async function updateMemberRole(
  dispatch: React.Dispatch<Action>,
  babyId: string,
  userId: string,
  newRole: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('baby_members')
    .update({ role: newRole })
    .eq('baby_id', babyId)
    .eq('user_id', userId)

  if (error) return false

  dispatch({ type: 'UPDATE_MEMBER', userId, role: newRole })
  return true
}

// Helper: remove member from baby group
export async function removeMember(
  dispatch: React.Dispatch<Action>,
  babyId: string,
  userId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('baby_members')
    .delete()
    .eq('baby_id', babyId)
    .eq('user_id', userId)

  if (error) return false

  dispatch({ type: 'REMOVE_MEMBER', userId })
  return true
}

// Helper: switch active baby — reload logs, intervals, members
export async function switchBaby(
  dispatch: React.Dispatch<Action>,
  babyId: string,
): Promise<void> {
  localStorage.setItem('yaya_active_baby', babyId)

  const [babyRes, logsRes, intervalsRes, membersRes] = await Promise.all([
    supabase.from('babies').select('*').eq('id', babyId).single(),
    supabase.from('logs').select('*').eq('baby_id', babyId).order('timestamp', { ascending: true }),
    supabase.from('interval_configs').select('*').eq('baby_id', babyId),
    supabase.from('baby_members').select('user_id, display_name, role').eq('baby_id', babyId),
  ])

  if (!babyRes.data) return

  const baby: Baby = {
    id: babyRes.data.id,
    name: babyRes.data.name,
    birthDate: babyRes.data.birth_date,
    gender: babyRes.data.gender ?? undefined,
    photoUrl: babyRes.data.photo_url,
  }

  const logs: LogEntry[] = (logsRes.data ?? []).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    timestamp: row.timestamp,
    ml: row.ml ?? undefined,
    duration: row.duration ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
  }))

  const members: Record<string, Member> = {}
  for (const row of membersRes.data ?? []) {
    members[row.user_id] = {
      userId: row.user_id,
      displayName: row.display_name || '',
      role: row.role,
    }
  }

  const intervals = { ...DEFAULT_INTERVALS }
  for (const row of intervalsRes.data ?? []) {
    const base = intervals[row.category] ?? { label: row.category, minutes: row.minutes, warn: row.warn }
    intervals[row.category] = {
      ...base,
      minutes: row.minutes,
      warn: row.warn,
      mode: row.mode ?? 'interval',
      scheduledHours: row.scheduled_hours ? JSON.parse(row.scheduled_hours) : undefined,
    }
  }

  dispatch({ type: 'SWITCH_BABY', baby, logs, intervals, members })

  // Load notification preferences for new baby
  const { data: prefData } = await supabase
    .from('notification_prefs')
    .select('pause_during_sleep, quiet_enabled, quiet_start, quiet_end')
    .eq('baby_id', babyId)
    .maybeSingle()

  if (prefData) {
    if (prefData.pause_during_sleep) {
      dispatch({ type: 'SET_PAUSE_DURING_SLEEP', value: true })
    }
    if (prefData.quiet_enabled) {
      dispatch({ type: 'SET_QUIET_HOURS', value: { enabled: true, start: prefData.quiet_start, end: prefData.quiet_end } })
    }
  }
}
