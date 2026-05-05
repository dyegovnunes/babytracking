// Publica os posts 80 a 90:
// 1. Lê frontmatter de cada artigo.md via gray-matter
// 2. Converte imagens → WebP em blog/public/posts/{slug}/
// 3. Insere rows em blog_posts no Supabase com status=published
//
// Rodar: cd blog && npx tsx publish-posts-80-90.ts

import sharp from 'sharp'
import matter from 'gray-matter'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')

// Carrega .env do blog
const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8')
const env: Record<string, string> = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
  if (m) env[m[1]] = m[2].trim()
}

const SUPABASE_URL = env['PUBLIC_SUPABASE_URL']
const SERVICE_ROLE = env['SUPABASE_SERVICE_ROLE_KEY']
if (!SUPABASE_URL || !SERVICE_ROLE) { console.error('Faltam vars no .env'); process.exit(1) }

// Extrai content_md (após o frontmatter YAML)
function extractContent(mdPath: string): string {
  const raw = fs.readFileSync(mdPath, 'utf-8')
  const { content } = matter(raw)
  return content.trim()
}

// Planifica keywords de qualquer formato: array flat ou nested {primaria, secundarias, long_tails}
function flattenKeywords(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const out: string[] = []
    if (obj.primaria) out.push(String(obj.primaria))
    if (Array.isArray(obj.secundarias)) out.push(...obj.secundarias.map(String))
    if (Array.isArray(obj.long_tails)) out.push(...obj.long_tails.map(String))
    return out
  }
  return []
}

// Insere um post no banco via REST
async function insertPost(row: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/blog_posts`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`${res.status} ${txt}`)
  }
}

// Encontra a imagem com extensão jpg ou png
function findImage(dir: string, name: string): string {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    const p = path.join(dir, `${name}.${ext}`)
    if (fs.existsSync(p)) return p
  }
  throw new Error(`Imagem não encontrada: ${name} em ${dir}`)
}

// Posts 80-90
const POSTS_DIRS = [
  '80-regressao-sono-quanto-tempo-dura',
  '81-como-registrar-rotina-no-yaya',
  '82-bebe-quando-senta-sozinho',
  '83-febre-bebe-o-que-fazer',
  '84-seguranca-em-casa-para-bebe',
  '85-regressao-sono-8-meses',
  '86-cardapio-bebe-8-9-meses',
  '87-paternidade-ativa-primeiros-meses',
  '88-engatinhamento-quando-comeca',
  '89-constipacao-bebe-introducao-alimentar',
  '90-amamentacao-apos-6-meses',
]

async function main() {
  for (const folderName of POSTS_DIRS) {
    const postNum = parseInt(folderName.split('-')[0], 10)
    const postDir = path.join(REPO_ROOT, 'content', 'posts', folderName)
    const mdPath = path.join(postDir, 'artigo.md')

    const raw = fs.readFileSync(mdPath, 'utf-8')
    const { data: fm } = matter(raw)

    const slug = fm.slug as string
    console.log(`\n── Post #${postNum}: ${slug} ──`)

    // 1. Converte e salva imagens
    const destDir = path.join(__dirname, 'public', 'posts', slug)
    fs.mkdirSync(destDir, { recursive: true })

    const heroSrc = findImage(postDir, `img${postNum}-1`)
    const midSrc  = findImage(postDir, `img${postNum}-2`)

    await sharp(heroSrc).webp({ quality: 85 }).toFile(path.join(destDir, 'hero.webp'))
    console.log('  ✓ hero.webp')

    await sharp(midSrc).webp({ quality: 85 }).toFile(path.join(destDir, 'mid.webp'))
    console.log('  ✓ mid.webp')

    // 2. Extrai content_md
    const content_md = extractContent(mdPath)

    // 3. Monta row para o banco
    const row: Record<string, unknown> = {
      post_number:     postNum,
      slug:            slug,
      title:           (fm.title as string).replace(/'/g, ''),
      meta_description: fm.meta_description as string,
      category:        fm.category as string,
      audience:        (fm.audience as string) ?? 'parent',
      target_week_start: fm.target_week_start ?? 0,
      target_week_end:   fm.target_week_end ?? 52,
      pillar:          fm.pillar as string | null ?? null,
      role:            fm.role as string | null ?? null,
      schema_type:     (fm.schema as string) ?? 'Article',
      keywords:        flattenKeywords(fm.keywords),
      related_slugs:   (fm.related_slugs as string[]) ?? [],
      affiliate_products: (fm.affiliate_products as unknown[]) ?? [],
      sources:         (fm.sources as unknown[]) ?? [],
      image_url:       `https://blog.yayababy.app/posts/${slug}/hero.webp`,
      image_alt:       fm.title as string,
      mid_image_url:   `https://blog.yayababy.app/posts/${slug}/mid.webp`,
      content_md,
      status:          'published',
      published_at:    new Date().toISOString(),
      premium_teaser:  null,
    }

    // 4. Insere no banco
    try {
      await insertPost(row)
      console.log('  ✓ Inserido no banco')
    } catch (e) {
      console.error(`  ✗ DB error: ${(e as Error).message}`)
    }
  }

  console.log('\nDone. Agora: git add blog/public/posts/ && git commit && git push')
}

main().catch((e) => { console.error(e); process.exit(1) })
