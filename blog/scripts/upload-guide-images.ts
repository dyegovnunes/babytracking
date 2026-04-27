#!/usr/bin/env tsx
/**
 * scripts/upload-guide-images.ts
 *
 * Faz upload de todas as imagens do guia "Últimas Semanas" para o Supabase Storage.
 *   - JPG → WebP (Sharp, qualidade 82, max 1400px)
 *   - Bucket: guide-images  |  Path: ultimas-semanas/img/{nome}.webp
 *   - Faz upsert (sobrescreve se já existir)
 *
 * Uso:
 *   npx tsx scripts/upload-guide-images.ts
 *   npx tsx scripts/upload-guide-images.ts --dry
 */

import sharp from 'sharp'
import { readdir, readFile } from 'node:fs/promises'
import { join, basename, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = join(__dirname, '..', '..', 'content', 'infoprodutos', 'guia-ultimas-semanas', 'imagens')
const STORAGE_BUCKET = 'guide-images'
const STORAGE_PREFIX = 'ultimas-semanas/img'
const MAX_WIDTH = 1400
const QUALITY = 82
const DRY_RUN = process.argv.includes('--dry')

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Defina PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em blog/.env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}`

async function main() {
  const files = (await readdir(IMAGES_DIR)).filter(f =>
    /\.(jpg|jpeg|png)$/i.test(f)
  )

  console.log(`\n📷  ${files.length} imagens encontradas em:\n    ${IMAGES_DIR}\n`)
  if (DRY_RUN) console.log('🔍  DRY RUN — nenhum arquivo será enviado\n')

  const results: Array<{ local: string; remotePath: string; url: string; kb: number }> = []

  for (const file of files) {
    const ext = extname(file)
    const nameWithoutExt = basename(file, ext)
    const remotePath = `${STORAGE_PREFIX}/${nameWithoutExt}.webp`
    const publicUrl = `${PUBLIC_BASE}/${remotePath}`

    const srcPath = join(IMAGES_DIR, file)
    const raw = await readFile(srcPath)

    // Converte para WebP
    const webpBuffer = await sharp(raw)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer()

    const kb = Math.round(webpBuffer.length / 1024)

    if (!DRY_RUN) {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(remotePath, webpBuffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: true,
        })

      if (error) {
        console.error(`  ❌  ${file} → ${error.message}`)
        continue
      }
    }

    results.push({ local: file, remotePath, url: publicUrl, kb })
    const status = DRY_RUN ? '🔍' : '✅'
    console.log(`  ${status}  ${file.padEnd(42)} → ${kb} KB`)
  }

  console.log('\n─────────────────────────────────────────────────────')
  console.log('URLs públicas geradas:\n')
  for (const r of results) {
    console.log(`${r.local}`)
    console.log(`  ${r.url}\n`)
  }

  console.log('─────────────────────────────────────────────────────')
  console.log(`\n✅  ${results.length}/${files.length} imagens ${DRY_RUN ? 'simuladas' : 'enviadas'}\n`)
}

main().catch(err => { console.error(err); process.exit(1) })
