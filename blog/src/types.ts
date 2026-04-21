export type ContentCategory =
  | 'alimentacao'
  | 'sono'
  | 'desenvolvimento'
  | 'saude'
  | 'rotina'
  | 'marcos'

export type Audience = 'gestante' | 'parent' | 'both'

export interface BlogPost {
  id: string
  slug: string
  title: string
  meta_description: string | null
  content_md: string
  keywords: string[] | null
  category: ContentCategory
  audience: Audience
  target_week_start: number | null
  target_week_end: number | null
  image_url: string | null
  image_alt: string | null
  published_at: string | null
}

export const CATEGORY_LABEL: Record<ContentCategory, string> = {
  alimentacao: 'Alimentação',
  sono: 'Sono',
  desenvolvimento: 'Desenvolvimento',
  saude: 'Saúde',
  rotina: 'Rotina',
  marcos: 'Marcos',
}

export const CATEGORY_EMOJI: Record<ContentCategory, string> = {
  alimentacao: '🥦',
  sono: '😴',
  desenvolvimento: '🧠',
  saude: '❤️',
  rotina: '🔁',
  marcos: '⭐',
}
