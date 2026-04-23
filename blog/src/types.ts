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

export type Audience = 'gestante' | 'parent' | 'both'
export type SchemaType = 'Article' | 'HowTo' | 'FAQPage'
export type Pillar = 'gestacao' | 'amamentacao' | 'sono' | 'primeiros-dias' | string
export type Role = 'pilar' | 'cluster'

export interface AffiliateProduct {
  tipo: string
  nome: string
  asin: string
  url: string
}

export interface PremiumTeaserData {
  title: string
  body: string
  cta_text?: string
  cta_url?: string
}

export interface BlogPost {
  id: string
  slug: string
  title: string
  meta_description: string | null
  content_md: string
  keywords: string[] | null
  category: ContentCategory
  audience: Audience
  pillar: Pillar | null
  role: Role | null
  related_slugs: string[]
  schema_type: SchemaType
  affiliate_products: AffiliateProduct[]
  premium_teaser: PremiumTeaserData | null
  target_week_start: number | null
  target_week_end: number | null
  image_url: string | null
  image_alt: string | null
  mid_image_url: string | null
  published_at: string | null
  post_number: number | null
}

export const CATEGORY_LABEL: Record<ContentCategory, string> = {
  gestacao: 'Gestação',
  alimentacao: 'Alimentação',
  amamentacao: 'Amamentação',
  sono: 'Sono',
  rotina: 'Rotina',
  saude: 'Saúde',
  seguranca: 'Segurança',
  desenvolvimento: 'Desenvolvimento',
  marcos: 'Marcos',
}

export const CATEGORY_EMOJI: Record<ContentCategory, string> = {
  gestacao: '🤰',
  alimentacao: '🥦',
  amamentacao: '🤱',
  sono: '😴',
  rotina: '🔁',
  saude: '❤️',
  seguranca: '🛡️',
  desenvolvimento: '🧠',
  marcos: '⭐',
}
