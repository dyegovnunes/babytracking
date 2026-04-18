import { useRef, useCallback, useState, useMemo } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAppState, useAppDispatch, switchBaby } from '../../contexts/AppContext'
import { useMyRole } from '../../hooks/useMyRole'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { can } from '../../lib/roles'
import { hapticLight, hapticMedium } from '../../lib/haptics'
import { spring } from '../../lib/motion'
import BabySwitcher from '../ui/BabySwitcher'
import Toast from '../ui/Toast'

interface TabDef {
  readonly to: string
  readonly icon: string
  readonly label: string
}

const baseTabs: readonly TabDef[] = [
  { to: '/', icon: 'track_changes', label: 'Início' },
  { to: '/insights', icon: 'insights', label: 'Insights' },
  { to: '/profile', icon: 'person', label: 'Perfil' },
] as const

const HISTORY_TAB: TabDef = { to: '/history', icon: 'history', label: 'Histórico' }
const YAYA_PLUS_TAB: TabDef = { to: '/yaya-plus', icon: 'auto_awesome', label: 'Yaya+' }

const LONG_PRESS_MS = 600
const DOUBLE_TAP_MS = 300

export default function BottomNav() {
  const { baby, babiesWithRole } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const myRole = useMyRole()
  const isPremium = useBabyPremium()

  // Nav adaptativa: free vê "Yaya+" (upgrade + MGM) em vez de "Histórico"
  // (o acesso free ao histórico limitado continua via "Ver tudo →" em
  // Últimos Registros, a rota /history funciona mas sai da nav).
  const tabs = useMemo<readonly TabDef[]>(() => {
    const secondary = isPremium ? HISTORY_TAB : YAYA_PLUS_TAB
    return [baseTabs[0], secondary, baseTabs[1], baseTabs[2]]
  }, [isPremium])

  const babyPhoto = baby?.photoUrl
  const babyName = baby?.name
  const usePhoto = !!babyPhoto
  const shortName = babyName && babyName.length <= 10 ? babyName : null
  const hasMultipleBabies = babiesWithRole.length > 1

  // BabySheet state
  const [showBabySheet, setShowBabySheet] = useState(false)
  const [switchToast, setSwitchToast] = useState<string | null>(null)

  // Long press tracking
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFired = useRef(false)

  // Double tap tracking
  const lastTapTime = useRef(0)

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleProfileTouchStart = useCallback(() => {
    longPressFired.current = false
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true
      hapticMedium()
      setShowBabySheet(true)
    }, LONG_PRESS_MS)
  }, [])

  const handleProfileTouchEnd = useCallback(() => {
    clearLongPress()
    if (longPressFired.current) return // long press já abriu o sheet

    const now = Date.now()
    const timeSinceLastTap = now - lastTapTime.current

    // Double tap: troca direto pro próximo bebê
    if (hasMultipleBabies && timeSinceLastTap < DOUBLE_TAP_MS) {
      lastTapTime.current = 0
      hapticLight()
      const currentIdx = babiesWithRole.findIndex(b => b.id === baby?.id)
      const nextIdx = (currentIdx + 1) % babiesWithRole.length
      const nextBaby = babiesWithRole[nextIdx]
      switchBaby(dispatch, nextBaby.id)
      setSwitchToast(`Trocando para ${nextBaby.name}`)
      return
    }

    lastTapTime.current = now

    // Single tap: navega para /profile (com delay para detectar double tap)
    setTimeout(() => {
      if (Date.now() - lastTapTime.current >= DOUBLE_TAP_MS) {
        navigate('/profile')
      }
    }, DOUBLE_TAP_MS)
  }, [hasMultipleBabies, babiesWithRole, baby?.id, dispatch, navigate, clearLongPress])

  const handleProfileTouchCancel = useCallback(() => {
    clearLongPress()
  }, [clearLongPress])

  const isProfileActive = location.pathname === '/profile'

  return (
    <>
      <nav
        className="fixed left-0 right-0 z-40 bg-surface-container/60 backdrop-blur-xl border-t border-outline-variant/15 pb-safe"
        style={{
          // --yaya-ad-offset é setado pelo AdBanner quando o banner AdMob está
          // visível (60px). Quando premium, a var não existe e fallback = 0.
          // Esse deslocamento garante que a nav fica acima do banner, já que o
          // plugin @capacitor-community/admob ignora nosso margin em Android 15+.
          bottom: 'var(--yaya-ad-offset, 0px)',
        }}
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs
            .filter((tab) => tab.to !== '/insights' || can.viewInsights(myRole))
            .map((tab) => {
              // Profile tab: custom gesture handler (PointerEvents unify touch + mouse)
              if (tab.to === '/profile') {
                return (
                  <div
                    key={tab.to}
                    className={`relative flex flex-col items-center gap-0.5 min-w-[64px] py-1 transition-colors cursor-pointer select-none ${
                      isProfileActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                    onPointerDown={handleProfileTouchStart}
                    onPointerUp={handleProfileTouchEnd}
                    onPointerCancel={handleProfileTouchCancel}
                    onPointerLeave={handleProfileTouchCancel}
                  >
                    {isProfileActive && <NavActiveGlow />}
                    {usePhoto ? (
                      <img
                        src={babyPhoto}
                        alt={babyName}
                        className={`w-6 h-6 rounded-full object-cover transition-all ${
                          isProfileActive ? 'ring-2 ring-tertiary scale-110' : 'opacity-70'
                        }`}
                      />
                    ) : (
                      <motion.span
                        className="material-symbols-outlined text-2xl"
                        animate={{ scale: isProfileActive ? 1.1 : 1 }}
                        whileTap={{ scale: 1.2 }}
                        transition={spring.subtle}
                        style={isProfileActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {tab.icon}
                      </motion.span>
                    )}
                    <span className="font-label text-[10px] font-medium">
                      {shortName ?? tab.label}
                    </span>
                  </div>
                )
              }

              // Regular tabs: standard NavLink
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={({ isActive }) =>
                    `relative flex flex-col items-center gap-0.5 min-w-[64px] py-1 transition-colors ${
                      isActive ? 'text-tertiary' : 'text-on-surface-variant'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <NavActiveGlow />}
                      <motion.span
                        className="material-symbols-outlined text-2xl"
                        animate={{ scale: isActive ? 1.1 : 1 }}
                        whileTap={{ scale: 1.2 }}
                        transition={spring.subtle}
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        onClick={() => { if (!isActive) hapticLight() }}
                      >
                        {tab.icon}
                      </motion.span>
                      <span className="font-label text-[10px] font-medium">
                        {tab.label}
                      </span>
                    </>
                  )}
                </NavLink>
              )
            })}
        </div>
      </nav>

      {showBabySheet && <BabySwitcher onClose={() => setShowBabySheet(false)} />}
      {switchToast && <Toast message={switchToast} onDismiss={() => setSwitchToast(null)} />}
    </>
  )
}

/**
 * Pill sutil que indica a tab ativa e desliza entre as tabs quando o
 * usuário troca. `layoutId="nav-active-glow"` faz Framer Motion tratar
 * como mesmo elemento entre renders diferentes — quando ele some de
 * uma tab e aparece em outra, o movimento é interpolado com spring.
 *
 * Design: fundo quase imperceptível (white/5 dark, primary/5 light) —
 * a cor vem do ícone (text-tertiary rosa), o fundo só dá uma "elevação"
 * discreta. Não compete visualmente, só localiza a tab ativa.
 */
function NavActiveGlow() {
  return (
    <motion.div
      layoutId="nav-active-glow"
      className="absolute inset-x-1 inset-y-0 rounded-2xl bg-on-surface/[0.08] pointer-events-none"
      transition={spring.delight}
      aria-hidden
    />
  )
}
