#!/usr/bin/env tsx
/**
 * scripts/publish-content.ts
 *
 * Lê todos os `.md` em content/posts/* /artigo.md, parseia o frontmatter YAML
 * e faz UPSERT no blog_posts do Supabase.
 *
 * Regras importantes:
 * - Slug é a chave primária lógica. Nunca muda.
 * - Em UPDATE de post existente, campos NÃO presentes no frontmatter
 *   preservam valor atual do DB (merge parcial).
 * - image_url e published_at são preservados do DB quando o frontmatter
 *   não declara explicitamente (evita perder imagens e sobrescrever datas).
 * - Valida reciprocidade de related_slugs (warning, não erro).
 *
 * Uso:
 *   npm run publish:content              # dry-run (default, mostra diff)
 *   npm run publish:content:execute     # aplica as mudanças no Supabase
 *
 * Requer em blog/.env:
 *   PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (pegue em Supabase Dashboard →
 *                               Settings → API → service_role secret)
 */

import { createClient } from '@supabase/supabase-js'
import matter from 'gray-matter'
import { readdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadDotenv } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BLOG_ROOT = join(__dirname, '..')
const CONTENT_DIR = join(BLOG_ROOT, '..', 'content', 'posts')

loadDotenv({ path: join(BLOG_ROOT, '.env') })

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Faltou env var em blog/.env:')
  if (!SUPABASE_URL) console.error('   - PUBLIC_SUPABASE_URL')
  if (!SERVICE_KEY) {
    console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    console.error('')
    console.error('   Pegue em Supabase Dashboard → Settings → API →')
    console.error('   "service_role" (Project API keys, seção reveal).')
    console.error('   ⚠️  NUNCA comite essa key. blog/.env já está no .gitignore.')
  }
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const DRY_RUN = !process.argv.includes('--execute')

// ─── Types ────────────────────────────────────────────────────────────────

interface FrontMatterKeywords {
  primaria?: string
  secundarias?: string[]
  long_tails?: string[]
}

interface FrontMatter {
  title?: string
  slug?: string
  description?: string
  category?: 'alimentacao' | 'sono' | 'desenvolvimento' | 'saude' | 'rotina' | 'marcos'
  audience?: 'gestante' | 'parent' | 'both'
  pillar?: string
  role?: 'pilar' | 'cluster'
  // 'schema' é o campo do frontmatter; mapeia pra coluna schema_type no DB
  schema?: 'Article' | 'HowTo' | 'FAQPage'
  related_slugs?: string[]
  target_week_start?: number
  target_week_end?: number
  keywords?: FrontMatterKeywords | string[]
  sources?: Array<{ name: string; url?: string } | string>
  affiliate_products?: Array<{ name: string; context: string }>
  premium_teaser?: { title: string; body: string; cta_text?: string; cta_url?: string } | null
  image_url?: string
  image_alt?: string
  mid_image_url?: string
  status?: 'draft' | 'review' | 'published' | 'archived'
}

interface ParsedPost {
  folder: string
  fm: FrontMatter
  body: string
}

interface ExistingPost {
  slug: string
  title: string | null
  meta_description: string | null
  content_md: string | null
  keywords: string[] | null
  category: string
  audience: string | null
  pillar: string | null
  role: string | null
  schema_type: string
  related_slugs: string[] | null
  target_week_start: number | null
  target_week_end: number | null
  sources: any
  affiliate_products: any
  premium_teaser: any
  image_url: string | null
  image_alt: string | null
  mid_image_url: string | null
  status: string
  published_at: string | null
  post_number: number | null
}

