import { useRef, useCallback, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAppState, useAppDispatch, switchBaby } from '../../contexts/AppContext'
import { useMyRole } from '../../hooks/useMyRole'
import { can } from '../../lib/roles'
import { hapticLight, hapticMedium } from '../../lib/haptics'
import BabySwitcher from '../ui/BabySwitcher'
import Toast from '../ui/Toast'

const tabs = [
  { to: '/', icon: 'track_changes', label: 'Início' },
  { to: '/history', icon: 'history', label: 'Histórico' },
  { to: '/insights', icon: 'insights', label: 'Insights' },
  { to: '/profile', icon: 'person', label: 'Perfil' },
] as const

const LONG_PRESS_MS = 1500
const DOUBLE_TAP_MS = 300

export default function BottomNav() {
  const { baby, babiesWithRole } = useAppState()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const myRole = useMyRole()

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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container/60 backdrop-blur-xl border-t border-outline-variant/15 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {tabs
            .filter((tab) => tab.to !== '/insights' || can.viewInsights(myRole))
            .map((tab) => {
              // Profile tab: custom gesture handler
              if (tab.to === '/profile') {
                return (
                  <div
                    key={tab.to}
                    className={`flex flex-col items-center gap-0.5 min-w-[64px] py-1 transition-colors cursor-pointer select-none ${
                      isProfileActive ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                    onTouchStart={handleProfileTouchStart}
                    onTouchEnd={handleProfileTouchEnd}
                    onTouchCancel={handleProfileTouchCancel}
                    onMouseDown={handleProfileTouchStart}
                    onMouseUp={handleProfileTouchEnd}
                    onMouseLeave={handleProfileTouchCancel}
                  >
                    {usePhoto ? (
                      <img
                        src={babyPhoto}
                        alt={babyName}
                        className={`w-6 h-6 rounded-full object-cover transition-all ${
                          isProfileActive ? 'ring-2 ring-primary scale-110' : 'opacity-70'
                        }`}
                      />
                    ) : (
                      <span
                        className={`material-symbols-outlined text-2xl transition-all ${
                          isProfileActive ? 'scale-110' : ''
                        }`}
                        style={isProfileActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {tab.icon}
                      </span>
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
                    `flex flex-col items-center gap-0.5 min-w-[64px] py-1 transition-colors ${
                      isActive ? 'text-primary' : 'text-on-surface-variant'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`material-symbols-outlined text-2xl transition-all ${
                          isActive ? 'scale-110' : ''
                        }`}
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                      >
                        {tab.icon}
                      </span>
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
