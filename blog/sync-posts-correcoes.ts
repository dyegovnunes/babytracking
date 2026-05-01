// sync-posts-correcoes.ts
// Atualiza content_md de 6 posts já publicados com correções pontuais de texto.
// Rodar: cd blog && npx tsx sync-posts-correcoes.ts

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')

// Carrega .env
const envPath = path.join(__dirname, '.env')
const envContent = fs.readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Faltam vars no blog/.env')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const POSTS = [
  '02-amamentacao-sob-demanda',
  '03-sono-recem-nascido',
  '24-quarto-do-bebe',
  '41-sono-bebe-3-6-meses',
  '44-prontidao-alimentar',
  '46-rotina-de-sono',
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
  let ok = 0, fail = 0
  for (const dir of POSTS) {
    const mdPath = path.join(REPO_ROOT, 'content', 'posts', dir, 'artigo.md')
    if (!fs.existsSync(mdPath)) { console.warn(`⚠  Não encontrado: ${mdPath}`); fail++; continue }

    const raw = fs.readFileSync(mdPath, 'utf-8')
    const slug = extractSlug(raw)
    if (!slug) { console.warn(`⚠  Sem slug: ${dir}`); fail++; continue }

    const content_md = extractBody(raw)
    const { error } = await supabase.from('blog_posts').update({ content_md }).eq('slug', slug)

    if (error) { console.error(`✗ ${dir} (${slug}): ${error.message}`); fail++ }
    else       { console.log(`✓ ${dir} → ${slug}`); ok++ }
  }
  console.log(`\nConcluído: ${ok} atualizados, ${fail} falhas`)
}

main().catch(e => { console.error(e); process.exit(1) })
