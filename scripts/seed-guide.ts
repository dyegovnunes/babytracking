// ════════════════════════════════════════════════════════════════════════════
// scripts/seed-guide.ts
// ════════════════════════════════════════════════════════════════════════════
// Pipeline unificado de seed para qualquer guia da Sua Biblioteca Yaya.
// Substitui os scripts seed-guia-*.ts individuais.
//
// Como rodar:
//   cd blog && npx tsx ../scripts/seed-guide.ts <slug-do-guia>
//
// Convenções esperadas (ver docs/biblioteca/MANUAL_DE_ESTILO.md):
//   content/infoprodutos/<slug>/
//     ├── <slug>.md           markdown self-describing
//     └── imagens/            PNGs/JPGs (convertidos pra WebP no upload)
//
// Pré-requisitos:
//   - blog/.env com SUPABASE_SERVICE_ROLE_KEY e PUBLIC_SUPABASE_URL
//   - guide com slug=<slug> já existe na tabela guides (criar via SQL/admin antes)
//   - bucket 'guide-images' público criado
// ════════════════════════════════════════════════════════════════════════════

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import {
  loadBlogEnv,
  createSupabaseAdmin,
  uploadImages,
  hashText,
} from './lib/seed-utils'
import { parseGuideMarkdown, ParsedSection } from './lib/md-parser'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Config / args ───────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..')
const STORAGE_BUCKET = 'guide-images'

function getSlugFromArgs(): string {
  const args = process.argv.slice(2)
  // Aceita: `seed-guide.ts <slug>` OU `seed-guide.ts --slug=<slug>`
  for (const arg of args) {
    if (arg.startsWith('--slug=')) return arg.slice('--slug='.length)
    if (!arg.startsWith('--')) return arg
  }
  console.error('Uso: npx tsx scripts/seed-guide.ts <slug-do-guia>')
  console.error('Exemplo: npx tsx scripts/seed-guide.ts ultimas-semanas')
  process.exit(1)
}

loadBlogEnv(REPO_ROOT)
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!
const supabase = createSupabaseAdmin()

