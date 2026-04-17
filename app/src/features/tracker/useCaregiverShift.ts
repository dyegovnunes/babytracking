import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getLocalDateString } from '../../lib/formatters'

/** 1 = ruim, 2 = médio, 3 = bom. null = não respondeu. */
export type ShiftScore = 1 | 2 | 3 | null

export interface CaregiverShift {
  id: string
  babyId: string
  caregiverId: string
  shiftDate: string // YYYY-MM-DD
  moodScore: number | null
  ateScore: ShiftScore
  sleptScore: ShiftScore
  note: string | null
  quickNotes: string[]
  submittedAt: string | null // ISO
  createdAt: string
}

interface SubmitInput {
  moodScore?: number | null
  ateScore?: ShiftScore
  sleptScore?: ShiftScore
  note?: string | null
}

const SHIFT_COLUMNS =
  'id, baby_id, caregiver_id, shift_date, mood_score, ate_score, slept_score, note, quick_notes, submitted_at, created_at'

function toScore(value: number | null | undefined): ShiftScore {
  if (value === 1 || value === 2 || value === 3) return value
  return null
}

function mapRow(row: {
  id: string
  baby_id: string
  caregiver_id: string
  shift_date: string
  mood_score: number | null
  ate_score: number | null
  slept_score: number | null
  note: string | null
  quick_notes: string[] | null
  submitted_at: string | null
  created_at: string
}): CaregiverShift {
  return {
    id: row.id,
    babyId: row.baby_id,
    caregiverId: row.caregiver_id,
    shiftDate: row.shift_date,
    moodScore: row.mood_score,
    ateScore: toScore(row.ate_score),
    sleptScore: toScore(row.slept_score),
    note: row.note,
    quickNotes: row.quick_notes ?? [],
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
  }
}

/**
 * Shift (resumo) diário do caregiver para um bebê.
 * Um caregiver tem no máximo 1 shift por dia por bebê (UNIQUE).
 *
 * Uso normal: o próprio caregiver consulta / escreve o próprio shift.
 * Parents/guardians podem ler (RLS permite SELECT), mas não escrever.
 */
export function useCaregiverShift(
  babyId: string | undefined,
  caregiverId: string | undefined,
  date: string = getLocalDateString(),
) {
  const [shift, setShift] = useState<CaregiverShift | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!babyId || !caregiverId) {
      setShift(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('caregiver_shifts')
      .select(SHIFT_COLUMNS)
      .eq('baby_id', babyId)
      .eq('caregiver_id', caregiverId)
      .eq('shift_date', date)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data) {
          setShift(null)
        } else {
          setShift(mapRow(data))
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [babyId, caregiverId, date, reloadKey])

  const hasSubmittedToday = useMemo(() => !!shift?.submittedAt, [shift])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  const submitResume = useCallback(
    async (input: SubmitInput): Promise<CaregiverShift | null> => {
      if (!babyId || !caregiverId) return null
      const payload = {
        baby_id: babyId,
        caregiver_id: caregiverId,
        shift_date: date,
        mood_score: input.moodScore ?? null,
        ate_score: input.ateScore ?? null,
        slept_score: input.sleptScore ?? null,
        note: input.note?.trim() ? input.note.trim() : null,
        submitted_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from('caregiver_shifts')
        .upsert(payload, { onConflict: 'baby_id,caregiver_id,shift_date' })
        .select(SHIFT_COLUMNS)
      if (error || !data || data.length === 0) return null
      const row = mapRow(data[0])
      setShift(row)
      return row
    },
    [babyId, caregiverId, date],
  )

  const addQuickNote = useCallback(
    async (text: string): Promise<boolean> => {
      if (!babyId || !caregiverId) return false
      const trimmed = text.trim()
      if (!trimmed) return false
      const existing = shift?.quickNotes ?? []
      const payload = {
        baby_id: babyId,
        caregiver_id: caregiverId,
        shift_date: date,
        quick_notes: [...existing, trimmed],
      }
      const { data, error } = await supabase
        .from('caregiver_shifts')
        .upsert(payload, { onConflict: 'baby_id,caregiver_id,shift_date' })
        .select(SHIFT_COLUMNS)
      if (error || !data || data.length === 0) return false
      setShift(mapRow(data[0]))
      return true
    },
    [babyId, caregiverId, date, shift],
  )

  return { shift, loading, hasSubmittedToday, submitResume, addQuickNote, reload }
}

/**
 * Busca shifts dentro de um intervalo de datas para um bebê.
 * Usado pelo HistoryPage pra exibir a linha de resumo por dia.
 */
export function useShiftsForBaby(babyId: string | undefined, fromDate?: string, toDate?: string) {
  const [shifts, setShifts] = useState<CaregiverShift[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!babyId) {
      setShifts([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    let query = supabase
      .from('caregiver_shifts')
      .select(SHIFT_COLUMNS)
      .eq('baby_id', babyId)
      .not('submitted_at', 'is', null)
      .order('shift_date', { ascending: false })

    if (fromDate) query = query.gte('shift_date', fromDate)
    if (toDate) query = query.lte('shift_date', toDate)

    query.then(({ data, error }) => {
      if (cancelled) return
      if (error || !data) {
        setShifts([])
      } else {
        setShifts(data.map(mapRow))
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [babyId, fromDate, toDate])

  return { shifts, loading }
}
