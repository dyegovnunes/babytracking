import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { MedicationLog } from '../medications/medicationData'

interface MedicationLogRow {
  id: string
  medication_id: string
  baby_id: string
  administered_at: string
  administered_by: string | null
  notes: string | null
  created_at: string
  slot_time: string | null
}

function mapLog(row: MedicationLogRow): MedicationLog {
  return {
    id: row.id,
    medicationId: row.medication_id,
    babyId: row.baby_id,
    administeredAt: row.administered_at,
    administeredBy: row.administered_by,
    notes: row.notes,
    createdAt: row.created_at,
    slotTime: row.slot_time,
  }
}

/**
 * Carrega medication_logs do bebê em uma janela de tempo. Retorna logs
 * ordenados por `administered_at` desc.
 *
 * `sinceMs`: timestamp em ms (epoch). Se `undefined`, busca todos.
 *
 * Separado do `useMedications` (que só traz o dia atual) porque a
 * timeline/histórico precisa de janelas variáveis.
 */
export function useMedicationLogsRange(
  babyId: string | undefined,
  sinceMs?: number,
): { logs: MedicationLog[]; loading: boolean; reload: () => void } {
  const [logs, setLogs] = useState<MedicationLog[]>([])
  const [loading, setLoading] = useState(true)
  // Contador incrementado por callers pra forçar refetch (ex: após administrar
  // uma dose, TrackerPage chama reload pra a timeline atualizar na hora).
  const [reloadTick, setReloadTick] = useState(0)

  const reload = useCallback(() => setReloadTick((t) => t + 1), [])

  useEffect(() => {
    if (!babyId) {
      setLogs([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    let query = supabase
      .from('medication_logs')
      .select(
        'id, medication_id, baby_id, administered_at, administered_by, notes, created_at, slot_time',
      )
      .eq('baby_id', babyId)
      .order('administered_at', { ascending: false })

    if (sinceMs !== undefined) {
      query = query.gte('administered_at', new Date(sinceMs).toISOString())
    }

    query.then(({ data, error }) => {
      if (cancelled) return
      if (!error && data) {
        setLogs((data as unknown as MedicationLogRow[]).map(mapLog))
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [babyId, sinceMs, reloadTick])

  return { logs, loading, reload }
}