// Extrai número do nome da pasta (ex: "13-plano-de-parto" → 13)
function folderNumber(folder: string): number | null {
  const match = folder.match(/^(\d+)-/)
  return match ? parseInt(match[1], 10) : null
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function flattenKeywords(kw: FrontMatter['keywords']): string[] {
  if (!kw) return []
  if (Array.isArray(kw)) return kw
  const all: string[] = []
  if (kw.primaria) all.push(kw.primaria)
  if (kw.secundarias) all.push(...kw.secundarias)
  if (kw.long_tails) all.push(...kw.long_tails)
  return Array.from(new Set(all)) // dedup
}

function normalizeSources(
  sources: FrontMatter['sources'],
): Array<{ name: string; url?: string }> {
  if (!sources) return []
  return sources.map((s) => (typeof s === 'string' ? { name: s } : s))
}

function pick<T>(fromFm: T | undefined, fromDb: T | null | undefined, fallback: T): T {
  if (fromFm !== undefined) return fromFm
  if (fromDb !== null && fromDb !== undefined) return fromDb
  return fallback
}

// ─── Load disk ────────────────────────────────────────────────────────────

async function loadPostsFromDisk(): Promise<ParsedPost[]> {
  if (!existsSync(CONTENT_DIR)) {
    console.error(`❌ Pasta não existe: ${CONTENT_DIR}`)
    process.exit(1)
  }
  const entries = await readdir(CONTENT_DIR, { withFileTypes: true })
  const posts: ParsedPost[] = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const mdPath = join(CONTENT_DIR, e.name, 'artigo.md')
    if (!existsSync(mdPath)) continue
    const raw = await readFile(mdPath, 'utf-8')
    const parsed = matter(raw)
    posts.push({
      folder: e.name,
      fm: parsed.data as FrontMatter,
      body: parsed.content.trim(),
    })
  }
  return posts.sort((a, b) => a.folder.localeCompare(b.folder))
}

// ─── Load DB ──────────────────────────────────────────────────────────────

async function loadExistingFromDb(): Promise<Map<string, ExistingPost>> {
  const { data, error } = await supabase.from('blog_posts').select('*')
  if (error) throw error
  return new Map((data as ExistingPost[]).map((p) => [p.slug, p]))
}

// ─── Validation ───────────────────────────────────────────────────────────

interface ValidationResult {
  errors: Array<{ folder: string; reason: string }>
  warnings: string[]
}

function validate(
  posts: ParsedPost[],
  existing: Map<string, ExistingPost>,
): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const warnings: string[] = []
  const validCategories = [
    'alimentacao', 'amamentacao', 'sono', 'desenvolvimento',
    'saude', 'rotina', 'marcos', 'gestacao', 'seguranca',
  ]
  const validSchemas = ['Article', 'HowTo', 'FAQPage']
  const validAudiences = ['gestante', 'parent', 'both']
  const validRoles = ['pilar', 'cluster']

  // Required fields + enum validations
  for (const p of posts) {
    const { fm, folder } = p
    if (!fm.slug) {
      errors.push({ folder, reason: 'slug ausente' })
      continue
    }
    if (!fm.title) errors.push({ folder, reason: 'title ausente' })
    if (!fm.category) errors.push({ folder, reason: 'category ausente' })
    else if (!validCategories.includes(fm.category)) {
      errors.push({ folder, reason: `category inválida: ${fm.category}` })
    }
    if (fm.schema && !validSchemas.includes(fm.schema)) {
      errors.push({ folder, reason: `schema inválido: ${fm.schema}` })
    }
    if (fm.audience && !validAudiences.includes(fm.audience)) {
      errors.push({ folder, reason: `audience inválida: ${fm.audience}` })
    }
    if (fm.role && !validRoles.includes(fm.role)) {
      errors.push({ folder, reason: `role inválida: ${fm.role}` })
    }
    if (!p.body || p.body.length < 100) {
      errors.push({ folder, reason: `body muito curto (${p.body.length} chars)` })
    }
  }

  // Reciprocidade de related_slugs
  const allSlugsFromDisk = new Set(posts.map((p) => p.fm.slug).filter(Boolean) as string[])
  const slugToRelated = new Map<string, string[]>()
  for (const p of posts) {
    if (p.fm.slug && p.fm.related_slugs) {
      slugToRelated.set(p.fm.slug, p.fm.related_slugs)
    }
  }
  for (const p of posts) {
    const mySlug = p.fm.slug
    if (!mySlug) continue
    const myRelated = p.fm.related_slugs ?? []
    for (const target of myRelated) {
      // Target tem que existir em algum lugar (disco OU DB)
      if (!allSlugsFromDisk.has(target) && !existing.has(target)) {
        warnings.push(
          `${mySlug} → ${target}: destino não existe nem em disco nem no DB`,
        )
        continue
      }
      // Reciprocidade: target deve ter mySlug em related_slugs
      const targetRelated =
        slugToRelated.get(target) ??
        (existing.get(target)?.related_slugs ?? [])
      if (!targetRelated.includes(mySlug)) {
        warnings.push(
          `reciprocidade: ${mySlug} → ${target}, mas ${target} não aponta de volta`,
        )
      }
    }
  }

  return { errors, warnings }
}

