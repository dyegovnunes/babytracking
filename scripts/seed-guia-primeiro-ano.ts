// ════════════════════════════════════════════════════════════════════════════
// seed-guia-primeiro-ano.ts
// ════════════════════════════════════════════════════════════════════════════
// Pipeline de carga do "Guia do Primeiro Ano" (G02):
//   1. Upload de imagens PNG → WebP para bucket guide-images
//   2. Parse do markdown self-describing (cada ## SEÇÃO: traz type/slug/parent/data)
//   3. Rewrite de image paths locais pelas URLs públicas
//   4. DELETE + INSERT em guide_sections (idempotente)
//
// Como rodar:
//   cd blog && npx tsx ../scripts/seed-guia-primeiro-ano.ts
//
// Pré-requisitos:
//   - blog/.env com SUPABASE_SERVICE_ROLE_KEY e PUBLIC_SUPABASE_URL
//   - guide com slug='primeiro-ano' já existe na tabela guides (migration SQL)
//   - bucket 'guide-images' público criado
//   - Stripe price_id já atualizado: UPDATE guides SET stripe_price_id='price_xxx' WHERE slug='primeiro-ano'
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// ── Config ───────────────────────────────────────────────────────────────────
const REPO_ROOT   = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(REPO_ROOT, 'content', 'infoprodutos', 'guia-primeiro-ano')
const MD_FILE     = path.join(CONTENT_DIR, 'guia-primeiro-ano.md')
const IMG_DIR     = path.join(CONTENT_DIR, 'imagens')
const GUIDE_SLUG  = 'primeiro-ano'
const STORAGE_BUCKET = 'guide-images'
const STORAGE_PREFIX = `${GUIDE_SLUG}/img`

function loadBlogEnv() {
  const envPath = path.join(REPO_ROOT, 'blog', '.env')
  const raw = require('fs').readFileSync(envPath, 'utf-8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
loadBlogEnv()

const SUPABASE_URL  = process.env.PUBLIC_SUPABASE_URL!
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY!
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

  console.log(`📸 Convertendo e fazendo upload de ${pngs.length} imagens…`)

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
    imagePathMap.set(file, publicUrl)
    imagePathMap.set(`imagens/${file}`, publicUrl)
    const kb = (await fs.stat(source)).size / 1024
    console.log(`  ✓ ${file} (${kb.toFixed(0)}KB → ${(webpBuffer.length / 1024).toFixed(0)}KB WebP)`)
  }

  return imagePathMap
}

// ── Step 2: Parser do markdown self-describing ────────────────────────────────
//
// O G02 usa ## SEÇÃO: como marcador. Cada bloco contém metadados explícitos:
//   **type:** `linear` | `part` | `flashcards` | `checklist` | `quiz`
//   **slug:** `slug-da-secao`
//   **parent:** `slug-da-part-pai` (ausente em parts)
//   **estimated_minutes:** N
//   **cover_image_url:** `path/no/storage.webp`  (em parts)
//   **content_md:** ```markdown ... ```  (em sections lineares)
//   **data (JSON):** ```json ... ```  (em flashcards/checklist/quiz)

interface ParsedSection {
  type: 'part' | 'linear' | 'flashcards' | 'checklist' | 'quiz'
  title: string
  slug: string
  parent: string | null
  estimated_minutes: number
  cover_image_url?: string
  content_md?: string
  data?: Record<string, unknown>
}

function rewriteImagePaths(md: string, imageMap: Map<string, string>): string {
  return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt: string, src: string) => {
    const cleaned = src.trim().replace(/^\.\//, '')
    const url = imageMap.get(cleaned) ?? imageMap.get(path.basename(cleaned))
    return url ? `![${alt}](${url})` : full
  })
}

// Rewrite de paths de imagem no storage (cover_image_url usa path relativo no MD)
function resolveStorageUrl(relativePath: string): string {
  // "primeiro-ano/img/hero-modulo-1.webp" → URL pública completa
  return `${PUBLIC_URL_BASE}/${relativePath}`
}

