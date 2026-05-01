// ════════════════════════════════════════════════════════════════════════════
// scripts/lib/validation-rules.ts
// ════════════════════════════════════════════════════════════════════════════
// QA editorial dos guias da Sua Biblioteca Yaya.
// Roda em cima do output do parser self-describing + arquivos de imagem.
//
// 3 níveis:
//   error   → bloqueia o seed (a menos que use --skip-validation)
//   warning → mostra mas permite seguir
//   info    → sugestão editorial
// ════════════════════════════════════════════════════════════════════════════

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { ParsedSection } from './md-parser'

export type IssueLevel = 'error' | 'warning' | 'info'

export interface Issue {
  level: IssueLevel
  section?: string  // slug pra contextualizar
  rule: string      // nome curto da regra (pra o cowork procurar no manual)
  message: string
}

const VALID_CALLOUTS = new Set(['ciencia', 'mito', 'alerta', 'yaya', 'disclaimer'])

// ── Checks de estrutura ─────────────────────────────────────────────────────

function checkStructure(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []
  const narrativeRoots = sections.filter(
    s => s.parent === null && s.category === 'narrative',
  )

  // Tem ≥1 part?
  const parts = sections.filter(s => s.type === 'part')
  if (parts.length === 0) {
    issues.push({
      level: 'error',
      rule: 'structure-min-parts',
      message: 'Guia precisa ter pelo menos 1 seção do tipo `part` (capítulo).',
    })
  }

  // Tem Introdução?
  const hasIntro = sections.some(s => s.slug.startsWith('introducao'))
  if (!hasIntro) {
    issues.push({
      level: 'error',
      rule: 'structure-intro-missing',
      message: 'Guia precisa ter uma seção com slug iniciando em `introducao`.',
    })
  }

  // Tem Conclusão?
  const hasConclusion = sections.some(s => s.slug.startsWith('conclusao'))
  if (!hasConclusion) {
    issues.push({
      level: 'error',
      rule: 'structure-conclusion-missing',
      message: 'Guia precisa ter uma seção com slug iniciando em `conclusao`.',
    })
  }

  // Conclusão é a ÚLTIMA seção narrative raiz?
  // (parent=null, category=narrative). A ordem do array é a ordem do MD.
  if (hasConclusion && narrativeRoots.length > 0) {
    const last = narrativeRoots[narrativeRoots.length - 1]
    if (!last.slug.startsWith('conclusao')) {
      issues.push({
        level: 'error',
        rule: 'structure-conclusion-position',
        section: last.slug,
        message:
          `A Conclusão deve ser a ÚLTIMA seção raiz (narrative, parent=null) ` +
          `do MD, depois de todas as Partes. Hoje a última raiz é "${last.slug}".`,
      })
    }
  }

  // Conclusão deve ser parent=null + narrative
  const conclusion = sections.find(s => s.slug.startsWith('conclusao'))
  if (conclusion) {
    if (conclusion.parent !== null) {
      issues.push({
        level: 'error',
        rule: 'structure-conclusion-parent',
        section: conclusion.slug,
        message:
          `Conclusão tem parent=\`${conclusion.parent}\`. Deve ser ` +
          `parent: \`null\` (não filha de nenhuma parte).`,
      })
    }
    if (conclusion.category !== 'narrative') {
      issues.push({
        level: 'error',
        rule: 'structure-conclusion-category',
        section: conclusion.slug,
        message:
          `Conclusão tem category=\`${conclusion.category}\`. Deve ser ` +
          `category: \`narrative\`.`,
      })
    }
  }

  return issues
}

// ── Checks de callouts e tipografia ─────────────────────────────────────────

function checkCallouts(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []
  for (const sec of sections) {
    const md = sec.content_md ?? ''
    // Detecta `:::tipo` no início de linha (não match dentro de code fence)
    const callouts = md.match(/^:::([a-z]+)/gim) ?? []
    for (const c of callouts) {
      const tipo = c.replace(':::', '').trim().toLowerCase()
      if (!VALID_CALLOUTS.has(tipo)) {
        issues.push({
          level: 'error',
          rule: 'callout-invalid',
          section: sec.slug,
          message:
            `Callout \`:::${tipo}\` não é canônico. Use só: ` +
            `${[...VALID_CALLOUTS].map(t => `:::${t}`).join(', ')}.`,
        })
      }
    }
  }
  return issues
}

