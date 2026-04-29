// Tipos compartilhados da feature de conteúdo contextual.
// O conteúdo vem da tabela blog_posts do Supabase — sem tabela separada.

export type ContentCategory =
  | 'alimentacao'
  | 'amamentacao'
  | 'sono'
  | 'desenvolvimento'
  | 'saude'
  | 'rotina'
  | 'marcos'
  | 'gestacao'
  | 'seguranca'

export interface ContentArticle {
  id: string
  slug: string
  title: string
  /** meta_description do post */
  excerpt: string
  category: ContentCategory
  imageUrl: string | null
  targetWeekStart: number | null
  targetWeekEnd: number | null
  /** URL completa com UTM já incluído */
  blogUrl: string
}

export const CONTENT_CATEGORY_EMOJI: Record<ContentCategory, string> = {
  alimentacao:  '🍽',
  amamentacao:  '🤱',
  sono:         '😴',
  desenvolvimento: '🧠',
  saude:        '❤️',
  rotina:       '📅',
  marcos:       '⭐',
  gestacao:     '🤰',
  seguranca:    '🛡',
}

export const BLOG_BASE_URL = 'https://blog.yayababy.app'
