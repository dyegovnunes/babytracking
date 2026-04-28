// Hook que busca artigos do blog contextualmente relevantes para a idade do bebê.
// Usa blog_posts direto (sem tabela content_cards separada) — todos os campos
// necessários já estão em blog_posts: target_week_start, target_week_end,
// category, title, meta_description, image_url.
//
// Dismiss por 7 dias via localStorage (chave: yb_content_dismissed → JSON obj).

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

      // Busca mais do que o limite para filtrar dismissals depois
      const { data } = await query.limit(limit * 4)

      if (cancelled) return

      const posts = (data ?? []) as RawPost[]
      const mapped = posts.map((p) => mapPost(p, utmMedium))

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
