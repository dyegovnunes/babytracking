import { useNavigate, useLocation } from 'react-router-dom';
import { signOutAdmin } from '../lib/adminAuth';

const NAV_ITEMS = [
  { path: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: 'users', label: 'Usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { path: 'push', label: 'Push', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { path: 'monetization', label: 'Receita', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: 'config', label: 'Config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname.split('/paineladmin/')[1]?.split('/')[0] || 'dashboard';

  return (
    <div style={{ background: '#0d0a27', minHeight: '100vh', color: '#e7e2ff' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid rgba(183,159,255,0.1)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 1200,
        margin: '0 auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{'\u26A1'}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#b79fff' }}>Yaya Admin</span>
        </div>
        <button
          onClick={async () => { await signOutAdmin(); navigate('/paineladmin/login'); }}
          style={{ color: 'rgba(231,226,255,0.4)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          Sair
        </button>
      </header>

      {/* Desktop: sidebar + content | Mobile: content + bottom nav */}
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', minHeight: 'calc(100vh - 60px)' }}>
        {/* Desktop sidebar */}
        <nav className="admin-sidebar" style={{
          width: 200,
          padding: '24px 12px',
          borderRight: '1px solid rgba(183,159,255,0.08)',
          flexShrink: 0,
        }}>
          {NAV_ITEMS.map(item => {
            const isActive = current === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(`/paineladmin/${item.path}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  marginBottom: 4,
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(183,159,255,0.12)' : 'transparent',
                  color: isActive ? '#b79fff' : 'rgba(231,226,255,0.5)',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                <NavIcon d={item.icon} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Main content */}
        <main style={{ flex: 1, padding: '24px', paddingBottom: 100, overflow: 'auto' }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="admin-bottom-nav" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(13,10,39,0.95)',
        borderTop: '1px solid rgba(183,159,255,0.1)',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 4px' }}>
          {NAV_ITEMS.map(item => {
            const isActive = current === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(`/paineladmin/${item.path}`)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: '6px 12px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(183,159,255,0.15)' : 'transparent',
                  color: isActive ? '#b79fff' : 'rgba(231,226,255,0.35)',
                  transition: 'all 0.15s',
                }}
              >
                <NavIcon d={item.icon} />
                <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
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
