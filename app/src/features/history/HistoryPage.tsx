import { useState, useCallback, useMemo, Fragment } from 'react'
import { useAppState, useAppDispatch, updateLog, deleteLog } from '../../contexts/AppContext'
import type { LogEntry } from '../../types'
import CategoryFilter from './components/CategoryFilter'
import {
  useTimeline,
  useMedicationLogsRange,
  matchesFilter,
  TimelineRow,
} from '../timeline'
import type { TimelineFilter, TimelineItem } from '../timeline/types'
import EditModal from '../../components/ui/EditModal'
import Toast from '../../components/ui/Toast'
import { HistorySkeleton } from '../../components/ui/Skeleton'
import { hapticMedium } from '../../lib/haptics'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { useShiftsForBaby, type CaregiverShift } from '../tracker/useCaregiverShift'
import ShiftDetailModal from '../tracker/components/ShiftDetailModal'
import ResumoDoDiaSheet from '../tracker/components/ResumoDoDiaSheet'
import { useAuth } from '../../contexts/AuthContext'
import { useMyRole } from '../../hooks/useMyRole'
import { useCaregiverSchedule, isInWorkWindow } from '../profile/useCaregiverSchedule'
import { useVaccines } from '../vaccines'
import { useMilestones } from '../milestones'
import { useMedications } from '../medications'
import VaccineLogEditModal from '../vaccines/components/VaccineLogEditModal'
import MilestoneLogEditModal from '../milestones/components/MilestoneLogEditModal'
import type { BabyVaccine } from '../vaccines/vaccineData'
import type { BabyMilestone } from '../milestones/milestoneData'

// Free: hoje e ontem apenas (2 dias)
const HISTORY_LIMIT_DAYS = 2

const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

function getDayKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getDayLabel(dayKey: string): string {
  const today = new Date()
  const todayKey = getDayKey(today.getTime())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = getDayKey(yesterday.getTime())

  if (dayKey === todayKey) return 'Hoje'
  if (dayKey === yesterdayKey) return 'Ontem'

  const [, month, day] = dayKey.split('-')
  return `${parseInt(day)} de ${MONTHS_PT[parseInt(month) - 1]}`
}

function groupByDay(items: TimelineItem[]): { dayKey: string; label: string; items: TimelineItem[] }[] {
  const groups = new Map<string, TimelineItem[]>()
  for (const it of items) {
    const key = getDayKey(it.ts)
    const arr = groups.get(key)
    if (arr) arr.push(it)
    else groups.set(key, [it])
  }
  return Array.from(groups.entries()).map(([dayKey, dayItems]) => ({
    dayKey,
    label: getDayLabel(dayKey),
    items: dayItems,
  }))
}

