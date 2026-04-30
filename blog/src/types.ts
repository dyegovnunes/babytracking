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
  sources: Array<{ name: string; url: string }> | null
  premium_teaser: PremiumTeaserData | null
  target_week_start: number | null
  target_week_end: number | null
  image_url: string | null
  image_alt: string | null
  mid_image_url: string | null
  published_at: string | null
  post_number: number | null
}

// ── Sua Biblioteca Yaya — infoprodutos ─────────────────────────────────────

export type GuideStatus = 'draft' | 'published' | 'archived'
export type GuideSectionType = 'linear' | 'quiz' | 'checklist' | 'part' | 'flashcards'
export type GuideSectionCategory = 'narrative' | 'complementary'
export type PurchaseStatus = 'pending' | 'completed' | 'refunded' | 'failed'
export type PurchaseProvider = 'stripe' | 'hotmart' | 'manual'
export type HighlightColor = 'yellow' | 'pink' | 'purple'

export interface Guide {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  price_cents: number
  stripe_price_id: string | null
  cover_image_url: string | null
  status: GuideStatus
  courtesy_days: number
  audience: string | null
  target_week_start: number | null
  target_week_end: number | null
  created_at: string
  updated_at: string
}

export interface GuideSection {
  id: string
  guide_id: string
  parent_id: string | null
  order_index: number
  slug: string
  title: string
  cover_image_url: string | null
  estimated_minutes: number | null
  content_md: string | null
  type: GuideSectionType
  category: GuideSectionCategory
  data: Record<string, unknown> | null
  is_preview: boolean
  created_at: string
  updated_at: string
}

export interface GuidePurchase {
  id: string
  user_id: string | null
  guide_id: string
  email: string
  provider: PurchaseProvider
  provider_session_id: string | null
  amount_cents: number
  status: PurchaseStatus
  purchased_at: string | null
  refunded_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface GuideHighlight {
  id: string
  user_id: string
  section_id: string
  anchor_text: string
  position: number | null
  color: HighlightColor
  note_md: string | null
  created_at: string
}

export interface GuideNote {
  user_id: string
  section_id: string
  note_md: string
  updated_at: string
}

export interface GuideProgress {
  user_id: string
  guide_id: string
  section_id: string
  completed: boolean
  completed_at: string | null
  scroll_offset: number | null
  last_seen_at: string
}

export const GUIDE_STATUS_LABEL: Record<GuideStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
}

export const GUIDE_SECTION_TYPE_LABEL: Record<GuideSectionType, string> = {
  part: 'Parte',
  linear: 'Leitura',
  quiz: 'Quiz',
  checklist: 'Checklist',
  flashcards: 'Flashcards',
}

export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  pending: 'Pendente',
  completed: 'Confirmada',
  refunded: 'Reembolsada',
  failed: 'Falhou',
}

// ─────────────────────────────────────────────────────────────────────────

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
