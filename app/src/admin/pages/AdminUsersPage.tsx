import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatRelativeShort } from '../../lib/formatters';

interface UserRow {
  id: string;
  email: string;
  is_premium: boolean;
  is_admin: boolean;
  subscription_plan: string | null;
  subscription_status: string | null;
  signup_platform: string | null;
  created_at: string;
  courtesy_expires_at: string | null;
  courtesy_reason: string | null;
  last_seen_at: string | null;
  last_seen_platform: string | null;
  // Campos enriquecidos (migration 20260420):
  platforms: string[] | null;
  last_activity_at: string | null;
  records_24h: number | null;
}

type SortKey =
  | 'email'
  | 'platforms'
  | 'created_at'
  | 'plan'
  | 'last_activity'
  | 'records_24h'
  | 'status';

type FilterKey = 'all' | 'paying' | 'courtesy' | 'free';

const PAYING_PLANS = new Set(['monthly', 'annual', 'lifetime']);

function isCourtesyActive(u: UserRow): boolean {
  if (u.subscription_plan === 'courtesy_lifetime') return true;
  if (u.courtesy_expires_at && new Date(u.courtesy_expires_at) > new Date()) return true;
  return false;
}

function isPaying(u: UserRow): boolean {
  return u.is_premium && !!u.subscription_plan && PAYING_PLANS.has(u.subscription_plan) && !isCourtesyActive(u);
}

function statusBucket(u: UserRow): 'courtesy' | 'paying' | 'free' {
  if (isCourtesyActive(u)) return 'courtesy';
  if (u.is_premium) return 'paying';
  return 'free';
}