const GUIDE_SLUG = getSlugFromArgs()
const CONTENT_DIR = path.join(REPO_ROOT, 'content', 'infoprodutos', GUIDE_SLUG)
const MD_FILE = path.join(CONTENT_DIR, `${GUIDE_SLUG}.md`)
const IMG_DIR = path.join(CONTENT_DIR, 'imagens')
const STORAGE_PREFIX = `${GUIDE_SLUG}/img`
const PUBLIC_URL_BASE = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`

// ── Persistência ────────────────────────────────────────────────────────────

interface PersistResult {
  guideId: string
  totalParts: number
  totalChildren: number
  errors: string[]
  /** slug → uuid pra linhas inseridas (pra hook de áudio) */
  slugToId: Map<string, string>
}

async function persistSections(parsed: ParsedSection[]): Promise<PersistResult> {
  const errors: string[] = []
  const slugToId = new Map<string, string>()

  // Pega o guide
  const { data: guide, error: guideErr } = await supabase
    .from('guides')
    .select('id')
    .eq('slug', GUIDE_SLUG)
    .single()

  if (guideErr || !guide) {
    throw new Error(
      `Guide '${GUIDE_SLUG}' não encontrado. Cadastre antes via SQL ou admin.\n` +
      `Exemplo: INSERT INTO guides (slug, title, price_cents, status) VALUES ('${GUIDE_SLUG}', 'Título', 4700, 'draft');`,
    )
  }
  const guideId = guide.id as string

  // Cleanup idempotente. Apaga FKs dependentes primeiro pra não bater em RLS silencioso.
  console.log(`🗑️  Apagando seções existentes do guide…`)
  const { data: existingSections } = await supabase
    .from('guide_sections').select('id').eq('guide_id', guideId)
  const existingIds = (existingSections ?? []).map((s: { id: string }) => s.id)

  if (existingIds.length > 0) {
    const dependentTables = [
      'guide_ratings',
      'guide_highlights',
      'guide_notes',
      'guide_progress',
      'guide_checklist_state',
      'guide_milestones',
      'guide_audio_segments',
    ]
    for (const table of dependentTables) {
      // Tenta deletar; tabela pode não existir ainda (migrations antigas) — ignora.
      const { error } = await supabase.from(table).delete().in('section_id', existingIds)
      if (error && !/does not exist/i.test(error.message)) {
        console.warn(`  ⚠️  delete em ${table}: ${error.message}`)
      }
    }
    // Filhas antes das pais (parent_id é self-ref)
    await supabase.from('guide_sections').delete().eq('guide_id', guideId).not('parent_id', 'is', null)
    await supabase.from('guide_sections').delete().eq('guide_id', guideId)
  }

  // Separa parts (raiz) de filhas
  const parts = parsed.filter(s => s.type === 'part')
  const children = parsed.filter(s => s.type !== 'part')

  console.log(`\n📝 Inserindo ${parts.length} partes…`)
  let partOrder = 0
  for (const part of parts) {
    const { data, error } = await supabase
      .from('guide_sections')
      .insert({
        guide_id: guideId,
        parent_id: null,
        order_index: partOrder++,
        slug: part.slug,
        title: part.title,
        content_md: part.content_md ?? '',
        type: part.type,
        category: part.category,
        data: part.data ?? null,
        estimated_minutes: part.estimated_minutes,
        cover_image_url: part.cover_image_url ?? null,
        is_preview: part.is_preview,
      })
      .select('id')
      .single()

    if (error) {
      errors.push(`Falha INSERT part "${part.title}": ${error.message}`)
      continue
    }
    slugToId.set(part.slug, data.id)
    console.log(`  ✓ [part] ${part.slug}  (cover: ${part.cover_image_url ? '✓' : '—'}, preview: ${part.is_preview ? '✓' : '—'})`)
  }

  console.log(`\n📝 Inserindo ${children.length} seções filhas…`)
  const orderByParent = new Map<string, number>()
  let totalOk = 0

  for (const sec of children) {
    const parentSlug = sec.parent
    const parentId = parentSlug ? slugToId.get(parentSlug) : null

    if (parentSlug && !parentId) {
      errors.push(`Parent '${parentSlug}' não encontrado para "${sec.title}" — pulando`)
      continue
    }

    const orderKey = parentSlug ?? '__root__'
    const orderIndex = orderByParent.get(orderKey) ?? 0
    orderByParent.set(orderKey, orderIndex + 1)

    const { data, error } = await supabase.from('guide_sections').insert({
      guide_id: guideId,
      parent_id: parentId ?? null,
      order_index: orderIndex,
      slug: sec.slug,
      title: sec.title,
      content_md: sec.content_md ?? '',
      type: sec.type,
      category: sec.category,
      data: sec.data ?? null,
      estimated_minutes: sec.estimated_minutes,
      cover_image_url: sec.cover_image_url ?? null,
      is_preview: sec.is_preview,
    }).select('id').single()

    if (error) {
      errors.push(`"${sec.title}": ${error.message}`)
      continue
    }
    slugToId.set(sec.slug, data.id)
    totalOk++

    const typeLabel = sec.type === 'flashcards' ? '🃏'
      : sec.type === 'checklist' ? '📋'
      : sec.type === 'quiz' ? '❓'
      : '📄'
    const previewLabel = sec.is_preview ? ' 👁️' : ''
    console.log(`  ${typeLabel} [${sec.type}/${sec.category}] ${sec.slug}${previewLabel}`)
  }

  return {
    guideId,
    totalParts: parts.length,
    totalChildren: totalOk,
    errors,
    slugToId,
  }
}

// ── Cover do guide (a partir de hero-lp ou hero-intro) ──────────────────────

async function updateGuideCover(imageMap: Map<string, string>) {
  const candidates = ['hero-lp.png', 'hero-intro.png', 'cover.png', 'capa.png']
  let heroUrl: string | undefined
  for (const c of candidates) {
    heroUrl = imageMap.get(c) ?? imageMap.get(`imagens/${c}`)
    if (heroUrl) break
  }
  if (!heroUrl) {
    console.log('⚠️  hero-lp.png / hero-intro.png não encontrada — guides.cover_image_url não atualizada')
    return
  }
  await supabase.from('guides').update({ cover_image_url: heroUrl }).eq('slug', GUIDE_SLUG)
  console.log(`🖼️  guides.cover_image_url atualizada: ${heroUrl}`)
}

// ── Hook de áudio (no-op por enquanto; integrado em etapa posterior) ────────

async function maybeGenerateAudio(parsed: ParsedSection[], slugToId: Map<string, string>) {
  // Só dispara se o env `GENERATE_AUDIO=1` estiver setado e a edge function existir.
  if (process.env.GENERATE_AUDIO !== '1') {
    console.log(`\n🔇 Áudio TTS não gerado (defina GENERATE_AUDIO=1 pra ativar).`)
    return
  }
  console.log(`\n🎙️  Disparando geração de áudio TTS para seções linear…`)

  const linearSections = parsed.filter(s => s.type === 'linear' && s.content_md)
  for (const sec of linearSections) {
    const sectionId = slugToId.get(sec.slug)
    if (!sectionId) continue
    const textHash = hashText(sec.content_md ?? '')

    const { error } = await supabase.functions.invoke('generate-guide-audio', {
      body: { section_id: sectionId, text_hash: textHash },
    })
    if (error) {
      console.warn(`  ⚠️  ${sec.slug}: ${error.message ?? 'erro desconhecido'}`)
    } else {
      console.log(`  🎵 ${sec.slug}: OK`)
    }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 Seed do guia "${GUIDE_SLUG}"\n`)
  console.log(`   Diretório: ${CONTENT_DIR}`)
  console.log(`   Markdown:  ${MD_FILE}`)
  console.log(`   Imagens:   ${IMG_DIR}\n`)

  // 1) Validações de existência
  try {
    await fs.access(MD_FILE)
  } catch {
    console.error(`❌ Markdown não encontrado: ${MD_FILE}`)
    console.error(`   Crie a pasta ${CONTENT_DIR} e o arquivo ${GUIDE_SLUG}.md.`)
    console.error(`   Use content/infoprodutos/_template/ como ponto de partida.`)
    process.exit(1)
  }

  // 2) Upload de imagens (gera o imageMap)
  const imageMap = await uploadImages({
    imgDir: IMG_DIR,
    bucket: STORAGE_BUCKET,
    prefix: STORAGE_PREFIX,
    supabase,
    publicUrlBase: PUBLIC_URL_BASE,
  })

  // 3) Atualiza cover do guide
  await updateGuideCover(imageMap)

  // 4) Lê e faz parse do markdown
  const md = await fs.readFile(MD_FILE, 'utf-8')
  console.log(`\n📄 Markdown: ${(md.length / 1024).toFixed(1)}KB`)

  const { sections, warnings, errors: parseErrors } = parseGuideMarkdown(md, {
    imageMap,
    publicUrlBase: PUBLIC_URL_BASE,
  })

  if (warnings.length > 0) {
    console.log(`\n⚠️  Avisos do parser (${warnings.length}):`)
    for (const w of warnings) console.log(`   • ${w}`)
  }
  if (parseErrors.length > 0) {
    console.error(`\n❌ Erros do parser (${parseErrors.length}):`)
    for (const e of parseErrors) console.error(`   • ${e}`)
    console.error(`\nCorrija os erros e rode novamente.`)
    process.exit(1)
  }

  console.log(`\n📊 Parsed: ${sections.filter(s => s.type === 'part').length} parts + ${sections.filter(s => s.type !== 'part').length} seções`)
  const types = [...new Set(sections.map(s => s.type))]
  console.log(`   Types: ${types.join(', ')}`)
  const categories = [...new Set(sections.map(s => s.category))]
  console.log(`   Categories: ${categories.join(', ')}`)

  // 5) Persiste no DB
  const { totalParts, totalChildren, errors: dbErrors, slugToId } = await persistSections(sections)

  if (dbErrors.length > 0) {
    console.error(`\n❌ Erros de DB (${dbErrors.length}):`)
    for (const e of dbErrors) console.error(`   • ${e}`)
  }

  console.log(`\n✅ Total inserido: ${totalParts} parts + ${totalChildren} seções`)

  // 6) Hook de áudio (opcional)
  await maybeGenerateAudio(sections, slugToId)

  console.log(`\n🎉 Pronto! Acesse /admin/biblioteca/${GUIDE_SLUG} para revisar.`)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
