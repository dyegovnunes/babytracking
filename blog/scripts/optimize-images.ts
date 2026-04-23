#!/usr/bin/env tsx
/**
 * scripts/optimize-images.ts
 *
 * Para cada post em content/posts/:
 *   img*-1.png  →  blog/public/posts/{slug}/hero.webp  (1200px max, WebP q82)
 *   img*-2.png  →  blog/public/posts/{slug}/mid.webp   (1200px max, WebP q82)
 *
 * Também atualiza o frontmatter de cada artigo.md:
 *   - image_url → .webp
 *   - mid_image_url → adicionado quando há imagem do meio
 *
 * Uso:
 *   npm run optimize:images          # processa todos os posts
 *   npm run optimize:images -- --dry # mostra o que faria, sem gravar
 */

import sharp from 'sharp'
import matter from 'gray-matter'
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BLOG_ROOT = join(__dirname, '..')
const CONTENT_DIR = join(BLOG_ROOT, '..', 'content', 'posts')
const PUBLIC_DIR = join(BLOG_ROOT, 'public', 'posts')
const BASE_URL = 'https://blog.yayababy.app/posts'

const DRY_RUN = process.argv.includes('--dry')
const MAX_WIDTH = 1200
const QUALITY = 82

interface Result {
  folder: string
  slug: string
  hero: { src: string; destKb: number; srcKb: number } | null
  mid: { src: string; destKb: number; srcKb: number } | null
  skipped: string[]
}

async function findImages(folder: string): Promise<string[]> {
  const entries = await readdir(folder)
  return entries
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f) && !f.toLowerCase().includes('v0'))
    .sort()
    .map((f) => join(folder, f))
}

async function optimizeImage(src: string, dest: string): Promise<{ srcKb: number; destKb: number }> {
  const srcStat = await stat(src)
  await sharp(src)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(dest)
  const destStat = await stat(dest)
  return {
    srcKb: Math.round(srcStat.size / 1024),
    destKb: Math.round(destStat.size / 1024),
  }
}

async function updateFrontmatter(
  mdPath: string,
  slug: string,
  hasHero: boolean,
  hasMid: boolean,
): Promise<void> {
  const raw = await readFile(mdPath, 'utf-8')
  const parsed = matter(raw)
  const fm = parsed.data

  let changed = false

  if (hasHero) {
    const newUrl = `${BASE_URL}/${slug}/hero.webp`
    if (fm.image_url !== newUrl) {
      fm.image_url = newUrl
      changed = true
    }
  }

  if (hasMid) {
    const newMidUrl = `${BASE_URL}/${slug}/mid.webp`
    if (fm.mid_image_url !== newMidUrl) {
      fm.mid_image_url = newMidUrl
      changed = true
    }
  }

  if (!changed || DRY_RUN) return

  const newContent = matter.stringify(parsed.content, fm)
  await writeFile(mdPath, newContent, 'utf-8')
}

async function main() {
  console.log(`[optimize-images] ${DRY_RUN ? '🔍 DRY RUN' : '🚀 EXECUTE'}`)
  console.log(`[optimize-images] Max width: ${MAX_WIDTH}px · WebP quality: ${QUALITY}`)
  console.log()

  const entries = await readdir(CONTENT_DIR, { withFileTypes: true })
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()

  const results: Result[] = []
  let totalSrcKb = 0
  let totalDestKb = 0

  for (const folder of folders) {
    const folderPath = join(CONTENT_DIR, folder)
    const mdPath = join(folderPath, 'artigo.md')
    if (!existsSync(mdPath)) continue

    const raw = await readFile(mdPath, 'utf-8')
    const { data: fm } = matter(raw)
    const slug: string = fm.slug
    if (!slug) {
      console.log(`  ⚠ ${folder}: sem slug, pulando`)
      continue
    }

    const images = await findImages(folderPath)
    const result: Result = { folder, slug, hero: null, mid: null, skipped: [] }

    const destDir = join(PUBLIC_DIR, slug)
    if (!DRY_RUN) await mkdir(destDir, { recursive: true })

    for (let i = 0; i < images.length && i < 2; i++) {
      const src = images[i]
      const name = i === 0 ? 'hero' : 'mid'
      const dest = join(destDir, `${name}.webp`)

      if (DRY_RUN) {
        const srcStat = await stat(src)
        const srcKb = Math.round(srcStat.size / 1024)
        result[name as 'hero' | 'mid'] = { src: basename(src), srcKb, destKb: 0 }
        totalSrcKb += srcKb
        continue
      }

      const sizes = await optimizeImage(src, dest)
      result[name as 'hero' | 'mid'] = { src: basename(src), ...sizes }
      totalSrcKb += sizes.srcKb
      totalDestKb += sizes.destKb
    }

    if (images.length > 2) {
      result.skipped = images.slice(2).map((p) => basename(p))
    }

    if (!DRY_RUN) {
      await updateFrontmatter(mdPath, slug, !!result.hero, !!result.mid)
    }

    results.push(result)
  }

  // Report
  for (const r of results) {
    const parts: string[] = [`  ${r.folder} (${r.slug})`]
    if (r.hero) {
      parts.push(`hero: ${r.hero.srcKb}KB → ${DRY_RUN ? '?' : r.hero.destKb + 'KB'}`)
    }
    if (r.mid) {
      parts.push(`mid: ${r.mid.srcKb}KB → ${DRY_RUN ? '?' : r.mid.destKb + 'KB'}`)
    }
    if (r.skipped.length) {
      parts.push(`ignoradas: ${r.skipped.join(', ')}`)
    }
    console.log(parts.join(' · '))
  }

  if (!DRY_RUN) {
    const saved = totalSrcKb - totalDestKb
    const pct = Math.round((saved / totalSrcKb) * 100)
    console.log()
    console.log(`✅ ${results.length} posts processados`)
    console.log(`   Antes: ${(totalSrcKb / 1024).toFixed(1)} MB`)
    console.log(`   Depois: ${(totalDestKb / 1024).toFixed(1)} MB`)
    console.log(`   Economia: ${(saved / 1024).toFixed(1)} MB (${pct}%)`)
    console.log()
    console.log('   Próximo passo: npm run publish:content:execute')
  }
}

main().catch((e) => {
  console.error('❌ Erro:', e)
  process.exit(1)
})
