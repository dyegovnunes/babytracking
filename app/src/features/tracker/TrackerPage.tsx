import { useState, useCallback, useMemo } from 'react'
import { useAppState, useAppDispatch, addLog, updateLog, deleteLog } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_EVENTS } from '../../lib/constants'
import { getNextProjection } from './projections'
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
import HighlightsStrip from './components/HighlightsStrip'
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
import type { LogEntry } from '../../types'
import { useContentArticles, ContentArticleCard } from '../content'

const PROJECTION_CATEGORIES: string[] = ['feed', 'diaper', 'sleep_nap', 'sleep_awake', 'bath']

export default function TrackerPage() {
  const { logs, intervals, baby, members, loading, pauseDuringSleep, quietHours, streak } = useAppState()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const myRole = useMyRole()
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
    limit: 1,
    utmMedium: 'home_card',
  })
  const contentArticle = contentArticles[0] ?? null

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

  const [bottleModalOpen, setBottleModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showAdModal, setShowAdModal] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const { checkAndRecord, recordsToday, dailyLimit, grantBonusRecords } = useDailyLimit()

  const handleLog = useCallback(
    async (eventId: string) => {
      if (!baby) return

      const event = DEFAULT_EVENTS.find((e) => e.id === eventId)
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

      const log = await addLog(dispatch, eventId, baby.id, undefined, user?.id)
      if (log) {
        hapticSuccess()
        setToast(`${event.label} registrado!`)
      }
    },
    [baby, dispatch, user, checkAndRecord],
  )

  const handleBottleConfirm = useCallback(
    async (ml: number) => {
      if (!baby) return
      setBottleModalOpen(false)
      const log = await addLog(dispatch, 'bottle', baby.id, ml, user?.id)
      if (log) {
        hapticSuccess()
        setToast(`Mamadeira ${ml}ml registrada!`)
      }
    },
    [baby, dispatch, user],
  )

  const handleEditLog = useCallback((log: LogEntry) => {
    hapticMedium()
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

      <ActivityGrid events={DEFAULT_EVENTS} logs={logs} onLog={handleLog} highlightedEventIds={highlightedEventIds} />

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

      {/* Acompanhe a jornada: saltos, marcos, (futuro) vacinas e remédios */}
      {baby && (can.viewLeaps(myRole) || can.viewMilestones(myRole)) && (
        <HighlightsStrip
          highlights={highlights}
          babyName={baby.name}
          babyGender={baby.gender}
          birthDate={baby.birthDate}
          onChange={() => setHighlightsTick((t) => t + 1)}
        />
      )}

      {/* Artigo contextual do blog — entre highlights e registros recentes */}
      {contentArticle && (
        <ContentArticleCard
          article={contentArticle}
          onDismiss={() => dismissArticle(contentArticle.slug)}
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
    </div>
  )
}