function checkEmDash(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []
  for (const sec of sections) {
    // Verifica title E content_md
    const sources: Array<{ where: string; text: string }> = [
      { where: 'título', text: sec.title },
      { where: 'conteúdo', text: sec.content_md ?? '' },
    ]
    for (const { where, text } of sources) {
      if (text.includes('—')) {
        issues.push({
          level: 'error',
          rule: 'no-em-dash',
          section: sec.slug,
          message:
            `Travessão (—) encontrado no ${where}. Substitua por hífen ` +
            `simples ( - ), vírgula ou dois-pontos. Regra de marca Yaya.`,
        })
      }
    }
  }
  return issues
}

// ── Checks de imagens ───────────────────────────────────────────────────────

async function checkImages(
  sections: ParsedSection[],
  imgDir: string,
): Promise<Issue[]> {
  const issues: Issue[] = []
  let availableImages: Set<string>
  try {
    const files = await fs.readdir(imgDir)
    availableImages = new Set(files.map(f => f.toLowerCase()))
  } catch {
    return [{
      level: 'warning',
      rule: 'img-folder-missing',
      message:
        `Pasta ${imgDir} não existe. Crie-a se for inserir imagens (alt-text obrigatório).`,
    }]
  }

  for (const sec of sections) {
    const md = sec.content_md ?? ''
    // Regex pra ![alt](path)
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    let m: RegExpExecArray | null
    while ((m = imgRegex.exec(md)) !== null) {
      const alt = m[1].trim()
      const src = m[2].trim()

      // Path local (não URL externa) — verifica existência
      if (!/^https?:\/\//i.test(src)) {
        // Aceita "imagens/foo.jpg", "./foo.jpg", "foo.jpg"
        const filename = path.basename(src).toLowerCase()
        if (!availableImages.has(filename)) {
          issues.push({
            level: 'error',
            rule: 'img-not-found',
            section: sec.slug,
            message:
              `Imagem \`${src}\` não existe em ${imgDir}. ` +
              `Adicione o arquivo ou corrija o path.`,
          })
        }
      }

      // Alt-text obrigatório e descritivo
      if (!alt) {
        issues.push({
          level: 'warning',
          rule: 'img-no-alt',
          section: sec.slug,
          message:
            `Imagem \`${src}\` sem alt-text. Acessibilidade + SEO ` +
            `pedem texto descritivo.`,
        })
      } else if (alt.length < 8) {
        issues.push({
          level: 'warning',
          rule: 'img-alt-short',
          section: sec.slug,
          message:
            `Imagem \`${src}\` tem alt-text muito curto (\"${alt}\"). ` +
            `Descreva o que a imagem mostra em ≥8 caracteres.`,
        })
      }
    }
  }
  return issues
}

// ── Checks de comprimento e qualidade ───────────────────────────────────────

function checkSectionContent(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []
  for (const sec of sections) {
    if (sec.type === 'linear' && sec.content_md) {
      // Comprimento mínimo (sem markdown markup)
      const stripped = sec.content_md.replace(/[*_`#>\[\]()]/g, '').trim()
      if (stripped.length < 200) {
        issues.push({
          level: 'warning',
          rule: 'section-too-short',
          section: sec.slug,
          message:
            `Seção tem só ${stripped.length} caracteres de conteúdo. ` +
            `Talvez muito curta? (recomendado ≥200)`,
        })
      }
    }
  }
  return issues
}

function checkParts(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []
  for (const part of sections.filter(s => s.type === 'part')) {
    if (!part.cover_image_url) {
      issues.push({
        level: 'warning',
        rule: 'part-no-cover',
        section: part.slug,
        message:
          `Parte \`${part.slug}\` sem cover_image_url. ` +
          `Capítulos ficam mais editorais com capa (21:9).`,
      })
    }
  }
  return issues
}

// ── Checks de quiz/flashcards/checklist ─────────────────────────────────────

