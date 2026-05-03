import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { LinkedPediatrician, BabyDocument } from '../../types'

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
  const [documents, setDocuments] = useState<BabyDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)

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
          phone: string | null
          next_appointment_at: string | null
        }) => ({
          linkId: row.link_id,
          pediatricianId: row.pediatrician_id,
          name: row.name,
          crm: row.crm,
          crmState: row.crm_state,
          linkedAt: row.linked_at,
          consentGivenAt: row.consent_given_at,
          phone: row.phone,
          nextAppointmentAt: row.next_appointment_at,
        }))
      )
    } catch {
      setLinked([])
    } finally {
      setLoading(false)
    }
  }, [babyId])

  const loadDocuments = useCallback(async () => {
    if (!babyId) { setDocuments([]); return }
    setLoadingDocs(true)
    try {
      const { data } = await supabase.rpc('get_baby_documents', { p_baby_id: babyId })
      setDocuments(
        (data ?? []).map((row: {
          share_id: string
          token: string
          doc_type: string
          title: string
          content: string
          ped_name: string
          ped_crm: string
          ped_crm_state: string
          ped_phone: string | null
          shared_at: string
          read_at: string | null
        }) => ({
          shareId: row.share_id,
          token: row.token,
          docType: row.doc_type as BabyDocument['docType'],
          title: row.title,
          content: row.content,
          pedName: row.ped_name,
          pedCrm: row.ped_crm,
          pedCrmState: row.ped_crm_state,
          pedPhone: row.ped_phone,
          sharedAt: row.shared_at,
          readAt: row.read_at,
        }))
      )
    } catch {
      setDocuments([])
    } finally {
      setLoadingDocs(false)
    }
  }, [babyId])

  const markDocumentRead = useCallback(async (token: string) => {
    try {
      await supabase.rpc('mark_document_read', { p_token: token })
      setDocuments(prev => prev.map(d => d.token === token ? { ...d, readAt: new Date().toISOString() } : d))
    } catch {
      // silencioso
    }
  }, [])

  const scheduleAppointment = useCallback(
    async (linkId: string, dateTime: string): Promise<boolean> => {
      try {
        const { error } = await supabase.rpc('set_next_appointment', {
          p_link_id: linkId,
          p_datetime: dateTime,
        })
        if (error) return false
        await reload()
        return true
      } catch {
        return false
      }
    },
    [reload]
  )

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
  useEffect(() => { loadDocuments() }, [loadDocuments])

  return { linked, loading, documents, loadingDocs, link, unlink, reload, loadDocuments, markDocumentRead, scheduleAppointment }
}
