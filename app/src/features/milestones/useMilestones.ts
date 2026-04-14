import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import {
  MILESTONES,
  type BabyMilestone,
} from './milestoneData'
import { getAgeBand, type AgeBand } from '../../lib/ageUtils'

interface BabyMilestoneRow {
  id: string
  baby_id: string
  milestone_id: string
  achieved_at: string
  photo_url: string | null
  note: string | null
  recorded_by: string | null
  created_at: string
  milestones: { code: string } | { code: string }[] | null
}

function mapRow(row: BabyMilestoneRow): BabyMilestone {
  const ms = row.milestones
  const code = Array.isArray(ms) ? ms[0]?.code ?? '' : ms?.code ?? ''
  return {
    id: row.id,
    babyId: row.baby_id,
    milestoneId: row.milestone_id,
    milestoneCode: code,
    achievedAt: row.achieved_at,
    photoUrl: row.photo_url,
    note: row.note,
    recordedBy: row.recorded_by,
    createdAt: row.created_at,
  }
}

export function useMilestones(
  babyId: string | undefined,
  birthDate: string | undefined,
) {
  const [achieved, setAchieved] = useState<BabyMilestone[]>([])
  const [loading, setLoading] = useState(true)

  const ageDays = useMemo(() => {
    if (!birthDate) return 0
    return Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000)
  }, [birthDate])

  const currentBand: AgeBand = birthDate ? getAgeBand(birthDate) : 'beyond'

  useEffect(() => {
    if (!babyId) {
      setAchieved([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('baby_milestones')
      .select(
        'id, baby_id, milestone_id, achieved_at, photo_url, note, recorded_by, created_at, milestones(code)',
      )
      .eq('baby_id', babyId)
      .order('achieved_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) {
          setAchieved((data as unknown as BabyMilestoneRow[]).map(mapRow))
        }
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [babyId])

  const achievedCodes = useMemo(
    () => new Set(achieved.map((a) => a.milestoneCode)),
    [achieved],
  )

  const registerMilestone = useCallback(
    async (
      milestoneCode: string,
      achievedAt: string,
      photoDataUrl?: string,
      note?: string,
      userId?: string,
    ): Promise<BabyMilestone | null> => {
      if (!babyId) return null

      // Resolve milestone ID
      const { data: mData, error: mErr } = await supabase
        .from('milestones')
        .select('id')
        .eq('code', milestoneCode)
        .single()

      if (mErr || !mData) return null

      let photoUrl: string | null = null

      if (photoDataUrl) {
        try {
          const fileName = `${babyId}/${milestoneCode}-${Date.now()}.jpg`
          const response = await fetch(photoDataUrl)
          const blob = await response.blob()

          const { error: uploadError } = await supabase.storage
            .from('milestone-photos')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: true,
            })

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('milestone-photos')
              .getPublicUrl(fileName)
            photoUrl = urlData.publicUrl
          }
        } catch {
          // silently ignore upload failure — milestone is still saved
        }
      }

      const { data, error } = await supabase
        .from('baby_milestones')
        .insert({
          baby_id: babyId,
          milestone_id: mData.id,
          achieved_at: achievedAt,
          photo_url: photoUrl,
          note: note?.trim() || null,
          recorded_by: userId || null,
        })
        .select(
          'id, baby_id, milestone_id, achieved_at, photo_url, note, recorded_by, created_at',
        )
        .single()

      if (error || !data) return null

      const newEntry: BabyMilestone = {
        id: data.id,
        babyId: data.baby_id,
        milestoneId: data.milestone_id,
        milestoneCode,
        achievedAt: data.achieved_at,
        photoUrl: data.photo_url,
        note: data.note,
        recordedBy: data.recorded_by,
        createdAt: data.created_at,
      }

      setAchieved((prev) =>
        [...prev, newEntry].sort((a, b) =>
          a.achievedAt.localeCompare(b.achievedAt),
        ),
      )
      return newEntry
    },
    [babyId],
  )

  const deleteMilestone = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('baby_milestones')
      .delete()
      .eq('id', id)

    if (!error) {
      setAchieved((prev) => prev.filter((a) => a.id !== id))
      return true
    }
    return false
  }, [])

  const totalForAge = useMemo(
    () =>
      MILESTONES.filter((m) => m.typicalAgeDaysMin <= ageDays + 30).length,
    [ageDays],
  )

  return {
    allMilestones: MILESTONES,
    achieved,
    achievedCodes,
    ageDays,
    currentBand,
    achievedCount: achieved.length,
    totalForAge,
    loading,
    registerMilestone,
    deleteMilestone,
  }
}
