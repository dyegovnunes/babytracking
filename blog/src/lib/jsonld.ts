import type { BlogPost, ContentCategory } from '../types'
import { CATEGORY_LABEL } from '../types'

const SITE = 'https://blog.yayababy.app'
const APP_SITE = 'https://yayababy.app'

/**
 * Extrai seções H2 do markdown para montagem de HowTo/FAQPage JSON-LD.
 * Pula seções meta como "Fontes", "Referências" e "Resumindo".
 */
export function parseMdSections(md: string): Array<{ heading: string; body: string }> {
  const parts = md.split(/^## /m)
  const sections = parts.slice(1).map((part) => {
    const lines = part.split('\n')
    const heading = lines[0].trim()
    let body = lines.slice(1).join('\n').trim()
    // Corta em marcadores de rodapé
    const endMarkers = ['\n---\n', '\n---', '**Fontes:**', '*Este conteúdo']
    for (const marker of endMarkers) {
      const idx = body.indexOf(marker)
      if (idx !== -1) body = body.slice(0, idx).trim()
    }
    return { heading, body }
  })
  const skip = ['Fontes', 'Referências', 'Resumindo', 'Neste guia']
  return sections.filter((s) => !skip.some((k) => s.heading.startsWith(k)))
}

/** Remove sintaxe markdown básica para texto limpo em JSON-LD. */
export function stripMd(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // imagens
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/^>\s*/gm, '') // blockquotes
    .replace(/^[-*+]\s+/gm, '') // lista -
    .replace(/^\d+\.\s+/gm, '') // lista numerada
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function slugifyHeading(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function breadcrumbJsonLd(post: BlogPost): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Blog', item: SITE },
      {
        '@type': 'ListItem',
        position: 2,
        name: CATEGORY_LABEL[post.category as ContentCategory],
        item: `${SITE}/categoria/${post.category}`,
      },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE}/${post.slug}` },
    ],
  }
}

export function categoryBreadcrumbJsonLd(category: ContentCategory): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Blog', item: SITE },
      {
        '@type': 'ListItem',
        position: 2,
        name: CATEGORY_LABEL[category],
        item: `${SITE}/categoria/${category}`,
      },
    ],
  }
}

export function articleJsonLd(post: BlogPost): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.meta_description,
    image: post.image_url ? [post.image_url] : undefined,
    datePublished: post.published_at,
    dateModified: post.published_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/${post.slug}` },
    publisher: {
      '@type': 'Organization',
      name: 'Yaya Baby',
      url: APP_SITE,
      logo: { '@type': 'ImageObject', url: `${SITE}/logo.png` },
    },
  }
}

export function howToJsonLd(post: BlogPost): object | null {
  const sections = parseMdSections(post.content_md)
  if (sections.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: post.title,
    description: post.meta_description,
    image: post.image_url ? [post.image_url] : undefined,
    step: sections.map((s, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: s.heading,
      text: stripMd(s.body),
      url: `${SITE}/${post.slug}#${slugifyHeading(s.heading)}`,
    })),
  }
}

export function faqJsonLd(post: BlogPost): object | null {
  const sections = parseMdSections(post.content_md)
  if (sections.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sections.map((s) => ({
      '@type': 'Question',
      name: s.heading,
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripMd(s.body),
      },
    })),
  }
}
