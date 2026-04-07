import { useState, useCallback } from 'react'
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
import FollowUpBar from '../components/ui/FollowUpBar'
import { TrackerSkeleton } from '../components/ui/Skeleton'
import type { LogEntry } from '../types'

const PROJECTION_CATEGORIES: string[] = ['feed', 'diaper', 'sleep_nap', 'sleep_awake', 'bath']

export default function TrackerPage() {
  const { logs, intervals, baby, members, loading, pauseDuringSleep, quietHours } = useAppState()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const now = useTimer()

  const [bottleModalOpen, setBottleModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [followUp, setFollowUp] = useState<{ logId: string; eventId: 'breast_left' | 'breast_right' } | null>(null)

  const handleLog = useCallback(
    async (eventId: string) => {
      if (!baby) return

      const event = DEFAULT_EVENTS.find((e) => e.id === eventId)
      if (!event) return

      if (event.hasAmount) {
        hapticLight()
        setBottleModalOpen(true)
        return
      }

      const log = await addLog(dispatch, eventId, baby.id, undefined, user?.id)
      if (log) {
        hapticSuccess()
        setToast(`${event.label} registrado!`)
        if (eventId === 'breast_left' || eventId === 'breast_right') {
          setFollowUp({ logId: log.id, eventId })
        }
      }
    },
    [baby, dispatch, user],
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

  const handleChangeToBoth = useCallback(
    async (logId: string) => {
      const logEntry = logs.find(l => l.id === logId)
      if (!logEntry) return
      const ok = await updateLog(dispatch, { ...logEntry, eventId: 'breast_both' })
      setFollowUp(null)
      if (ok) {
        hapticSuccess()
        setToast('Alterado para Ambos os lados!')
      }
    },
    [logs, dispatch],
  )

  const handleFollowUpBottle = useCallback(() => {
    setFollowUp(null)
    hapticLight()
    setBottleModalOpen(true)
  }, [])

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

  return (
    <div className="pb-4 page-enter">
      <HeroIdentity />

      <ActivityGrid events={DEFAULT_EVENTS} logs={logs} onLog={handleLog} />

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
        />
      )}

      {followUp && (
        <FollowUpBar
          logId={followUp.logId}
          originalEventId={followUp.eventId}
          onChangeToBoth={handleChangeToBoth}
          onAddBottle={handleFollowUpBottle}
          onDismiss={() => setFollowUp(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
