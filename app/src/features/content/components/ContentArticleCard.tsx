// Card compacto de artigo contextual — aparece na TrackerPage (Home)
// entre o HighlightsStrip e o RecentLogs.
//
// Toque em qualquer área (exceto ✕) abre o artigo via Capacitor Browser.
// Toque em ✕ chama onDismiss (remove por 7 dias, gerenciado pelo hook).

import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { hapticLight } from '../../../lib/haptics'
import type { ContentArticle } from '../contentTypes'
import { CONTENT_CATEGORY_EMOJI } from '../contentTypes'

interface Props {
  article: ContentArticle
  onDismiss: () => void
}

async function openUrl(url: string) {
  hapticLight()
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export default function ContentArticleCard({ article, onDismiss }: Props) {
  const emoji = CONTENT_CATEGORY_EMOJI[article.category] ?? '📖'

  return (
    <section className="px-5 mt-4">
      <button
        type="button"
        className="w-full text-left active:scale-[0.98] transition-transform"
        onClick={() => openUrl(article.blogUrl)}
        aria-label={`Abrir artigo: ${article.title}`}
      >
        <div
          className="flex items-center gap-3 rounded-md p-3"
          style={{
            background: 'rgba(183,159,255,0.05)',
            border: '1px solid rgba(183,159,255,0.12)',
          }}
        >
          {/* Thumbnail */}
          <div
            className="shrink-0 rounded"
            style={{
              width: 56,
              height: 56,
              background: 'rgba(183,159,255,0.1)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
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
            <p className="font-label text-[10px] uppercase tracking-wider text-primary/70 font-bold mb-0.5">
              {emoji} Para você
            </p>
            <p
              className="font-label text-sm font-semibold text-on-surface leading-snug"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {article.title}
            </p>
            <p className="font-label text-xs text-primary mt-1 font-medium">
              Ler artigo →
            </p>
          </div>

          {/* Botão fechar */}
          <button
            type="button"
            aria-label="Dispensar sugestão"
            className="shrink-0 p-1.5 -mr-1 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              hapticLight()
              onDismiss()
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      </button>
    </section>
  )
}
