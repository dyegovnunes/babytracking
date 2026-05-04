import { useState, useCallback, useMemo, useEffect } from 'react'
import { useAppState, useAppDispatch, addLog, updateLog, deleteLog } from '../../contexts/AppContext'
import { useOfflineQueue, OFFLINE_QUEUE_ENABLED } from './useOfflineQueue'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_EVENTS, EVENT_CATALOG } from '../../lib/constants'
import { getNextProjection, isInQuietHours } from './projections'
import { useTimer } from '../../hooks/useTimer'
import { hapticSuccess, hapticLight, hapticMedium } from '../../lib/haptics'
import HeroIdentity from './components/HeroIdentity'
import ActivityGrid from './components/ActivityGrid'
import PredictionCard from './components/PredictionCard'
import MedicationProjectionCard from './components/MedicationProjectionCard'
import RecentLogs from './components/RecentLogs'
import PrenatalView from './components/PrenatalView'
import { isPrenatal } from '../../lib/formatters'
import { getMedicationProjections } from './medicationProjections'
import ResumoDoDiaButton from './components/ResumoDoDiaButton'
import ResumoDoDiaSheet from './components/ResumoDoDiaSheet'
import ShiftDetailModal from './components/ShiftDetailModal'
import OutOfHoursBanner from './components/OutOfHoursBanner'
import { useShiftsForBaby, type CaregiverShift } from './useCaregiverShift'
import { useCaregiverSchedule, isInWorkWindow } from '../profile/useCaregiverSchedule'
import BottleModal from '../../components/ui/BottleModal'
import EditModal from '../../components/ui/EditModal'
import Toast from '../../components/ui/Toast'
import { RewardedAdModal } from '../../components/ui/RewardedAdModal'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { useDailyLimit } from './useDailyLimit'
import JourneyCarousel from './components/JourneyCarousel'
import { collectHighlights } from './highlights'
import { getAgeBand, getHighlightedEvents } from '../../lib/ageUtils'
import { useMilestones } from '../milestones'
import { useVaccines, VACCINES } from '../vaccines'
import { useMedications } from '../medications'
import { useMyRole } from '../../hooks/useMyRole'
import { can } from '../../lib/roles'
import { useTimeline, useMedicationLogsRange } from '../timeline'
import VaccineLogEditModal from '../vaccines/components/VaccineLogEditModal'
import MilestoneLogEditModal from '../milestones/components/MilestoneLogEditModal'
import type { BabyVaccine } from '../vaccines/vaccineData'
import type { BabyMilestone } from '../milestones/milestoneData'

import { TrackerSkeleton } from '../../components/ui/Skeleton'
import { useGridItems } from './useGridItems'
import MealModal from './components/MealModal'
import MoodSheet from './components/MoodSheet'
import SickModal from './components/SickModal'
import GridSettingsSheet from './components/GridSettingsSheet'
import AllergenPanel from './components/AllergenPanel'
import PottyPanel from './components/PottyPanel'
import TwoYearSummaryModal from './components/TwoYearSummaryModal'
import type { LogEntry, MealPayload, MoodPayload, SickPayload } from '../../types'
import { useContentArticles } from '../content'
import { useDiscoveryNudges } from './useDiscoveryNudges'
import DiscoveryNudgeCard from './components/DiscoveryNudgeCard'
import DiscoveryTrail from './components/DiscoveryTrail'
import TrailCompletionSheet from './components/TrailCompletionSheet'
import RoutineIntroSheet from './components/RoutineIntroSheet'
import InsightsIntroSheet from './components/InsightsIntroSheet'
import YaIATrailSheet from './components/YaIATrailSheet'
import ReportIntroSheet from './components/ReportIntroSheet'
import FirstRecordSheet from './components/FirstRecordSheet'
import MemberJoinedSheet from './components/MemberJoinedSheet'
import { useMemberJoinNotification } from './useMemberJoinNotification'
import FamilyInviteSheet from '../profile/components/FamilyInviteSheet'

const PROJECTION_CATEGORIES: string[] = ['feed', 'diaper', 'sleep_nap', 'sleep_awake', 'bath']

