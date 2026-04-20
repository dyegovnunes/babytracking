import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { ContentCard, ContentAction } from './contentTypes'

interface ContentCardRow {
  id: string
  slug: string
  title: string
  body: string
  cta_text: string
  cta_url: string
  trigger_week: number
  end_week: number | null
  category: string
  is_premium: boolean
  priority: number
  blog_url: string | null
  image_url: string | null
  status: string
  published_at: string | null
}

function mapRow(row: ContentCardRow): ContentCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    body: row.body,
    ctaText: row.cta_text,
    ctaUrl: row.cta_url,
    triggerWeek: row.trigger_week,
    endWeek: row.end_week,
    category: row.category as ContentCard['category'],
    isPremium: row.is_premium,
    priority: row.priority,
    blogUrl: row.blog_url,
    imageUrl: row.image_url,
    status: row.status as ContentCard['status'],
    publishedAt: row.published_at,
  }
}

/**
 * Busca o card de conteúdo mais relevante para a idade atual do bebê.
 * Retorna null quando não há card aplicável ou o bebê ainda não está definido.
 *
 * Prioridade: priority DESC (maior número = mais importante), depois published_at ASC.
 * Exclui cards cujo dismiss foi registrado no Supabase nas últimas 7 dias.
 */
export function useContentCards(
  babyId: string | undefined,
  userId: string | undefined,
  ageWeeks: number,
) {
  const [card, setCard] = useState<ContentCard | null>(null)
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // Carrega dismissed IDs do Supabase (sincroniza entre devices)
  useEffect(() => {
    if (!babyId || !userId) {
      setDismissedIds(new Set())
      return
    }
    const since = new Date(Date.now() - 7 * 86400000).toISOString()
    supabase
      .from('user_content_interactions')
      .select('card_id')
      .eq('user_id', userId)
      .eq('baby_id', babyId)
      .eq('action', 'dismissed')
      .gte('created_at', since)
      .then(({ data }) => {
        setDismissedIds(new Set((data ?? []).map((r) => r.card_id as string)))
      })
  }, [babyId, userId])

  useEffect(() => {
    if (!babyId || ageWeeks <= 0) {
      setCard(null)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    supabase
      .from('content_cards')
      .select('*')
      .eq('status', 'published')
      .lte('trigger_week', ageWeeks)
      .or(`end_week.is.null,end_week.gte.${ageWeeks}`)
      .order('priority', { ascending: false })
      .order('published_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error) return
        const cards = (data ?? []).map(mapRow)
        const best = cards.find((c) => !dismissedIds.has(c.id)) ?? null
        setCard(best)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [babyId, ageWeeks, dismissedIds])

  /** Registra uma interação no Supabase (viewed, clicked, dismissed, shared). */
  const trackInteraction = useCallback(
    async (cardId: string, action: ContentAction) => {
      if (!babyId || !userId) return
      // dismissed tem UNIQUE partial index — usa upsert silencioso
      if (action === 'dismissed') {
        await supabase.from('user_content_interactions').upsert(
          { user_id: userId, baby_id: babyId, card_id: cardId, action },
          { onConflict: 'user_id,baby_id,card_id', ignoreDuplicates: true },
        )
        setDismissedIds((prev) => new Set([...prev, cardId]))
      } else {
        await supabase
          .from('user_content_interactions')
          .insert({ user_id: userId, baby_id: babyId, card_id: cardId, action })
      }
    },
    [babyId, userId],
  )

  return { card, loading, trackInteraction }
}
