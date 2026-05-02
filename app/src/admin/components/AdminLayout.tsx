import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOutAdmin } from '../lib/adminAuth';
import { supabase } from '../../lib/supabase';

const NAV_ITEMS: Array<{ path: string; label: string; icon: string }> = [
  { path: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: 'users', label: 'Usuários', icon: 'group' },
  { path: 'pediatricians', label: 'Pediatras', icon: 'stethoscope' },
  { path: 'push', label: 'Push', icon: 'notifications' },
  { path: 'monetization', label: 'Receita', icon: 'payments' },
  { path: 'config', label: 'Configurações', icon: 'settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname.split('/paineladmin/')[1]?.split('/')[0] || 'dashboard';
  const [pendingPeds, setPendingPeds] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { count } = await supabase
        .from('pediatricians')
        .select('*', { count: 'exact', head: true })
        .is('approved_at', null);
      if (!cancelled) setPendingPeds(count ?? 0);
    }
    load();
    // Recarrega o badge sempre que voltar pra fora da pagina de pediatras
    // (depois de aprovar alguem, por exemplo)
    if (current !== 'pediatricians') load();
    return () => { cancelled = true; };
  }, [current]);

  async function handleSignOut() {
    await signOutAdmin();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen font-body bg-surface text-on-surface">
      {/* Header */}
      <header className="max-w-[1200px] mx-auto flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
        <div className="flex items-center gap-2.5">
          {/* Logo com mask-image pra herdar cor do tema (bg-primary) */}
          <div
            className="w-7 h-7 bg-primary"
            style={{
              maskImage: 'url(/logo-symbol.png)',
              WebkitMaskImage: 'url(/logo-symbol.png)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
            aria-label="Yaya"
          />
          <span className="font-headline text-lg font-extrabold tracking-tight text-on-surface">
            Ya<span className="text-primary">ya</span>
            <span className="font-label text-xs font-medium ml-2 text-on-surface-variant/70">
              Admin
            </span>
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="font-label text-sm flex items-center gap-1.5 text-on-surface-variant/70 hover:text-on-surface bg-transparent border-none cursor-pointer active:opacity-60 transition-opacity"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Sair
        </button>
      </header>

      {/* Desktop: sidebar + content | Mobile: content + bottom nav */}
      <div className="max-w-[1200px] mx-auto flex" style={{ minHeight: 'calc(100vh - 60px)' }}>
        {/* Desktop sidebar */}
        <nav className="admin-sidebar flex-shrink-0 py-6 px-3 border-r border-outline-variant/20" style={{ width: 220 }}>
          {NAV_ITEMS.map(item => {
            const isActive = current === item.path;
            const badge = item.path === 'pediatricians' ? pendingPeds : 0;
            return (
              <button
                key={item.path}
                onClick={() => navigate(`/paineladmin/${item.path}`)}
                className={`font-label flex items-center gap-3 w-full px-4 py-2.5 mb-1 rounded-md bg-transparent border-none cursor-pointer text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/12 text-primary font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-low font-medium'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className="flex-1 text-left">{item.label}</span>
                {badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 p-6 overflow-auto" style={{ paddingBottom: 100 }}>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav — blur sobre surface */}
      <nav
        className="admin-bottom-nav fixed bottom-0 left-0 right-0 border-t border-outline-variant/30"
        style={{
          background: 'color-mix(in srgb, var(--color-surface) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex justify-around px-1 py-2">
          {NAV_ITEMS.map(item => {
            const isActive = current === item.path;
            const badge = item.path === 'pediatricians' ? pendingPeds : 0;
            return (
              <button
                key={item.path}
                onClick={() => navigate(`/paineladmin/${item.path}`)}
                className={`relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md bg-transparent border-none cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-on-surface-variant/70 hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span className={`font-label text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {badge > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-amber-500 text-[9px] font-bold text-white">
                    {badge}
                  </span>
                )}
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
