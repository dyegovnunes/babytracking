import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface UserRow {
  id: string;
  email: string;
  is_premium: boolean;
  is_admin: boolean;
  subscription_plan: string | null;
  signup_platform: string | null;
  created_at: string;
  courtesy_expires_at: string | null;
  courtesy_reason: string | null;
  last_seen_at: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase.rpc('admin_get_users');
    setUsers((data as UserRow[]) ?? []);
    setLoading(false);
  }

  const filtered = users
    .filter(u => {
      if (filter === 'premium') return u.is_premium;
      if (filter === 'free') return !u.is_premium;
      return true;
    })
    .filter(u =>
      !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search)
    );

  const platformLabel = (p: string | null) => {
    if (p === 'android') return 'Android';
    if (p === 'ios') return 'iOS';
    return 'Web';
  };

  const isCourtesyActive = (u: UserRow) =>
    u.courtesy_expires_at && new Date(u.courtesy_expires_at) > new Date();

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(183,159,255,0.12)',
    borderRadius: 12,
    padding: '12px 16px',
    color: '#e7e2ff',
    fontSize: 14,
    outline: 'none',
  };

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    background: active ? 'rgba(183,159,255,0.2)' : 'rgba(255,255,255,0.04)',
    color: active ? '#b79fff' : 'rgba(231,226,255,0.5)',
    transition: 'all 0.15s',
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e7e2ff' }}>Usuarios</h2>
        <span style={{ fontSize: 13, color: 'rgba(231,226,255,0.4)' }}>{filtered.length} de {users.length}</span>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por email ou ID..."
        style={inputStyle}
      />

      <div style={{ display: 'flex', gap: 8, margin: '12px 0 16px' }}>
        {(['all', 'premium', 'free'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={filterBtnStyle(filter === f)}>
            {f === 'all' ? 'Todos' : f === 'premium' ? 'Yaya+' : 'Free'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 24, height: 24, border: '2px solid #b79fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Header row - desktop */}
          <div className="admin-table-header" style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
            padding: '8px 16px',
            fontSize: 11,
            color: 'rgba(231,226,255,0.35)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}>
            <span>Email</span>
            <span>Plataforma</span>
            <span>Cadastro</span>
            <span>Plano</span>
            <span>Status</span>
          </div>

          {filtered.map(user => (
            <button
              key={user.id}
              onClick={() => navigate(`/paineladmin/users/${user.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 100px',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(183,159,255,0.06)',
                borderRadius: 12,
                padding: '14px 16px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                color: '#e7e2ff',
                width: '100%',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(183,159,255,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
                <div className="admin-mobile-sub" style={{ fontSize: 11, color: 'rgba(231,226,255,0.35)', marginTop: 2 }}>
                  {platformLabel(user.signup_platform)} · {new Date(user.created_at).toLocaleDateString('pt-BR')}
                </div>
              </div>
              <span className="admin-table-cell" style={{ fontSize: 13, color: 'rgba(231,226,255,0.5)' }}>
                {platformLabel(user.signup_platform)}
              </span>
              <span className="admin-table-cell" style={{ fontSize: 13, color: 'rgba(231,226,255,0.5)' }}>
                {new Date(user.created_at).toLocaleDateString('pt-BR')}
              </span>
              <span className="admin-table-cell" style={{ fontSize: 13, color: 'rgba(231,226,255,0.5)', textTransform: 'capitalize' }}>
                {user.subscription_plan || (user.is_premium ? 'premium' : 'free')}
              </span>
              <div>
                {isCourtesyActive(user) ? (
                  <span style={{ fontSize: 11, background: 'rgba(255,179,0,0.15)', color: '#FFB300', padding: '3px 10px', borderRadius: 20 }}>Cortesia</span>
                ) : user.is_premium ? (
                  <span style={{ fontSize: 11, background: 'rgba(183,159,255,0.15)', color: '#b79fff', padding: '3px 10px', borderRadius: 20 }}>Yaya+</span>
                ) : (
                  <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'rgba(231,226,255,0.4)', padding: '3px 10px', borderRadius: 20 }}>Free</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 768px) {
          .admin-table-header { display: none !important; }
          .admin-table-cell { display: none !important; }
          button[style*="grid-template-columns"] { grid-template-columns: 1fr auto !important; }
        }
        @media (min-width: 769px) {
          .admin-mobile-sub { display: none !important; }
        }
      `}</style>
    </div>
  );
}
