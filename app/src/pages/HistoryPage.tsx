import { useState, useCallback, useMemo } from 'react'
import { useAppState, useAppDispatch, updateLog, deleteLog } from '../contexts/AppContext'
import { DEFAULT_EVENTS } from '../lib/constants'
import type { EventCategory, LogEntry } from '../types'
import CategoryFilter from '../components/timeline/CategoryFilter'
import TimelineEntry from '../components/timeline/TimelineEntry'
import EditModal from '../components/ui/EditModal'
import Toast from '../components/ui/Toast'
import { HistorySkeleton } from '../components/ui/Skeleton'
import { hapticMedium } from '../lib/haptics'
import { usePremium } from '../hooks/usePremium'
import { PaywallModal } from '../components/ui/PaywallModal'
import { AdBanner } from '../components/ui/AdBanner'

const HISTORY_LIMIT_DAYS = 3

export default function HistoryPage() {
  const { logs, members, loading } = useAppState()
  const dispatch = useAppDispatch()
  const { isPremium } = usePremium()

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
    <div className="pb-4 page-enter">
      <section className="px-5 pt-6 pb-4">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
          Histórico
        </h1>
        <p className="font-label text-sm text-on-surface-variant">
          Timeline completa de registros
        </p>
      </section>

      <CategoryFilter selected={filter} onChange={setFilter} />

      <section className="px-5 mt-4 space-y-2">
        {visibleLogs.length === 0 ? (
          <p className="text-center text-on-surface-variant font-label text-sm py-12">
            {filter === 'all'
              ? 'Nenhum registro ainda.'
              : 'Nenhum registro nesta categoria.'}
          </p>
        ) : (
          visibleLogs.map((log) => (
            <TimelineEntry key={log.id} log={log} members={members} onEdit={handleEdit} />
          ))
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

      <AdBanner />
    </div>
  )
}
