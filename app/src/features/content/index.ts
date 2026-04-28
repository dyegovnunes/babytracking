// Feature: content — integração blog ↔ app
// Conteúdo contextual baseado na idade do bebê, servido via blog_posts.

export { useContentArticles } from './useContentArticles'
export { default as ContentArticleCard } from './components/ContentArticleCard'
export { default as ContentSection } from './components/ContentSection'
export type { ContentArticle, ContentCategory } from './contentTypes'
export { CONTENT_CATEGORY_EMOJI, BLOG_BASE_URL } from './contentTypes'
