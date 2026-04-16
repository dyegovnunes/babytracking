import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react'
import type { LogEntry, IntervalConfig, Baby, BabyWithRole, Member } from '../types'
import { supabase } from '../lib/supabase'
import { DEFAULT_INTERVALS } from '../lib/constants'
import { useAuth } from './AuthContext'
import { updateStreak, getStreak, type StreakData } from '../lib/streak'
import { Capacitor } from '@capacitor/core'
import { initPushNotifications, updateLastSeen } from '../lib/pushNotifications'

interface AppState {
  logs: LogEntry[]
  intervals: Record<string, IntervalConfig>
  baby: Baby | null
  babies: Baby[]
  babiesWithRole: BabyWithRole[]
  members: Record<string, Member>
  loading: boolean
  needsOnboarding: boolean
  needsWelcome: boolean
  pauseDuringSleep: boolean
  quietHours: { enabled: boolean; start: number; end: number }
  streak: StreakData | null
}

type Action =
  | { type: 'SET_INITIAL'; logs: LogEntry[]; intervals: Record<string, IntervalConfig>; baby: Baby; babies: Baby[]; babiesWithRole: BabyWithRole[]; members: Record<string, Member>; needsWelcome?: boolean }
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
  | { type: 'SET_STREAK'; streak: StreakData | null }
  | { type: 'SET_WELCOME_SHOWN' }

