// Seção "Entenda esta fase" para InsightsPage.
// Mostra 1-2 artigos do blog relevantes para a idade atual do bebê,
// posicionados após os InsightCards e antes do paywall.
// Sem dismiss — seção sempre visível, muda conforme a criança cresce.

import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { hapticLight } from '../../../lib/haptics'
import { useContentArticles } from '../useContentArticles'
import type { ContentCategory } from '../contentTypes'
import { CONTENT_CATEGORY_EMOJI } from '../contentTypes'

interface Props {
  babyAgeWeeks: number
  /** Categoria dos insights dominantes no período — prioriza artigos relevantes. */
  dominantCategory?: ContentCategory
}

async function openUrl(url: string) {
  hapticLight()
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export default function ContentSection({ babyAgeWeeks, dominantCategory }: Props) {
  // Tenta primeiro artigos da categoria dominante dos insights
  const { articles: focused, loading: loadingFocused } = useContentArticles(babyAgeWeeks, {
    category: dominantCategory,
    limit: 2,
    utmMedium: 'insights_section',
    filterDismissed: false, // na seção de insights não filtra dismissals
  })

  // Fallback: artigos sem filtro de categoria quando não há suficientes na categoria
  const { articles: general, loading: loadingGeneral } = useContentArticles(babyAgeWeeks, {
    limit: 2,
    utmMedium: 'insights_section',
    filterDismissed: false,
  })

  const loading = loadingFocused || loadingGeneral

  // Usa focados se tiver algum, senão os gerais
  const articles = focused.length > 0 ? focused : general

  if (loading || articles.length === 0) return null

  return (
    <div
      className="rounded-md p-4"
      style={{
        background: 'rgba(183,159,255,0.04)',
        border: '1px solid rgba(183,159,255,0.10)',
      }}
    >
      <p className="font-label text-[10px] uppercase tracking-wider text-primary/60 font-bold mb-3">
        📖 Entenda esta fase
      </p>

      <div className="space-y-3">
        {articles.map((article) => {
          const emoji = CONTENT_CATEGORY_EMOJI[article.category] ?? '📖'
          return (
            <button
              key={article.id}
              type="button"
              className="w-full text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
              onClick={() => openUrl(article.blogUrl)}
              aria-label={`Abrir artigo: ${article.title}`}
            >
              {/* Thumbnail */}
              <div
                className="shrink-0 rounded"
                style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(183,159,255,0.1)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {article.imageUrl ? (
                  <img
                    src={article.imageUrl}
                    alt=""
                    aria-hidden
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                ) : (
                  <span aria-hidden>{emoji}</span>
                )}
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p
                  className="font-label text-sm font-medium text-on-surface leading-snug"
                  style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {article.title}
                </p>
                <p className="font-label text-xs text-primary mt-0.5">
                  Ler →
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
