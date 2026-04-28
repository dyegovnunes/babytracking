/**
 * useGridItems — carrega a config do grid do bebê da tabela baby_grid_items.
 *
 * Estratégia de segurança (nunca quebra o tracker):
 *  1. Lê localStorage imediatamente como estado inicial (zero flicker).
 *  2. Busca baby_grid_items no Supabase; se vier vazio ou der erro → fallback
 *     para DEFAULT_EVENTS.
 *  3. Salva no localStorage sempre que a query retornar dados válidos.
 *
 * O TrackerPage substitui apenas o prop `events` do ActivityGrid.
 * DEFAULT_EVENTS continua sendo o dicionário para resolver eventId → EventType
 * em handlers de log e projections — não é substituído em nenhum outro lugar.
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { DEFAULT_EVENTS } from '../../lib/constants'
import type { EventType } from '../../types'

const CACHE_KEY_PREFIX = 'yaya_grid_'

interface RawGridItem {
  event_id: string
  sort_order: number
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
      .map((id) => DEFAULT_EVENTS.find((e) => e.id === id))
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

function resolveEvents(rows: RawGridItem[]): EventType[] {
  const events = rows
    .map((r) => DEFAULT_EVENTS.find((e) => e.id === r.event_id))
    .filter((e): e is EventType => !!e)
  return events.length > 0 ? events : DEFAULT_EVENTS
}

interface UseGridItemsResult {
  /** Lista de EventType habilitados, ordenados por sort_order */
  gridEvents: EventType[]
  /** true somente no primeiro carregamento sem cache */
  loading: boolean
}

export function useGridItems(babyId: string | undefined): UseGridItemsResult {
  const cached = babyId ? readCache(babyId) : null
  const [gridEvents, setGridEvents] = useState<EventType[]>(cached ?? DEFAULT_EVENTS)
  const [loading, setLoading] = useState(!cached)
  const lastBabyId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!babyId) {
      setGridEvents(DEFAULT_EVENTS)
      setLoading(false)
      return
    }

    // Se o babyId mudou, atualiza o estado inicial com cache do novo bebê
    if (lastBabyId.current !== babyId) {
      lastBabyId.current = babyId
      const newCache = readCache(babyId)
      setGridEvents(newCache ?? DEFAULT_EVENTS)
      setLoading(!newCache)
    }

    let cancelled = false

    supabase
      .from('baby_grid_items')
      .select('event_id, sort_order')
      .eq('baby_id', babyId)
      .eq('enabled', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return

        if (error || !data || data.length === 0) {
          // Fallback para DEFAULT_EVENTS — tracker nunca fica em branco
          setGridEvents(DEFAULT_EVENTS)
          setLoading(false)
          return
        }

        const resolved = resolveEvents(data as RawGridItem[])
        setGridEvents(resolved)
        setLoading(false)
        writeCache(babyId, resolved)
      })

    return () => {
      cancelled = true
    }
  }, [babyId])

  return { gridEvents, loading }
}
