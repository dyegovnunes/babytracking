// ════════════════════════════════════════════════════════════════════════════
// scripts/lib/md-utils.ts
// ════════════════════════════════════════════════════════════════════════════
// Helpers puros de manipulação de markdown — sem dependência de Supabase.
// Permite que o validator (que não fala com DB) carregue o parser sem puxar
// o cliente Supabase junto.
// ════════════════════════════════════════════════════════════════════════════

import * as path from 'node:path'

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
 */
export function resolveStorageUrl(relativePath: string, publicUrlBase: string): string {
  return `${publicUrlBase}/${relativePath}`
}

/**
 * Remove âncoras Markdown extras `{#anchor}` no fim de headings.
 */
export function stripAnchors(line: string): string {
  return line.replace(/\s*\{#[a-z0-9-]+\}\s*$/i, '').trim()
}