export default function TrackerPage() {
  const { logs, intervals, baby, members, loading, pauseDuringSleep, quietHours, streak } = useAppState()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const myRole = useMyRole()
  const { enqueue } = useOfflineQueue(baby?.id, dispatch)
  // Grid configurável: carrega baby_grid_items do Supabase.
  // Fallback automático para DEFAULT_EVENTS se vazio ou erro — tracker nunca quebra.
  const {
    gridEvents,
    pendingSuggestions,
    knownEventIds,
    seedSuggestion,
    acceptSuggestion,
    dismissSuggestion,
    toggleEvent,
  } = useGridItems(baby?.id)
  const nowRaw = useTimer()
  // Arredonda `now` pro minuto corrente. Ticks do useTimer (a cada ~30s)
  // criavam um Date novo que cascateava recálculos em useMedications.dayStatuses
  // (que depende de `now`), que por sua vez refazia medicationProjections —
  // causando "piscar" na home. Com nowMinute estável por minuto, memos ficam
  // consistentes até o minuto virar.
  const now = useMemo(() => {
    const r = new Date(nowRaw)
    r.setSeconds(0, 0)
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(nowRaw.getTime() / 60000)])

  // Detecta se o bebê está dormindo agora (último evento de sono foi "sleep")
  const isBabySleeping = useMemo(() => {
    const sleepLogs = logs
      .filter((l) => l.eventId === 'sleep' || l.eventId === 'wake')
      .sort((a, b) => b.timestamp - a.timestamp)
    return sleepLogs.length > 0 && sleepLogs[0].eventId === 'sleep'
  }, [logs])

  // Shifts do bebê — aparecem mesclados no RecentLogs (que já limita a 5
  // após ordenar por timestamp). Sem filtro de data: um shift enviado ontem
  // à noite continua aparecendo na Home depois da meia-noite.
  const { shifts: recentShifts } = useShiftsForBaby(baby?.id)
  // Schedule do próprio usuário (só existe quando ele é caregiver desse bebê)
  const { schedule: myCaregiverSchedule } = useCaregiverSchedule(
    myRole === 'caregiver' ? baby?.id : undefined,
    myRole === 'caregiver' ? user?.id : undefined,
  )

  const [detailShift, setDetailShift] = useState<CaregiverShift | null>(null)
  const [editingShift, setEditingShift] = useState<CaregiverShift | null>(null)
  const [timelineVaccine, setTimelineVaccine] = useState<BabyVaccine | null>(null)
  const [timelineMilestone, setTimelineMilestone] = useState<BabyMilestone | null>(null)

  const canEditShift = useCallback(
    (shift: CaregiverShift): boolean => {
      if (!user || user.id !== shift.caregiverId) return false
      if (!myCaregiverSchedule) return false
      return isInWorkWindow(myCaregiverSchedule, { startOffsetMin: -45, endOffsetMin: 60 })
    },
    [user, myCaregiverSchedule],
  )

  // Milestones (home card + timeline)
  const {
    achievedCodes,
    ageDays,
    achieved: milestoneRecords,
    registerMilestone,
    deleteMilestone,
  } = useMilestones(baby?.id, baby?.birthDate)

  // Vacinas — alimenta highlights + timeline
  const {
    statusByCode: vaccineStatusByCode,
    records: vaccineRecords,
    applyVaccine,
    clearRecord: clearVaccineRecord,
  } = useVaccines(baby?.id, baby?.birthDate)

  // Medicamentos — alimenta o chip no HighlightsStrip e a timeline
  const medicationMembersById = useMemo(() => {
    const map: Record<string, string> = {}
    if (members) {
      for (const [uid, m] of Object.entries(members)) {
        map[uid] = m.displayName
      }
    }
    return map
  }, [members])
  const {
    homeAlerts: medicationAlerts,
    activeMedications,
    archivedMedications,
    dayStatuses: medicationDayStatuses,
    administerDose,
    loading: medicationsLoading,
  } = useMedications(baby?.id, medicationMembersById, now)

  // Proximas doses (janela 1h) — card com check inline. Overdues ficam no
  // alert da HighlightsStrip (complementam, não duplicam).
  //
  // GATE DE LOADING: useMedications faz 2 fetches em sequência (medications,
  // depois medication_logs). Entre os setters, o estado vê activeMedications
  // preenchido mas todayLogs ainda vazio — projection mostrava dose
  // "pendente" por ~100ms e sumia quando logs chegavam (dose dada).
  // Isso era o "piscar". Agora só renderiza projection pós-loading.
  const medicationProjections = useMemo(
    () => medicationsLoading ? [] : getMedicationProjections(medicationDayStatuses, now),
    [medicationDayStatuses, now, medicationsLoading],
  )

  const allMedications = useMemo(
    () => [...activeMedications, ...archivedMedications],
    [activeMedications, archivedMedications],
  )

  // Medication logs nas últimas 24h (janela da home) — separado do useMedications
  // porque este só traz o dia local, não as últimas 24h móveis.
  const medLogsSinceMs = useMemo(() => Date.now() - 24 * 60 * 60 * 1000, [])
  const { logs: recentMedicationLogs, reload: reloadMedLogs } = useMedicationLogsRange(
    baby?.id,
    medLogsSinceMs,
  )

  const handleMedicationConfirm = useCallback(
    async (medicationId: string, slotTime: string) => {
      await administerDose(medicationId, new Date(), user?.id, slotTime)
      // Força refetch do useMedicationLogsRange pra o log aparecer imediatamente
      // em "Últimos Registros" / timeline — senão só depois de recarregar a página.
      reloadMedLogs()
    },
    [administerDose, user, reloadMedLogs],
  )

  // Timeline unificada pra "Últimos registros"
  const timelineInputs = useMemo(
    () => ({
      logs,
      shifts: recentShifts,
      vaccines: vaccineRecords,
      milestones: milestoneRecords,
      medicationLogs: recentMedicationLogs,
      medications: allMedications,
    }),
    [
      logs,
      recentShifts,
      vaccineRecords,
      milestoneRecords,
      recentMedicationLogs,
      allMedications,
    ],
  )
  const { items: timelineItems } = useTimeline(timelineInputs)

  // Regra da home: últimas 4h OU últimos 5 items (o que der mais).
  const recentItems = useMemo(() => {
    const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000
    const last4h = timelineItems.filter((i) => i.ts >= fourHoursAgo)
    return last4h.length >= 5 ? last4h : timelineItems.slice(0, 5)
  }, [timelineItems])

  // Artigo contextual do blog (1 artigo para a fase do bebê)
  const babyAgeWeeks = ageDays > 0 ? Math.floor(ageDays / 7) : 0
  const { articles: contentArticles, dismissArticle } = useContentArticles(babyAgeWeeks, {
    limit: 5,
    utmMedium: 'home_carousel',
  })

  // Progressive Discovery: nudge contextual (aparece após a trilha expirar)
  const { nudge: discoveryNudge, dismissNudge } = useDiscoveryNudges(baby?.id, logs, baby, members)

  // Highlights strip (saltos + marcos + vacinas + medicamentos)
  const [highlightsTick, setHighlightsTick] = useState(0)
  const highlights = useMemo(
    () =>
      collectHighlights({
        birthDate: baby?.birthDate,
        achievedCodes,
        ageDays,
        vaccines: VACCINES,
        vaccineStatus: vaccineStatusByCode,
        medicationAlerts,
        reactivityTick: highlightsTick,
      }),
    [
      baby?.birthDate,
      achievedCodes,
      ageDays,
      vaccineStatusByCode,
      medicationAlerts,
      highlightsTick,
    ],
  )

  // Card comemorativo de 2 anos
  const [twoYearOpen, setTwoYearOpen]               = useState(false)
  const [twoYearCardDismissed, setTwoYearCardDismissed] = useState(false)

  // Cards de sugestão de amamentação — persistidos em localStorage por babyId
  const [dismissedBreastCards, setDismissedBreastCards] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    if (!baby) return
    const stored2yr = localStorage.getItem(`yaya_2yr_${baby.id}`)
    if (stored2yr) {
      const ts = parseInt(stored2yr)
      // Valor numérico = snooze com timestamp; '1' = dismiss permanente legado
      const snoozed = !isNaN(ts) ? Date.now() - ts < 7 * 24 * 60 * 60 * 1000 : true
      setTwoYearCardDismissed(snoozed)
    }
    const dismissed = new Set<string>()
    if (localStorage.getItem(`yaya_bss_${baby.id}`) === '1') dismissed.add('simplify')
    if (localStorage.getItem(`yaya_bsd_${baby.id}`) === '1') dismissed.add('disable')
    setDismissedBreastCards(dismissed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baby?.id])

  const [bottleModalOpen, setBottleModalOpen] = useState(false)
  const [mealModalOpen, setMealModalOpen] = useState(false)
  const [editingMealLog, setEditingMealLog] = useState<LogEntry | null>(null)
  const [moodSheetOpen, setMoodSheetOpen] = useState(false)
  const [sickModalOpen, setSickModalOpen] = useState(false)
  const [editingSickLog, setEditingSickLog] = useState<LogEntry | null>(null)
  const [gridSettingsOpen, setGridSettingsOpen] = useState(false)
  const [showFamilyInviteSheet, setShowFamilyInviteSheet] = useState(false)
  const [showTrailCompletion, setShowTrailCompletion] = useState(false)
  const [showFirstRecord, setShowFirstRecord] = useState(false)

  // Detectar conclusão da trilha diretamente no TrackerPage — mais confiável que
  // depender do useEffect interno do DiscoveryTrail (que pode ser perdido no remount).
  // Usa flag localStorage para persistir entre remounts ao trocar de aba.
  useEffect(() => {
    if (!baby) return
    const completedKey  = `yaya_trail_completed_${baby.id}`
    const pendingKey    = `yaya_trail_pending_celebration_${baby.id}`
    const dismissKey    = `yaya_trail_dismissed_${baby.id}`

    // Se já tem comemoração pendente (definida pelo DiscoveryTrail), mostrar agora
    if (localStorage.getItem(pendingKey)) {
      localStorage.removeItem(pendingKey)
      const t = setTimeout(() => setShowTrailCompletion(true), 400)
      return () => clearTimeout(t)
    }

    // Verificar também na home se todos os passos estão done mas a comemoração ainda não saiu
    if (localStorage.getItem(completedKey)) return
    if (localStorage.getItem(dismissKey)) return

    const bucket = babyAgeWeeks < 13 ? '0to3m' : babyAgeWeeks < 52 ? '3to12m' : '12mplus'
    const BUCKET_KEYS: Record<string, string[]> = {
      '0to3m':   ['yaya_evt_first_record_created', 'yaya_evt_routine_configured', 'yaya_evt_insights_tab_opened', 'yaya_evt_yaia_first_message', 'yaya_evt_family_invite_sent', 'yaya_evt_super_report_generated'],
      '3to12m':  ['yaya_evt_first_record_created', 'yaya_evt_routine_configured', 'yaya_evt_yaia_first_message', 'yaya_evt_family_invite_sent', 'yaya_evt_super_report_generated'],
      '12mplus': ['yaya_evt_first_record_created', 'yaya_evt_routine_configured', 'yaya_evt_development_leap_opened', 'yaya_evt_yaia_first_message', 'yaya_evt_family_invite_sent', 'yaya_evt_super_report_generated'],
    }
    const allDone = BUCKET_KEYS[bucket].every(k => localStorage.getItem(`${k}_${baby.id}`))
    if (allDone) {
      localStorage.setItem(completedKey, '1')
      const t = setTimeout(() => setShowTrailCompletion(true), 400)
      return () => clearTimeout(t)
    }
  }, [baby?.id, babyAgeWeeks])
  const { notification: memberJoinNotif, clearNotification: clearMemberJoin } = useMemberJoinNotification(baby?.id)
  const [showRoutineIntro, setShowRoutineIntro] = useState(false)
  const [showInsightsIntro, setShowInsightsIntro] = useState<'insights' | 'milestones' | 'leaps' | null>(null)
  const [showYaIATrailSheet, setShowYaIATrailSheet] = useState(false)
  const [showReportIntro, setShowReportIntro] = useState(false)
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showAdModal, setShowAdModal] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const { checkAndRecord, recordsToday, dailyLimit, grantBonusRecords } = useDailyLimit()

  // Semeia sugestões de eventos por faixa etária — idempotente (DB tem UNIQUE constraint)
  useEffect(() => {
    if (!baby || knownEventIds.size === 0) return
    const ageMonths = ageDays > 0 ? ageDays / 30.4375 : 0
    // Refeição sugerida a partir de 6 meses
    if (ageMonths >= 6 && !knownEventIds.has('meal')) {
      seedSuggestion('meal', 9)
    }
    // Humor sugerido a partir de 12 meses
    if (ageMonths >= 12 && !knownEventIds.has('mood')) {
      seedSuggestion('mood', 10)
    }
    // Penico sugerido a partir de 18 meses
    if (ageMonths >= 18 && !knownEventIds.has('potty_pee')) {
      seedSuggestion('potty_pee', 11)
    }
    if (ageMonths >= 18 && !knownEventIds.has('potty_poop')) {
      seedSuggestion('potty_poop', 12)
    }
  }, [baby, knownEventIds, ageDays, seedSuggestion])

  // Eventos que indicam que o bebê acordou (alimentação ou troca de fralda)
  const WAKE_TRIGGER_EVENTS = ['breast_left', 'breast_right', 'breast_both', 'bottle', 'diaper_wet', 'diaper_dirty']

  // Auto-sono só faz sentido durante o horário noturno configurado.
  // Durante o dia, o pai pode ter simplesmente esquecido de registrar o acordou.
  const isNighttime = useMemo(() => {
    if (!quietHours?.enabled) return false
    return isInQuietHours(new Date(), { start: quietHours.start, end: quietHours.end })
  }, [quietHours, now])

  // Helper: mostra FirstRecordSheet na primeira vez; toast normal nas seguintes.
  // Chama hapticSuccess() internamente — não chamar de novo no handler.
  const notifyRecordCreated = useCallback(
    (label: string) => {
      if (!baby) return
      const celebKey = `yaya_celebration_first_record_${baby.id}`
      if (!localStorage.getItem(celebKey)) {
        localStorage.setItem(celebKey, '1')
        hapticSuccess()
        setShowFirstRecord(true)
      } else {
        setToast(`${label} registrado!`)
      }
    },
    [baby],
  )

  const handleLog = useCallback(
    async (eventId: string) => {
      if (!baby) return

      const event = EVENT_CATALOG.find((e) => e.id === eventId)
      if (!event) return

      // Check limit at click-time using real-time count (not stale state)
      if (!checkAndRecord()) {
        hapticLight()
        setShowAdModal(true)
        return
      }

      if (event.hasAmount) {
        hapticLight()
        setBottleModalOpen(true)
        return
      }

      if (eventId === 'meal') {
        hapticLight()
        setMealModalOpen(true)
        return
      }

      if (eventId === 'mood') {
        hapticLight()
        setMoodSheetOpen(true)
        return
      }

      if (eventId === 'sick_log') {
        hapticLight()
        setSickModalOpen(true)
        return
      }

      // Offline: enfileirar localmente e dispatch otimista para feedback imediato
      if (!navigator.onLine && OFFLINE_QUEUE_ENABLED) {
        // Auto-sono offline — só durante horário noturno
        if (isBabySleeping && isNighttime && WAKE_TRIGGER_EVENTS.includes(eventId)) {
          const ts = Date.now()
          const wakeId = enqueue({ eventId: 'wake',  babyId: baby.id, userId: user?.id, payload: { source: 'offline' }, timestamp: ts - 5 * 60_000 })
          const evtId  = enqueue({ eventId,           babyId: baby.id, userId: user?.id, payload: { source: 'offline' }, timestamp: ts })
          const slpId  = enqueue({ eventId: 'sleep', babyId: baby.id, userId: user?.id, payload: { source: 'offline' }, timestamp: ts + 30 * 60_000 })
          if (wakeId) dispatch({ type: 'ADD_LOG', log: { id: wakeId,  eventId: 'wake',  timestamp: ts - 5 * 60_000, payload: { source: 'offline' }, createdBy: user?.id } })
          if (evtId)  dispatch({ type: 'ADD_LOG', log: { id: evtId,   eventId,          timestamp: ts,             payload: { source: 'offline' }, createdBy: user?.id } })
          if (slpId)  dispatch({ type: 'ADD_LOG', log: { id: slpId,  eventId: 'sleep',  timestamp: ts + 30 * 60_000, payload: { source: 'offline' }, createdBy: user?.id } })
          hapticLight()
          setToast(`${event.label} + sono automático salvos offline`)
          return
        }
        const ts = Date.now()
        const tempId = enqueue({ eventId, babyId: baby.id, userId: user?.id, payload: { source: 'offline' }, timestamp: ts })
        if (tempId) dispatch({ type: 'ADD_LOG', log: { id: tempId, eventId, timestamp: ts, payload: { source: 'offline' }, createdBy: user?.id } })
        hapticLight()
        setToast(`${event.label} salvo offline`)
        return
      }

      // Auto-sono: se bebê está dormindo E é horário noturno e registrou amamentação/fralda,
      // insere "acordou" 5 min antes e "dormiu" 30 min depois automaticamente.
      // Fora do horário noturno, o pai pode ter simplesmente esquecido de registrar o acordou.
      if (isBabySleeping && isNighttime && WAKE_TRIGGER_EVENTS.includes(eventId)) {
        const ts = Date.now()
        await addLog(dispatch, 'wake',  baby.id, undefined, user?.id, null, ts - 5 * 60_000)
        const log = await addLog(dispatch, eventId, baby.id, undefined, user?.id, null, ts)
        await addLog(dispatch, 'sleep', baby.id, undefined, user?.id, null, ts + 30 * 60_000)
        if (log) {
          hapticSuccess()
          setToast(`${event.label} + sono automático registrado`)
        }
        return
      }

      const log = await addLog(dispatch, eventId, baby.id, undefined, user?.id)
      if (log) {
        notifyRecordCreated(event.label)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baby, dispatch, user, checkAndRecord, isBabySleeping, enqueue, notifyRecordCreated],
  )

  const handleMealConfirm = useCallback(
    async (payload: MealPayload) => {
      if (!baby) return
      setMealModalOpen(false)
      if (!navigator.onLine && OFFLINE_QUEUE_ENABLED) {
        const ts = Date.now()
        const p = { source: 'offline', ...(payload as Record<string, unknown>) }
        const tempId = enqueue({ eventId: 'meal', babyId: baby.id, userId: user?.id, payload: p, timestamp: ts })
        if (tempId) dispatch({ type: 'ADD_LOG', log: { id: tempId, eventId: 'meal', timestamp: ts, payload: p, createdBy: user?.id } })
        setToast('Refeição salva offline')
        return
      }
      const log = await addLog(dispatch, 'meal', baby.id, undefined, user?.id, payload as unknown as Record<string, unknown>)
      if (log) {
        notifyRecordCreated('Refeição')
      }
    },
    [baby, dispatch, user, enqueue, notifyRecordCreated],
  )

  const handleMealEditConfirm = useCallback(
    async (payload: MealPayload, timestamp?: number) => {
      if (!editingMealLog) return
      const updated: LogEntry = {
        ...editingMealLog,
        payload: payload as unknown as Record<string, unknown>,
        timestamp: timestamp ?? editingMealLog.timestamp,
      }
      setEditingMealLog(null)
      const ok = await updateLog(dispatch, updated)
      if (ok) setToast('Refeição atualizada!')
    },
    [editingMealLog, dispatch],
  )

  const handleMealEditDelete = useCallback(
    async () => {
      if (!editingMealLog) return
      setEditingMealLog(null)
      const ok = await deleteLog(dispatch, editingMealLog.id)
      if (ok) setToast('Registro excluído!')
    },
    [editingMealLog, dispatch],
  )

  const handleMoodConfirm = useCallback(
    async (payload: MoodPayload) => {
      if (!baby) return
      setMoodSheetOpen(false)
      if (!navigator.onLine && OFFLINE_QUEUE_ENABLED) {
        const ts = Date.now()
        const p = { source: 'offline', ...(payload as unknown as Record<string, unknown>) }
        const tempId = enqueue({ eventId: 'mood', babyId: baby.id, userId: user?.id, payload: p, timestamp: ts })
        if (tempId) dispatch({ type: 'ADD_LOG', log: { id: tempId, eventId: 'mood', timestamp: ts, payload: p, createdBy: user?.id } })
        setToast('Humor salvo offline')
        return
      }
      const log = await addLog(dispatch, 'mood', baby.id, undefined, user?.id, payload as unknown as Record<string, unknown>)
      if (log) {
        notifyRecordCreated('Humor')
      }
    },
    [baby, dispatch, user, enqueue, notifyRecordCreated],
  )

  const handleSickConfirm = useCallback(
    async (payload: SickPayload) => {
      if (!baby) return
      setSickModalOpen(false)
      if (!navigator.onLine && OFFLINE_QUEUE_ENABLED) {
        const ts = Date.now()
        const p = { source: 'offline', ...(payload as Record<string, unknown>) }
        const tempId = enqueue({ eventId: 'sick_log', babyId: baby.id, userId: user?.id, payload: p, timestamp: ts })
        if (tempId) dispatch({ type: 'ADD_LOG', log: { id: tempId, eventId: 'sick_log', timestamp: ts, payload: p, createdBy: user?.id } })
        setToast('Registro salvo offline')
        return
      }
      const log = await addLog(dispatch, 'sick_log', baby.id, undefined, user?.id, payload as unknown as Record<string, unknown>)
      if (log) {
        notifyRecordCreated('Registro de saúde')
      }
    },
    [baby, dispatch, user, enqueue, notifyRecordCreated],
  )

  const handleSickEditConfirm = useCallback(
    async (payload: SickPayload, timestamp?: number) => {
      if (!editingSickLog) return
      const updated: LogEntry = {
        ...editingSickLog,
        payload: payload as unknown as Record<string, unknown>,
        timestamp: timestamp ?? editingSickLog.timestamp,
      }
      setEditingSickLog(null)
      const ok = await updateLog(dispatch, updated)
      if (ok) setToast('Registro atualizado!')
    },
    [editingSickLog, dispatch],
  )

  const handleSickEditDelete = useCallback(async () => {
    if (!editingSickLog) return
    setEditingSickLog(null)
    const ok = await deleteLog(dispatch, editingSickLog.id)
    if (ok) setToast('Registro excluído!')
  }, [editingSickLog, dispatch])

  const handleBottleConfirm = useCallback(
    async (ml: number) => {
      if (!baby) return
      setBottleModalOpen(false)
      if (!navigator.onLine && OFFLINE_QUEUE_ENABLED) {
        const ts = Date.now()
        const p: Record<string, unknown> = { source: 'offline' }
        const tempId = enqueue({ eventId: 'bottle', babyId: baby.id, ml, userId: user?.id, payload: p, timestamp: ts })
        if (tempId) dispatch({ type: 'ADD_LOG', log: { id: tempId, eventId: 'bottle', timestamp: ts, ml, payload: p, createdBy: user?.id } })
        setToast(`Mamadeira ${ml}ml salva offline`)
        return
      }
      const log = await addLog(dispatch, 'bottle', baby.id, ml, user?.id)
      if (log) {
        notifyRecordCreated(`Mamadeira ${ml}ml`)
      }
    },
    [baby, dispatch, user, enqueue, notifyRecordCreated],
  )

  const handleEditLog = useCallback((log: LogEntry) => {
    hapticMedium()
    if (log.eventId === 'meal')     { setEditingMealLog(log); return }
    if (log.eventId === 'sick_log') { setEditingSickLog(log); return }
    setEditingLog(log)
  }, [])

  const handleSaveLog = useCallback(
    async (log: LogEntry) => {
      const ok = await updateLog(dispatch, log)
      setEditingLog(null)
      if (ok) setToast('Registro atualizado!')
    },
    [dispatch],
  )

  const handleDeleteLog = useCallback(
    async (id: string) => {
      const ok = await deleteLog(dispatch, id)
      setEditingLog(null)
      if (ok) setToast('Registro excluído!')
    },
    [dispatch],
  )

  const [dismissedProjections, setDismissedProjections] = useState<Set<string>>(new Set())

  const handleDismissProjection = useCallback((label: string) => {
    hapticLight()
    setDismissedProjections(prev => new Set(prev).add(label))
  }, [])

  // 2.6: Simplificação de amamentação (≥ 8m, low frequency, left/right ainda no grid)
  const showBreastSimplify = useMemo(() => {
    if (!baby || dismissedBreastCards.has('simplify')) return false
    if (ageDays < 243) return false // < 8 meses
    const hasBreastSides = gridEvents.some((e) => e.id === 'breast_left' || e.id === 'breast_right')
    if (!hasBreastSides) return false
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
    const recent = logs.filter(
      (l) => (l.eventId === 'breast_left' || l.eventId === 'breast_right') && l.timestamp >= fourteenDaysAgo,
    ).length
    return recent < 14 // menos de 1 sessão/dia em média nos últimos 14 dias
  }, [baby, ageDays, gridEvents, logs, dismissedBreastCards])

  // 3.5: Sugestão de desabilitar amamentação (≥ 12m, zero registros em 30 dias)
  const showBreastDisable = useMemo(() => {
    if (!baby || dismissedBreastCards.has('disable')) return false
    if (showBreastSimplify) return false // não exibe os dois ao mesmo tempo
    if (ageDays < 365) return false // < 12 meses
    const hasAnyBreast = gridEvents.some(
      (e) => e.id === 'breast_left' || e.id === 'breast_right' || e.id === 'breast_both',
    )
    if (!hasAnyBreast) return false
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const recentBreast = logs.filter(
      (l) =>
        (l.eventId === 'breast_left' || l.eventId === 'breast_right' || l.eventId === 'breast_both') &&
        l.timestamp >= thirtyDaysAgo,
    ).length
    return recentBreast === 0
  }, [baby, ageDays, gridEvents, logs, dismissedBreastCards, showBreastSimplify])

  // Memoizamos projections pra evitar o "piscar" durante renders sucessivos
  // (useTimer tickava a cada ~30s e recalculava sem cache, alternando com
  // o loading do useMedications).
  const projections = useMemo(() => {
    // Força recálculo quando o minuto muda (useTimer)
    void now
    return PROJECTION_CATEGORIES
      .map((cat) => getNextProjection(logs, cat, intervals, DEFAULT_EVENTS, { pauseDuringSleep, quietHours }))
      .filter(Boolean)
      .filter((p) => !dismissedProjections.has(p!.label))
  }, [logs, intervals, pauseDuringSleep, quietHours, dismissedProjections, now])

  if (loading) {
    return <TrackerSkeleton />
  }

  // Pré-natal: bebê ainda não nasceu → mostra countdown + dicas em vez da
  // tela normal de registros/projeções (não faz sentido registrar antes).
  if (baby && isPrenatal(baby.birthDate)) {
    return (
      <PrenatalView
        babyName={baby.name}
        gender={baby.gender}
        birthDate={baby.birthDate}
      />
    )
  }

  // Age-based highlights
  const band = baby?.birthDate ? getAgeBand(baby.birthDate) : 'beyond'
  const highlightedEventIds = getHighlightedEvents(band)

  return (
    <div className="pb-4 page-enter">
      <HeroIdentity streak={myRole !== 'caregiver' ? streak : undefined} />

      <ActivityGrid events={gridEvents} logs={logs} onLog={handleLog} highlightedEventIds={highlightedEventIds} />

      {/* Link discreto de personalização — alinhado à direita, abaixo do grid */}
      <div className="flex justify-end px-5 mt-1">
        <button
          onClick={() => { hapticLight(); setGridSettingsOpen(true) }}
          className="flex items-center gap-1 px-2 py-1 text-on-surface-variant/40 font-label text-[11px] active:text-on-surface-variant/70"
        >
          <span className="material-symbols-outlined text-[13px]">tune</span>
          <span>Personalizar</span>
        </button>
      </div>

      {/* Trilha de descoberta pós-onboarding — guia o usuário pelas features
          nos primeiros 14 dias. Grid permanece intocável e no topo. */}
      {baby && (
        <DiscoveryTrail
          babyId={baby.id}
          babyAgeWeeks={babyAgeWeeks}
          babyName={baby.name}
          babyGender={baby.gender}
          logsCount={logs.length}
          onStepAction={{
            record:     () => window.scrollTo({ top: 0, behavior: 'smooth' }),
            invite:     () => setShowFamilyInviteSheet(true),
            routine:    () => setShowRoutineIntro(true),
            insights:   () => setShowInsightsIntro('insights'),
            milestones: () => setShowInsightsIntro('milestones'),
            leaps:      () => setShowInsightsIntro('leaps'),
            yaia:       () => setShowYaIATrailSheet(true),
            report:     () => setShowReportIntro(true),
          }}
          onComplete={() => setShowTrailCompletion(true)}
        />
      )}

      {/* Card comemorativo 2 anos — aparece quando bebê completa 24 meses */}
      {ageDays >= 730 && !twoYearCardDismissed && baby && (
        <div className="mx-5 mt-3 rounded-md overflow-hidden border border-[#ffd77a]/30"
             style={{ background: 'linear-gradient(135deg, #1a1145 0%, #0d0a27 100%)' }}>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0 mt-0.5">🎂</span>
              <div className="flex-1 min-w-0">
                <p className="font-label text-sm font-bold text-white">
                  {baby.name} faz 2 anos!
                </p>
                <p className="font-body text-xs text-white/60 mt-0.5">
                  Dois anos de registros, marcos e cuidados. Veja o resumo especial da jornada.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => { hapticSuccess(); setTwoYearOpen(true) }}
                className="flex-1 py-2 rounded-md font-label text-xs font-bold flex items-center justify-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #b79fff, #ffd77a)', color: '#1a1145' }}
              >
                <span className="material-symbols-outlined text-sm">celebration</span>
                Ver resumo
              </button>
              <button
                onClick={() => {
                  hapticLight()
                  localStorage.setItem(`yaya_2yr_${baby.id}`, String(Date.now()))
                  setTwoYearCardDismissed(true)
                }}
                className="px-4 py-2 rounded-md border border-white/20 text-white/60 font-label text-xs"
              >
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards de sugestão de novos eventos — aparecem uma vez, nunca repetem */}
      {pendingSuggestions.map((ev) => (
        <div key={ev.id} className="mx-5 mt-3 bg-primary/8 border border-primary/20 rounded-md p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{ev.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-label text-sm font-semibold text-on-surface">
                Novo: {ev.label}
              </p>
              <p className="font-body text-xs text-on-surface-variant mt-0.5">
                {ev.id === 'meal'
                  ? `A ${baby?.name ?? 'bebê'} já está na fase de introdução alimentar! Quer adicionar Refeição ao painel?`
                  : ev.id === 'mood'
                  ? `Que tal registrar o humor de ${baby?.name ?? 'bebê'}? Adicionar ao painel?`
                  : ev.id === 'potty_pee'
                  ? `${baby?.name ?? 'Bebê'} já pode estar pronta(o) para o penico! Quer adicionar ao painel?`
                  : ev.id === 'potty_poop'
                  ? `Registrar cocô no penico junto com o xixi?`
                  : `Quer adicionar ${ev.label} ao painel?`}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { hapticSuccess(); acceptSuggestion(ev.id) }}
              className="flex-1 py-2 rounded-md bg-primary text-on-primary font-label text-xs font-semibold"
            >
              Adicionar
            </button>
            <button
              onClick={() => { hapticLight(); dismissSuggestion(ev.id) }}
              className="px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant font-label text-xs"
            >
              Agora não
            </button>
          </div>
        </div>
      ))}

      {/* 2.6: Simplificação de amamentação — frequência caiu, sugerir usar só "Ambos" */}
      {showBreastSimplify && baby && (
        <div className="mx-5 mt-3 bg-surface-container border border-outline-variant/30 rounded-md p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🤱</span>
            <div className="flex-1 min-w-0">
              <p className="font-label text-sm font-semibold text-on-surface">Amamentando menos agora?</p>
              <p className="font-body text-xs text-on-surface-variant mt-0.5">
                Nessa fase muitas mães usam só "Ambos os peitos" para registrar mais rápido.
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                hapticSuccess()
                toggleEvent('breast_left', false)
                toggleEvent('breast_right', false)
                toggleEvent('breast_both', true)
                localStorage.setItem(`yaya_bss_${baby.id}`, '1')
                setDismissedBreastCards((prev) => new Set([...prev, 'simplify']))
                setToast('Painel simplificado!')
              }}
              className="flex-1 py-2 rounded-md bg-surface-container-high border border-outline-variant text-on-surface font-label text-xs font-semibold"
            >
              Simplificar
            </button>
            <button
              onClick={() => {
                hapticLight()
                localStorage.setItem(`yaya_bss_${baby.id}`, '1')
                setDismissedBreastCards((prev) => new Set([...prev, 'simplify']))
              }}
              className="px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant font-label text-xs"
            >
              Manter
            </button>
          </div>
        </div>
      )}

      {/* 3.5: Sem amamentação há 30 dias — sugerir desabilitar */}
      {showBreastDisable && baby && (
        <div className="mx-5 mt-3 bg-surface-container border border-outline-variant/30 rounded-md p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">🤱</span>
            <div className="flex-1 min-w-0">
              <p className="font-label text-sm font-semibold text-on-surface">Desmame concluído?</p>
              <p className="font-body text-xs text-on-surface-variant mt-0.5">
                Não há registros de amamentação há mais de 30 dias. Quer remover do painel?
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                hapticSuccess()
                toggleEvent('breast_left', false)
                toggleEvent('breast_right', false)
                toggleEvent('breast_both', false)
                localStorage.setItem(`yaya_bsd_${baby.id}`, '1')
                setDismissedBreastCards((prev) => new Set([...prev, 'disable']))
                setToast('Botões de amamentação removidos!')
              }}
              className="flex-1 py-2 rounded-md bg-surface-container-high border border-outline-variant text-on-surface font-label text-xs font-semibold"
            >
              Remover
            </button>
            <button
              onClick={() => {
                hapticLight()
                localStorage.setItem(`yaya_bsd_${baby.id}`, '1')
                setDismissedBreastCards((prev) => new Set([...prev, 'disable']))
              }}
              className="px-4 py-2 rounded-md border border-outline-variant text-on-surface-variant font-label text-xs"
            >
              Manter
            </button>
          </div>
        </div>
      )}

      <OutOfHoursBanner />

      <div className="mt-4">
        <ResumoDoDiaButton />
      </div>

      {(projections.length > 0 || medicationProjections.length > 0) && (
        <section className="px-5 mt-6">
          <h2 className="font-headline text-base font-bold text-on-surface mb-3">
            Projeções
          </h2>
          <div className="space-y-2">
            {medicationProjections.map((mp) => (
              <MedicationProjectionCard
                key={`med-${mp.medication.id}-${mp.slotTime}`}
                projection={mp}
                onConfirm={handleMedicationConfirm}
              />
            ))}
            {projections.map((p) => (
              <PredictionCard key={p!.label} projection={p!} onDismiss={handleDismissProjection} />
            ))}
          </div>
        </section>
      )}

      {/* Rastreio de alérgenos — aparece a partir de 6 meses */}
      <AllergenPanel logs={logs} ageDays={ageDays} />

      {/* Painel de desfralde — aparece a partir de 18 meses quando há registros */}
      <PottyPanel logs={logs} ageDays={ageDays} gridEvents={gridEvents} />

      {/* Journey Carousel — saltos, marcos, vacinas + artigos do blog */}
      {baby && (can.viewLeaps(myRole) || can.viewMilestones(myRole)) && (
        <JourneyCarousel
          highlights={highlights}
          articles={contentArticles}
          babyName={baby.name}
          babyGender={baby.gender}
          birthDate={baby.birthDate}
          onChange={() => setHighlightsTick((t) => t + 1)}
          onDismissArticle={(slug) => dismissArticle(slug)}
        />
      )}

      {/* Nudge de descoberta contextual — aparece após os 14 dias da trilha
          quando o usuário ainda não explorou uma feature de valor relevante */}
      {discoveryNudge && (
        <DiscoveryNudgeCard
          nudge={discoveryNudge}
          onDismiss={() => dismissNudge(discoveryNudge.id)}
          onExplore={
            discoveryNudge.id === 'nudge_family' || discoveryNudge.id === 'nudge_family_remind'
              ? () => setShowFamilyInviteSheet(true)
              : undefined
          }
        />
      )}

      <RecentLogs
        items={recentItems}
        members={members}
        onEditLog={handleEditLog}
        onShiftClick={(s) => setDetailShift(s)}
        onVaccineClick={(v) => setTimelineVaccine(v)}
        onMilestoneClick={(m) => setTimelineMilestone(m)}
      />

      {bottleModalOpen && (
        <BottleModal
          onConfirm={handleBottleConfirm}
          onClose={() => setBottleModalOpen(false)}
        />
      )}

      {editingLog && (
        <EditModal
          log={editingLog}
          onSave={handleSaveLog}
          onDelete={handleDeleteLog}
          onClose={() => setEditingLog(null)}
          onAddBottle={() => { setEditingLog(null); setBottleModalOpen(true); }}
        />
      )}

      <RewardedAdModal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        onAdCompleted={grantBonusRecords}
        onUpgrade={() => setShowPaywall(true)}
        recordsToday={recordsToday}
        dailyLimit={dailyLimit}
      />

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="daily_limit"
      />

      {mealModalOpen && baby && (
        <MealModal
          babyName={baby.name}
          onConfirm={handleMealConfirm}
          onClose={() => setMealModalOpen(false)}
        />
      )}

      {editingMealLog && baby && (
        <MealModal
          babyName={baby.name}
          initialLog={editingMealLog}
          onConfirm={handleMealEditConfirm}
          onDelete={handleMealEditDelete}
          onClose={() => setEditingMealLog(null)}
        />
      )}

      {moodSheetOpen && baby && (
        <MoodSheet
          babyName={baby.name}
          onConfirm={handleMoodConfirm}
          onClose={() => setMoodSheetOpen(false)}
        />
      )}

      {sickModalOpen && baby && (
        <SickModal
          babyName={baby.name}
          onConfirm={handleSickConfirm}
          onClose={() => setSickModalOpen(false)}
        />
      )}

      {editingSickLog && baby && (
        <SickModal
          babyName={baby.name}
          initialLog={editingSickLog}
          onConfirm={handleSickEditConfirm}
          onDelete={handleSickEditDelete}
          onClose={() => setEditingSickLog(null)}
        />
      )}

      {baby && (
        <GridSettingsSheet
          babyId={baby.id}
          isOpen={gridSettingsOpen}
          onClose={() => setGridSettingsOpen(false)}
          gridEvents={gridEvents}
          onToggle={toggleEvent}
        />
      )}

      {twoYearOpen && baby && (
        <TwoYearSummaryModal
          baby={baby}
          logs={logs}
          milestoneCount={milestoneRecords.length}
          longestStreak={(streak as { longestStreak?: number } | null)?.longestStreak ?? 0}
          onClose={() => setTwoYearOpen(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {detailShift && (
        <ShiftDetailModal
          shift={detailShift}
          caregiverName={members[detailShift.caregiverId]?.displayName || 'Cuidador(a)'}
          onClose={() => setDetailShift(null)}
          onEdit={
            canEditShift(detailShift)
              ? () => {
                  const s = detailShift
                  setDetailShift(null)
                  // Abre o sheet de edição em um novo tick para evitar choque
                  // entre os dois useSheetBackClose (mesma técnica do VaccinesPage)
                  setTimeout(() => setEditingShift(s), 0)
                }
              : undefined
          }
        />
      )}

      {editingShift && baby && (
        <ResumoDoDiaSheet
          babyId={baby.id}
          babyName={baby.name}
          caregiverId={editingShift.caregiverId}
          onClose={() => setEditingShift(null)}
        />
      )}

      {timelineVaccine && (
        <VaccineLogEditModal
          vaccine={timelineVaccine}
          onClose={() => setTimelineVaccine(null)}
          onSave={async (_id, input) => {
            const res = await applyVaccine(
              timelineVaccine.vaccineCode,
              {
                date: input.appliedAt.toISOString(),
                location: input.location ?? undefined,
                batchNumber: input.batchNumber ?? undefined,
              },
              user?.id,
            )
            return res.ok
          }}
          onRemove={async () => {
            return await clearVaccineRecord(timelineVaccine.vaccineCode)
          }}
        />
      )}

      {timelineMilestone && (
        <MilestoneLogEditModal
          milestone={timelineMilestone}
          onClose={() => setTimelineMilestone(null)}
          onSave={async (_id, input) => {
            const result = await registerMilestone(
              timelineMilestone.milestoneCode,
              input.achievedAt.toISOString(),
              undefined,
              input.note ?? undefined,
              user?.id,
            )
            return !!result
          }}
          onRemove={async (id) => {
            return await deleteMilestone(id)
          }}
        />
      )}

      <FamilyInviteSheet
        isOpen={showFamilyInviteSheet}
        onClose={() => setShowFamilyInviteSheet(false)}
      />

      <TrailCompletionSheet
        isOpen={showTrailCompletion}
        babyName={baby?.name ?? ''}
        onClose={() => setShowTrailCompletion(false)}
      />

      <RoutineIntroSheet
        isOpen={showRoutineIntro}
        babyName={baby?.name ?? ''}
        babyGender={baby?.gender}
        onClose={() => setShowRoutineIntro(false)}
      />

      <InsightsIntroSheet
        isOpen={showInsightsIntro !== null}
        stepId={showInsightsIntro ?? 'insights'}
        babyName={baby?.name ?? ''}
        babyGender={baby?.gender}
        onClose={() => setShowInsightsIntro(null)}
      />

      <YaIATrailSheet
        isOpen={showYaIATrailSheet}
        babyName={baby?.name ?? ''}
        babyAgeWeeks={babyAgeWeeks}
        babyId={baby?.id ?? ''}
        babyGender={baby?.gender}
        onClose={() => setShowYaIATrailSheet(false)}
      />

      <ReportIntroSheet
        isOpen={showReportIntro}
        babyName={baby?.name ?? ''}
        babyGender={baby?.gender}
        onClose={() => setShowReportIntro(false)}
      />

      {/* ===== CELEBRATION MOMENTS ===== */}

      <FirstRecordSheet
        isOpen={showFirstRecord}
        babyName={baby?.name ?? ''}
        babyGender={baby?.gender}
        onClose={() => setShowFirstRecord(false)}
      />

      <MemberJoinedSheet
        isOpen={!!memberJoinNotif}
        memberName={memberJoinNotif?.memberName ?? ''}
        memberRole={memberJoinNotif?.memberRole ?? 'caregiver'}
        babyName={baby?.name ?? ''}
        babyGender={baby?.gender}
        onClose={clearMemberJoin}
      />
    </div>
  )
}