// ─── Diff (pretty print) ──────────────────────────────────────────────────

function diffField(label: string, before: any, after: any): string | null {
  const b = JSON.stringify(before ?? null)
  const a = JSON.stringify(after ?? null)
  if (b === a) return null
  const brief = (v: any) => {
    const s = JSON.stringify(v ?? null)
    return s.length > 60 ? s.slice(0, 60) + '...' : s
  }
  return `    ${label}: ${brief(before)} → ${brief(after)}`
}

// ─── Build upsert objects ─────────────────────────────────────────────────

function buildUpsertObject(post: ParsedPost, existing: ExistingPost | undefined) {
  const { fm, body, folder } = post
  const now = new Date().toISOString()

  // post_number vem do prefixo numérico da pasta (ex: "13-plano-de-parto" → 13)
  // Preserva o valor do DB se não for detectável no disco
  const numFromFolder = folderNumber(folder)

  return {
    slug: fm.slug!,
    post_number: numFromFolder ?? existing?.post_number ?? null,
    title: pick(fm.title, existing?.title, fm.slug!),
    meta_description: pick(fm.description, existing?.meta_description, null),
    content_md: body,
    keywords: fm.keywords !== undefined
      ? flattenKeywords(fm.keywords)
      : (existing?.keywords ?? []),
    category: pick(fm.category, existing?.category as any, 'rotina'),
    audience: pick(fm.audience, existing?.audience as any, 'both'),
    pillar: pick(fm.pillar, existing?.pillar, null),
    role: pick(fm.role, existing?.role as any, null),
    schema_type: pick(fm.schema, existing?.schema_type as any, 'Article'),
    related_slugs: fm.related_slugs !== undefined
      ? fm.related_slugs
      : (existing?.related_slugs ?? []),
    target_week_start: pick(fm.target_week_start, existing?.target_week_start, null),
    target_week_end: pick(fm.target_week_end, existing?.target_week_end, null),
    sources: fm.sources !== undefined
      ? normalizeSources(fm.sources)
      : (existing?.sources ?? []),
    affiliate_products: pick(fm.affiliate_products, existing?.affiliate_products, []),
    premium_teaser: pick(fm.premium_teaser, existing?.premium_teaser, null),
    image_url: pick(fm.image_url, existing?.image_url, null),
    image_alt: pick(fm.image_alt, existing?.image_alt, null),
    mid_image_url: pick(fm.mid_image_url, existing?.mid_image_url, null),
    status: pick(fm.status, existing?.status as any, 'published'),
    published_at: existing?.published_at ?? now,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const mode = DRY_RUN ? '🔍 DRY RUN (nenhuma mudança será aplicada)' : '🚀 EXECUTE MODE'
  console.log(`[publish-content] ${mode}`)
  console.log(`[publish-content] Lendo posts de ${CONTENT_DIR}...`)

  const [posts, existing] = await Promise.all([
    loadPostsFromDisk(),
    loadExistingFromDb(),
  ])

  console.log(`[publish-content] ${posts.length} posts em disco, ${existing.size} no DB`)

  // Valida
  const { errors, warnings } = validate(posts, existing)
  if (errors.length > 0) {
    console.log('\n❌ ERROS (impede execução):')
    for (const e of errors) console.log(`   ${e.folder}: ${e.reason}`)
    console.log('\n   Corrija os erros acima antes de rodar novamente.')
    process.exit(1)
  }

  // Classifica e mostra diff
  const updates: ParsedPost[] = []
  const inserts: ParsedPost[] = []
  for (const p of posts) {
    if (p.fm.slug && existing.has(p.fm.slug)) updates.push(p)
    else inserts.push(p)
  }

  console.log(`\n📊 ${updates.length} updates · ${inserts.length} inserts\n`)

  if (updates.length > 0) {
    console.log('📝 UPDATES:')
    for (const p of updates) {
      const exist = existing.get(p.fm.slug!)!
      const obj = buildUpsertObject(p, exist)
      console.log(`\n  ${p.fm.slug}`)
      const diffs = [
        diffField('title', exist.title, obj.title),
        diffField('category', exist.category, obj.category),
        diffField('audience', exist.audience, obj.audience),
        diffField('pillar', exist.pillar, obj.pillar),
        diffField('role', exist.role, obj.role),
        diffField('schema_type', exist.schema_type, obj.schema_type),
        diffField('related_slugs', exist.related_slugs, obj.related_slugs),
        diffField(
          'content_md (chars)',
          exist.content_md?.length ?? 0,
          obj.content_md.length,
        ),
        diffField('keywords (count)', exist.keywords?.length ?? 0, obj.keywords.length),
        diffField('premium_teaser', exist.premium_teaser, obj.premium_teaser),
      ].filter(Boolean)
      if (diffs.length === 0) {
        console.log('    (sem mudanças detectadas)')
      } else {
        diffs.forEach((d) => console.log(d))
      }
    }
  }

  if (inserts.length > 0) {
    console.log('\n\n➕ INSERTS:')
    for (const p of inserts) {
      const obj = buildUpsertObject(p, undefined)
      console.log(`\n  ${p.fm.slug}`)
      console.log(`    title: ${obj.title}`)
      console.log(`    category: ${obj.category} · audience: ${obj.audience}`)
      console.log(`    pillar: ${obj.pillar} · role: ${obj.role} · schema: ${obj.schema_type}`)
      console.log(`    content_md: ${obj.content_md.length} chars`)
      console.log(`    related_slugs: ${JSON.stringify(obj.related_slugs)}`)
    }
  }

  if (warnings.length > 0) {
    console.log('\n\n⚠️  WARNINGS (não bloqueiam):')
    for (const w of warnings) console.log(`   - ${w}`)
  }

  if (DRY_RUN) {
    console.log('\n\n💡 Dry-run completo. Rode com `npm run publish:content:execute` para aplicar.')
    return
  }

  // Executa
  console.log('\n\n🚀 Executando upsert...')
  const toUpsert = posts.map((p) =>
    buildUpsertObject(p, existing.get(p.fm.slug!)),
  )

  const { error } = await supabase
    .from('blog_posts')
    .upsert(toUpsert, { onConflict: 'slug' })

  if (error) {
    console.error('❌ Erro do Supabase:', error)
    process.exit(1)
  }

  console.log(`✅ Done. ${toUpsert.length} posts upserted.`)
  console.log(`   (${updates.length} atualizados, ${inserts.length} novos)`)
  console.log('\n   Próximo passo: trigger rebuild do Vercel')
  console.log('     git commit --allow-empty -m "content: batch upsert via script"')
  console.log('     git push origin main')
}

main().catch((e) => {
  console.error('❌ Erro inesperado:', e)
  process.exit(1)
})
