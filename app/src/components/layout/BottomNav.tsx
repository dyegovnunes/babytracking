import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', icon: 'track_changes', label: 'Início' },
  { to: '/history', icon: 'history', label: 'Histórico' },
  { to: '/insights', icon: 'insights', label: 'Insights' },
  { to: '/profile', icon: 'person', label: 'Perfil' },
] as const

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface-container/60 backdrop-blur-xl border-t border-outline-variant/15 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 min-w-[64px] py-1 transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant'
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
        ))}
      </div>
    </nav>
  )
}
