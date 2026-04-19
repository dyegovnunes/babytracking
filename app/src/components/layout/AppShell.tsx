import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Header from './Header'
import BottomNav from './BottomNav'
import { AdBanner } from '../ui/AdBanner'
import { prefersReducedMotion } from '../../lib/motion'
import CelebrationHost from '../../features/journey/components/CelebrationHost'

export default function AppShell() {
  const location = useLocation()
  const reduced = prefersReducedMotion()

  return (
    <div className="h-dvh bg-surface flex flex-col overflow-hidden">
      <Header />
      <main
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          paddingTop: 'calc(3.5rem + env(safe-area-inset-top))',
          // Inclui --yaya-ad-offset (setado pelo AdBanner quando banner ativo)
          // pra o conteúdo não ficar atrás da bottom nav que subiu pra acomodar
          // o banner. Quando premium, a var = 0 e voltamos ao padding normal.
          paddingBottom: 'calc(5rem + env(safe-area-inset-bottom) + var(--yaya-ad-offset, 0px))',
        }}
      >
        {/*
          Transição suave entre abas — fade curto (não slide horizontal, que
          brigaria com scroll em listas). mode="wait" evita duas páginas no
          DOM ao mesmo tempo (conflito com AdBanner/absolute children).
          Reduced-motion: duração 0, mantém mudança instantânea.
        */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {/* Banner AdMob — montado uma única vez no shell.
          Ao mudar de página não há mais sequência hide/show que causava crash. */}
      <AdBanner />
      <BottomNav />
      {/* Host global de celebrações (micro toasts + medium modal + big
          fullscreen). Monta 1x no shell pra persistir entre trocas de
          aba e pegar unlocks acontecidos em qualquer página. */}
      <CelebrationHost />
    </div>
  )
}
