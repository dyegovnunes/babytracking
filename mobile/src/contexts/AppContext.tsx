import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { LogEntry, IntervalConfig, Baby, Member } from '../types'
import { supabase } from '../lib/supabase'
import { DEFAULT_INTERVALS, DEFAULT_EVENTS } from '../lib/constants'
import { requestNotificationPermission, rescheduleAllNotifications } from '../lib/notifications'
import { useAuth } from './AuthContext'

interface AppState {
  logs: LogEntry[]
  intervals: Record<string, IntervalConfig>
  baby: Baby | null
  members: Record<string, Member>
  loading: boolean
  needsOnboarding: boolean
}

type Action =
  | { type: 'SET_INITIAL'; logs: LogEntry[]; intervals: Record<string, IntervalConfig>; baby: Baby; members: Record<string, Member> }
  | { type: 'SET_NO_BABY' }
  | { type: 'ADD_LOG'; log: LogEntry }
  | { type: 'UPDATE_LOG'; log: LogEntry }
  | { type: 'DELETE_LOG'; id: string }
  | { type: 'SET_INTERVALS'; intervals: Record<string, IntervalConfig> }
  | { type: 'SET_BABY'; baby: Baby }
  | { type: 'CLEAR_LOGS' }

const initialState: AppState = {
  logs: [],
  intervals: DEFAULT_INTERVALS,
  baby: null,
  members: {},
  loading: true,
  needsOnboarding: false,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_INITIAL':
      return { ...state, logs: action.logs, intervals: action.intervals, baby: action.baby, members: action.members, loading: false, needsOnboarding: false }
    case 'SET_NO_BABY':
      return { ...state, loading: false, needsOnboarding: true }
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
    case 'CLEAR_LOGS':
      return { ...state, logs: [] }
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

    async function load() {
      // Find the user's baby via baby_members
      const { data: memberships } = await supabase
        .from('baby_members')
        .select('baby_id')
        .eq('user_id', user!.id)
        .limit(1)

      if (!memberships || memberships.length === 0) {
        dispatch({ type: 'SET_NO_BABY' })
        return
      }

      const babyId = memberships[0].baby_id

      const [babyRes, logsRes, intervalsRes, membersRes] = await Promise.all([
        supabase.from('babies').select('*').eq('id', babyId).single(),
        supabase.from('logs').select('*').eq('baby_id', babyId).order('timestamp', { ascending: true }),
        supabase.from('interval_configs').select('*').eq('baby_id', babyId),
        supabase.from('baby_members').select('user_id, display_name, role').eq('baby_id', babyId),
      ])

      if (!babyRes.data) {
        dispatch({ type: 'SET_NO_BABY' })
        return
      }

      const baby: Baby = {
        id: babyRes.data.id,
        name: babyRes.data.name,
        birthDate: babyRes.data.birth_date,
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

      dispatch({ type: 'SET_INITIAL', logs, intervals, baby, members })

      // Setup notifications
      await requestNotificationPermission()
      await rescheduleAllNotifications(logs, intervals, DEFAULT_EVENTS)
    }

    load()
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
