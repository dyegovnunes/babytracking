// ════════════════════════════════════════════════════════════════════════════
// scripts/validate-guide.ts
// ════════════════════════════════════════════════════════════════════════════
// Valida um guia da Sua Biblioteca Yaya SEM mexer no DB.
// Checks: estrutura, callouts canônicos, travessões, imagens, tom Yaya, fontes.
//
// Como rodar:
//   cd blog && npx tsx ../scripts/validate-guide.ts <slug-do-guia>
//
// Exit codes:
//   0 → sem erros (pode subir)
//   1 → tem erros bloqueantes (corrige antes do seed)
// ════════════════════════════════════════════════════════════════════════════

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { loadBlogEnv, createSupabaseAdmin } from './lib/seed-utils'
import { parseGuideMarkdown } from './lib/md-parser'
import { runValidation, printIssues } from './lib/validation-rules'

const REPO_ROOT = path.resolve(__dirname, '..')
const STORAGE_BUCKET = 'guide-images'

function getSlugFromArgs(): string {
  const args = process.argv.slice(2)
  for (const arg of args) {
    if (arg.startsWith('--slug=')) return arg.slice('--slug='.length)
    if (!arg.startsWith('--')) return arg
  }
  console.error('Uso: npx tsx scripts/validate-guide.ts <slug-do-guia>')
  process.exit(1)
}

function resolveContentPaths(slug: string) {
  const candidates = [
    {
      dir: path.join(REPO_ROOT, 'content', 'infoprodutos', slug),
      md: path.join(REPO_ROOT, 'content', 'infoprodutos', slug, `${slug}.md`),
    },
    {
      dir: path.join(REPO_ROOT, 'content', 'infoprodutos', `guia-${slug}`),
      md: path.join(REPO_ROOT, 'content', 'infoprodutos', `guia-${slug}`, `guia-${slug}.md`),
    },
  ]
  for (const c of candidates) {
    try {
      require('fs').accessSync(c.md)
      return c
    } catch { /* tenta próximo */ }
  }
  return candidates[0]
}

async function main() {
  loadBlogEnv(REPO_ROOT)
  const slug = getSlugFromArgs()
  const { dir, md: mdFile } = resolveContentPaths(slug)
  const imgDir = path.join(dir, 'imagens')

  console.log(`\n🔍 Validando guia "${slug}"\n`)
  console.log(`   Markdown: ${mdFile}`)
  console.log(`   Imagens:  ${imgDir}\n`)

  let md: string
  try {
    md = await fs.readFile(mdFile, 'utf-8')
  } catch {
    console.error(`❌ Markdown não encontrado: ${mdFile}`)
    process.exit(1)
  }

  // Mock imageMap pra parser não falhar (não precisa de URLs reais aqui)
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL ?? ''
  const publicUrlBase = supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}`
    : 'https://example.com/dummy'

  const { sections, warnings: parseWarnings, errors: parseErrors } =
    parseGuideMarkdown(md, { imageMap: new Map(), publicUrlBase })

  if (parseErrors.length > 0) {
    console.error('❌ Erros de parsing (impedem qualquer validação):')
    for (const e of parseErrors) console.error(`   • ${e}`)
    process.exit(1)
  }
  if (parseWarnings.length > 0) {
    console.log('⚠️  Avisos do parser:')
    for (const w of parseWarnings) console.log(`   • ${w}`)
  }

  const issues = await runValidation(sections, { imgDir })
  const { errors } = printIssues(issues)

  console.log('')
  if (errors > 0) {
    console.error(`\n❌ Validação falhou com ${errors} erro(s) bloqueante(s).`)
    console.error('   Corrija antes de rodar o seed.')
    process.exit(1)
  }

  console.log(`✅ Validação OK. Pode rodar o seed.`)
  process.exit(0)
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
