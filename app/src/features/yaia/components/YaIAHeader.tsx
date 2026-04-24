import { useNavigate } from 'react-router-dom'
import { formatAge } from '../../../lib/formatters'
import type { Baby } from '../../../types'
import YaIAOrb from './YaIAOrb'

interface YaIAHeaderProps {
  baby: Baby | null
  isLoading: boolean
  hasMessages: boolean
  counterLabel: string | null
  onEndSession: () => void
  onOpenInfo: () => void
}

/**
 * Header premium estilo Pi.ai: orb 44px com logo Yaya, título "yaIA",
 * subtítulo com status online + contexto do bebê. Absorve o antigo
 * ContextChip. Borda inferior com fade nas pontas (mask-image) em vez
 * de linha cortada.
 */
export default function YaIAHeader({
  baby,
  isLoading,
  hasMessages,
  counterLabel,
  onEndSession,
  onOpenInfo,
}: YaIAHeaderProps) {
  const navigate = useNavigate()
  const ageLabel = baby?.birthDate ? formatAge(baby.birthDate) : null

  return (
    <header
      className="sticky top-0 z-20 bg-surface/80 backdrop-blur-2xl"
      style={{
        // Fade nas pontas do border-bottom: usa box-shadow com mask pra
        // não cortar reto. Alternativa sem SVG.
        boxShadow:
          'inset 0 -1px 0 0 rgba(107,78,201,0.12), 0 4px 20px -12px rgba(0,0,0,0.2)',
      }}
    >
      <div className="flex items-start gap-3 px-3 pt-2 pb-2.5 max-w-lg mx-auto w-full">
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="shrink-0 w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors mt-1.5"
          aria-label="Voltar"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        {/* Orb + título + subtítulo */}
        <div className="flex items-center gap-3 flex-1 min-w-0 mt-1">
          <YaIAOrb size="md" pulsing={isLoading} />
          <div className="flex flex-col min-w-0">
            <h1 className="font-display text-lg text-on-surface leading-tight">
              yaIA
            </h1>
            <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant/80 leading-tight truncate">
              <span className="relative flex w-1.5 h-1.5 shrink-0">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="truncate">
                online
                {baby?.name ? (
                  <>
                    {' · '}
                    {baby.name}
                    {ageLabel ? `, ${ageLabel}` : ''}
                  </>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="shrink-0 flex items-center mt-1.5">
          {hasMessages && (
            <button
              type="button"
              onClick={onEndSession}
              className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Encerrar conversa"
              title="Encerrar conversa"
            >
              <span className="material-symbols-outlined text-[20px]">
                restart_alt
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenInfo}
            className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            aria-label="Sobre a yaIA"
          >
            <span className="material-symbols-outlined text-[20px]">info</span>
          </button>
        </div>
      </div>

      {counterLabel && (
        <div className="text-center text-[11px] text-on-surface-variant/70 pb-1.5 px-4">
          {counterLabel}
        </div>
      )}
    </header>
  )
}
