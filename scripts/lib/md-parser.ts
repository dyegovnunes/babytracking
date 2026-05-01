// ════════════════════════════════════════════════════════════════════════════
// scripts/lib/md-parser.ts
// ════════════════════════════════════════════════════════════════════════════
// Parser único do formato self-describing dos guias da Sua Biblioteca Yaya.
// Cada seção declara explicitamente seu type/slug/parent/category/etc no
// próprio markdown, sem depender de detecção por regex no título.
//
// Formato esperado de cada seção:
//
//   ## SEÇÃO: Título visível
//
//   **type:** `linear`
//   **slug:** `slug-da-secao`
//   **parent:** `slug-da-parte-pai`     (ou `null` para seções raiz)
//   **category:** `narrative`            (ou `complementary`)
//   **estimated_minutes:** `5`
//   **cover_image_url:** `meu-guia/img/capa.webp`   (opcional, parts)
//   **is_preview:** `true`               (opcional, default false)
//
//   ```markdown
//   Conteúdo em markdown puro, com callouts permitidos.
//   :::ciencia
//   Texto da caixa científica.
//   :::
//   ```
//
//   ```json
//   { "items": [...] }                    (apenas para checklist/quiz/flashcards)
//   ```
// ════════════════════════════════════════════════════════════════════════════

import { rewriteImagePaths, resolveStorageUrl, stripAnchors } from './md-utils'

export type SectionType = 'part' | 'linear' | 'checklist' | 'quiz' | 'flashcards'
export type SectionCategory = 'narrative' | 'complementary'

export interface ParsedSection {
  type: SectionType
  category: SectionCategory
  title: string
  slug: string
  parent: string | null
  estimated_minutes: number
  cover_image_url?: string
  content_md?: string
  data?: Record<string, unknown>
  is_preview: boolean
}

export interface ParseOptions {
  imageMap: Map<string, string>
  publicUrlBase: string
}

export interface ParseResult {
  sections: ParsedSection[]
  warnings: string[]
  errors: string[]
}

// ── Helpers de extração de metadata ─────────────────────────────────────────

/**
 * Lê valor de uma chave no formato `**key:** \`valor\``.
 * Aceita variações: `**key:**` (colon dentro do bold) ou `**key**:` (fora).
 */
export function extractMetaValue(block: string, key: string): string | null {
  const re = new RegExp(`\\*\\*${key}:?[^*]*\\*\\*:?\\s*\`([^\`]+)\``)
  const m = block.match(re)
  return m ? m[1].trim() : null
}

/**
 * Extrai conteúdo de bloco de código com linguagem específica.
 * `extractCodeBlock(block, 'markdown')` retorna texto entre ```markdown\n...\n```
 */
export function extractCodeBlock(block: string, lang: string): string | null {
  const re = new RegExp(`\`\`\`${lang}\\s*\\n?([\\s\\S]*?)\\n?\`\`\``)
  const m = block.match(re)
  return m ? m[1].trim() : null
}

/** Aceita "true"/"false"/"sim"/"nao" → boolean. Default = false. */
function parseBool(value: string | null): boolean {
  if (!value) return false
  const v = value.trim().toLowerCase()
  return v === 'true' || v === 'sim' || v === 'yes' || v === '1'
}

// ── Parser principal ────────────────────────────────────────────────────────

const VALID_TYPES: ReadonlySet<SectionType> = new Set([
  'part', 'linear', 'checklist', 'quiz', 'flashcards',
])
const VALID_CATEGORIES: ReadonlySet<SectionCategory> = new Set([
  'narrative', 'complementary',
])

/**
 * Heurística pra inferir `category` quando não declarada.
 * narrative: part, linear (default)
 * complementary: checklist, quiz, flashcards (default)
 */
function inferCategory(type: SectionType): SectionCategory {
  if (type === 'part' || type === 'linear') return 'narrative'
  return 'complementary'
}

/**
 * Parse um documento markdown self-describing em seções estruturadas.
 * Retorna sections + warnings/errors pro caller decidir o que fazer.
 */