function checkComplementary(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []

  for (const sec of sections) {
    const data = sec.data as Record<string, unknown> | undefined

    if (sec.type === 'quiz') {
      const results = (data?.results ?? {}) as Record<string, unknown>
      const expectedKeys = ['a', 'b', 'c', 'd']
      for (const k of expectedKeys) {
        if (!results[k]) {
          issues.push({
            level: 'error',
            rule: 'quiz-missing-result',
            section: sec.slug,
            message: `Quiz sem resultado para perfil "${k}". Esperado a/b/c/d.`,
          })
        } else {
          const r = results[k] as { title?: string; description?: string }
          if (!r.title || !r.description) {
            issues.push({
              level: 'error',
              rule: 'quiz-incomplete-result',
              section: sec.slug,
              message: `Resultado "${k}" sem title ou description.`,
            })
          }
        }
      }
      const questions = (data?.questions ?? []) as Array<{ options?: unknown[] }>
      if (questions.length < 4) {
        issues.push({
          level: 'warning',
          rule: 'quiz-few-questions',
          section: sec.slug,
          message: `Quiz tem só ${questions.length} perguntas. Recomendado 6-10.`,
        })
      }
    }

    if (sec.type === 'flashcards') {
      const cards = (data?.cards ?? []) as Array<{ front?: string; back?: string }>
      for (let i = 0; i < cards.length; i++) {
        const c = cards[i]
        if (!c.front || !c.back) {
          issues.push({
            level: 'error',
            rule: 'flashcard-empty',
            section: sec.slug,
            message: `Card #${i + 1} tem front ou back vazio.`,
          })
        }
      }
      if (cards.length === 0) {
        issues.push({
          level: 'error',
          rule: 'flashcards-empty',
          section: sec.slug,
          message: 'Seção de flashcards sem nenhum card.',
        })
      }
    }

    if (sec.type === 'checklist') {
      const groups = (data?.groups ?? []) as Array<{ title?: string; items?: unknown[] }>
      const items = (data?.items ?? []) as Array<{ id?: string; text?: string }>
      const allItems: Array<{ id?: string; text?: string }> = items.length > 0
        ? items
        : groups.flatMap(g => (g.items ?? []) as Array<{ id?: string; text?: string }>)

      if (allItems.length === 0) {
        issues.push({
          level: 'error',
          rule: 'checklist-empty',
          section: sec.slug,
          message: 'Checklist sem items.',
        })
      } else {
        // Valida ids únicos
        const ids = new Set<string>()
        const dupes = new Set<string>()
        for (const it of allItems) {
          if (!it.id || !it.text) {
            issues.push({
              level: 'error',
              rule: 'checklist-item-incomplete',
              section: sec.slug,
              message: 'Algum item de checklist sem id ou text.',
            })
            continue
          }
          if (ids.has(it.id)) dupes.add(it.id)
          ids.add(it.id)
        }
        if (dupes.size > 0) {
          issues.push({
            level: 'error',
            rule: 'checklist-duplicate-id',
            section: sec.slug,
            message: `Ids duplicados no checklist: ${[...dupes].join(', ')}.`,
          })
        }
        // Sugere groups quando muitos items sem agrupamento
        if (items.length > 10 && groups.length === 0) {
          issues.push({
            level: 'warning',
            rule: 'checklist-suggest-groups',
            section: sec.slug,
            message:
              `Checklist tem ${items.length} items sem agrupamento. ` +
              `Considere usar \`groups\` (ver manual §4.3).`,
          })
        }
      }
    }
  }

  return issues
}

// ── Checks editoriais (fontes, tom Yaya) ────────────────────────────────────

function checkSources(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []
  let sbpMentions = 0
  let foreignSourceMentions = 0
  const foreignSources = ['OMS', 'WHO', 'NICE', 'ACOG', 'AAP', 'CDC']

  for (const sec of sections) {
    const md = sec.content_md ?? ''
    sbpMentions += (md.match(/\bSBP\b/g) ?? []).length
    for (const fs of foreignSources) {
      foreignSourceMentions += (md.match(new RegExp(`\\b${fs}\\b`, 'g')) ?? []).length
    }
  }

  if (foreignSourceMentions > 0 && sbpMentions === 0) {
    issues.push({
      level: 'warning',
      rule: 'source-prefer-sbp',
      message:
        `Guia cita ${foreignSourceMentions} fonte(s) internacional(is) ` +
        `(OMS, NICE, ACOG, AAP) mas zero menções a SBP. ` +
        `SBP é fonte prioritária — verifique se há referência local equivalente.`,
    })
  }

  // Disclaimer presente em algum lugar?
  const hasDisclaimer = sections.some(s =>
    /:::disclaimer/i.test(s.content_md ?? ''),
  )
  if (!hasDisclaimer) {
    issues.push({
      level: 'warning',
      rule: 'no-disclaimer',
      message:
        `Nenhum \`:::disclaimer\` no guia. Recomendado pelo menos 1 ` +
        `(responsabilidade médico-legal). Ver manual §6.`,
    })
  }

  return issues
}

