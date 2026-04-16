import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * Agenda de trabalho de um caregiver específico em um bebê específico.
 *
 * RLS:
 * - Parents do bebê têm ALL (upsert/read/delete).
 * - Caregivers (auth.uid() = caregiver_id) têm SELECT apenas no próprio registro.
 *
 * O mesmo hook funciona tanto na tela do parent (editando a agenda do caregiver)
 * quanto na tela do próprio caregiver (lendo a própria agenda).
 */
export interface CaregiverSchedule {
  id: string
  babyId: string
  caregiverId: string
  workStartTime: string // 'HH:MM' (24h)
  workEndTime: string   // 'HH:MM'
  workdays: number[]    // 0=Dom..6=Sáb (getDay())
  instructions: string | null
}

interface SaveInput {
  workStartTime: string
  workEndTime: string
  workdays: number[]
  instructions: string | null
}

interface WorkWindowOptions {
  /** minutos antes do workStartTime em que já consideramos "dentro da janela". Default 0. */
  startOffsetMin?: number
  /** minutos depois do workEndTime em que ainda consideramos "dentro da janela". Default 0. */
  endOffsetMin?: number
  /** data "agora". Default new Date(). Útil para testes. */
  now?: Date
}

/** 'HH:MM' → minutos desde 00:00. Retorna null se inválido. */
function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null
  const [h, m] = value.split(':').map((p) => parseInt(p, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

/**
 * Retorna true se `now` está dentro da janela de trabalho descrita no schedule,
 * considerando as tolerâncias opcionais.
 *
 * - workdays vazio → sempre false (interpretação conservadora)
 * - Se schedule for null/undefined → sempre false.
 */
export function isInWorkWindow(
  schedule: CaregiverSchedule | null | undefined,
  options: WorkWindowOptions = {},
): boolean {
  if (!schedule) return false
  const now = options.now ?? new Date()
  const day = now.getDay()
  if (!schedule.workdays.includes(day)) return false

  const startMin = parseTimeToMinutes(schedule.workStartTime)
  const endMin = parseTimeToMinutes(schedule.workEndTime)
  if (startMin == null || endMin == null) return false

  const nowMin = now.getHours() * 60 + now.getMinutes()
  const lower = startMin - (options.startOffsetMin ?? 0)
  const upper = endMin + (options.endOffsetMin ?? 0)
  // Janela simples sem wraparound (não precisamos ainda — turno noturno fica para `caregiver_sessions`).
  return nowMin >= lower && nowMin <= upper
}

function mapRow(row: {
  id: string
  baby_id: string
  caregiver_id: string
  work_start_time: string
  work_end_time: string
  workdays: number[] | null
  instructions: string | null
}): CaregiverSchedule {
  // Postgres retorna TIME como 'HH:MM:SS'. Normalizamos para 'HH:MM'.
  const start = (row.work_start_time ?? '08:00').slice(0, 5)
  const end = (row.work_end_time ?? '18:00').slice(0, 5)
  return {
    id: row.id,
    babyId: row.baby_id,
    caregiverId: row.caregiver_id,
    workStartTime: start,
    workEndTime: end,
    workdays: row.workdays ?? [1, 2, 3, 4, 5],
    instructions: row.instructions ?? null,
  }
}

export function useCaregiverSchedule(babyId: string | undefined, caregiverId: string | undefined) {
  const [schedule, setSchedule] = useState<CaregiverSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!babyId || !caregiverId) {
      setSchedule(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('caregiver_schedules')
      .select('id, baby_id, caregiver_id, work_start_time, work_end_time, workdays, instructions')
      .eq('baby_id', babyId)
      .eq('caregiver_id', caregiverId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setSchedule(null)
        } else {
          setSchedule(mapRow(data))
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [babyId, caregiverId, reloadKey])

  const saveSchedule = useCallback(
    async (input: SaveInput): Promise<boolean> => {
      if (!babyId || !caregiverId) return false
      const payload = {
        baby_id: babyId,
        caregiver_id: caregiverId,
        work_start_time: input.workStartTime,
        work_end_time: input.workEndTime,
        workdays: input.workdays,
        instructions: input.instructions && input.instructions.trim() ? input.instructions.trim() : null,
      }
      // Upsert pelo UNIQUE(baby_id, caregiver_id). Encadeamos .select() para detectar RLS silencioso.
      const { data, error } = await supabase
        .from('caregiver_schedules')
        .upsert(payload, { onConflict: 'baby_id,caregiver_id' })
        .select('id, baby_id, caregiver_id, work_start_time, work_end_time, workdays, instructions')
      if (error || !data || data.length === 0) {
        return false
      }
      setSchedule(mapRow(data[0]))
      return true
    },
    [babyId, caregiverId],
  )

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { schedule, loading, saveSchedule, reload }
}
