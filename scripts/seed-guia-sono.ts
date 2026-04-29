// ════════════════════════════════════════════════════════════════════════════
// seed-guia-sono.ts
// ════════════════════════════════════════════════════════════════════════════
// Pipeline de carga do "Guia do Sono" (G03):
//   1. Upload de imagens PNG → WebP para bucket guide-images
//   2. Parse do markdown (# TITLE (type: X) / ## Title (type: X, slug: Y))
//   3. Rewrite de image paths locais pelas URLs públicas
//   4. DELETE + INSERT em guide_sections (idempotente)
//
// Como rodar:
//   cd blog && npx tsx ../scripts/seed-guia-sono.ts
//
// Pré-requisitos:
//   - blog/.env com SUPABASE_SERVICE_ROLE_KEY e PUBLIC_SUPABASE_URL
//   - guide com slug='guia-sono' já existe na tabela guides (INSERT SQL)
//   - bucket 'guide-images' público criado
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── Config ───────────────────────────────────────────────────────────────────
const REPO_ROOT      = path.resolve(__dirname, '..')
const CONTENT_DIR    = path.join(REPO_ROOT, 'content', 'infoprodutos', 'guia-sono')
const MD_FILE        = path.join(CONTENT_DIR, 'guia-sono.md')
const IMG_DIR        = path.join(CONTENT_DIR, 'imagens')
const GUIDE_SLUG     = 'guia-sono'
const STORAGE_BUCKET = 'guide-images'
const STORAGE_PREFIX = `${GUIDE_SLUG}/img`

function loadBlogEnv() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const raw = require('fs').readFileSync(path.join(REPO_ROOT, 'blog', '.env'), 'utf-8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
loadBlogEnv()

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltam PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no blog/.env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
const PUBLIC_URL_BASE = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`

// ── Helpers ──────────────────────────────────────────────────────────────────
function estimateMinutes(text: string): number {
  const words = text.replace(/[#*`>\[\]()]/g, '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

// ── Step 1: Upload imagens ────────────────────────────────────────────────────
async function uploadImages(): Promise<Map<string, string>> {
  const imagePathMap = new Map<string, string>()
  const files = await fs.readdir(IMG_DIR)
  const pngs = files.filter(f => /\.(png|jpe?g)$/i.test(f))

  console.log(`\n📸 Convertendo e fazendo upload de ${pngs.length} imagens…`)

  for (const file of pngs) {
    const source = path.join(IMG_DIR, file)
    const baseName = file.replace(/\.[^.]+$/, '')
    const remoteName = `${baseName}.webp`
    const remotePath = `${STORAGE_PREFIX}/${remoteName}`

    const webpBuffer = await sharp(source)
      .webp({ quality: 82, effort: 4 })
      .toBuffer()

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(remotePath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000',
      })

    if (error) { console.error(`  ✗ ${file}: ${error.message}`); continue }

    const publicUrl = `${PUBLIC_URL_BASE}/${remotePath}`
    // Register under multiple path variants so rewrite hits any reference format
    imagePathMap.set(file, publicUrl)
    imagePathMap.set(`imagens/${file}`, publicUrl)
    imagePathMap.set(`guia-sono/imagens/${file}`, publicUrl)
    imagePathMap.set(baseName, publicUrl) // without extension (for cover lookup)

    const kb = (await fs.stat(source)).size / 1024
    console.log(`  ✓ ${file} (${kb.toFixed(0)}KB → ${(webpBuffer.length / 1024).toFixed(0)}KB WebP)`)
  }

  return imagePathMap
}

// ── Step 2: Parser ────────────────────────────────────────────────────────────
interface ParsedSection {
  type: 'part' | 'linear' | 'flashcards' | 'checklist' | 'quiz'
  title: string
  slug: string
  parent: string | null
  estimated_minutes: number
  cover_image_url?: string
  content_md?: string
  data?: Record<string, unknown>
  is_preview?: boolean
  flags?: Record<string, boolean>
}

function rewriteImagePaths(md: string, imageMap: Map<string, string>): string {
  return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt: string, src: string) => {
    const cleaned = src.trim()
    const url =
      imageMap.get(cleaned) ??
      imageMap.get(cleaned.replace(/^guia-sono\/imagens\//, '')) ??
      imageMap.get(path.basename(cleaned))
    return url ? `![${alt}](${url})` : full
  })
}

