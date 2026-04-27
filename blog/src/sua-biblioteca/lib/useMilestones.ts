// useMilestones — hook que mantém estado dos marcos do leitor sincronizado.
// Estratégia em duas camadas:
//   1. Fetch inicial via SELECT (cobre marcos já existentes ao montar)
//   2. Realtime subscriber em postgres_changes (detecta novos INSERTs)
//
// Quando um milestone NOVO chega (não estava no fetch inicial), o hook
// dispara um callback `onNewMilestone` — usado pra abrir o modal de
// comemoração ou toast.

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export interface GuideMilestone {
  id: string
  user_id: string
  guide_id: string
  type: GuideMilestoneType
  ref: string | null
  achieved_at: string
  metadata: Record<string, unknown> | null
}

export type GuideMilestoneType =
  | 'section-completed'
  | 'part-completed'
  | 'guide-completed'
  | 'quiz-completed'
  | 'first-highlight'
  | 'first-note'
  | '5-highlights'
  | '10-highlights'
  | '20-highlights'
  | 'first-checklist-completed'
  | 'all-checklists-completed'

interface UseMilestonesOptions {
  userId: string | null
  guideId: string | null
  /**
   * Callback quando um marco NOVO chega (não estava no fetch inicial).
   * Usado pra disparar comemoração visual (modal/toast).
   * Recebe a row completa do milestone.
   */
  onNewMilestone?: (m: GuideMilestone) => void
}

export function useMilestones({ userId, guideId, onNewMilestone }: UseMilestonesOptions) {
  const [milestones, setMilestones] = useState<GuideMilestone[]>([])
  const [loading, setLoading] = useState(true)
  // Set de ids já vistos no fetch inicial — pra detectar "novo de verdade"
  // ao invés de re-disparar comemoração ao recarregar a página
  const seenIds = useRef<Set<string>>(new Set())
  const initialLoadDone = useRef(false)
  const onNewMilestoneRef = useRef(onNewMilestone)

  // Mantém ref atualizada sem re-subscribing
  useEffect(() => {
    onNewMilestoneRef.current = onNewMilestone
  }, [onNewMilestone])

  // Fetch inicial
  useEffect(() => {
    if (!userId || !guideId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('guide_milestones')
        .select('*')
        .eq('user_id', userId)
        .eq('guide_id', guideId)
        .order('achieved_at', { ascending: true })

      if (cancelled) return

      const rows = (data ?? []) as GuideMilestone[]
      setMilestones(rows)
      seenIds.current = new Set(rows.map(r => r.id))
      initialLoadDone.current = true
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [userId, guideId])

  // Realtime subscriber — escuta INSERTs novos via postgres_changes
  useEffect(() => {
    if (!userId || !guideId) return

    const channel = supabase
      .channel(`guide_milestones:${userId}:${guideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guide_milestones',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newRow = payload.new as GuideMilestone
          // Filtra pelo guide_id (postgres_changes filter aceita só uma key)
          if (newRow.guide_id !== guideId) return
          // Idempotência: se já está no estado (ex: fetch otimista), ignora
          if (seenIds.current.has(newRow.id)) return

          seenIds.current.add(newRow.id)
          setMilestones(prev => [...prev, newRow])

          // Só dispara callback DEPOIS do load inicial — evita disparar
          // ao recarregar a página com marcos antigos
          if (initialLoadDone.current) {
            onNewMilestoneRef.current?.(newRow)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, guideId])

  // Helper: verifica se um marco específico já foi achievedo
  const has = useCallback((type: GuideMilestoneType, ref?: string) => {
    return milestones.some(m =>
      m.type === type && (ref === undefined || m.ref === ref)
    )
  }, [milestones])

  // Helper: insere milestone manualmente (pra tipos que não vêm do trigger SQL,
  // ex: 'first-highlight', 'first-note', counts de highlights). Idempotente
  // via UNIQUE constraint — se já existe, devolve sucesso silencioso.
  const record = useCallback(async (type: GuideMilestoneType, ref?: string, metadata?: Record<string, unknown>) => {
    if (!userId || !guideId) return null
    if (has(type, ref)) return null  // já achievedo, evita request

    const { data, error } = await supabase
      .from('guide_milestones')
      .insert({
        user_id: userId,
        guide_id: guideId,
        type,
        ref: ref ?? null,
        metadata: metadata ?? null,
      })
      .select()
      .single()

    if (error) {
      // Conflict (UNIQUE) é OK — outro caminho já registrou. Não é bug.
      if (error.code === '23505') return null
      console.warn('[useMilestones] erro ao registrar marco:', error)
      return null
    }
    return data as GuideMilestone
  }, [userId, guideId, has])

  return { milestones, loading, has, record }
}
