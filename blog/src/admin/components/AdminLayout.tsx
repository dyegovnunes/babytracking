import { useNavigate, useLocation } from 'react-router-dom'
import { signOutAdmin } from '../lib/adminAuth'

const NAV_ITEMS = [
  { path: 'posts', label: 'Posts', icon: 'article' },
  { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const current = location.pathname.replace(/^\//, '').split('/')[0] || 'posts'

  async function handleSignOut() {
    await signOutAdmin()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: '#0d0a27', color: '#e7e2ff' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'rgba(183,159,255,0.15)', maxWidth: 1280, margin: '0 auto' }}
      >
        <div className="flex items-center gap-3">
          {/* Logo */}
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Ya<span style={{ color: '#b79fff' }}>ya</span>{' '}
            <span className="text-xs font-medium opacity-50">Blog Admin</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://blog.yayababy.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity no-underline"
            style={{ color: '#e7e2ff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
            Ver blog
          </a>
          <button
            onClick={handleSignOut}
            className="text-sm flex items-center gap-1.5 opacity-50 hover:opacity-100 transition-opacity cursor-pointer bg-transparent border-none"
            style={{ color: '#e7e2ff' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            Sair
          </button>
        </div>
      </header>

      <div className="flex" style={{ maxWidth: 1280, margin: '0 auto', minHeight: 'calc(100vh - 61px)' }}>
        {/* Sidebar desktop */}
        <nav
          className="admin-sidebar flex-shrink-0 py-6 px-3 border-r"
          style={{ width: 200, borderColor: 'rgba(183,159,255,0.1)' }}
        >
          {NAV_ITEMS.map(item => {
            const isActive = current === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(`/${item.path}`)}
                className="flex items-center gap-3 w-full px-4 py-2.5 mb-1 rounded-md cursor-pointer bg-transparent border-none text-sm transition-all"
                style={{
                  color: isActive ? '#b79fff' : 'rgba(231,226,255,0.6)',
                  background: isActive ? 'rgba(183,159,255,0.12)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Conteúdo principal */}
        <main className="flex-1 p-6 overflow-auto" style={{ paddingBottom: 80 }}>
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav
        className="admin-bottom-nav fixed bottom-0 left-0 right-0 border-t flex justify-around px-1 py-2"
        style={{
          background: 'rgba(13,10,39,0.92)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(183,159,255,0.15)',
          paddingBottom: 'env(safe-area-inset-bottom, 8px)',
        }}
      >
        {NAV_ITEMS.map(item => {
          const isActive = current === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(`/${item.path}`)}
              className="flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-md cursor-pointer bg-transparent border-none transition-all"
              style={{ color: isActive ? '#b79fff' : 'rgba(231,226,255,0.5)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <style>{`
        @media (max-width: 768px) { .admin-sidebar { display: none !important; } }
        @media (min-width: 769px) { .admin-bottom-nav { display: none !important; } }
        .material-symbols-outlined { font-family: 'Material Symbols Outlined'; font-style: normal; }
      `}</style>
    </div>
  )
}
