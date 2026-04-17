import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../contexts/ThemeContext'
import { useAppState } from '../../contexts/AppContext'
import { isInQuietHours } from '../../lib/quietHours'
import { hapticLight } from '../../lib/haptics'
import PlanBadge from '../ui/PlanBadge'

export default function Header() {
  const navigate = useNavigate()
  const { theme, adaptiveTheme, setTheme } = useTheme()
  const { quietHours } = useAppState()

  // Hint visual: em modo adaptado, durante o noturno e ainda em light,
  // o ícone recebe cor primary para sugerir que o noturno "prefere" dark.
  const showNightHint =
    adaptiveTheme &&
    isInQuietHours(quietHours) &&
    theme === 'light'

  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const iconName = theme === 'dark' ? 'light_mode' : 'dark_mode'
  const iconColor = showNightHint ? 'text-primary' : 'text-on-surface-variant'

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface/80 backdrop-blur-xl" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between px-5 h-14">
        <div className="flex items-center gap-2">
          <h1 className="font-headline text-lg font-bold text-on-surface tracking-tight">
            Ya<span className="text-primary">ya</span>
          </h1>
          <PlanBadge />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { hapticLight(); setTheme(nextTheme) }}
            className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center active:scale-95 transition-transform"
            aria-label={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          >
            <span className={`material-symbols-outlined ${iconColor} text-xl`}>
              {iconName}
            </span>
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Configurações"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl">
              settings
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
