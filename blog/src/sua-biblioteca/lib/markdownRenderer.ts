// markdownRenderer — converte markdown da seção em HTML com extensões custom:
//   - :::ciencia / :::mito / :::alerta / :::yaya  → <div class="callout callout-X">
//   - > > texto                                    → pull quote (blockquote dentro de blockquote)
//   - Drop cap automático no primeiro <p> da seção (controlado via CSS)
//
// Usa marked com extensão custom pra "directives" tipo MDX.

import { marked, type Tokens } from 'marked'

type CalloutType = 'ciencia' | 'mito' | 'alerta' | 'yaya'

const CALLOUT_LABELS: Record<CalloutType, string> = {
  ciencia: 'Ciência',
  mito: 'Mito vs. Realidade',
  alerta: 'Alerta',
  yaya: 'No Yaya',
}

const CALLOUT_ICONS: Record<CalloutType, string> = {
  ciencia: 'science',
  mito: 'help_outline',
  alerta: 'warning',
  yaya: 'phone_iphone',
}

// Extensão "callout" — sintaxe :::tipo\n...conteúdo...\n:::
// Marked v15: tokenizer roda com `this` apontando pro lexer; renderer pro parser.
// Usamos `function` (não arrow) pra ter acesso ao `this` correto.
const calloutExtension = {
  name: 'callout',
  level: 'block' as const,
  start(src: string) {
    const m = src.match(/^:::(?:ciencia|mito|alerta|yaya)/m)
    return m ? m.index : undefined
  },
  tokenizer(this: { lexer: { blockTokens: (src: string) => unknown[] } }, src: string) {
    const rule = /^:::(ciencia|mito|alerta|yaya)\s*\n([\s\S]+?)\n:::(?:\n|$)/
    const match = rule.exec(src)
    if (match) {
      return {
        type: 'callout',
        raw: match[0],
        calloutType: match[1] as CalloutType,
        content: match[2],
        tokens: this.lexer.blockTokens(match[2]),
      } as unknown as Tokens.Generic
    }
  },
  renderer(this: { parser: { parse: (t: unknown[]) => string } }, token: Tokens.Generic) {
    const calloutType = token.calloutType as CalloutType
    const inner = this.parser.parse(token.tokens as unknown[])
    return `<aside class="callout callout-${calloutType}" data-type="${calloutType}">
      <div class="callout-header">
        <span class="material-symbols-outlined callout-icon">${CALLOUT_ICONS[calloutType]}</span>
        <span class="callout-label">${CALLOUT_LABELS[calloutType]}</span>
      </div>
      <div class="callout-body">${inner}</div>
    </aside>`
  },
}

marked.use({ extensions: [calloutExtension as never] })
marked.setOptions({ gfm: true, breaks: false })

export function renderSectionMarkdown(md: string): string {
  if (!md) return ''
  let html = marked.parse(md, { async: false }) as string

  // Adiciona classe `drop-cap` no primeiro parágrafo (CSS aplica o effect)
  html = html.replace(/<p>/, '<p class="drop-cap">')

  // Pull quote: blockquote contendo apenas outro blockquote — converte
  // em <aside class="pull-quote">
  html = html.replace(
    /<blockquote>\s*<blockquote>([\s\S]+?)<\/blockquote>\s*<\/blockquote>/g,
    '<aside class="pull-quote">$1</aside>'
  )

  // Links externos abrem em nova aba
  html = html.replace(
    /<a href="(https?:\/\/[^"]+)"/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer"'
  )

  return html
}
