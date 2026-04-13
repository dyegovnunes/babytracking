import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface UserRow {
  id: string;
  email: string;
  is_premium: boolean;
  subscription_plan: string | null;
  signup_platform: string | null;
  created_at: string;
  courtesy_expires_at: string | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'premium' | 'free'>('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { loadUsers(); }, [filter]);

  async function loadUsers() {
    setLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, is_premium, subscription_plan, signup_platform, created_at, courtesy_expires_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'premium') query = query.eq('is_premium', true);
    if (filter === 'free') query = query.eq('is_premium', false);

    const { data } = await query;

    // Fetch emails from auth via a separate admin-friendly approach
    // Since we can't join auth.users directly from client, we'll show user IDs
    // and fetch emails where possible
    const mapped = (data ?? []).map((u: any) => ({
      ...u,
      email: u.id.slice(0, 8) + '...',
    }));

    setUsers(mapped);
    setLoading(false);
  }

  const filtered = search
    ? users.filter(u =>
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.id.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const platformIcon = (p: string | null) => {
    if (p === 'android') return '\u{1F916}';
    if (p === 'ios') return '\u{1F34E}';
    return '\u{1F310}';
  };

  return (
    <div className="space-y-3 py-2">
      <h2 className="text-base font-bold text-gray-200">Usuarios</h2>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por ID..."
        className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
      />

      <div className="flex gap-2">
        {(['all', 'premium', 'free'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
              filter === f ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'premium' ? 'Yaya+' : 'Free'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-600 text-xs">{filtered.length} usuarios</p>
          {filtered.map(user => (
            <button
              key={user.id}
              onClick={() => navigate(`/paineladmin/users/${user.id}`)}
              className="w-full bg-gray-900 rounded-xl px-4 py-3 text-left active:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate font-mono">{user.id.slice(0, 12)}...</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {platformIcon(user.signup_platform)}{' '}
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="ml-2 flex-shrink-0">
                  {user.courtesy_expires_at && new Date(user.courtesy_expires_at) > new Date() ? (
                    <span className="text-[10px] bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full">Cortesia</span>
                  ) : user.is_premium ? (
                    <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full">Yaya+</span>
                  ) : (
                    <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Free</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
