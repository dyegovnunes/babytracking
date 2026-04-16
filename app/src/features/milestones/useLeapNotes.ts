import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface LeapNote {
  id: string
  leapId: number
  note: string
  updatedAt: string
}

interface LeapNoteRow {
  id: string
  baby_id: string
  leap_id: number
  note: string
  recorded_by: string | null
  updated_at: string
}

function mapRow(row: LeapNoteRow): LeapNote {
  return {
    id: row.id,
    leapId: row.leap_id,
    note: row.note,
    updatedAt: row.updated_at,
  }
}

export function useLeapNotes(babyId: string | undefined) {
  const [notes, setNotes] = useState<Map<number, LeapNote>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!babyId) { setLoading(false); return }
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('leap_notes')
        .select('*')
        .eq('baby_id', babyId)

      if (cancelled) return
      if (error) { setLoading(false); return }

      const map = new Map<number, LeapNote>()
      for (const row of (data ?? []) as LeapNoteRow[]) {
        map.set(row.leap_id, mapRow(row))
      }
      setNotes(map)
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [babyId])

  const saveNote = useCallback(async (leapId: number, text: string) => {
    if (!babyId) return

    const userId = (await supabase.auth.getUser()).data.user?.id

    const { data, error } = await supabase
      .from('leap_notes')
      .upsert(
        {
          baby_id: babyId,
          leap_id: leapId,
          note: text,
          recorded_by: userId,
        },
        { onConflict: 'baby_id,leap_id' },
      )
      .select()

    if (!error && data && data.length > 0) {
      const row = data[0] as LeapNoteRow
      setNotes(prev => {
        const next = new Map(prev)
        next.set(leapId, mapRow(row))
        return next
      })
    }

    return { error: error?.message ?? null }
  }, [babyId])

  return { notes, saveNote, loading }
}