export function parseGuideMarkdown(md: string, opts: ParseOptions): ParseResult {
  const warnings: string[] = []
  const errors: string[] = []
  const sections: ParsedSection[] = []

  // Divide o documento em blocos pelo marcador `## SEÇÃO:`.
  // slice(1) descarta tudo que vem antes da primeira `## SEÇÃO:`
  // (cabeçalho, índice, intro do arquivo).
  const raw = md.split(/^## SEÇÃO:/m).slice(1)

  if (raw.length === 0) {
    errors.push(
      'Nenhum bloco "## SEÇÃO:" encontrado. ' +
      'Cada seção do guia deve começar com "## SEÇÃO: Título".',
    )
    return { sections, warnings, errors }
  }

  for (const block of raw) {
    const lines = block.split('\n')
    const title = stripAnchors(lines[0].trim())

    const typeRaw = extractMetaValue(block, 'type')
    const slug = extractMetaValue(block, 'slug')
    const parentRaw = extractMetaValue(block, 'parent')
    const categoryRaw = extractMetaValue(block, 'category')
    const estMinRaw = extractMetaValue(block, 'estimated_minutes')
    const coverRaw = extractMetaValue(block, 'cover_image_url')
    const isPreviewRaw = extractMetaValue(block, 'is_preview')

    // Validação obrigatória
    if (!typeRaw) {
      errors.push(`Seção "${title}" sem **type:** — pulando`)
      continue
    }
    if (!slug) {
      errors.push(`Seção "${title}" sem **slug:** — pulando`)
      continue
    }
    if (!VALID_TYPES.has(typeRaw as SectionType)) {
      errors.push(
        `Seção "${title}" tem type inválido: \`${typeRaw}\`. ` +
        `Válidos: ${[...VALID_TYPES].join(', ')}`,
      )
      continue
    }

    const type = typeRaw as SectionType

    // Category: usa declarado OU infere do type
    let category: SectionCategory
    if (categoryRaw) {
      if (!VALID_CATEGORIES.has(categoryRaw as SectionCategory)) {
        warnings.push(
          `Seção "${title}" tem category inválida: \`${categoryRaw}\`. ` +
          `Inferindo de type=${type}.`,
        )
        category = inferCategory(type)
      } else {
        category = categoryRaw as SectionCategory
      }
    } else {
      category = inferCategory(type)
    }

    // parent: `null` literal vira null real; ausente também vira null
    const parent = !parentRaw || parentRaw.toLowerCase() === 'null'
      ? null
      : parentRaw

    // Parts não podem ter parent
    if (type === 'part' && parent !== null) {
      warnings.push(
        `Seção "${title}" é type=part mas tem parent=\`${parent}\`. ` +
        `Forçando parent=null.`,
      )
    }
    const finalParent = type === 'part' ? null : parent

    // estimated_minutes
    const estimated_minutes = estMinRaw ? parseInt(estMinRaw, 10) : 3
    if (Number.isNaN(estimated_minutes) || estimated_minutes < 1) {
      warnings.push(
        `Seção "${title}" tem estimated_minutes inválido: \`${estMinRaw}\`. ` +
        `Usando 3.`,
      )
    }

    // cover_image_url: resolve para URL pública completa se for path relativo
    let cover_image_url: string | undefined
    if (coverRaw) {
      // Se já é URL completa, mantém. Senão, resolve no storage.
      cover_image_url = /^https?:\/\//i.test(coverRaw)
        ? coverRaw
        : resolveStorageUrl(coverRaw, opts.publicUrlBase)
    }

    // content_md (linear, part) — pode ter callouts inline
    const rawMd = extractCodeBlock(block, 'markdown')
    const content_md = rawMd ? rewriteImagePaths(rawMd, opts.imageMap) : undefined

    // data JSON (checklist, quiz, flashcards)
    let data: Record<string, unknown> | undefined
    const rawJson = extractCodeBlock(block, 'json')
    if (rawJson) {
      try {
        data = JSON.parse(rawJson)
      } catch (e) {
        errors.push(`JSON inválido em "${title}": ${(e as Error).message}`)
        continue
      }
    }

    // Validações específicas por type
    if (type === 'checklist') {
      const d = data as { items?: unknown; groups?: unknown; checklist_items?: unknown } | undefined
      const hasItems = !!d && Array.isArray(d.items)
      const hasGroups = !!d && Array.isArray(d.groups)
      // checklist_items é nome legado (do G02 e do seed antigo); aceitamos como alias.
      const hasLegacyItems = !!d && Array.isArray(d.checklist_items)
      if (!hasItems && !hasGroups && !hasLegacyItems) {
        errors.push(
          `Seção "${title}" é type=checklist mas não tem bloco \`\`\`json com { "items": [...] } ou { "groups": [...] }\``,
        )
        continue
      }
    }
    if (type === 'quiz' && (!data || !Array.isArray((data as { questions?: unknown }).questions))) {
      errors.push(
        `Seção "${title}" é type=quiz mas não tem bloco \`\`\`json com { "questions": [...], "results": {...} }\``,
      )
      continue
    }
    if (type === 'flashcards' && (!data || !Array.isArray((data as { cards?: unknown }).cards))) {
      errors.push(
        `Seção "${title}" é type=flashcards mas não tem bloco \`\`\`json com { "cards": [...] }\``,
      )
      continue
    }

    sections.push({
      type,
      category,
      title,
      slug,
      parent: finalParent,
      estimated_minutes: Number.isFinite(estimated_minutes) && estimated_minutes >= 1
        ? estimated_minutes
        : 3,
      cover_image_url,
      content_md,
      data,
      is_preview: parseBool(isPreviewRaw),
    })
  }

  // Validação cruzada: parents declarados existem?
  const allSlugs = new Set(sections.map(s => s.slug))
  for (const s of sections) {
    if (s.parent && !allSlugs.has(s.parent)) {
      errors.push(
        `Seção "${s.title}" referencia parent=\`${s.parent}\` que não existe entre as seções.`,
      )
    }
  }

  // Validação cruzada: slugs duplicados?
  const slugCounts = new Map<string, number>()
  for (const s of sections) {
    slugCounts.set(s.slug, (slugCounts.get(s.slug) ?? 0) + 1)
  }
  for (const [slug, count] of slugCounts) {
    if (count > 1) {
      errors.push(`Slug \`${slug}\` aparece ${count} vezes — slugs devem ser únicos por guia.`)
    }
  }

  return { sections, warnings, errors }
}
