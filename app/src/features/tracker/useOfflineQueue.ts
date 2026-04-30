import { useEffect, useCallback, useRef } from 'react'
import { addLog, type AppDispatch } from '../../contexts/AppContext'

/**
 * Mudar para false + redeploy desativa toda a feature de fila offline
 * sem quebrar nada — todos os guards são no-op.
 */
export const OFFLINE_QUEUE_ENABLED = true

export interface OfflineEntry {
  /** UUID temporário gerado localmente no momento do tap */
  id: string
  eventId: string
  babyId: string
  ml?: number
  userId?: string
  payload: Record<string, unknown>
  timestamp: number
}

const QUEUE_KEY = (babyId: string) => `yaya_offline_queue_${babyId}`

function loadQueue(babyId: string): OfflineEntry[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY(babyId)) ?? '[]')
  } catch {
    return []
  }
}

function saveQueue(babyId: string, entries: OfflineEntry[]) {
  try {
    localStorage.setItem(QUEUE_KEY(babyId), JSON.stringify(entries))
  } catch {
    // Storage cheio — silenciar
  }
}

export function useOfflineQueue(babyId: string | undefined, dispatch: AppDispatch) {
  const syncing = useRef(false)

  const flushQueue = useCallback(async () => {
    if (!OFFLINE_QUEUE_ENABLED || !babyId || syncing.current) return
    const queue = loadQueue(babyId)
    if (queue.length === 0) return
    syncing.current = true
    const failed: OfflineEntry[] = []
    for (const entry of queue) {
      try {
        // Remove a entry temporária do estado antes de inserir a real
        dispatch({ type: 'REMOVE_LOG', id: entry.id })
        await addLog(
          dispatch,
          entry.eventId,
          entry.babyId,
          entry.ml,
          entry.userId,
          { ...entry.payload, source: 'offline' },
          entry.timestamp,
        )
      } catch {
        failed.push(entry)
      }
    }
    saveQueue(babyId, failed)
    syncing.current = false
  }, [babyId, dispatch])

  // Flush quando voltar online
  useEffect(() => {
    window.addEventListener('online', flushQueue)
    return () => window.removeEventListener('online', flushQueue)
  }, [flushQueue])

  // Flush no mount se já online (abriu o app depois de voltar a ter internet)
  useEffect(() => {
    if (navigator.onLine) flushQueue()
  }, [flushQueue])

  /**
   * Enfileira uma entrada offline no localStorage e retorna o ID temporário.
   * Retorna null se a feature estiver desabilitada ou sem babyId.
   */
  const enqueue = useCallback(
    (entry: Omit<OfflineEntry, 'id'>): string | null => {
      if (!OFFLINE_QUEUE_ENABLED || !babyId) return null
      const full: OfflineEntry = { ...entry, id: crypto.randomUUID() }
      saveQueue(babyId, [...loadQueue(babyId), full])
      return full.id
    },
    [babyId],
  )

  return { enqueue, flushQueue }
}
