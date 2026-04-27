// ════════════════════════════════════════════════════════════════════════════
// seed-guia-ultimas-semanas.ts
// ════════════════════════════════════════════════════════════════════════════
// Pipeline completo de carga inicial do "Guia das Últimas Semanas":
//   1. Lê o markdown em content/infoprodutos/guia-ultimas-semanas/
//   2. Converte os PNGs em WebP otimizado e faz upload pro bucket guide-images
//   3. Faz parse hierárquico (## = part, ### = section)
//   4. Converte caixas de destaque (>🔬 / >✅ / >🚨 / 📱) em :::tipo
//   5. Substitui paths de imagem locais pelas URLs públicas
//   6. Gera JSON estruturado pro quiz fullscreen
//   7. INSERT em guides + guide_sections (DELETE antes pra ser idempotente)
//
// Como rodar:
//   cd blog && npx tsx ../scripts/seed-guia-ultimas-semanas.ts
//
// Pré-requisitos:
//   - blog/.env com SUPABASE_SERVICE_ROLE_KEY e PUBLIC_SUPABASE_URL
//   - guide com slug='ultimas-semanas' já existe na tabela guides
//   - bucket 'guide-images' público criado
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// ── Config ─────────────────────────────────────────────────────────────────
const REPO_ROOT = path.resolve(__dirname, '..')
const CONTENT_DIR = path.join(REPO_ROOT, 'content', 'infoprodutos', 'guia-ultimas-semanas')
const MD_FILE = path.join(CONTENT_DIR, 'guia-ultimas-semanas.md')
const IMG_DIR = path.join(CONTENT_DIR, 'imagens')
const GUIDE_SLUG = 'ultimas-semanas'
const STORAGE_BUCKET = 'guide-images'
const STORAGE_PREFIX = `${GUIDE_SLUG}/img`

// Carrega .env do blog
function loadBlogEnv() {
  const envPath = path.join(REPO_ROOT, 'blog', '.env')
  const content = require('fs').readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}
loadBlogEnv()

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltam SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no blog/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

