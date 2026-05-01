// Atualiza content_md de 6 posts já publicados
// Rodar: cd blog && node sync-posts-correcoes.mjs

import { createClient } from '@supabase/supabase-js'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const POSTS = [
  '02-amamentacao-sob-demanda',
  '03-sono-recem-nascido',
  '24-quarto-do-bebe',
  '41-sono-bebe-3-6-meses',
  '44-prontidao-alimentar',
  '46-rotina-de-sono',
]

let ok = 0, fail = 0
for (const dir of POSTS) {
  const mdPath = path.join(REPO_ROOT, 'content', 'posts', dir, 'artigo.md')
  if (!fs.existsSync(mdPath)) { console.warn(`⚠  ${mdPath}`); fail++; continue }

  const raw = fs.readFileSync(mdPath, 'utf-8')
  const slugMatch = raw.match(/^slug:\s*['"]?([^\s'"]+)['"]?/m)
  if (!slugMatch) { console.warn(`⚠  Sem slug: ${dir}`); fail++; continue }
  const slug = slugMatch[1]

  const parts = raw.split(/^---\s*$/m)
  const content_md = parts.length < 3 ? raw : parts.slice(2).join('---').trim()

  const { error } = await supabase.from('blog_posts').update({ content_md }).eq('slug', slug)
  if (error) { console.error(`✗ ${dir} (${slug}): ${error.message}`); fail++ }
  else       { console.log(`✓ ${dir} → ${slug}`); ok++ }
}
console.log(`\nConcluído: ${ok} atualizados, ${fail} falhas`)