/**
 * Extracts type and slug from inline metadata like (type: linear, slug: intro-o-que-e)
 * Finds the LAST occurrence of (type: to handle titles with parentheses like (0-3 MESES)
 */
function parseHeadingMeta(line: string): { title: string; type: string; slug: string | null } {
  const typeIdx = line.lastIndexOf('(type:')
  if (typeIdx === -1) {
    const title = line.replace(/^#{1,2}\s+/, '').trim()
    return { title, type: 'linear', slug: null }
  }
  // Title is everything between heading prefix and the (type: marker
  const afterHashes = line.slice(line.indexOf(' ') + 1)
  const title = afterHashes.slice(0, afterHashes.lastIndexOf('(type:')).trim()
  const metaStr = line.slice(typeIdx + 1, line.lastIndexOf(')')).trim()
  const typeMatch = metaStr.match(/type:\s*(\w+)/)
  const slugMatch = metaStr.match(/slug:\s*([\w-]+)/)
  return {
    title,
    type: typeMatch?.[1] ?? 'linear',
    slug: slugMatch?.[1] ?? null,
  }
}

function derivePartSlug(rawTitle: string): string {
  // MODULO N: ... → modulo-N
  const modMatch = rawTitle.match(/MODULO\s+(\d+)/i)
  if (modMatch) return `modulo-${modMatch[1]}`
  // CONCLUSAO → conclusao, BONUS: QUIZ... → bonus-quiz, etc.
  return rawTitle
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function extractContentMd(block: string, imageMap: Map<string, string>): string | undefined {
  const re = /\*\*content_md:\*\*\s*```markdown\s*([\s\S]*?)```/
  const m = block.match(re)
  if (!m) return undefined
  return rewriteImagePaths(m[1].trim(), imageMap)
}

function extractJsonData(block: string): Record<string, unknown> | undefined {
  const re = /\*\*data:\*\*\s*```json\s*([\s\S]*?)```/
  const m = block.match(re)
  if (!m) return undefined
  try {
    return JSON.parse(m[1].trim())
  } catch (e) {
    console.error(`  ✗ JSON inválido: ${e}`)
    return undefined
  }
}

// Sections to mark as is_preview (free sample visible on landing page)
const PREVIEW_SLUGS = new Set(['intro-o-que-e'])

function parseMarkdown(md: string, imageMap: Map<string, string>): ParsedSection[] {
  const sections: ParsedSection[] = []
  const blocks = md.split(/\n---\n/)

  let currentPartSlug: string | null = null

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    const firstLine = trimmed.split('\n')[0].trim()

    // Determine heading level
    const isH1 = firstLine.startsWith('# ') && !firstLine.startsWith('## ')
    const isH2 = firstLine.startsWith('## ')

    if (!isH1 && !isH2) continue

    // Skip preamble (title block at top of file with no type metadata)
    if (!firstLine.includes('(type:') && !isH2) continue

    if (isH1) {
      const { title, type, slug: explicitSlug } = parseHeadingMeta(firstLine)

      // Skip # flags: lines (within a block, not first line, so shouldn't hit here)
      if (title.toLowerCase().startsWith('flags:')) continue

      if (type === 'part') {
        const slug = derivePartSlug(title)
        // Map part slug to expected cover image name
        const coverKey = `hero-${slug}` // matches 'hero-introducao', 'hero-modulo-1', etc.
        const cover_image_url = imageMap.get(coverKey)
        const content_md = extractContentMd(trimmed, imageMap)
        const estimated_minutes = content_md ? estimateMinutes(content_md) : 2

        sections.push({
          type: 'part',
          title,
          slug,
          parent: null,
          estimated_minutes,
          cover_image_url,
          content_md: content_md ?? '',
        })
        currentPartSlug = slug

      } else {
        // Root-level section: conclusao, bonus sections
        const slug = explicitSlug ?? derivePartSlug(title)
        const content_md = type === 'linear' ? extractContentMd(trimmed, imageMap) : undefined
        const data = ['flashcards', 'checklist', 'quiz'].includes(type)
          ? extractJsonData(trimmed) : undefined
        const estimated_minutes = content_md ? estimateMinutes(content_md) : 3

        // Parse optional # flags: line (e.g. in CONCLUSAO block)
        const flagsLine = trimmed.split('\n').find(l => /^#\s+flags:/i.test(l))
        let flags: Record<string, boolean> | undefined
        if (flagsLine) {
          flags = {}
          const raw = flagsLine.replace(/^#\s+flags:\s*/i, '')
          for (const pair of raw.split(',')) {
            const [k, v] = pair.trim().split(':').map(s => s.trim())
            if (k && v) flags[k] = v.toLowerCase() === 'true'
          }
        }

        sections.push({ type: type as ParsedSection['type'], title, slug, parent: null, estimated_minutes, content_md, data, flags })
      }

    } else if (isH2) {
      const { title, type, slug: explicitSlug } = parseHeadingMeta(firstLine)
      const slug = explicitSlug ?? derivePartSlug(title)
      const content_md = type === 'linear' ? extractContentMd(trimmed, imageMap) : undefined
      const data = ['flashcards', 'checklist', 'quiz'].includes(type)
        ? extractJsonData(trimmed) : undefined
      const estimated_minutes = content_md ? estimateMinutes(content_md) : 3

      sections.push({
        type: type as ParsedSection['type'],
        title,
        slug,
        parent: currentPartSlug,
        estimated_minutes,
        content_md,
        data,
        is_preview: PREVIEW_SLUGS.has(slug),
      })
    }
  }

  // Post-process: set part estimated_minutes to sum of children
  const childMinutesByParent = new Map<string, number>()
  for (const s of sections) {
    if (s.parent) {
      childMinutesByParent.set(s.parent, (childMinutesByParent.get(s.parent) ?? 0) + s.estimated_minutes)
    }
  }
  for (const s of sections) {
    if (s.type === 'part' && childMinutesByParent.has(s.slug)) {
      s.estimated_minutes = childMinutesByParent.get(s.slug)!
    }
  }

  return sections
}

// ── Step 3: Persiste no DB ────────────────────────────────────────────────────
async function persistSections(parsed: ParsedSection[]) {
  const { data: guide, error: guideErr } = await supabase
    .from('guides')
    .select('id')
    .eq('slug', GUIDE_SLUG)
    .single()

  if (guideErr || !guide) {
    throw new Error(
      `Guide '${GUIDE_SLUG}' não encontrado. Execute o SQL de criação primeiro:\n` +
      `  INSERT INTO guides (slug, title, ...) VALUES ('guia-sono', ...);`
    )
  }
  const guideId = guide.id as string

  console.log(`\n🗑️  Apagando seções existentes do guide…`)
  await supabase.from('guide_sections').delete().eq('guide_id', guideId)

  const slugToId = new Map<string, string>()

  // Insert parts first
  const parts    = parsed.filter(s => s.type === 'part')
  const children = parsed.filter(s => s.type !== 'part')

  console.log(`\n📝 Inserindo ${parts.length} partes…`)
  let partOrder = 0
  for (const part of parts) {
    const { data, error } = await supabase
      .from('guide_sections')
      .insert({
        guide_id:          guideId,
        parent_id:         null,
        order_index:       partOrder++,
        slug:              part.slug,
        title:             part.title,
        content_md:        part.content_md ?? '',
        type:              'part',
        data:              null,
        estimated_minutes: part.estimated_minutes,
        cover_image_url:   part.cover_image_url ?? null,
        is_preview:        false,
      })
      .select('id')
      .single()

    if (error) throw new Error(`Falha INSERT part "${part.title}": ${error.message}`)
    slugToId.set(part.slug, data.id)
    console.log(`  ✓ [part] ${part.slug}  (cover: ${part.cover_image_url ? '✓' : '—'})`)
  }

  // Mark intro section as preview
  if (slugToId.has('introducao')) {
    await supabase.from('guide_sections')
      .update({ is_preview: true })
      .eq('id', slugToId.get('introducao'))
    console.log(`  👁️  Introdução marcada como preview`)
  }

  // Insert children + root non-part sections
  console.log(`\n📝 Inserindo ${children.length} seções…`)
  const orderByParent = new Map<string, number>()
  let totalOk = 0

  // Group: root sections (parent=null) come after all part children
  const rootSections = children.filter(s => s.parent === null)
  const childSections = children.filter(s => s.parent !== null)

  for (const sec of [...childSections, ...rootSections]) {
    const parentSlug = sec.parent
    const parentId = parentSlug ? slugToId.get(parentSlug) : null

    if (parentSlug && !parentId) {
      console.warn(`  ⚠️  Parent '${parentSlug}' não encontrado para "${sec.title}" — pulando`)
      continue
    }

    const orderKey = parentSlug ?? '__root__'
    const orderIndex = orderByParent.get(orderKey) ?? 0
    orderByParent.set(orderKey, orderIndex + 1)

    const { data: inserted, error } = await supabase
      .from('guide_sections')
      .insert({
        guide_id:          guideId,
        parent_id:         parentId ?? null,
        order_index:       orderIndex,
        slug:              sec.slug,
        title:             sec.title,
        content_md:        sec.content_md ?? '',
        type:              sec.type,
        data:              sec.data ?? null,
        estimated_minutes: sec.estimated_minutes,
        cover_image_url:   null,
        is_preview:        sec.is_preview ?? false,
      })
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ "${sec.title}": ${error.message}`)
      continue
    }

    slugToId.set(sec.slug, inserted.id)
    totalOk++

    const typeLabel = sec.type === 'flashcards' ? '🃏'
      : sec.type === 'checklist' ? '📋'
      : sec.type === 'quiz' ? '❓'
      : '📄'
    const previewTag = sec.is_preview ? ' [preview]' : ''
    console.log(`  ${typeLabel} [${sec.type}] ${sec.slug}${previewTag}`)
  }

  // Apply flags to special sections
  for (const sec of parsed) {
    if (sec.flags && slugToId.has(sec.slug)) {
      await supabase.from('guide_sections')
        .update({ data: sec.flags })
        .eq('id', slugToId.get(sec.slug))
      console.log(`\n  🏁 ${sec.slug}: flags aplicadas →`, sec.flags)
    }
  }

  // Conclusao fallback (in case flags line wasn't parsed)
  const conclusaoId = slugToId.get('conclusao-guia-sono')
  if (conclusaoId) {
    await supabase.from('guide_sections')
      .update({ data: { hide_completion_btn: true, show_nps: true, show_yaya_cta: true } })
      .eq('id', conclusaoId)
    console.log(`  🏁 conclusao-guia-sono: flags hide_completion_btn + show_nps + show_yaya_cta aplicadas`)
  }

  console.log(`\n✅ Total: ${parts.length} parts + ${totalOk} seções inseridas`)
}

// ── Step 4: Atualiza cover do guide ──────────────────────────────────────────
async function updateGuideCover(imageMap: Map<string, string>) {
  const heroUrl = imageMap.get('hero-introducao') ?? imageMap.get('hero-introducao.png')
  if (!heroUrl) {
    console.warn('⚠️  hero-introducao não encontrada — cover_image_url não atualizada')
    return
  }
  await supabase.from('guides').update({ cover_image_url: heroUrl }).eq('slug', GUIDE_SLUG)
  console.log(`\n🖼️  guides.cover_image_url atualizada`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Seed do Guia do Sono (G03)\n`)

  const imageMap = await uploadImages()
  await updateGuideCover(imageMap)

  const md = await fs.readFile(MD_FILE, 'utf-8')
  console.log(`\n📄 Markdown: ${(md.length / 1024).toFixed(1)}KB`)

  const parsed = parseMarkdown(md, imageMap)
  const parts    = parsed.filter(s => s.type === 'part')
  const children = parsed.filter(s => s.type !== 'part')
  console.log(`📊 Parsed: ${parts.length} parts + ${children.length} seções`)
  console.log(`   Types: ${[...new Set(parsed.map(s => s.type))].join(', ')}\n`)

  await persistSections(parsed)

  console.log(`\n🎉 Pronto! Acessa /admin/biblioteca/guia-sono para revisar.`)
  console.log(`\nPróximos passos:`)
  console.log(`  1. Criar Stripe price_id no dashboard (R$67)`)
  console.log(`     UPDATE guides SET stripe_price_id = 'price_xxx' WHERE slug = 'guia-sono';`)
  console.log(`  2. Publicar após revisão:`)
  console.log(`     UPDATE guides SET status = 'published' WHERE slug = 'guia-sono';`)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