function extractMetaValue(block: string, key: string): string | null {
  // Aceita dois formatos:
  //   **key:** `valor`   (colon dentro do bold — formato atual do G02)
  //   **key**: `valor`   (colon fora do bold — formato legado)
  const re = new RegExp(`\\*\\*${key}:?[^*]*\\*\\*:?\\s*\`([^\`]+)\``)
  const m = block.match(re)
  return m ? m[1].trim() : null
}

function extractCodeBlock(block: string, lang: string): string | null {
  const re = new RegExp(`\`\`\`${lang}\\s*([\\s\\S]*?)\`\`\``)
  const m = block.match(re)
  return m ? m[1].trim() : null
}

function parseMarkdown(md: string, imageMap: Map<string, string>): ParsedSection[] {
  const sections: ParsedSection[] = []

  // Divide o documento em blocos pelo marcador ## SEÇÃO:
  const raw = md.split(/^## SEÇÃO:/m).slice(1) // slice(1) descarta o que vem antes da primeira seção

  for (const block of raw) {
    const lines = block.split('\n')
    const title = lines[0].trim()

    const typeRaw  = extractMetaValue(block, 'type')
    const slug     = extractMetaValue(block, 'slug')
    const parentRaw = extractMetaValue(block, 'parent')
    const parent   = parentRaw === 'null' ? null : parentRaw  // `null` literal → null real
    const estMin   = extractMetaValue(block, 'estimated_minutes')
    const coverRaw = extractMetaValue(block, 'cover_image_url')

    if (!typeRaw || !slug) {
      console.warn(`  ⚠️  Seção "${title}" sem type/slug — pulando`)
      continue
    }

    const type = typeRaw as ParsedSection['type']
    const estimated_minutes = estMin ? parseInt(estMin, 10) : 3

    // cover_image_url: resolve para URL pública completa
    const cover_image_url = coverRaw ? resolveStorageUrl(coverRaw) : undefined

    // content_md (seções lineares e parts com intro)
    const rawMd = extractCodeBlock(block, 'markdown')
    const content_md = rawMd
      ? rewriteImagePaths(rawMd, imageMap)
      : undefined

    // data JSON (flashcards, checklist, quiz)
    let data: Record<string, unknown> | undefined
    const rawJson = extractCodeBlock(block, 'json')
    if (rawJson) {
      try {
        data = JSON.parse(rawJson)
      } catch (e) {
        console.error(`  ✗ JSON inválido em "${title}": ${e}`)
      }
    }

    sections.push({
      type,
      title,
      slug,
      parent: parent ?? null,
      estimated_minutes,
      cover_image_url,
      content_md,
      data,
    })
  }

  return sections
}

// ── Step 3: Persiste no DB ────────────────────────────────────────────────────
async function persistSections(parsed: ParsedSection[]) {
  // Busca o guide
  const { data: guide, error: guideErr } = await supabase
    .from('guides')
    .select('id')
    .eq('slug', GUIDE_SLUG)
    .single()

  if (guideErr || !guide) {
    throw new Error(
      `Guide '${GUIDE_SLUG}' não encontrado. Rode a migration SQL primeiro:\n` +
      `  supabase db push  (inclui 20260429_seed_guia_primeiro_ano.sql)`
    )
  }
  const guideId = guide.id as string

  // Idempotente: apaga seções existentes
  console.log(`🗑️  Apagando seções existentes do guide…`)
  await supabase.from('guide_sections').delete().eq('guide_id', guideId)

  // Mapa slug → uuid (para resolver parent_id)
  const slugToId = new Map<string, string>()

  // Ordena: parts primeiro, depois filhas (para ter parent_id disponível)
  const parts    = parsed.filter(s => s.type === 'part')
  const children = parsed.filter(s => s.type !== 'part')

  // Insere parts
  console.log(`\n📝 Inserindo ${parts.length} partes…`)
  let partOrder = 0
  for (const part of parts) {
    const { data, error } = await supabase
      .from('guide_sections')
      .insert({
        guide_id:           guideId,
        parent_id:          null,
        order_index:        partOrder++,
        slug:               part.slug,
        title:              part.title,
        content_md:         part.content_md ?? '',
        type:               'part',
        data:               null,
        estimated_minutes:  part.estimated_minutes,
        cover_image_url:    part.cover_image_url ?? null,
        is_preview:         false,
      })
      .select('id')
      .single()

    if (error) throw new Error(`Falha INSERT part "${part.title}": ${error.message}`)
    slugToId.set(part.slug, data.id)
    console.log(`  ✓ [part] ${part.slug}  (cover: ${part.cover_image_url ? '✓' : '—'})`)
  }

  // Marca Introdução como preview (amostra grátis)
  if (slugToId.has('introducao')) {
    await supabase
      .from('guide_sections')
      .update({ is_preview: true })
      .eq('id', slugToId.get('introducao'))
    console.log(`  👁️  Introdução marcada como preview`)
  }

  // Insere filhas agrupadas por parent
  console.log(`\n📝 Inserindo ${children.length} seções filhas…`)
  const orderByParent = new Map<string, number>()
  let totalOk = 0

  for (const sec of children) {
    const parentSlug = sec.parent  // null = seção raiz (conclusão, quiz bônus)

    const parentId = parentSlug ? slugToId.get(parentSlug) : null
    if (parentSlug && !parentId) {
      console.warn(`  ⚠️  Parent '${parentSlug}' não encontrado para "${sec.title}" — pulando`)
      continue
    }

    const orderKey = parentSlug ?? '__root__'
    const orderIndex = orderByParent.get(orderKey) ?? 0
    orderByParent.set(orderKey, orderIndex + 1)

    const { error } = await supabase.from('guide_sections').insert({
      guide_id:          guideId,
      parent_id:         parentId ?? null,
      order_index:       orderIndex,
      slug:              sec.slug,
      title:             sec.title,
      content_md:        sec.content_md ?? '',
      type:              sec.type,
      data:              sec.data ?? null,
      estimated_minutes: sec.estimated_minutes,
      cover_image_url:   sec.cover_image_url ?? null,
      is_preview:        false,
    })

    if (error) {
      console.error(`  ✗ "${sec.title}": ${error.message}`)
    } else {
      totalOk++
      const typeLabel = sec.type === 'flashcards' ? '🃏' : sec.type === 'checklist' ? '📋' : sec.type === 'quiz' ? '❓' : '📄'
      console.log(`  ${typeLabel} [${sec.type}] ${sec.slug}`)
    }
  }

  // Aplica flags especiais na Conclusão
  const { data: conclusao } = await supabase
    .from('guide_sections')
    .select('id')
    .eq('guide_id', guideId)
    .eq('slug', 'conclusao')
    .single()

  if (conclusao) {
    await supabase
      .from('guide_sections')
      .update({ data: { hide_completion_btn: true, show_nps: true, show_yaya_cta: true } })
      .eq('id', conclusao.id)
    console.log(`\n  🏁 Conclusão: flags hide_completion_btn + show_nps + show_yaya_cta aplicadas`)
  }

  console.log(`\n✅ Total: ${parts.length} parts + ${totalOk} seções inseridas`)
}

// ── Step 4: Atualiza cover do guide ──────────────────────────────────────────
async function updateGuideCover(imageMap: Map<string, string>) {
  const heroUrl = imageMap.get('hero-intro.png') ?? imageMap.get('imagens/hero-intro.png')
  if (!heroUrl) {
    console.log('⚠️  hero-intro.png não encontrada no imageMap — cover_image_url não atualizada')
    return
  }
  await supabase.from('guides').update({ cover_image_url: heroUrl }).eq('slug', GUIDE_SLUG)
  console.log(`🖼️  guides.cover_image_url atualizada`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Seed do Guia do Primeiro Ano (G02)\n`)

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

  console.log(`\n🎉 Pronto! Acessa /admin/biblioteca/primeiro-ano para revisar.`)
  console.log(`\nPróximos passos:`)
  console.log(`  1. Criar Stripe price_id no dashboard`)
  console.log(`     UPDATE guides SET stripe_price_id = 'price_xxx' WHERE slug = 'primeiro-ano';`)
  console.log(`  2. Publicar após revisão:`)
  console.log(`     UPDATE guides SET published = true WHERE slug = 'primeiro-ano';`)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
