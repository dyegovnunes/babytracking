import { useNavigate, useLocation } from 'react-router-dom';
import { signOutAdmin } from '../lib/adminAuth';

const NAV_ITEMS = [
  { path: 'dashboard', icon: '\u{1F4CA}', label: 'Dashboard' },
  { path: 'users', icon: '\u{1F465}', label: 'Usuarios' },
  { path: 'push', icon: '\u{1F514}', label: 'Push' },
  { path: 'monetization', icon: '\u{1F4B0}', label: 'Receita' },
  { path: 'config', icon: '\u2699\uFE0F', label: 'Config' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const current = location.pathname.split('/paineladmin/')[1]?.split('/')[0] || 'dashboard';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-purple-400">{'\u26A1'} Yaya Admin</h1>
        <button
          onClick={async () => { await signOutAdmin(); navigate('/paineladmin/login'); }}
          className="text-gray-500 text-xs"
        >
          Sair
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {children}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-2" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around py-2">
          {NAV_ITEMS.map(item => {
            const isActive = current === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(`/paineladmin/${item.path}`)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-purple-600/20' : ''
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className={`text-[10px] font-medium ${isActive ? 'text-purple-400' : 'text-gray-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
