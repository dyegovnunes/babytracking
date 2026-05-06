// Card contextual de descoberta progressiva.
// Aparece na home entre HighlightsStrip e ContentArticleCard.
// Baseado no layout do ContentArticleCard mas sem imagem — emoji + título + subtítulo + CTA.
// Toque em qualquer área (exceto ✕) navega para o destino.
// Toque em ✕ dispara onDismiss (dismiss permanente via useDiscoveryNudges).

import { useNavigate } from 'react-router-dom'
import { hapticLight } from '../../../lib/haptics'
import YaIAOrb from '../../yaia/components/YaIAOrb'
import type { DiscoveryNudge } from '../useDiscoveryNudges'

/** Mapeia o id do nudge para a foto em /public/nudges/. yaIA é tratado à parte (orb). */
function nudgeImage(id: string): string {
  if (id === 'nudge_family' || id === 'nudge_family_remind') return '/nudges/family.webp'
  if (id === 'nudge_insights') return '/nudges/insights.webp'
  if (id === 'nudge_report') return '/nudges/report.webp'
  return ''
}

interface Props {
  nudge: DiscoveryNudge
  onDismiss: () => void
  /** Quando fornecido, substitui a navegação para nudge.destination */
  onExplore?: () => void
}

export default function DiscoveryNudgeCard({ nudge, onDismiss, onExplore }: Props) {
  const navigate = useNavigate()

  function handleTap() {
    hapticLight()
    if (onExplore) {
      onExplore()
    } else {
      navigate(nudge.destination)
    }
  }

  return (
    <section className="px-5 mt-4">
      <button
        type="button"
        className="w-full text-left active:scale-[0.98] transition-transform"
        onClick={handleTap}
        aria-label={nudge.title}
      >
        <div
          className="rounded-md overflow-hidden relative"
          style={{
            background: 'rgba(183,159,255,0.05)',
            border: '1px solid rgba(183,159,255,0.18)',
          }}
        >
          {/* Área do visual — yaIA usa o orb oficial; demais usam fotos. */}
          {nudge.id === 'nudge_yaia' ? (
            <div
              className="w-full flex items-center justify-center py-5"
              style={{ background: 'rgba(183,159,255,0.07)' }}
            >
              <YaIAOrb size="lg" breathing={false} />
            </div>
          ) : (
            <div
              className="w-full overflow-hidden"
              style={{ aspectRatio: '16/9', background: 'rgba(183,159,255,0.07)' }}
            >
              <img
                src={nudgeImage(nudge.id)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
                aria-hidden
              />
            </div>
          )}

          {/* Botão fechar — canto superior direito */}
          <button
            type="button"
            aria-label="Dispensar sugestão"
            className="absolute top-2 right-2 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
            style={{
              background: 'rgba(0,0,0,0.35)',
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

          {/* Texto abaixo do emoji */}
          <div className="px-3 py-2.5">
            <p className="font-label text-xs uppercase tracking-wider text-primary/70 font-bold mb-1">
              💡 Para você
            </p>
            <p className="font-label text-sm font-semibold text-on-surface leading-snug mb-1">
              {nudge.title}
            </p>
            <p
              className="font-body text-xs text-on-surface-variant leading-relaxed mb-1.5"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {nudge.subtitle}
            </p>
            <p className="font-label text-xs text-primary font-medium">
              Explorar →
            </p>
          </div>
        </div>
      </button>
    </section>
  )
}
