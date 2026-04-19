import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDiscoveryHint } from '../useDiscoveryHint'
import { hapticLight } from '../../../lib/haptics'
import { spring } from '../../../lib/motion'

/**
 * Slot único abaixo do ActivityGrid na home. Sugere a próxima feature
 * contextualmente (idade do bebê + features ainda não vistas).
 *
 * - Renderiza `null` quando não há hint ativo — não quebra spacing
 * - Entrada/saída com spring delight
 * - CTA à direita, botão X pra dismiss forever
 * - Máximo 1 hint visível por vez (regra do hook)
 */
export default function DiscoveryHint() {
  const { activeHint, dismiss } = useDiscoveryHint()
  const navigate = useNavigate()

  if (!activeHint) return null

  const { hint, copy } = activeHint

  const handleCTA = () => {
    hapticLight()
    // Não marcamos como dismissed — a descoberta destrava o achievement
    // via useFeatureSeen quando a tela montar. Hint some naturalmente.
    navigate(hint.cta.path)
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticLight()
    dismiss(hint.key)
  }

  return (
    <div className="px-5 mt-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={hint.key}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={spring.delight}
          className="relative bg-surface-container border border-outline-variant/20 rounded-md px-4 py-3 flex items-center gap-3"
        >
          <span className="text-lg leading-none shrink-0" aria-hidden>
            💡
          </span>
          <p className="flex-1 min-w-0 font-label text-xs text-on-surface leading-snug">
            {copy}
          </p>
          <button
            type="button"
            onClick={handleCTA}
            className="shrink-0 font-label text-xs font-bold text-primary no-cta-shadow px-2 py-1 rounded-md active:bg-primary/10"
          >
            {hint.cta.label}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dispensar sugestão"
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant/60 active:bg-surface-container-high"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
