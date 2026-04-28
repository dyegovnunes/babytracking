/**
 * useGridItems — carrega a config do grid do bebê da tabela baby_grid_items.
 *
 * Estratégia de segurança (nunca quebra o tracker):
 *  1. Lê localStorage imediatamente como estado inicial (zero flicker).
 *  2. Busca baby_grid_items no Supabase; se vier vazio ou erro → fallback
 *     para DEFAULT_EVENTS.
 *  3. Salva no localStorage sempre que a query retornar dados válidos.
 *
 * Sprint 3: retorna também pendingSuggestions (suggested_at IS NOT NULL,
 * accepted_at IS NULL, dismissed_at IS NULL) e ações para aceitar/dispensar/
 * semear sugestões. Usa EVENT_CATALOG como dicionário de resolução para
 * suportar eventos além dos 9 padrão (meal, mood, etc).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { DEFAULT_EVENTS, EVENT_CATALOG } from '../../lib/constants'
import type { EventType } from '../../types'

const CACHE_KEY_PREFIX = 'yaya_grid_'

interface RawGridItem {
  id: string
  event_id: string
  sort_order: number
  enabled: boolean
  suggested_at: string | null
  accepted_at: string | null
  dismissed_at: string | null
}

function cacheKey(babyId: string) {
  return `${CACHE_KEY_PREFIX}${babyId}`
}

function readCache(babyId: string): EventType[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(babyId))
    if (!raw) return null
    const ids: string[] = JSON.parse(raw)
    const events = ids
      .map((id) => EVENT_CATALOG.find((e) => e.id === id))
      .filter((e): e is EventType => !!e)
    return events.length > 0 ? events : null
  } catch {
    return null
  }
}

function writeCache(babyId: string, events: EventType[]) {
  try {
    localStorage.setItem(cacheKey(babyId), JSON.stringify(events.map((e) => e.id)))
  } catch {
    // localStorage indisponível — não bloqueia
  }
}

function resolveEnabledEvents(rows: RawGridItem[]): EventType[] {
  const enabled = rows.filter((r) => r.enabled)
  const events = enabled
    .map((r) => EVENT_CATALOG.find((e) => e.id === r.event_id))
    .filter((e): e is EventType => !!e)
  return events.length > 0 ? events : DEFAULT_EVENTS
}

function resolveSuggestions(rows: RawGridItem[]): EventType[] {
  return rows
    .filter((r) => r.suggested_at && !r.accepted_at && !r.dismissed_at && !r.enabled)
    .map((r) => EVENT_CATALOG.find((e) => e.id === r.event_id))
    .filter((e): e is EventType => !!e)
}

interface UseGridItemsResult {
  /** Lista de EventType habilitados, ordenados por sort_order */
  gridEvents: EventType[]
  /** Eventos sugeridos mas ainda não aceitos/dispensados */
  pendingSuggestions: EventType[]
  /** Set de todos os event_ids conhecidos (enabled + suggested + dismissed) */
  knownEventIds: Set<string>
  /** true somente no primeiro carregamento sem cache */
  loading: boolean
  /** Aceita uma sugestão: enabled=true, accepted_at=now */
  acceptSuggestion: (eventId: string) => Promise<void>
  /** Dispensa uma sugestão: dismissed_at=now */
  dismissSuggestion: (eventId: string) => Promise<void>
  /** Semeia uma nova sugestão na tabela (idempotente via ON CONFLICT DO NOTHING) */
  seedSuggestion: (eventId: string, sortOrder: number) => Promise<void>
  /**
   * Liga/desliga um evento manualmente (painel de personalização).
   * Se a row não existir → insere com enabled=true.
   * Se estiver habilitando → limpa dismissed_at e seta accepted_at.
   */
  toggleEvent: (eventId: string, enabled: boolean) => Promise<void>
}

