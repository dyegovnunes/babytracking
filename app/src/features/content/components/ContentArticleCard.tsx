// Card de artigo contextual na TrackerPage (Home).
// Layout: imagem em destaque (topo, 16:9) + kicker + título + "Ler artigo".
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
          className="rounded-md overflow-hidden"
          style={{
            background: 'rgba(183,159,255,0.05)',
            border: '1px solid rgba(183,159,255,0.12)',
          }}
        >
          {/* Imagem de destaque — aspect 16:9 */}
          <div
            className="relative w-full"
            style={{ aspectRatio: '16/9', background: 'rgba(183,159,255,0.1)' }}
          >
            {article.imageUrl ? (
              <img
                src={article.imageUrl}
                alt=""
                aria-hidden
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                loading="lazy"
              />
            ) : (
              /* Placeholder com emoji centralizado quando não há imagem */
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ fontSize: 36 }}
                aria-hidden
              >
                {emoji}
              </div>
            )}

            {/* Gradient overlay sutil no fundo da imagem para legibilidade */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(to bottom, transparent 50%, rgba(15,11,26,0.55) 100%)',
              }}
            />

            {/* Botão fechar — canto superior direito */}
            <button
              type="button"
              aria-label="Dispensar sugestão"
              className="absolute top-2 right-2 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
              style={{
                background: 'rgba(0,0,0,0.45)',
                width: 28,
                height: 28,
                backdropFilter: 'blur(4px)',
              }}
              onClick={(e) => {
                e.stopPropagation()
                hapticLight()
                onDismiss()
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          </div>

          {/* Texto abaixo da imagem */}
          <div className="px-3 py-2.5">
            <p className="font-label text-[10px] uppercase tracking-wider text-primary/70 font-bold mb-1">
              {emoji} Para você
            </p>
            <p
              className="font-label text-sm font-semibold text-on-surface leading-snug mb-1.5"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {article.title}
            </p>
            <p className="font-label text-xs text-primary font-medium">
              Ler artigo →
            </p>
          </div>
        </div>
      </button>
    </section>
  )
}