function platformLabel(p: string): string {
  if (p === 'android') return 'Android';
  if (p === 'ios') return 'iOS';
  if (p === 'web') return 'Web';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function renderPlatforms(user: UserRow): string {
  if (user.platforms && user.platforms.length > 0) {
    return user.platforms.map(platformLabel).join(' | ');
  }
  if (user.signup_platform) return platformLabel(user.signup_platform);
  return '—';
}

function planLabel(u: UserRow): string {
  if (isCourtesyActive(u)) return 'Cortesia';
  if (!u.subscription_plan) return u.is_premium ? 'Premium' : 'Free';
  return u.subscription_plan;
}

function sortUsers(users: UserRow[], sort: { col: SortKey; dir: 'asc' | 'desc' }): UserRow[] {
  const mult = sort.dir === 'asc' ? 1 : -1;
  // Nulls SEMPRE no fim, independente de asc/desc.
  const nullLast = <T,>(a: T | null | undefined, b: T | null | undefined): number | null => {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return null;
  };

  const arr = [...users];
  arr.sort((a, b) => {
    switch (sort.col) {
      case 'email':
        return a.email.localeCompare(b.email) * mult;
      case 'platforms': {
        const ap = (a.platforms && a.platforms[0]) || '';
        const bp = (b.platforms && b.platforms[0]) || '';
        return ap.localeCompare(bp) * mult;
      }
      case 'created_at':
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mult;
      case 'plan':
        return planLabel(a).localeCompare(planLabel(b)) * mult;
      case 'last_activity': {
        const n = nullLast(a.last_activity_at, b.last_activity_at);
        if (n !== null) return n;
        return (new Date(a.last_activity_at!).getTime() - new Date(b.last_activity_at!).getTime()) * mult;
      }
      case 'records_24h': {
        const av = a.records_24h ?? 0;
        const bv = b.records_24h ?? 0;
        return (av - bv) * mult;
      }
      case 'status': {
        // Ordem ordinal: Cortesia (0) > Yaya+ (1) > Free (2) na asc; invertido na desc
        const order: Record<ReturnType<typeof statusBucket>, number> = {
          courtesy: 0,
          paying: 1,
          free: 2,
        };
        return (order[statusBucket(a)] - order[statusBucket(b)]) * mult;
      }
    }
  });
  return arr;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<{ col: SortKey; dir: 'asc' | 'desc' }>({
    col: 'created_at',
    dir: 'desc',
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc('admin_get_users');
      setUsers((data as UserRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const visible = useMemo(() => {
    const filtered = users
      .filter(u => {
        if (filter === 'paying') return isPaying(u);
        if (filter === 'courtesy') return isCourtesyActive(u);
        if (filter === 'free') return !u.is_premium;
        return true;
      })
      .filter(u => !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.id.includes(search));
    return sortUsers(filtered, sort);
  }, [users, filter, search, sort]);

  function onSortHeader(col: SortKey) {
    setSort(prev => {
      if (prev.col === col) return { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      // Default direction por coluna
      const defaultDir: 'asc' | 'desc' = col === 'email' ? 'asc' : 'desc';
      return { col, dir: defaultDir };
    });
  }

  function arrow(col: SortKey): string {
    if (sort.col !== col) return '';
    return sort.dir === 'asc' ? ' ↑' : ' ↓';
  }

  const GRID_COLS = '2fr 1fr 1fr 1fr 1fr 70px 100px';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-xl font-bold text-on-surface">Usuários</h2>
        <span className="font-label text-xs text-on-surface-variant">
          {visible.length} de {users.length}
        </span>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por email ou ID..."
        className="w-full rounded-md px-4 py-3 text-sm bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/30"
      />

      <div className="flex gap-2 mt-3 mb-4 flex-wrap">
        {(['all', 'paying', 'courtesy', 'free'] as const).map(f => {
          const label = f === 'all' ? 'Todos' : f === 'paying' ? 'Pagantes' : f === 'courtesy' ? 'Cortesia' : 'Free';
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-label text-xs px-3 py-2 rounded-md transition-colors ${
                active
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'bg-surface-container-lowest text-on-surface-variant font-medium hover:bg-surface-container-low'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">
            progress_activity
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {/* Header row - desktop */}
          <div
            className="admin-table-header grid px-4 py-2 font-label text-[10px] text-on-surface-variant/70 uppercase tracking-wider"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            <SortHeader label="Email" col="email" current={sort.col} arrow={arrow('email')} onClick={onSortHeader} />
            <SortHeader label="Plataforma" col="platforms" current={sort.col} arrow={arrow('platforms')} onClick={onSortHeader} />
            <SortHeader label="Cadastro" col="created_at" current={sort.col} arrow={arrow('created_at')} onClick={onSortHeader} />
            <SortHeader label="Plano" col="plan" current={sort.col} arrow={arrow('plan')} onClick={onSortHeader} />
            <SortHeader label="Último acesso" col="last_activity" current={sort.col} arrow={arrow('last_activity')} onClick={onSortHeader} />
            <SortHeader label="Reg. 24h" col="records_24h" current={sort.col} arrow={arrow('records_24h')} onClick={onSortHeader} />
            <SortHeader label="Status" col="status" current={sort.col} arrow={arrow('status')} onClick={onSortHeader} />
          </div>

          {visible.map(user => (
            <UserCard
              key={user.id}
              user={user}
              gridCols={GRID_COLS}
              onClick={() => navigate(`/paineladmin/users/${user.id}`)}
            />
          ))}

          {visible.length === 0 && (
            <div className="py-12 text-center font-label text-sm text-on-surface-variant">
              Nenhum usuário encontrado.
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .admin-table-header { display: none !important; }
          .admin-table-cell { display: none !important; }
          button[data-admin-user-row="1"] { grid-template-columns: 1fr auto !important; }
        }
        @media (min-width: 769px) {
          .admin-mobile-sub { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function SortHeader({
  label,
  col,
  current,
  arrow,
  onClick,
}: {
  label: string;
  col: SortKey;
  current: SortKey;
  arrow: string;
  onClick: (c: SortKey) => void;
}) {
  const active = current === col;
  return (
    <button
      onClick={() => onClick(col)}
      className={`text-left bg-transparent border-none cursor-pointer font-label text-[10px] uppercase tracking-wider transition-colors ${
        active ? 'text-primary font-semibold' : 'text-on-surface-variant/70 hover:text-on-surface-variant'
      }`}
    >
      {label}
      {arrow}
    </button>
  );
}

function UserCard({
  user,
  gridCols,
  onClick,
}: {
  user: UserRow;
  gridCols: string;
  onClick: () => void;
}) {
  const bucket = statusBucket(user);
  const hasActivity24h = (user.records_24h ?? 0) > 0;
  const lastActivity = formatRelativeShort(user.last_activity_at);
  const recent = user.last_activity_at
    ? Date.now() - new Date(user.last_activity_at).getTime() < 2 * 60 * 60 * 1000
    : false;
  const stale = user.last_activity_at
    ? Date.now() - new Date(user.last_activity_at).getTime() > 14 * 24 * 60 * 60 * 1000
    : false;

  return (
    <button
      data-admin-user-row="1"
      onClick={onClick}
      className="grid items-center text-left w-full rounded-md px-4 py-3 bg-surface-container-lowest border border-outline-variant/30 hover:bg-surface-container-low transition-colors cursor-pointer"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="min-w-0">
        <div className="font-body text-sm font-medium text-on-surface truncate">
          {user.email}
        </div>
        <div className="admin-mobile-sub font-label text-[11px] text-on-surface-variant/70 mt-0.5 truncate">
          {renderPlatforms(user)}
          {' · '}
          {new Date(user.created_at).toLocaleDateString('pt-BR')}
          {' · '}
          {lastActivity}
          {hasActivity24h && <> · <span className="text-tertiary">{user.records_24h} reg.</span></>}
        </div>
      </div>
      <span className="admin-table-cell font-label text-sm text-on-surface-variant">
        {renderPlatforms(user)}
      </span>
      <span className="admin-table-cell font-label text-sm text-on-surface-variant">
        {new Date(user.created_at).toLocaleDateString('pt-BR')}
      </span>
      <span className="admin-table-cell font-label text-sm text-on-surface-variant capitalize">
        {planLabel(user)}
      </span>
      <span
        className={`admin-table-cell font-label text-sm ${
          user.last_activity_at == null
            ? 'text-on-surface-variant/50'
            : recent
              ? 'text-primary'
              : stale
                ? 'text-on-surface-variant/50'
                : 'text-on-surface-variant'
        }`}
      >
        {lastActivity}
      </span>
      <span
        className={`admin-table-cell font-label text-sm text-center tabular-nums ${
          hasActivity24h ? 'text-tertiary font-semibold' : 'text-on-surface-variant/50'
        }`}
      >
        {hasActivity24h ? user.records_24h : '—'}
      </span>
      <div>
        <StatusBadge bucket={bucket} />
      </div>
    </button>
  );
}

function StatusBadge({ bucket }: { bucket: 'courtesy' | 'paying' | 'free' }) {
  if (bucket === 'courtesy') {
    return (
      <span className="inline-block font-label text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
        Cortesia
      </span>
    );
  }
  if (bucket === 'paying') {
    return (
      <span className="inline-block font-label text-[11px] px-2.5 py-0.5 rounded-full bg-primary/15 text-primary">
        Yaya+
      </span>
    );
  }
  return (
    <span className="inline-block font-label text-[11px] px-2.5 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant/70">
      Free
    </span>
  );
}