const TONE_BAD_PATTERNS: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: /\bmam[aã]ezinha\b/gi, suggestion: 'Tom infantilizado. Use "mãe" ou "você".' },
  { pattern: /\bminha m[aã]e\b/gi, suggestion: 'Distância editorial. Use "você" (2ª pessoa) ou "a mãe".' },
  { pattern: /\bamada\b/gi, suggestion: 'Tom melodramático. Evite vocativos sentimentais.' },
  { pattern: /\bquerida\b/gi, suggestion: 'Tom melodramático. Evite vocativos sentimentais.' },
  { pattern: /\bvoc[eê] [eé] (a melhor|incr[ií]vel|maravilhosa)/gi, suggestion: 'Tom puxa-saco. Evite afirmações grandiosas sobre o leitor.' },
]

function checkTone(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []
  for (const sec of sections) {
    const md = sec.content_md ?? ''
    for (const { pattern, suggestion } of TONE_BAD_PATTERNS) {
      const matches = md.match(pattern)
      if (matches && matches.length > 0) {
        issues.push({
          level: 'warning',
          rule: 'tone-yaya',
          section: sec.slug,
          message: `Encontrado "${matches[0]}". ${suggestion}`,
        })
      }
    }
    // Excesso de "!" — humor exagerado
    const exclamations = (md.match(/!/g) ?? []).length
    const wordCount = md.split(/\s+/).length
    if (wordCount > 100 && exclamations > Math.max(3, wordCount / 200)) {
      issues.push({
        level: 'warning',
        rule: 'tone-exclamations',
        section: sec.slug,
        message:
          `Seção tem ${exclamations} pontos de exclamação. ` +
          `Tom Yaya é informativo, não eufórico — reduza.`,
      })
    }
  }
  return issues
}

// ── Checks de preview e estimativa ──────────────────────────────────────────

function checkPreviewAndEstimate(sections: ParsedSection[]): Issue[] {
  const issues: Issue[] = []
  const hasPreview = sections.some(s => s.is_preview)
  if (!hasPreview) {
    issues.push({
      level: 'warning',
      rule: 'no-preview',
      message:
        `Nenhuma seção marcada com is_preview: true. ` +
        `A landing pública não terá amostra grátis.`,
    })
  }

  const totalMin = sections.reduce((acc, s) => acc + (s.estimated_minutes ?? 0), 0)
  if (totalMin > 180) {
    issues.push({
      level: 'info',
      rule: 'guide-very-long',
      message: `Tempo total estimado: ${totalMin} minutos (>3h). Talvez dividir em 2 guias?`,
    })
  }
  return issues
}

// ── Roda todos os checks ────────────────────────────────────────────────────

export interface RunChecksOptions {
  imgDir: string
}

export async function runValidation(
  sections: ParsedSection[],
  opts: RunChecksOptions,
): Promise<Issue[]> {
  const issues: Issue[] = [
    ...checkStructure(sections),
    ...checkCallouts(sections),
    ...checkEmDash(sections),
    ...checkSectionContent(sections),
    ...checkParts(sections),
    ...checkComplementary(sections),
    ...checkSources(sections),
    ...checkTone(sections),
    ...checkPreviewAndEstimate(sections),
    ...(await checkImages(sections, opts.imgDir)),
  ]
  return issues
}

// ── Print formatado ─────────────────────────────────────────────────────────

const ICON_BY_LEVEL: Record<IssueLevel, string> = {
  error: '❌',
  warning: '⚠️ ',
  info: 'ℹ️ ',
}

const COLOR_BY_LEVEL: Record<IssueLevel, string> = {
  error: '\x1b[31m',
  warning: '\x1b[33m',
  info: '\x1b[36m',
}
const RESET = '\x1b[0m'

export function printIssues(issues: Issue[]): { errors: number; warnings: number; infos: number } {
  const errors = issues.filter(i => i.level === 'error')
  const warnings = issues.filter(i => i.level === 'warning')
  const infos = issues.filter(i => i.level === 'info')

  function printGroup(level: IssueLevel, label: string, items: Issue[]) {
    if (items.length === 0) return
    const color = COLOR_BY_LEVEL[level]
    console.log(`\n${color}${ICON_BY_LEVEL[level]}${label} (${items.length})${RESET}`)
    for (const i of items) {
      const ctx = i.section ? `\n     [seção: ${i.section}]` : ''
      console.log(`   • ${i.message} ${color}[${i.rule}]${RESET}${ctx}`)
    }
  }

  printGroup('error', 'ERROS (bloqueiam o seed)', errors)
  printGroup('warning', 'AVISOS', warnings)
  printGroup('info', 'SUGESTÕES', infos)

  if (issues.length === 0) {
    console.log('\n✅ Nenhum problema encontrado. Pronto pra subir.')
  }

  return { errors: errors.length, warnings: warnings.length, infos: infos.length }
}
