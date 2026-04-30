// ════════════════════════════════════════════════════════════════════════════
// scripts/lib/seed-utils.ts
// ════════════════════════════════════════════════════════════════════════════
// Helpers compartilhados pelos scripts de seed da Sua Biblioteca Yaya.
// Consolida lógica que estava duplicada nos seeds individuais por guia.
// ════════════════════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import * as crypto from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// ── Env ─────────────────────────────────────────────────────────────────────

/**
 * Carrega blog/.env no process.env. Idempotente — não sobrescreve env já setado.
 * Aceita REPO_ROOT explícito; caso omitido, deduz a partir do __dirname.
 */
export function loadBlogEnv(repoRoot?: string): void {
  const root = repoRoot ?? path.resolve(__dirname, '..', '..')
  const envPath = path.join(root, 'blog', '.env')
  const raw = require('fs').readFileSync(envPath, 'utf-8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z_]+)\s*=\s*(.+)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
  }
}

/**
 * Cria cliente Supabase com service role. Lê PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY do env. Aborta se ausentes.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const url = process.env.PUBLIC_SUPABASE_URL
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRole) {
    console.error('Faltam PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no blog/.env')
    process.exit(1)
  }
  return createClient(url, serviceRole)
}

// ── Texto / slugs ───────────────────────────────────────────────────────────

/**
 * Converte texto livre em slug kebab-case sem acentos.
 *   "Parte 1: Preparação" → "parte-1-preparacao"
 *   "1.1 Enxoval (kit base)" → "11-enxoval-kit-base"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacríticos
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Estimativa de tempo de leitura. ~200 palavras/minuto, mínimo 1 minuto.
 * Remove markdown noise (#, *, `, >, [, ], (, )) antes de contar.
 */
export function estimateMinutes(text: string): number {
  const words = text
    .replace(/[#*`>\[\]()]/g, '')
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

/**
 * SHA-256 hex do texto. Usado pra cache de áudio TTS — se o texto da seção
 * muda, o hash muda, o áudio é regenerado.
 */
export function hashText(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

// ── Imagens ─────────────────────────────────────────────────────────────────

export interface UploadImagesOptions {
  /** Pasta local com PNG/JPG (ex: content/infoprodutos/{slug}/imagens). */
  imgDir: string
  /** Bucket Storage (ex: 'guide-images'). */
  bucket: string
  /** Prefixo dentro do bucket (ex: '{slug}/img'). */
  prefix: string
  /** Cliente Supabase com service role. */
  supabase: SupabaseClient
  /** URL pública base (ex: `${SUPABASE_URL}/storage/v1/object/public/{bucket}`). */
  publicUrlBase: string
  /** Qualidade WebP (default 82). */
  quality?: number
}

/**
 * Sobe todas as PNG/JPG da pasta como WebP otimizado pro bucket.
 * Idempotente (upsert: true). Retorna mapa `local-relative-path → public URL`
 * com 2 entradas por arquivo: `imagens/{file}` e `{file}`.
 */
export async function uploadImages(opts: UploadImagesOptions): Promise<Map<string, string>> {
  const { imgDir, bucket, prefix, supabase, publicUrlBase, quality = 82 } = opts
  const imagePathMap = new Map<string, string>()

  let files: string[]
  try {
    files = await fs.readdir(imgDir)
  } catch (e) {
    console.warn(`⚠️  Pasta de imagens não existe: ${imgDir} — pulando upload`)
    return imagePathMap
  }

  const targets = files.filter(f => /\.(png|jpe?g)$/i.test(f))
  if (targets.length === 0) {
    console.log(`📸 Nenhuma imagem em ${imgDir}`)
    return imagePathMap
  }

  console.log(`📸 Convertendo e fazendo upload de ${targets.length} imagens…`)

  for (const file of targets) {
    const source = path.join(imgDir, file)
    const baseName = file.replace(/\.[^.]+$/, '')
    const remoteName = `${baseName}.webp`
    const remotePath = `${prefix}/${remoteName}`

    const webpBuffer = await sharp(source).webp({ quality, effort: 4 }).toBuffer()

    const { error } = await supabase.storage
      .from(bucket)
      .upload(remotePath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000',
      })

    if (error) {
      console.error(`  ✗ ${file}: ${error.message}`)
      continue
    }

    const publicUrl = `${publicUrlBase}/${remotePath}`
    imagePathMap.set(`imagens/${file}`, publicUrl)
    imagePathMap.set(file, publicUrl)
    const originalKb = (await fs.stat(source)).size / 1024
    console.log(`  ✓ ${file} (${originalKb.toFixed(0)}KB → ${(webpBuffer.length / 1024).toFixed(0)}KB WebP)`)
  }

  return imagePathMap
}

/**
 * Substitui paths locais (`imagens/foo.png` ou `./foo.png` ou `foo.png`)
 * pelas URLs públicas correspondentes no markdown.
 */
export function rewriteImagePaths(md: string, imageMap: Map<string, string>): string {
  return md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (full, alt: string, src: string) => {
    const cleaned = src.trim().replace(/^\.\//, '')
    const url = imageMap.get(cleaned) ?? imageMap.get(path.basename(cleaned))
    return url ? `![${alt}](${url})` : full
  })
}

/**
 * Resolve um path relativo dentro do bucket pra URL pública.
 * Útil pra `cover_image_url` que vem como path relativo no markdown.
 */
export function resolveStorageUrl(relativePath: string, publicUrlBase: string): string {
  return `${publicUrlBase}/${relativePath}`
}

// ── Markdown auxiliares ─────────────────────────────────────────────────────

/**
 * Remove âncoras Markdown extras `{#anchor}` no fim de headings.
 */
export function stripAnchors(line: string): string {
  return line.replace(/\s*\{#[a-z0-9-]+\}\s*$/i, '').trim()
}

/**
 * Conta caracteres do texto markdown final (sem markup) — útil pra estimar
 * custo de TTS antes de chamar a API.
 */
export function countCharsForTTS(md: string): number {
  // Remove markdown markup mais comum pra estimar texto que vai virar áudio
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')   // imagens
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links → texto
    .replace(/^#+\s+/gm, '')                 // headings
    .replace(/[*_`~]/g, '')                  // ênfase
    .replace(/^>\s?/gm, '')                  // blockquotes
    .replace(/^[-*+]\s+/gm, '')              // listas
    .replace(/\n{2,}/g, '\n')                // colapsa quebras
    .trim()
    .length
}
