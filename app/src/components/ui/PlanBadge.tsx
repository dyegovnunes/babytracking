import { useNavigate } from 'react-router-dom'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { hapticLight } from '../../lib/haptics'

/**
 * Chip visual no Header identificando o plano do user.
 *
 * - Free: chip cinza compacto "Free" → toca vai pra /yaya-plus (upgrade).
 * - Premium: retorna null — o Header mostra o "+" colado no próprio logo
 *   "Yaya" em vez do chip separado.
 */
export default function PlanBadge() {
  const isPremium = useBabyPremium()
  const navigate = useNavigate()

  if (isPremium) return null

  const handleClick = () => {
    hapticLight()
    navigate('/yaya-plus')
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant active:opacity-70 transition-opacity"
      aria-label="Plano gratuito — toque pra assinar"
    >
      <span className="font-label text-[10px] font-semibold uppercase tracking-wider">Free</span>
    </button>
  )
}
