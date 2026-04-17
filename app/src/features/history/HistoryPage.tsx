import { useState, useCallback, useMemo, Fragment } from 'react'
import { useAppState, useAppDispatch, updateLog, deleteLog } from '../../contexts/AppContext'
import { DEFAULT_EVENTS } from '../../lib/constants'
import type { EventCategory, LogEntry } from '../../types'
import CategoryFilter from './components/CategoryFilter'
import TimelineEntry from './components/TimelineEntry'
import ShiftSummaryRow from './components/ShiftSummaryRow'
import EditModal from '../../components/ui/EditModal'
import Toast from '../../components/ui/Toast'
import { HistorySkeleton } from '../../components/ui/Skeleton'
import { hapticMedium } from '../../lib/haptics'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { useShiftsForBaby } from '../tracker/useCaregiverShift'

// Free: hoje e ontem apenas (2 dias = HOJE + DIA ANTERIOR)
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

/** Threshold in ms to consider two breast logs as a single "both" session */
const BOTH_BREASTS_THRESHOLD = 30 * 60 * 1000

/**
 * Detects breast_left + breast_right pairs within 30 min and returns
 * a map from log id to its paired log. The "secondary" log (later one)
 * is added to the hidden set so it won't render separately.
 */
function detectBreastPairs(logs: LogEntry[]): { pairs: Map<string, LogEntry>; hidden: Set<string> } {
  const pairs = new Map<string, LogEntry>()
  const hidden = new Set<string>()
  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp)

  const leftLogs = sorted.filter((l) => l.eventId === 'breast_left')
  const rightLogs = sorted.filter((l) => l.eventId === 'breast_right')

  const usedRight = new Set<string>()

  for (const left of leftLogs) {
    for (const right of rightLogs) {
      if (usedRight.has(right.id)) continue
      const diff = Math.abs(left.timestamp - right.timestamp)
      if (diff <= BOTH_BREASTS_THRESHOLD) {
        // The earlier log becomes the primary, the later one is hidden
        const primary = left.timestamp <= right.timestamp ? left : right
        const secondary = primary === left ? right : left
        pairs.set(primary.id, secondary)
        hidden.add(secondary.id)
        usedRight.add(right.id)
        break
      }
    }
  }

  return { pairs, hidden }
}

function groupByDay(logs: LogEntry[]): { dayKey: string; label: string; logs: LogEntry[] }[] {
  const groups: Map<string, LogEntry[]> = new Map()
  for (const log of logs) {
    const key = getDayKey(log.timestamp)
    const arr = groups.get(key)
    if (arr) arr.push(log)
    else groups.set(key, [log])
  }
  return Array.from(groups.entries()).map(([dayKey, dayLogs]) => ({
    dayKey,
    label: getDayLabel(dayKey),
    logs: dayLogs,
  }))
}

export default function HistoryPage() {
  const { logs, members, loading, baby } = useAppState()
  const dispatch = useAppDispatch()
  const isPremium = useBabyPremium()
  const { shifts } = useShiftsForBaby(baby?.id)

  // Agrupa shifts por shift_date (YYYY-MM-DD) para render intercalado com logs
  const shiftsByDay = useMemo(() => {
    const m = new Map<string, typeof shifts>()
    for (const s of shifts) {
      const arr = m.get(s.shiftDate) ?? []
      arr.push(s)
      m.set(s.shiftDate, arr)
    }
    return m
  }, [shifts])

  const [filter, setFilter] = useState<EventCategory | 'all'>('all')
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)

  const cutoffDate = useMemo(
    () => isPremium ? null : Date.now() - HISTORY_LIMIT_DAYS * 24 * 60 * 60 * 1000,
    [isPremium]
  )

  const filtered = [...logs]
    .filter((log) => {
      if (filter === 'all') return true
      const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
      return event?.category === filter
    })
    .sort((a, b) => b.timestamp - a.timestamp)

  const visibleLogs = cutoffDate
    ? filtered.filter((log) => log.timestamp >= cutoffDate)
    : filtered

  const hasOlderLogs = cutoffDate
    ? filtered.some((log) => log.timestamp < cutoffDate)
    : false

  const { pairs: breastPairs, hidden: hiddenLogs } = useMemo(
    () => detectBreastPairs(visibleLogs),
    [visibleLogs],
  )

  const displayLogs = useMemo(
    () => visibleLogs.filter((l) => !hiddenLogs.has(l.id)),
    [visibleLogs, hiddenLogs],
  )

  const groupedLogs = useMemo(() => groupByDay(displayLogs), [displayLogs])

  const handleEdit = useCallback((log: LogEntry) => {
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
        {displayLogs.length === 0 ? (
          <p className="text-center text-on-surface-variant font-label text-sm py-12">
            {filter === 'all'
              ? 'Nenhum registro ainda.'
              : 'Nenhum registro nesta categoria.'}
          </p>
        ) : (
          groupedLogs.map((group) => {
            const dayShifts = shiftsByDay.get(group.dayKey) ?? []
            return (
              <Fragment key={group.dayKey}>
                <div className="flex items-center gap-3 pt-3 pb-1 first:pt-0">
                  <span className="font-headline text-xs font-semibold uppercase tracking-wider text-primary">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-primary/20" />
                </div>
                {dayShifts.map((s) => (
                  <ShiftSummaryRow
                    key={s.id}
                    shift={s}
                    caregiverName={members[s.caregiverId]?.displayName || 'Cuidador(a)'}
                  />
                ))}
                {group.logs.map((log) => (
                  <TimelineEntry
                    key={log.id}
                    log={log}
                    members={members}
                    onEdit={handleEdit}
                    pairedLog={breastPairs.get(log.id)}
                  />
                ))}
              </Fragment>
            )
          })
        )}

        {hasOlderLogs && (
          <button
            onClick={() => setShowPaywall(true)}
            className="w-full py-4 mt-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center gap-2 active:bg-primary/20 transition-colors"
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
    </div>
  )
}
