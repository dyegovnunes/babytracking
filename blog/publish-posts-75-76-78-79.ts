// Publica os posts 75, 76, 78 e 79:
// 1. Converte imagens → WebP em blog/public/posts/{slug}/
// 2. Insere rows em blog_posts no Supabase com status=published
//
// Rodar: cd blog && npx tsx publish-posts-75-76-78-79.ts

import sharp from 'sharp'
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

// Extrai o conteúdo do artigo (após o frontmatter YAML)
function extractContent(mdPath: string): string {
  const raw = fs.readFileSync(mdPath, 'utf-8')
  const parts = raw.split('---')
  if (parts.length < 3) return raw
  return parts.slice(2).join('---').trim()
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

const posts = [
  {
    post_number: 75,
    slug: 'colica-bebe-o-que-fazer',
    title: 'Cólica do Bebê: Causas, Sinais e o Que Realmente Alivia',
    meta_description: 'Cólica do bebê: causas, sinais e o que de fato alivia. Sem tiques, sem invenções. Tudo baseado na SBP e na evidência científica atual.',
    category: 'saude',
    audience: 'parent',
    target_week_start: 0,
    target_week_end: 16,
    pillar: 'saude-bebe',
    role: 'cluster',
    schema_type: 'Article',
    keywords: ['cólica bebê o que fazer', 'cólica bebê sintomas como reconhecer', 'cólica bebê recém-nascido alívio', 'cólica bebê quanto tempo dura', 'cólica bebê causas', 'como acalmar bebê com cólica'],
    related_slugs: ['choro-do-bebe', 'sono-recem-nascido-quanto-dorme', 'rotina-bebe-3-4-meses'],
    affiliate_products: [
      { tipo: 'conforto', nome: 'NUK Canguru 3 em 1 Ergonômico Comfort Cinza', asin: 'B09YJ1NY2W', url: 'https://www.amazon.com.br/dp/B09YJ1NY2W?tag=yaya090-20' },
      { tipo: 'conforto', nome: 'Bolsa Térmica Faixa de Sementes e Ervas para Bebê Cólica', asin: 'B0DMWMJMQ3', url: 'https://www.amazon.com.br/dp/B0DMWMJMQ3?tag=yaya090-20' },
    ],
    sources: [
      { name: 'SBP. Cólica do Lactente. Pediatria para Famílias. 2023.', url: 'https://www.sbp.com.br/pediatria-para-familias/primeira-infancia/colica-do-lactente/' },
      { name: 'Radesky JS et al. Overstimulation and infant colic. Journal of Pediatrics, 2013.', url: 'https://pubmed.ncbi.nlm.nih.gov/23809043/' },
      { name: 'Savino F et al. Lactobacillus reuteri versus simethicone in the treatment of infantile colic. Pediatrics, 2007.', url: 'https://pubmed.ncbi.nlm.nih.gov/18055646/' },
    ],
    image_url: 'https://blog.yayababy.app/posts/colica-bebe-o-que-fazer/hero.webp',
    image_alt: 'Cólica do Bebê: Causas e Alívio',
    mid_image_url: 'https://blog.yayababy.app/posts/colica-bebe-o-que-fazer/mid.webp',
    heroSrc: path.join(REPO_ROOT, 'content', 'posts', '75-colica-bebe', 'hero.jpg'),
    midSrc:  path.join(REPO_ROOT, 'content', 'posts', '75-colica-bebe', 'img75-2.jpg'),
    contentSrc: path.join(REPO_ROOT, 'content', 'posts', '75-colica-bebe', 'artigo.md'),
  },
  {
    post_number: 76,
    slug: 'denticao-bebe-quando-comeca',
    title: 'Dentição do Bebê: Quando Começa, Sintomas Reais e Mitos Comuns',
    meta_description: 'Dentição do bebê: quando começa, sintomas verdadeiros e mitos como febre e diarreia. Guia baseado em evidências da SBP e AAP para pais sem achismos.',
    category: 'desenvolvimento',
    audience: 'parent',
    target_week_start: 20,
    target_week_end: 52,
    pillar: 'desenvolvimento-bebe',
    role: 'cluster',
    schema_type: 'Article',
    keywords: ['dentição bebê quando começa', 'dentição bebê sintomas reais', 'primeiro dente bebê quando nasce', 'febre dentição bebê mito verdade', 'diarreia dentição bebê', 'como aliviar dor dentição bebê'],
    related_slugs: ['mordedor-bebe-quando-usar', 'marcos-desenvolvimento-bebe'],
    affiliate_products: [
      { tipo: 'desenvolvimento', nome: 'Mordedor Bebê Mãozinha Vilatoy Silicone Macio para +2 Meses', asin: 'B0GQP1XL2X', url: 'https://www.amazon.com.br/dp/B0GQP1XL2X?tag=yaya090-20' },
      { tipo: 'desenvolvimento', nome: 'Mordedor Bebê Silicone Anatômico BPA-Free', asin: 'B0F44BB81X', url: 'https://www.amazon.com.br/dp/B0F44BB81X?tag=yaya090-20' },
      { tipo: 'higiene', nome: 'Dedeira Escova de Dentes para Bebê Silicone Macia', asin: 'B07XSPX2VW', url: 'https://www.amazon.com.br/dp/B0B1NXNSHB?tag=yaya090-20' },
    ],
    sources: [
      { name: 'AAP. Teething Pain Relief. HealthyChildren.org. 2024.', url: 'https://www.healthychildren.org/English/ages-stages/baby/teething-tooth-care/Pages/Teething-Pain.aspx' },
      { name: 'SBP. Saúde oral materno-infantil. Pediatria para Famílias.', url: 'https://www.sbp.com.br/pediatria-para-familias/primeira-infancia/saude-oral-materno-infantil/' },
      { name: 'SBP. Nascimento dos dentes do bebê causa febre? Imprensa SBP.', url: 'https://www.sbp.com.br/imprensa/detalhe/nid/nascimento-dos-dentes-do-bebe-causa-febre/' },
      { name: 'Macknin ML et al. Symptoms Associated With Infant Teething. Pediatrics, 2000.', url: 'https://pubmed.ncbi.nlm.nih.gov/10742348/' },
    ],
    image_url: 'https://blog.yayababy.app/posts/denticao-bebe-quando-comeca/hero.webp',
    image_alt: 'Dentição do Bebê: Quando Começa e Sintomas Reais',
    mid_image_url: 'https://blog.yayababy.app/posts/denticao-bebe-quando-comeca/mid.webp',
    heroSrc: path.join(REPO_ROOT, 'content', 'posts', '76-denticao-bebe-mitos', 'hero.jpg'),
    midSrc:  path.join(REPO_ROOT, 'content', 'posts', '76-denticao-bebe-mitos', 'img76-2.jpg'),
    contentSrc: path.join(REPO_ROOT, 'content', 'posts', '76-denticao-bebe-mitos', 'artigo.md'),
  },
  {
    post_number: 78,
    slug: 'por-que-bebe-chora-tanto',
    title: 'Por Que o Bebê Chora Tanto: Decodificando os Tipos de Choro',
    meta_description: 'Por que o bebê chora tanto? Guia para decodificar os tipos de choro — fome, sono, dor, cólica, superstimulação — e como responder a cada um.',
    category: 'desenvolvimento',
    audience: 'parent',
    target_week_start: 0,
    target_week_end: 24,
    pillar: 'desenvolvimento-bebe',
    role: 'cluster',
    schema_type: 'Article',
    keywords: ['por que bebê chora tanto', 'tipos de choro do bebê como identificar', 'bebê chora sem parar o que fazer', 'choro de fome bebê como reconhecer', 'bebê chora muito à noite normal', 'como acalmar bebê chorando'],
    related_slugs: ['colica-bebe-o-que-fazer', 'regressao-sono-4-meses', 'sono-recem-nascido-quanto-dorme'],
    affiliate_products: [
      { tipo: 'conforto', nome: 'NUK Canguru 3 em 1 Ergonômico Comfort Cinza', asin: 'B09YJ1NY2W', url: 'https://www.amazon.com.br/dp/B09YJ1NY2W?tag=yaya090-20' },
      { tipo: 'conforto', nome: 'Chupeta Orthodontic NUK Silicone BPA-Free 0-6 Meses', asin: 'B01MY7FP4C', url: 'https://www.amazon.com.br/dp/B01MY7FP4C?tag=yaya090-20' },
      { tipo: 'sono', nome: 'Máquina de Ruído Branco para Bebê com Sons da Natureza', asin: 'B08T9L91LQ', url: 'https://www.amazon.com.br/dp/B08T9L91LQ?tag=yaya090-20' },
    ],
    sources: [
      { name: 'Barr RG. The Normal Crying Curve. Developmental Medicine & Child Neurology, 1990.', url: 'https://pubmed.ncbi.nlm.nih.gov/2209056/' },
      { name: "AAP. Responding to Your Baby's Cries. HealthyChildren.org. 2022.", url: 'https://www.healthychildren.org/English/ages-stages/baby/Pages/Responding-to-Your-Babys-Cries.aspx' },
      { name: 'SBP. Choro do Bebê: O Que os Pais Precisam Saber. Pediatria para Famílias.', url: 'https://www.sbp.com.br/pediatria-para-familias/primeira-infancia/choro-do-bebe/' },
      { name: 'Hunziker UA, Barr RG. Increased Carrying Reduces Infant Crying. Pediatrics, 1986.', url: 'https://pubmed.ncbi.nlm.nih.gov/3714959/' },
    ],
    image_url: 'https://blog.yayababy.app/posts/por-que-bebe-chora-tanto/hero.webp',
    image_alt: 'Por Que o Bebê Chora Tanto: Tipos de Choro',
    mid_image_url: 'https://blog.yayababy.app/posts/por-que-bebe-chora-tanto/mid.webp',
    heroSrc: path.join(REPO_ROOT, 'content', 'posts', '78-choro-bebe-decodificado', 'img78-1.png'),
    midSrc:  path.join(REPO_ROOT, 'content', 'posts', '78-choro-bebe-decodificado', 'img78-2.png'),
    contentSrc: path.join(REPO_ROOT, 'content', 'posts', '78-choro-bebe-decodificado', 'artigo.md'),
  },
  {
    post_number: 79,
    slug: 'dois-cuidadores-uma-rotina-bebe',
    title: 'Dois Cuidadores, Uma Rotina: Como Manter Todo Mundo na Mesma Página',
    meta_description: 'Dois cuidadores, um bebê: como sincronizar rotina com parceiro, babá ou avó sem perder informação. O método prático para quem não quer depender de memória ou WhatsApp.',
    category: 'rotina',
    audience: 'parent',
    target_week_start: 0,
    target_week_end: 24,
    pillar: 'rotina-e-organizacao',
    role: 'cluster',
    schema_type: 'Article',
    keywords: ['como dividir cuidados do bebê com o pai', 'dois cuidadores bebê rotina sincronizada', 'como compartilhar rotina bebê parceiro', 'app para dois cuidadores bebê', 'babá e mãe mesma rotina bebê', 'comunicação casal com bebê recém-nascido'],
    related_slugs: ['como-registrar-rotina-no-yaya', 'regressao-sono-quanto-tempo-dura'],
    affiliate_products: [] as unknown[],
    sources: [
      { name: "Schoppe-Sullivan SJ, et al. Fathers' Parenting and Children's Adjustment. Journal of Family Psychology, 2021.", url: 'https://psycnet.apa.org/record/2021-57842-001' },
      { name: "Parfitt Y, Ayers S. The effect of post-natal symptoms on the couples' relationship. Journal of Reproductive and Infant Psychology, 2009.", url: 'https://www.tandfonline.com/doi/abs/10.1080/02646830802350831' },
    ],
    image_url: 'https://blog.yayababy.app/posts/dois-cuidadores-uma-rotina-bebe/hero.webp',
    image_alt: 'Dois Cuidadores Uma Rotina: Como Sincronizar o Cuidado do Bebê',
    mid_image_url: 'https://blog.yayababy.app/posts/dois-cuidadores-uma-rotina-bebe/mid.webp',
    heroSrc: path.join(REPO_ROOT, 'content', 'posts', '79-quando-levar-bebe-pronto-socorro', 'img79-1.png'),
    midSrc:  path.join(REPO_ROOT, 'content', 'posts', '79-quando-levar-bebe-pronto-socorro', 'img79-2.png'),
    contentSrc: path.join(REPO_ROOT, 'content', 'posts', '79-quando-levar-bebe-pronto-socorro', 'artigo.md'),
  },
]

async function main() {
  for (const post of posts) {
    const { heroSrc, midSrc, contentSrc, ...row } = post
    const { post_number } = post
    console.log(`\n── Post #${post_number}: ${post.slug} ──`)

    // 1. Converte e salva imagens
    const destDir = path.join(__dirname, 'public', 'posts', post.slug)
    fs.mkdirSync(destDir, { recursive: true })

    await sharp(heroSrc).webp({ quality: 85 }).toFile(path.join(destDir, 'hero.webp'))
    console.log('  ✓ hero.webp')

    await sharp(midSrc).webp({ quality: 85 }).toFile(path.join(destDir, 'mid.webp'))
    console.log('  ✓ mid.webp')

    // 2. Extrai content_md
    const content_md = extractContent(contentSrc)

    // 3. Insere no banco
    try {
      await insertPost({ ...row, content_md, status: 'published', published_at: new Date().toISOString(), premium_teaser: null })
      console.log('  ✓ Inserido no banco')
    } catch (e) {
      console.error(`  ✗ DB error: ${(e as Error).message}`)
    }
  }

  console.log('\nDone. Agora: git add blog/public/posts/ && git commit && git push')
}

main().catch((e) => { console.error(e); process.exit(1) })
