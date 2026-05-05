// Hook que busca artigos do blog contextualmente relevantes para a idade do bebê.
// Usa blog_posts direto (sem tabela content_cards separada) — todos os campos
// necessários já estão em blog_posts: target_week_start, target_week_end,
// category, title, meta_description, image_url.
//
// Dismiss por 7 dias via localStorage (chave: yb_content_dismissed → JSON obj).
//
// Motor de relevância client-side:
//   score = proximidade do midpoint + penalidade por range muito amplo
//   Artigos escritos especificamente para a semana atual aparecem primeiro.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { ContentArticle, ContentCategory } from './contentTypes'
import { BLOG_BASE_URL } from './contentTypes'

const DISMISS_KEY = 'yb_content_dismissed'
const DISMISS_DAYS = 7

interface RawPost {
  id: string
  slug: string
  title: string
  meta_description: string | null
  category: string
  image_url: string | null
  target_week_start: number | null
  target_week_end: number | null
}

// Lê o mapa de dismissals do localStorage
function readDismissed(): Record<string, number> {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Retorna true se o artigo foi dispensado nos últimos DISMISS_DAYS
function isDismissed(slug: string): boolean {
  const map = readDismissed()
  const ts = map[slug]
  if (!ts) return false
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

function buildUrl(slug: string, utmMedium: string): string {
  return `${BLOG_BASE_URL}/${slug}?utm_source=app&utm_medium=${utmMedium}&utm_campaign=content`
}

function mapPost(p: RawPost, utmMedium: string): ContentArticle {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.meta_description ?? '',
    category: p.category as ContentCategory,
    imageUrl: p.image_url,
    targetWeekStart: p.target_week_start,
    targetWeekEnd: p.target_week_end,
    blogUrl: buildUrl(p.slug, utmMedium),
  }
}

/**
 * Relevância de um artigo para a semana atual do bebê.
 * Score mais baixo = mais relevante.
 *
 * Lógica:
 * - Distância do midpoint até a semana atual (componente principal)
 * - Penalidade assimétrica: tema no passado recente = 1.5×, passado distante = 2.5×
 *   (artigos sobre eventos que já passaram são menos úteis — "volta ao trabalho"
 *    é útil ANTES de acontecer, não semanas depois)
 * - Penalidade proporcional à largura do range (artigos mais específicos ganham)
 *
 * Exemplos para bebê de 20 semanas:
 *   range 18-22  → midpoint=20, dist=0   → score ≈ 0   + 0.4 = 0.4  ← certeiro
 *   range 16-18  → midpoint=17, passou 3 → score ≈ 4.5 + 0.2 = 4.7  ← penalizado
 *   range 0-52   → midpoint=26, 6 antes  → score ≈ 6   + 5.2 = 11.2 ← genérico
 */
function relevanceScore(post: RawPost, babyAgeWeeks: number): number {
  const start = post.target_week_start ?? 0
  const end = post.target_week_end ?? 52
  const midpoint = (start + end) / 2
  const width = end - start

  const raw = midpoint - babyAgeWeeks // positivo = tema ainda não chegou; negativo = já passou

  let distance: number
  if (raw >= 0) {
    // Tema ainda no futuro: distância linear normal
    distance = raw
  } else {
    // Tema já passou: penalidade assimétrica
    const weeksPast = Math.abs(raw)
    distance = weeksPast * (weeksPast > 4 ? 2.5 : 1.5)
  }

  return distance + width * 0.1
}

interface Options {
  /** Filtra por categoria (para InsightsPage contextuais). Se omitido, retorna todas. */
  category?: ContentCategory
  /** Máximo de artigos a retornar. Default: 5. */
  limit?: number
  /** utm_medium para os links. Default: 'home_card'. */
  utmMedium?: string
  /** Se true, exclui artigos dispensados pelo usuário. Default: true. */
  filterDismissed?: boolean
}

export function useContentArticles(
  babyAgeWeeks: number,
  options: Options = {},
) {
  const {
    category,
    limit = 5,
    utmMedium = 'home_card',
    filterDismissed = true,
  } = options

  const [articles, setArticles] = useState<ContentArticle[]>([])
  const [loading, setLoading] = useState(true)

  // Expõe função de dismiss para o card chamar
  const dismissArticle = useCallback((slug: string) => {
    const map = readDismissed()
    map[slug] = Date.now()
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify(map))
    } catch {
      // silencia erros de storage cheio
    }
    // Remove o artigo dispensado do state local imediatamente
    setArticles((prev) => prev.filter((a) => a.slug !== slug))
  }, [])

  useEffect(() => {
    if (babyAgeWeeks < 0 || !Number.isFinite(babyAgeWeeks)) {
      setArticles([])
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetch() {
      setLoading(true)

      let query = supabase
        .from('blog_posts')
        .select('id, slug, title, meta_description, category, image_url, target_week_start, target_week_end')
        .eq('status', 'published')
        .lte('target_week_start', babyAgeWeeks)
        .gte('target_week_end', babyAgeWeeks)
        .neq('audience', 'gestante') // posts de gestação não fazem sentido pós-nascimento

      if (category) {
        query = query.eq('category', category)
      }

      // Busca pool amplo para o motor de relevância ter mais opções para escolher
      const { data } = await query.limit(40)

      if (cancelled) return

      const posts = (data ?? []) as RawPost[]

      // Ordena por relevância: midpoint mais próximo da semana atual + penaliza ranges amplos
      const sorted = [...posts].sort(
        (a, b) => relevanceScore(a, babyAgeWeeks) - relevanceScore(b, babyAgeWeeks),
      )

      const mapped = sorted.map((p) => mapPost(p, utmMedium))

      const filtered = filterDismissed
        ? mapped.filter((a) => !isDismissed(a.slug))
        : mapped

      setArticles(filtered.slice(0, limit))
      setLoading(false)
    }

    fetch()
    return () => { cancelled = true }
  }, [babyAgeWeeks, category, limit, utmMedium, filterDismissed])

  return { articles, loading, dismissArticle }
}
