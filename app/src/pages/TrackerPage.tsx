import { useState, useCallback, useMemo } from 'react'
import { useAppState, useAppDispatch, addLog, updateLog, deleteLog } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { DEFAULT_EVENTS } from '../lib/constants'
import { getNextProjection } from '../lib/projections'
import { useTimer } from '../hooks/useTimer'
import { hapticSuccess, hapticLight, hapticMedium } from '../lib/haptics'
import HeroIdentity from '../components/activity/HeroIdentity'
import ActivityGrid from '../components/activity/ActivityGrid'
import PredictionCard from '../components/activity/PredictionCard'
import RecentLogs from '../components/activity/RecentLogs'
import BottleModal from '../components/ui/BottleModal'
import EditModal from '../components/ui/EditModal'
import Toast from '../components/ui/Toast'
import { RewardedAdModal } from '../components/ui/RewardedAdModal'
import { PaywallModal } from '../components/ui/PaywallModal'
import { useDailyLimit } from '../hooks/useDailyLimit'
import HighlightsStrip from '../components/home/HighlightsStrip'
import { collectHighlights } from '../lib/highlights'
import { AdBanner } from '../components/ui/AdBanner'
import { getAgeBand, getHighlightedEvents } from '../lib/ageUtils'
import { useMilestones } from '../hooks/useMilestones'

import { TrackerSkeleton } from '../components/ui/Skeleton'
import type { LogEntry } from '../types'

const PROJECTION_CATEGORIES: string[] = ['feed', 'diaper', 'sleep_nap', 'sleep_awake', 'bath']

export default function TrackerPage() {
  const { logs, intervals, baby, members, loading, pauseDuringSleep, quietHours, streak } = useAppState()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const now = useTimer()

  // Milestones (home card)
  const { achievedCodes, ageDays } = useMilestones(baby?.id, baby?.birthDate)

  // Highlights strip (saltos + marcos + futuro: vacinas/remédios)
  const [highlightsTick, setHighlightsTick] = useState(0)
  const highlights = useMemo(
    () =>
      collectHighlights({
        birthDate: baby?.birthDate,
        achievedCodes,
        ageDays,
        reactivityTick: highlightsTick,
      }),
    [baby?.birthDate, achievedCodes, ageDays, highlightsTick],
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

  // Force re-render of projections with timer
  void now

  const projections = PROJECTION_CATEGORIES
    .map((cat) => getNextProjection(logs, cat, intervals, DEFAULT_EVENTS, { pauseDuringSleep, quietHours }))
    .filter(Boolean)
    .filter(p => !dismissedProjections.has(p!.label))

  if (loading) {
    return <TrackerSkeleton />
  }

  // Age-based highlights
  const band = baby?.birthDate ? getAgeBand(baby.birthDate) : 'beyond'
  const highlightedEventIds = getHighlightedEvents(band)

  return (
    <div className="pb-4 page-enter">
      <HeroIdentity streak={streak} />

      <ActivityGrid events={DEFAULT_EVENTS} logs={logs} onLog={handleLog} highlightedEventIds={highlightedEventIds} />

      {projections.length > 0 && (
        <section className="px-5 mt-6">
          <h2 className="font-headline text-base font-bold text-on-surface mb-3">
            Projeções
          </h2>
          <div className="space-y-2">
            {projections.map((p) => (
              <PredictionCard key={p!.label} projection={p!} onDismiss={handleDismissProjection} />
            ))}
          </div>
        </section>
      )}

      {/* Acompanhe a jornada: saltos, marcos, (futuro) vacinas e remédios */}
      {baby && (
        <HighlightsStrip
          highlights={highlights}
          babyName={baby.name}
          babyGender={baby.gender}
          birthDate={baby.birthDate}
          onChange={() => setHighlightsTick((t) => t + 1)}
        />
      )}

      <AdBanner />

      <RecentLogs logs={logs} members={members} onEdit={handleEditLog} />

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
    </div>
  )
}