// ── Helpers ────────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function estimateMinutes(text: string): number {
  const words = text.replace(/[#*`>\[\]()]/g, '').split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

const PUBLIC_URL_BASE = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`

// ── Step 1: Upload imagens ─────────────────────────────────────────────────
async function uploadImages(): Promise<Map<string, string>> {
  const imagePathMap = new Map<string, string>() // 'imagens/file.png' → public URL
  const files = await fs.readdir(IMG_DIR)
  const pngs = files.filter(f => /\.(png|jpe?g)$/i.test(f))

  console.log(`📸 Convertendo e fazendo upload de ${pngs.length} imagens…`)

  for (const file of pngs) {
    const source = path.join(IMG_DIR, file)
    const baseName = file.replace(/\.[^.]+$/, '')
    const remoteName = `${baseName}.webp`
    const remotePath = `${STORAGE_PREFIX}/${remoteName}`

    // Converte pra WebP (q=82, lossless=false) — boa qualidade pra fotos
    const webpBuffer = await sharp(source)
      .webp({ quality: 82, effort: 4 })
      .toBuffer()

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(remotePath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000', // 1 ano
      })

    if (error) {
      console.error(`  ✗ ${file}: ${error.message}`)
      continue
    }

    const publicUrl = `${PUBLIC_URL_BASE}/${remotePath}`
    imagePathMap.set(`imagens/${file}`, publicUrl)
    imagePathMap.set(file, publicUrl) // cobre referências sem prefixo
    const originalKb = (await fs.stat(source)).size / 1024
    console.log(`  ✓ ${file} (${originalKb.toFixed(0)}KB → ${(webpBuffer.length / 1024).toFixed(0)}KB WebP)`)
  }

  return imagePathMap
}

// ── Step 2: Conversores de markdown ────────────────────────────────────────

const CALLOUT_MAP: Record<string, string> = {
  '🔬': 'ciencia',
  '✅': 'mito',
  '🚨': 'alerta',
}

/**
 * Converte caixas de destaque do guia pra sintaxe :::tipo
 *  - Blockquote `> 🔬 **Título**\n> conteúdo` → :::ciencia\nconteúdo\n:::
 *  - Bloco `📱 **No Yaya...**\n\nconteúdo` (sem blockquote) → :::yaya\nconteúdo\n:::
 */
function convertCallouts(md: string): string {
  let out = md

  // 1. Blockquotes com emoji 🔬/✅/🚨 no início
  // Match: `> EMOJI **título**\n(> conteúdo)+`
  out = out.replace(
    /^> (🔬|✅|🚨)\s*\*\*([^*]+?)\*\*\s*\n((?:^>(?: .*)?(?:\n|$))+)/gm,
    (_full, emoji: string, _title: string, body: string) => {
      const tipo = CALLOUT_MAP[emoji]
      // Remove o `> ` de cada linha do body
      const cleanedBody = body
        .split('\n')
        .map((l: string) => l.replace(/^>\s?/, ''))
        .join('\n')
        .trim()
      return `:::${tipo}\n${cleanedBody}\n:::\n`
    },
  )

  // 2. "📱 **No Yaya...**" sem blockquote — pega título + parágrafos
  //    até linha em branco dupla, separador `---` ou próximo heading
  out = out.replace(
    /^📱\s*\*\*([^*]+?)\*\*\s*\n\n((?:[^\n][^\n]*\n?)+?)(?=\n\n(?:---|##|$)|\n*$)/gm,
    (_full, _title: string, body: string) => {
      return `:::yaya\n${body.trim()}\n:::\n`
    },
  )

  return out
}

/** Substitui paths locais de imagens pelas URLs públicas */
function rewriteImagePaths(md: string, imageMap: Map<string, string>): string {
  return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt: string, src: string) => {
    const cleaned = src.trim().replace(/^\.\//, '')
    const url = imageMap.get(cleaned) ?? imageMap.get(path.basename(cleaned))
    if (url) return `![${alt}](${url})`
    return full // mantém se não achou
  })
}

/** Remove âncoras Markdown extras `{#anchor}` que vêm dos titles */
function stripAnchors(line: string): string {
  return line.replace(/\s*\{#[a-z0-9-]+\}\s*$/i, '').trim()
}

// ── Step 3: Parser hierárquico ─────────────────────────────────────────────

interface ParsedSection {
  level: 'part' | 'section'
  title: string
  slug: string
  body: string
  type?: 'linear' | 'quiz' | 'part'
  is_preview?: boolean
}

function parseMarkdown(md: string, imageMap: Map<string, string>): ParsedSection[] {
  const lines = md.split('\n')
  const sections: ParsedSection[] = []

  let current: ParsedSection | null = null
  let buffer: string[] = []

  function flush() {
    if (current) {
      current.body = buffer.join('\n').trim()
      sections.push(current)
    }
    buffer = []
  }

  for (const rawLine of lines) {
    // Pula o índice do guia (começa com `## Índice`) e o que vem antes da primeira `##`
    // Pula H1 do guia (já está nos metadados)
    if (rawLine.startsWith('# ') && !current) continue

    if (rawLine.startsWith('## ')) {
      flush()
      const title = stripAnchors(rawLine.replace(/^##\s+/, ''))

      // Pula índice e referências
      if (/^Índice/i.test(title)) {
        current = null
        continue
      }

      // Detecta tipo: Bônus quiz vira tipo 'quiz'; outras top-levels = 'part'
      const isQuiz = /Bônus.*quiz|Quiz/i.test(title)
      const isReferences = /^Refer[êe]ncias/i.test(title)

      // Pula referências (vamos colocar no rodapé do guia depois ou seção ocultada)
      if (isReferences) {
        current = null
        continue
      }

      current = {
        level: 'part',
        title,
        slug: slugify(title.replace(/^Parte \d+:\s*/i, 'parte-$&').replace(/Parte (\d+):\s*/i, 'parte-$1-')),
        body: '',
        type: isQuiz ? 'quiz' : 'part',
      }
      // Slug mais limpo:
      current.slug = slugifyPartTitle(title)
      continue
    }

    if (rawLine.startsWith('### ') && current) {
      // Cria a section, mas o `body` da part é fechado primeiro
      flush()
      const title = stripAnchors(rawLine.replace(/^###\s+/, ''))
      current = {
        level: 'section',
        title,
        slug: slugifySectionTitle(title),
        body: '',
        type: 'linear',
      }
      continue
    }

    // Pula linhas separadoras horizontais isoladas — viram quebra natural
    if (current) buffer.push(rawLine)
  }
  flush()

  // Pós-processamento: aplica callouts + image rewrite
  for (const sec of sections) {
    sec.body = convertCallouts(sec.body)
    sec.body = rewriteImagePaths(sec.body, imageMap)
  }

  return sections
}

function slugifyPartTitle(title: string): string {
  // "Parte 1: Preparação" → "parte-1-preparacao"
  // "Introdução" → "introducao"
  // "Conclusão" → "conclusao"
  // "Bônus: quiz — qual..." → "quiz-perfil"
  if (/Bônus.*quiz/i.test(title)) return 'quiz-perfil'
  const parteMatch = title.match(/^Parte\s+(\d+)[:\s]+(.+)$/i)
  if (parteMatch) return `parte-${parteMatch[1]}-${slugify(parteMatch[2].split(/[(:]/)[0])}`
  return slugify(title)
}

function slugifySectionTitle(title: string): string {
  // "1.1 Enxoval: o que realmente precisa" → "11-enxoval"
  // "4.5 Quando ligar para o médico..." → "45-quando-ligar-medico"
  const numMatch = title.match(/^(\d+)\.(\d+)\s+(.+)$/)
  if (numMatch) {
    const main = numMatch[3].split(/[:(]/)[0]
    return `${numMatch[1]}${numMatch[2]}-${slugify(main)}`
  }
  return slugify(title)
}

// ── Step 4: Quiz parser → estrutura JSON ───────────────────────────────────
function parseQuizToJSON(quizMd: string) {
  const questionPattern = /^\*\*(\d+)\.\s*(.+?)\*\*\s*$/gm
  const optPattern = /^- ([A-D])\)\s*(.+)$/

  const questions: Array<{ id: string; text: string; options: Array<{ value: string; label: string }> }> = []
  const lines = quizMd.split('\n')

  let currentQ: typeof questions[number] | null = null

  for (const line of lines) {
    const qm = line.match(/^\*\*(\d+)\.\s*(.+?)\*\*\s*$/)
    if (qm) {
      if (currentQ) questions.push(currentQ)
      currentQ = { id: `q${qm[1]}`, text: qm[2].trim(), options: [] }
      continue
    }
    const om = line.match(optPattern)
    if (om && currentQ) {
      currentQ.options.push({ value: om[1].toLowerCase(), label: om[2].trim() })
    }
  }
  if (currentQ) questions.push(currentQ)

  // Resultados (perfis)
  const results: Record<string, { title: string; description: string; recommended_sections: string[] }> = {
    a: {
      title: 'Analítica',
      description:
        'Você precisa entender antes de agir. Fontes, dados e referências são a sua linguagem. Priorize as caixas "O que a ciência diz" e os resumos de fontes — especialmente nas Partes 3 e 4.',
      recommended_sections: ['parte-3-primeiras-72-horas-em-casa', 'parte-4-primeiras-quatro-semanas-semana-a-semana'],
    },
    b: {
      title: 'Intuitiva',
      description:
        'Você confia no instinto, mas quer validação. Aprende melhor com exemplos do que com regras. Priorize as seções práticas da Parte 4 (semana a semana) e as caixas "Mito vs. realidade".',
      recommended_sections: ['parte-4-primeiras-quatro-semanas-semana-a-semana', 'parte-3-primeiras-72-horas-em-casa'],
    },
    c: {
      title: 'Ansiosa',
      description:
        'Você precisa de clareza, não de mais conteúdo. O maior risco é deixar a ansiedade substituir a observação. Priorize a Parte 2 (parto), a seção 4.5 (alertas) e os checklists de cada parte.',
      recommended_sections: ['parte-2-o-parto', 'parte-4-primeiras-quatro-semanas-semana-a-semana'],
    },
    d: {
      title: 'Pragmática',
      description:
        'Você quer o checklist e a ação. Priorize a Introdução, a Parte 1 (preparação) e os resumos de 3 pontos no final de cada seção. O Yaya foi feito pra esse perfil — registro com 1 toque.',
      recommended_sections: ['introducao', 'parte-1-preparacao'],
    },
  }

  return { questions, results }
}

// ── Step 5: Persiste no DB ─────────────────────────────────────────────────
async function persistSections(parsed: ParsedSection[]) {
  // Pega o guide
  const { data: guide, error: guideErr } = await supabase
    .from('guides')
    .select('id')
    .eq('slug', GUIDE_SLUG)
    .single()
  if (guideErr || !guide) {
    throw new Error(`Guide '${GUIDE_SLUG}' não encontrado. Cadastre antes via SQL ou admin.`)
  }
  const guideId = guide.id as string

  // Limpa seções existentes pra ser idempotente
  console.log(`🗑️  Apagando seções existentes do guide…`)
  await supabase.from('guide_sections').delete().eq('guide_id', guideId)

  // Identifica boundaries: qual section pertence a qual part
  const partsOnly = parsed.filter(s => s.level === 'part')
  const partIdsBySlug = new Map<string, string>() // slug → uuid
  let partOrder = 0

  // Insere parts primeiro
  console.log(`📝 Inserindo ${partsOnly.length} partes…`)
  for (const part of partsOnly) {
    const isQuiz = part.type === 'quiz'
    let dataField: Record<string, unknown> | null = null
    let contentMd = part.body
    if (isQuiz) {
      // Extrai estrutura do quiz; mantém uma intro curta no markdown
      const quizData = parseQuizToJSON(part.body)
      dataField = quizData
      contentMd = part.body.split('\n').slice(0, 3).join('\n').trim() // só a intro
    }

    const { data, error } = await supabase
      .from('guide_sections')
      .insert({
        guide_id: guideId,
        parent_id: null,
        order_index: partOrder++,
        slug: part.slug,
        title: part.title,
        content_md: contentMd,
        type: isQuiz ? 'quiz' : 'part',
        data: dataField,
        estimated_minutes: estimateMinutes(part.body),
        is_preview: false, // intro/conclusão NÃO são preview por default
      })
      .select('id')
      .single()
    if (error) throw new Error(`Falha INSERT part "${part.title}": ${error.message}`)
    partIdsBySlug.set(part.slug, data.id)
  }

  // Marca Introdução como preview (amostra grátis)
  await supabase
    .from('guide_sections')
    .update({ is_preview: true })
    .eq('guide_id', guideId)
    .like('slug', 'introducao%')

  // Insere sections (filhas) — assigna ao part anterior
  console.log(`📝 Inserindo seções filhas…`)
  let currentPartId: string | null = null
  let sectionOrderInPart = 0
  let totalSecs = 0

  for (const item of parsed) {
    if (item.level === 'part') {
      currentPartId = partIdsBySlug.get(item.slug) ?? null
      sectionOrderInPart = 0
      continue
    }
    if (!currentPartId) continue

    const { error } = await supabase.from('guide_sections').insert({
      guide_id: guideId,
      parent_id: currentPartId,
      order_index: sectionOrderInPart++,
      slug: item.slug,
      title: item.title,
      content_md: item.body,
      type: 'linear',
      estimated_minutes: estimateMinutes(item.body),
      is_preview: false,
    })
    if (error) {
      console.error(`  ✗ ${item.title}: ${error.message}`)
    } else {
      totalSecs++
    }
  }

  // Marca primeira section da Parte 1 como preview também
  const part1 = partIdsBySlug.get(slugifyPartTitle('Parte 1: Preparação (semanas 28 a 40)'))
  if (part1) {
    const { data: firstSec } = await supabase
      .from('guide_sections')
      .select('id')
      .eq('parent_id', part1)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()
    if (firstSec) {
      await supabase.from('guide_sections').update({ is_preview: true }).eq('id', firstSec.id)
      console.log(`  ✓ marcada primeira seção da Parte 1 como preview`)
    }
  }

  console.log(`✅ Total: ${partsOnly.length} parts + ${totalSecs} seções inseridas`)
}

// ── Step 6: Atualiza metadados do guide com cover ──────────────────────────
async function updateGuideMetadata(imageMap: Map<string, string>) {
  const heroUrl = imageMap.get('imagens/hero-lp.png') ?? imageMap.get('hero-lp.png')
  if (!heroUrl) return
  await supabase
    .from('guides')
    .update({ cover_image_url: heroUrl })
    .eq('slug', GUIDE_SLUG)
  console.log(`🖼️  cover_image_url atualizada: ${heroUrl}`)
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀 Seed do "${GUIDE_SLUG}"\n`)

  const imageMap = await uploadImages()
  await updateGuideMetadata(imageMap)

  const md = await fs.readFile(MD_FILE, 'utf-8')
  console.log(`\n📄 Markdown: ${(md.length / 1024).toFixed(1)}KB`)

  const parsed = parseMarkdown(md, imageMap)
  console.log(`📊 Parsed: ${parsed.filter(s => s.level === 'part').length} parts + ${parsed.filter(s => s.level === 'section').length} sections\n`)

  await persistSections(parsed)

  console.log(`\n🎉 Pronto! Acessa /admin/biblioteca/ultimas-semanas pra revisar.`)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
