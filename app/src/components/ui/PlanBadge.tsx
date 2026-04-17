import { useNavigate } from 'react-router-dom'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { hapticLight } from '../../lib/haptics'

/**
 * Chip no Header que identifica visualmente o plano do user.
 * - Free: chip cinza "Gratuito" → toca abre /yaya-plus (upgrade)
 * - Premium: chip roxo "Yaya+" com ícone auto_awesome → toca abre /settings
 *   (futuramente gerenciar assinatura)
 */
export default function PlanBadge() {
  const isPremium = useBabyPremium()
  const navigate = useNavigate()

  const handleClick = () => {
    hapticLight()
    navigate(isPremium ? '/settings' : '/yaya-plus')
  }

  if (isPremium) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/20 to-tertiary/20 border border-primary/30 active:opacity-70 transition-opacity"
        aria-label="Você é Yaya+"
      >
        <span
          className="material-symbols-outlined text-primary text-sm"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          auto_awesome
        </span>
        <span className="font-label text-[11px] font-bold text-primary tracking-wide">
          Yaya+
        </span>
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant active:opacity-70 transition-opacity"
      aria-label="Plano gratuito — toque pra assinar"
    >
      <span className="font-label text-[11px] font-semibold">Gratuito</span>
    </button>
  )
}
