import { useNavigate, useLocation } from 'react-router-dom';
import { signOutAdmin } from '../lib/adminAuth';

const NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: 'users', label: 'Usuários', icon: 'group' },
  { path: 'push', label: 'Push', icon: 'notifications' },
  { path: 'monetization', label: 'Receita', icon: 'payments' },
  { path: 'config', label: 'Configurações', icon: 'settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname.split('/paineladmin/')[1]?.split('/')[0] || 'dashboard';

  async function handleSignOut() {
    await signOutAdmin();
    navigate('/', { replace: true });
  }

  return (
    <div
      className="min-h-screen font-body"
      style={{ background: '#0d0a27', color: '#e7e2ff' }}
    >
      {/* Header */}
      <header
        className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid rgba(183,159,255,0.1)' }}
      >
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-symbol.png"
            alt="Yaya"
            className="w-7 h-7"
            style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(40%) saturate(1500%) hue-rotate(220deg) brightness(105%) contrast(95%)' }}
          />
          <span className="font-headline text-lg font-extrabold tracking-tight">
            Ya<span style={{ color: '#b79fff' }}>ya</span>
            <span className="font-label text-xs font-medium ml-2" style={{ color: 'rgba(231,226,255,0.5)' }}>
              Admin
            </span>
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="font-label text-sm flex items-center gap-1.5 active:opacity-60 transition-opacity"
          style={{ color: 'rgba(231,226,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Sair
        </button>
      </header>

      {/* Desktop: sidebar + content | Mobile: content + bottom nav */}
      <div className="max-w-[1200px] mx-auto flex" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {/* Desktop sidebar */}
        <nav
          className="admin-sidebar flex-shrink-0 py-6 px-3"
          style={{ width: 220, borderRight: '1px solid rgba(183,159,255,0.08)' }}
        >
          {NAV_ITEMS.map(item => {
            const isActive = current === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(`/paineladmin/${item.path}`)}
                className="font-label flex items-center gap-3 w-full px-4 py-2.5 mb-1 rounded-lg transition-colors"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(183,159,255,0.12)' : 'transparent',
                  color: isActive ? '#b79fff' : 'rgba(231,226,255,0.55)',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto" style={{ paddingBottom: 100 }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="admin-bottom-nav fixed bottom-0 left-0 right-0"
        style={{
          background: 'rgba(13,10,39,0.95)',
          borderTop: '1px solid rgba(183,159,255,0.1)',
          backdropFilter: 'blur(12px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex justify-around px-1 py-2">
          {NAV_ITEMS.map(item => {
            const isActive = current === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(`/paineladmin/${item.path}`)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors"
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(183,159,255,0.15)' : 'transparent',
                  color: isActive ? '#b79fff' : 'rgba(231,226,255,0.4)',
                }}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span
                  className="font-label"
                  style={{ fontSize: 10, fontWeight: isActive ? 600 : 500 }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar { display: none !important; }
        }
        @media (min-width: 769px) {
          .admin-bottom-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
