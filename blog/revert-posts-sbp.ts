// revert-posts-sbp.ts
// Re-sincroniza os 37 posts com o conteúdo PRÉ-SBP dos artigo.md (restaurados do git).
// Rodar: cd blog && npx tsx revert-posts-sbp.ts

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')

const envPath = path.join(__dirname, '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltam PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no blog/.env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const MODIFIED_POST_DIRS = [
  '02-amamentacao-sob-demanda',
  '03-sono-recem-nascido',
  '04-tipos-de-parto',
  '08-banho-recem-nascido',
  '12-regressao-sono-4-meses',
  '13-plano-de-parto',
  '14-choro-do-bebe',
  '16-cordao-umbilical',
  '18-rotina-recem-nascido',
  '20-ganho-peso-bebe',
  '24-quarto-do-bebe',
  '30-cadeirinha-carro',
  '31-leite-materno-armazenamento',
  '32-refluxo-regurgitacao',
  '33-formula-infantil',
  '34-visitas-recem-nascido',
  '37-ruido-branco',
  '40-brincadeiras-3-6-meses',
  '42-fase-oral',
  '43-bebe-rolar',
  '44-prontidao-alimentar',
  '45-ansiedade-separacao',
  '47-marcos-linguagem',
  '48-tummy-time',
  '50-percentis-curvas-crescimento',
  '51-introducao-alimentar',
  '53-primeiras-papas-receitas',
  '66-baba-eletronica',
  '70-berco-moises',
  '72-andador-bebe',
  '73-mordedor-bebe',
  '81-como-registrar-rotina-no-yaya',
  '82-bebe-quando-senta-sozinho',
  '89-constipacao-bebe-introducao-alimentar',
  '90-amamentacao-apos-6-meses',
  '91-bebe-primeiros-passos',
  '99-consulta-1-ano-pediatra',
]

function extractSlug(raw: string): string | null {
  const m = raw.match(/^slug:\s*['"]?([^\s'"]+)['"]?/m)
  return m ? m[1] : null
}

function extractBody(raw: string): string {
  const parts = raw.split(/^---\s*$/m)
  if (parts.length < 3) return raw
  return parts.slice(2).join('---').trim()
}

async function main() {
  console.log('\n🔄 Revertendo posts para conteúdo pré-SBP (git)...\n')
  let ok = 0, fail = 0

  for (const dir of MODIFIED_POST_DIRS) {
    const mdPath = path.join(REPO_ROOT, 'content', 'posts', dir, 'artigo.md')
    if (!fs.existsSync(mdPath)) {
      console.warn(`⚠  Não encontrado: ${mdPath}`)
      fail++; continue
    }

    const raw = fs.readFileSync(mdPath, 'utf-8')
    const slug = extractSlug(raw)
    if (!slug) {
      console.warn(`⚠  Sem slug no frontmatter: ${dir}`)
      fail++; continue
    }

    const content_md = extractBody(raw)

    const { error } = await supabase
      .from('blog_posts')
      .update({ content_md })
      .eq('slug', slug)

    if (error) {
      console.error(`✗ ${dir} (${slug}): ${error.message}`)
      fail++
    } else {
      console.log(`✓ ${dir} → ${slug}`)
      ok++
    }
  }

  console.log(`\n✅ Concluído: ${ok} revertidos, ${fail} falhas`)
}

main().catch(e => { console.error(e); process.exit(1) })