export default function HistoryPage() {
  const { logs, members, loading, baby } = useAppState()
  const dispatch = useAppDispatch()
  const { user } = useAuth()
  const myRole = useMyRole()
  const isPremium = useBabyPremium()
  const { shifts } = useShiftsForBaby(baby?.id)
  const [detailShift, setDetailShift] = useState<CaregiverShift | null>(null)
  const [editingShift, setEditingShift] = useState<CaregiverShift | null>(null)

  // Schedule do próprio usuário (pra saber se pode editar o próprio shift)
  const { schedule: myCaregiverSchedule } = useCaregiverSchedule(
    myRole === 'caregiver' ? baby?.id : undefined,
    myRole === 'caregiver' ? user?.id : undefined,
  )

  const canEditShift = (shift: CaregiverShift): boolean => {
    if (!user || user.id !== shift.caregiverId) return false
    if (!myCaregiverSchedule) return false
    return isInWorkWindow(myCaregiverSchedule, { startOffsetMin: -45, endOffsetMin: 60 })
  }

  // Data sources extras pra timeline unificada
  const {
    records: vaccineRecords,
    applyVaccine,
    clearRecord: clearVaccineRecord,
  } = useVaccines(baby?.id, baby?.birthDate)
  const {
    achieved: milestoneRecords,
    registerMilestone,
    deleteMilestone,
  } = useMilestones(baby?.id, baby?.birthDate)
  const memberMapForMeds = useMemo(() => {
    const map: Record<string, string> = {}
    for (const [uid, m] of Object.entries(members)) map[uid] = m.displayName
    return map
  }, [members])
  const { activeMedications, archivedMedications } = useMedications(
    baby?.id,
    memberMapForMeds,
  )
  const allMedications = useMemo(
    () => [...activeMedications, ...archivedMedications],
    [activeMedications, archivedMedications],
  )

  // Medication logs — free limit (2 dias) ou tudo pra premium
  const sinceMs = useMemo(() => {
    if (isPremium) return undefined
    return Date.now() - HISTORY_LIMIT_DAYS * 24 * 60 * 60 * 1000
  }, [isPremium])
  const { logs: medicationLogs } = useMedicationLogsRange(baby?.id, sinceMs)

  const [filter, setFilter] = useState<TimelineFilter>('all')
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [timelineVaccine, setTimelineVaccine] = useState<BabyVaccine | null>(null)
  const [timelineMilestone, setTimelineMilestone] = useState<BabyMilestone | null>(null)

  const cutoffDate = useMemo(
    () => isPremium ? null : Date.now() - HISTORY_LIMIT_DAYS * 24 * 60 * 60 * 1000,
    [isPremium]
  )

  // Agrega tudo em TimelineItem[]
  const timelineInputs = useMemo(
    () => ({
      logs,
      shifts,
      vaccines: vaccineRecords,
      milestones: milestoneRecords,
      medicationLogs,
      medications: allMedications,
    }),
    [logs, shifts, vaccineRecords, milestoneRecords, medicationLogs, allMedications],
  )
  const { items: allItems } = useTimeline(timelineInputs)

  // Aplica cutoff de 2 dias pra free + filtro de categoria
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (cutoffDate !== null && item.ts < cutoffDate) return false
      return matchesFilter(item, filter)
    })
  }, [allItems, cutoffDate, filter])

  const hasOlderItems = cutoffDate !== null && allItems.some((i) => i.ts < cutoffDate)

  const grouped = useMemo(() => groupByDay(filteredItems), [filteredItems])

  const handleEditLog = useCallback((log: LogEntry) => {
    hapticMedium()
    setEditingLog(log)
  }, [])

  const handleSave = useCallback(
    async (log: LogEntry) => {
      const ok = await updateLog(dispatch, log)
      setEditingLog(null)
      if (ok) setToast('Registro atualizado!')
    },
    [dispatch],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deleteLog(dispatch, id)
      setEditingLog(null)
      if (ok) setToast('Registro excluído!')
    },
    [dispatch],
  )

  if (loading) {
    return <HistorySkeleton />
  }

  return (
    <div className="pb-4 page-enter flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-surface">
        <section className="px-5 pt-6 pb-4">
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
            Histórico
          </h1>
          <p className="font-label text-sm text-on-surface-variant">
            Timeline completa de registros
          </p>
        </section>

        <CategoryFilter selected={filter} onChange={setFilter} />
      </div>

      <section className="px-5 mt-4 space-y-2 flex-1 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <p className="text-center text-on-surface-variant font-label text-sm py-12">
            {filter === 'all'
              ? 'Nenhum registro ainda.'
              : 'Nenhum registro nesta categoria.'}
          </p>
        ) : (
          grouped.map((group) => (
            <Fragment key={group.dayKey}>
              <div className="flex items-center gap-3 pt-3 pb-1 first:pt-0">
                <span className="font-headline text-xs font-semibold uppercase tracking-wider text-primary">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-primary/20" />
              </div>
              {group.items.map((item) => (
                <TimelineRow
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  members={members}
                  onEditLog={handleEditLog}
                  onShiftClick={(s) => setDetailShift(s)}
                  onVaccineClick={(v) => setTimelineVaccine(v)}
                  onMilestoneClick={(m) => setTimelineMilestone(m)}
                />
              ))}
            </Fragment>
          ))
        )}

        {hasOlderItems && (
          <button
            onClick={() => setShowPaywall(true)}
            className="w-full py-4 mt-2 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center gap-2 active:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-xl">lock</span>
            <span className="text-primary font-label font-semibold text-sm">
              Ver histórico completo com Yaya+
            </span>
          </button>
        )}
      </section>

      {editingLog && (
        <EditModal
          log={editingLog}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingLog(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="history"
      />

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
