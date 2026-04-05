import { useState, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import { useAppState, useAppDispatch, updateLog, deleteLog } from '../contexts/AppContext'
import { DEFAULT_EVENTS } from '../lib/constants'
import type { EventCategory, LogEntry } from '../types'
import CategoryFilter from '../components/timeline/CategoryFilter'
import TimelineEntry from '../components/timeline/TimelineEntry'
import EditModal from '../components/ui/EditModal'
import Toast from '../components/ui/Toast'
import { hapticMedium } from '../lib/haptics'

export default function HistoryScreen() {
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
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#b79fff" size="large" />
      </View>
    )
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="px-5 pt-6 pb-4">
          <Text className="font-headline text-2xl font-bold text-on-surface mb-1">
            Histórico
          </Text>
          <Text className="font-label text-sm text-on-surface-variant">
            Timeline completa de registros
          </Text>
        </View>

        <CategoryFilter selected={filter} onChange={setFilter} />

        <View className="px-5 mt-4 gap-2">
          {filtered.length === 0 ? (
            <Text className="text-center text-on-surface-variant font-label text-sm py-12">
              {filter === 'all'
                ? 'Nenhum registro ainda.'
                : 'Nenhum registro nesta categoria.'}
            </Text>
          ) : (
            filtered.map((log) => (
              <TimelineEntry key={log.id} log={log} members={members} onEdit={handleEdit} />
            ))
          )}
        </View>
      </ScrollView>

      {editingLog && (
        <EditModal
          log={editingLog}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setEditingLog(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </View>
  )
}
