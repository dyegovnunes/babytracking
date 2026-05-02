import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const NAV = [
  { to: '/dashboard', icon: 'grid_view',  label: 'Pacientes' },
  { to: '/conta',     icon: 'manage_accounts', label: 'Minha conta' },
]

export default function Sidebar() {
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="w-[220px] shrink-0 min-h-screen bg-white border-r border-[#d5d3de] flex flex-col px-4 py-6">

      {/* Logo */}
      <div className="mb-8 px-2">
        <span className="text-[22px] font-[800] text-[#7056e0] tracking-[-0.03em] lowercase block">yaya</span>
        <span className="text-[10px] font-[600] tracking-[0.1em] uppercase text-[#9e9cb0]">portal pediatra</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13px] font-[600] transition-colors duration-100 ${
                isActive
                  ? 'bg-[#e8e1ff] text-[#7056e0]'
                  : 'text-[#5a5870] hover:bg-[#f3f2f8] hover:text-[#1c1b2b]'
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-1 pt-4 border-t border-[#d5d3de]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] text-[13px] font-[600] text-[#5a5870] hover:bg-[#ffd9dd] hover:text-[#b3001f] transition-colors duration-100 cursor-pointer w-full text-left"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sair
        </button>
      </div>
    </aside>
  )
}