export function useGridItems(babyId: string | undefined): UseGridItemsResult {
  const cached = babyId ? readCache(babyId) : null
  const [gridEvents, setGridEvents] = useState<EventType[]>(cached ?? DEFAULT_EVENTS)
  const [pendingSuggestions, setPendingSuggestions] = useState<EventType[]>([])
  const [knownEventIds, setKnownEventIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(!cached)
  const lastBabyId = useRef<string | undefined>(undefined)

  const fetchGrid = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('baby_grid_items')
      .select('id, event_id, sort_order, enabled, suggested_at, accepted_at, dismissed_at')
      .eq('baby_id', id)
      .order('sort_order', { ascending: true })

    if (error || !data || data.length === 0) {
      setGridEvents(DEFAULT_EVENTS)
      setPendingSuggestions([])
      setKnownEventIds(new Set())
      setLoading(false)
      return
    }

    const rows = data as RawGridItem[]
    const resolved = resolveEnabledEvents(rows)
    const suggestions = resolveSuggestions(rows)
    const knownIds = new Set(rows.map((r) => r.event_id))

    setGridEvents(resolved)
    setPendingSuggestions(suggestions)
    setKnownEventIds(knownIds)
    setLoading(false)
    writeCache(id, resolved)
  }, [])

  useEffect(() => {
    if (!babyId) {
      setGridEvents(DEFAULT_EVENTS)
      setPendingSuggestions([])
      setKnownEventIds(new Set())
      setLoading(false)
      return
    }

    if (lastBabyId.current !== babyId) {
      lastBabyId.current = babyId
      const newCache = readCache(babyId)
      setGridEvents(newCache ?? DEFAULT_EVENTS)
      setLoading(!newCache)
    }

    fetchGrid(babyId)
  }, [babyId, fetchGrid])

  const acceptSuggestion = useCallback(async (eventId: string) => {
    if (!babyId) return
    await supabase
      .from('baby_grid_items')
      .update({ enabled: true, accepted_at: new Date().toISOString() })
      .eq('baby_id', babyId)
      .eq('event_id', eventId)
    fetchGrid(babyId)
  }, [babyId, fetchGrid])

  const dismissSuggestion = useCallback(async (eventId: string) => {
    if (!babyId) return
    await supabase
      .from('baby_grid_items')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('baby_id', babyId)
      .eq('event_id', eventId)
    fetchGrid(babyId)
  }, [babyId, fetchGrid])

  const seedSuggestion = useCallback(async (eventId: string, sortOrder: number) => {
    if (!babyId) return
    await supabase
      .from('baby_grid_items')
      .insert({
        baby_id: babyId,
        event_id: eventId,
        enabled: false,
        sort_order: sortOrder,
        suggested_at: new Date().toISOString(),
      })
      .maybeSingle()
      .then(() => {})
      // ignores conflict (UNIQUE constraint) silently
  }, [babyId])

  const toggleEvent = useCallback(async (eventId: string, enabled: boolean) => {
    if (!babyId) return

    // Invalidate cache so next read is fresh
    try { localStorage.removeItem(cacheKey(babyId)) } catch { /* noop */ }

    const now = new Date().toISOString()

    // Try UPDATE first
    const { data: updated } = await supabase
      .from('baby_grid_items')
      .update(
        enabled
          ? { enabled: true, dismissed_at: null, accepted_at: now }
          : { enabled: false },
      )
      .eq('baby_id', babyId)
      .eq('event_id', eventId)
      .select('id')

    // If no row existed, INSERT
    if (!updated || updated.length === 0) {
      const sortOrder = EVENT_CATALOG.findIndex((e) => e.id === eventId)
      await supabase
        .from('baby_grid_items')
        .insert({
          baby_id: babyId,
          event_id: eventId,
          enabled: true,
          sort_order: sortOrder >= 0 ? sortOrder : 99,
          accepted_at: now,
        })
        .maybeSingle()
        .then(() => {})
    }

    fetchGrid(babyId)
  }, [babyId, fetchGrid])

  return {
    gridEvents,
    pendingSuggestions,
    knownEventIds,
    loading,
    acceptSuggestion,
    dismissSuggestion,
    seedSuggestion,
    toggleEvent,
  }
}
