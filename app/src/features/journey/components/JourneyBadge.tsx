import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAchievements } from '../useAchievements'
import { getAchievement } from '../achievements'
import { hapticLight } from '../../../lib/haptics'
import { spring } from '../../../lib/motion'
import AchievementSheet from './AchievementSheet'

/**
 * Pill sutil que indica quantos achievements novos (seen_at=null) o user
 * tem pra ver. Posição: abaixo do nome do bebê no HeroIdentity.
 *
 * - Não renderiza nada quando não há unseen
 * - Mostra emoji do mais recente + "Novo marco" + contador se >1
 * - Tap abre AchievementSheet
 * - Haptic leve no tap
 * - Spring entrada/saída pra não piscar brusco
 */
export default function JourneyBadge() {
  const { unseen } = useAchievements()
  const [sheetOpen, setSheetOpen] = useState(false)

  // Permite CelebrationHost ou outros pontos do app pedirem pra abrir
  // o sheet via evento global. Ex: user clica "Ver jornada" numa
  // celebração de outra tela → navega pra home → sheet abre.
  useEffect(() => {
    const handler = () => setSheetOpen(true)
    window.addEventListener('yaya:open-achievement-sheet', handler)
    return () =>
      window.removeEventListener('yaya:open-achievement-sheet', handler)
  }, [])

  if (unseen.length === 0 && !sheetOpen) return null

  const mostRecent = unseen[0]
  const mostRecentDef = mostRecent
    ? getAchievement(mostRecent.achievementKey)
    : null
  const count = unseen.length

  return (
    <>
      <AnimatePresence>
        {unseen.length > 0 && (
          <motion.button
            type="button"
            onClick={() => {
              hapticLight()
              setSheetOpen(true)
            }}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            whileTap={{ scale: 0.95 }}
            transition={spring.delight}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary/15 border border-tertiary/30 text-tertiary no-cta-shadow"
            aria-label={`${count} novo${count !== 1 ? 's' : ''} marco${count !== 1 ? 's' : ''} na sua jornada`}
          >
            <span className="text-sm leading-none" aria-hidden>
              {mostRecentDef?.emoji ?? '✨'}
            </span>
            <span className="font-label text-[11px] font-semibold">
              {count === 1 ? 'Novo marco' : `${count} novos marcos`}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AchievementSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </>
  )
}
