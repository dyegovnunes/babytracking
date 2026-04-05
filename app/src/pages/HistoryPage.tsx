import { useState, useCallback } from 'react'
import { useAppState, useAppDispatch, updateLog, deleteLog } from '../contexts/AppContext'
import { DEFAULT_EVENTS } from '../lib/constants'
import type { EventCategory, LogEntry } from '../types'
import CategoryFilter from '../components/timeline/CategoryFilter'
import TimelineEntry from '../components/timeline/TimelineEntry'
import EditModal from '../components/ui/EditModal'
import Toast from '../components/ui/Toast'
import { HistorySkeleton } from '../components/ui/Skeleton'
import { hapticMedium } from '../lib/haptics'

export default function HistoryPage() {
  const { logs, members, loading } = useAppState()
  const dispatch = useAppDispatch()

  const [filter, setFilter] = useState<EventCategory | 'all'>('all')
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const filtered = [...logs]
    .filter((log) => {
      if (filter === 'all') return true
      const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
      return event?.category === filter
    })
    .sort((a, b) => b.timestamp - a.timestamp)

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
        {filtered.length === 0 ? (
          <p className="text-center text-on-surface-variant font-label text-sm py-12">
            {filter === 'all'
              ? 'Nenhum registro ainda.'
              : 'Nenhum registro nesta categoria.'}
          </p>
        ) : (
          filtered.map((log) => (
            <TimelineEntry key={log.id} log={log} members={members} onEdit={handleEdit} />
          ))
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
    </div>
  )
}
