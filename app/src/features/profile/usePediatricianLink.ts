import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { LinkedPediatrician } from '../../types'

export type LinkResult =
  | 'ok'
  | 'not_found'
  | 'not_approved'
  | 'already_linked'
  | 'not_authorized'
  | 'error'

export function usePediatricianLink(babyId: string | undefined) {
  const [linked, setLinked] = useState<LinkedPediatrician[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!babyId) { setLinked([]); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('get_baby_linked_pediatrician', {
        p_baby_id: babyId,
      })
      if (error) throw error
      setLinked(
        (data ?? []).map((row: {
          link_id: string
          pediatrician_id: string
          name: string
          crm: string
          crm_state: string
          linked_at: string
          consent_given_at: string | null
        }) => ({
          linkId: row.link_id,
          pediatricianId: row.pediatrician_id,
          name: row.name,
          crm: row.crm,
          crmState: row.crm_state,
          linkedAt: row.linked_at,
          consentGivenAt: row.consent_given_at,
        }))
      )
    } catch {
      setLinked([])
    } finally {
      setLoading(false)
    }
  }, [babyId])

  const link = useCallback(
    async (inviteCode: string): Promise<LinkResult> => {
      if (!babyId) return 'error'
      try {
        const { data, error } = await supabase.rpc('link_baby_to_pediatrician', {
          p_invite_code: inviteCode.trim().toUpperCase(),
          p_baby_id: babyId,
        })
        if (error) return 'error'
        const result = data as { success?: boolean; error?: string }
        if (!result.success) {
          if (result.error === 'not_found') return 'not_found'
          if (result.error === 'not_approved') return 'not_approved'
          if (result.error === 'already_linked') return 'already_linked'
          if (result.error === 'not_authorized') return 'not_authorized'
          return 'error'
        }
        await reload()
        return 'ok'
      } catch {
        return 'error'
      }
    },
    [babyId, reload]
  )

  const unlink = useCallback(
    async (pediatricianId: string): Promise<boolean> => {
      if (!babyId) return false
      try {
        const { data, error } = await supabase.rpc('unlink_baby_from_pediatrician', {
          p_pediatrician_id: pediatricianId,
          p_baby_id: babyId,
        })
        if (error) return false
        if (data) await reload()
        return !!data
      } catch {
        return false
      }
    },
    [babyId, reload]
  )

  useEffect(() => { reload() }, [reload])

  return { linked, loading, link, unlink, reload }
}
