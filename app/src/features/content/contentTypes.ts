export type ContentCategory =
  | 'alimentacao'
  | 'sono'
  | 'desenvolvimento'
  | 'saude'
  | 'rotina'
  | 'marcos'

export type ContentStatus = 'draft' | 'review' | 'published' | 'archived'

export interface ContentCard {
  id: string
  slug: string
  title: string
  body: string
  ctaText: string
  ctaUrl: string
  triggerWeek: number
  endWeek: number | null
  category: ContentCategory
  isPremium: boolean
  priority: number
  blogUrl: string | null
  imageUrl: string | null
  status: ContentStatus
  publishedAt: string | null
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  metaDescription: string | null
  contentMd: string
  keywords: string[] | null
  category: ContentCategory
  targetWeekStart: number | null
  targetWeekEnd: number | null
  sources: Record<string, string> | null
  imageUrl: string | null
  imageAlt: string | null
  status: ContentStatus
  cardId: string | null
  publishedAt: string | null
}

export type ContentAction = 'viewed' | 'clicked' | 'dismissed' | 'shared'