const initialState: AppState = {
  logs: [],
  intervals: DEFAULT_INTERVALS,
  baby: null,
  babies: [],
  babiesWithRole: [],
  members: {},
  loading: true,
  needsOnboarding: false,
  needsWelcome: false,
  pauseDuringSleep: true,
  quietHours: { enabled: false, start: 22, end: 7 },
  streak: null,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_INITIAL':
      return { ...state, logs: action.logs, intervals: action.intervals, baby: action.baby, babies: action.babies, babiesWithRole: action.babiesWithRole, members: action.members, loading: false, needsOnboarding: false, needsWelcome: action.needsWelcome ?? false }
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
      return { ...state, baby: action.baby, logs: action.logs, intervals: action.intervals, members: action.members, pauseDuringSleep: true, quietHours: { enabled: false, start: 22, end: 7 } }
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
    case 'SET_STREAK':
      return { ...state, streak: action.streak }
    case 'SET_WELCOME_SHOWN':
      return { ...state, needsWelcome: false }
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
      // Find all babies the user has access to (with role)
      const { data: memberships } = await supabase
        .from('baby_members')
        .select('baby_id, role')
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
        isPremium: row.is_premium ?? false,
      }))

      // Build babiesWithRole using membership roles
      const roleMap = new Map<string, string>()
      for (const m of memberships) roleMap.set(m.baby_id, m.role)
      const babiesWithRole: BabyWithRole[] = allBabies.map((b) => ({
        ...b,
        myRole: roleMap.get(b.id) ?? 'caregiver',
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

      // Check if user needs welcome screen (parent who hasn't seen it)
      const myRole = members[user!.id]?.role
      let needsWelcome = false
      if (myRole === 'parent') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('welcome_shown_at')
          .eq('id', user!.id)
          .single()
        needsWelcome = !profile?.welcome_shown_at
      }

      dispatch({ type: 'SET_INITIAL', logs, intervals, baby, babies: allBabies, babiesWithRole, members, needsWelcome })

      // Init push notifications if user has logs (not first-time user)
      if (logs.length > 0) {
        initPushNotifications(user!.id, babyId).catch(() => {})
      }

      // Load streak
      const streakData = await getStreak(babyId)
      dispatch({ type: 'SET_STREAK', streak: streakData })

      // Load notification preferences
      const { data: prefData } = await supabase
        .from('notification_prefs')
        .select('pause_during_sleep, quiet_enabled, quiet_start, quiet_end')
        .eq('user_id', user!.id)
        .eq('baby_id', babyId)
        .maybeSingle()

      if (prefData) {
        // pause_during_sleep defaults to true if null/undefined
        dispatch({ type: 'SET_PAUSE_DURING_SLEEP', value: prefData.pause_during_sleep !== false })
        if (prefData.quiet_enabled) {
          dispatch({ type: 'SET_QUIET_HOURS', value: { enabled: true, start: prefData.quiet_start, end: prefData.quiet_end } })
        }
      }
    }

    load().catch(() => {
      dispatch({ type: 'SET_NO_BABY' })
    })
  }, [user])

  // Realtime: escuta quando o usuário é REMOVIDO de um baby_members
  // (outro parent removeu, ou o usuário auto-saiu) e recarrega o estado.
  // Isso evita que o app continue mostrando um bebê ao qual o user não tem mais acesso.
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`baby-members-del-${user.id}`)
      .on(
        'postgres_changes' as never,
        {
          event: 'DELETE',
          schema: 'public',
          table: 'baby_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Limpar localStorage caso o bebê ativo tenha sido removido
          const activeId = localStorage.getItem('yaya_active_baby')
          if (activeId) localStorage.removeItem('yaya_active_baby')
          // Reload do app: simples e garantido
          window.location.href = '/'
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Background sync: refresh logs when app resumes from background
  const lastResumeRef = useRef(Date.now())

  const refreshLogs = useCallback(async () => {
    if (!user || !state.baby) return

    // Debounce: skip if last refresh was < 5s ago
    if (Date.now() - lastResumeRef.current < 5000) return
    lastResumeRef.current = Date.now()

    // Update last_seen for anti-spam
    updateLastSeen(user.id).catch(() => {})

    try {
      const [logsRes, streakData] = await Promise.all([
        supabase
          .from('logs')
          .select('*')
          .eq('baby_id', state.baby.id)
          .order('timestamp', { ascending: true }),
        getStreak(state.baby.id),
      ])

      if (logsRes.data) {
        const freshLogs: LogEntry[] = logsRes.data.map((row) => ({
          id: row.id,
          eventId: row.event_id,
          timestamp: row.timestamp,
          ml: row.ml ?? undefined,
          duration: row.duration ?? undefined,
          notes: row.notes ?? undefined,
          createdBy: row.created_by ?? undefined,
        }))

        // Only update if logs actually changed
        if (JSON.stringify(freshLogs.map(l => l.id)) !== JSON.stringify(state.logs.map(l => l.id))) {
          dispatch({ type: 'SET_INITIAL', logs: freshLogs, intervals: state.intervals, baby: state.baby, babies: state.babies, babiesWithRole: state.babiesWithRole, members: state.members })
        }
      }

      if (streakData) {
        dispatch({ type: 'SET_STREAK', streak: streakData })
      }
    } catch {
      // Silent fail — user still has cached data
    }
  }, [user, state.baby, state.logs, state.intervals, state.babies, state.members])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // Web: use visibilitychange
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') {
          refreshLogs()
        }
      }
      document.addEventListener('visibilitychange', handleVisibility)
      return () => document.removeEventListener('visibilitychange', handleVisibility)
    }

    // Native: use Capacitor App plugin
    let removeListener: (() => void) | null = null

    import('@capacitor/app').then(({ App }) => {
      (App as any).addListener('appStateChange', (state: any) => {
        if (state.isActive) refreshLogs()
      }).then((handle: any) => {
        removeListener = () => handle.remove()
      })
    }).catch(() => {})

    return () => {
      removeListener?.()
    }
  }, [refreshLogs])

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

  // Init push on first log (if not already initialized)
  if (userId) {
    initPushNotifications(userId, babyId).catch(() => {})
  }

  // Update streak on every log
  updateStreak(babyId).then((streakData) => {
    dispatch({ type: 'SET_STREAK', streak: streakData })
  }).catch(() => {})

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
  // Usar .select() para detectar se RLS silenciosamente bloqueou o update
  const { data, error } = await supabase
    .from('baby_members')
    .update({ role: newRole })
    .eq('baby_id', babyId)
    .eq('user_id', userId)
    .select('id')

  if (error || !data || data.length === 0) return false

  dispatch({ type: 'UPDATE_MEMBER', userId, role: newRole })
  return true
}

// Helper: remove member from baby group
export async function removeMember(
  dispatch: React.Dispatch<Action>,
  babyId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('baby_members')
    .delete()
    .eq('baby_id', babyId)
    .eq('user_id', userId)
    .select('id')

  if (error || !data || data.length === 0) return false

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
    isPremium: babyRes.data.is_premium ?? false,
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
    dispatch({ type: 'SET_PAUSE_DURING_SLEEP', value: prefData.pause_during_sleep !== false })
    if (prefData.quiet_enabled) {
      dispatch({ type: 'SET_QUIET_HOURS', value: { enabled: true, start: prefData.quiet_start, end: prefData.quiet_end } })
    }
  }
}
