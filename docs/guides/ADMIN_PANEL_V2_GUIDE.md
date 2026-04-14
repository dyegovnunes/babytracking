# Yaya — Admin Panel v2: Guia de Implementação
**Versão:** 2.0 | **Data:** 2026-04-13

> **INSTRUÇÕES:** Leia o documento completo antes de começar. Execute na ordem dos steps. Este guia substitui o ADMIN_IMPLEMENTATION_GUIDE.md com decisões de arquitetura atualizadas.

---

## Decisões de Arquitetura (v2 — atualizado)

| Decisão | v1 (anterior) | v2 (atual) |
|---|---|---|
| Localização | Projeto separado em `admin/` | Rota dentro da `landing-app/` em `/paineladmin` |
| Acesso | Qualquer `is_admin = true` | Apenas `dyego.vnunes@gmail.com` + `is_admin = true` |
| UI | Desktop | **Mobile-first** (uso no celular) |
| URL | `yayababy.app/admin` | `yayababy.app/paineladmin` |

**Por que dentro da landing-app:**
A landing-app já é um Vite+React SPA com React Router. Adicionar uma rota `/paineladmin` é trivial, sem overhead de novo projeto, novo deploy ou novo domínio.

---

## Contexto do Projeto

- **App mobile:** React 19 + Vite + Capacitor (em `app/`)
- **Landing page:** Vite + React SPA (em `landing-app/`) — aqui vai o admin
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions, RLS)
- **Monetização:** RevenueCat. Planos: monthly (R$29,90), annual (R$202,80/ano = R$16,90/mês), lifetime (R$299,90)
- **Admin autorizado:** apenas `dyego.vnunes@gmail.com`
- **Supabase URL:** `https://kgfjfdizxziacblgvplh.supabase.co`
- **Supabase Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZmpmZGl6eHppYWNibGd2cGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEzMTAsImV4cCI6MjA5MDg3NzMxMH0.Qo5SJpaYpQx7NtmngxK6CWusKfPmYdEJYu7hVQC4dhU`

---

## Tabelas Supabase Existentes (referência)

| Tabela | Campos relevantes |
|--------|------------------|
| `profiles` | id, is_premium, subscription_status, subscription_plan, subscription_started_at, subscription_expires_at, billing_provider, revenuecat_user_id |
| `babies` | id, name, birth_date, gender |
| `baby_members` | user_id, baby_id, display_name, role |
| `logs` | id, baby_id, event_id, timestamp, ml, duration, created_by |
| `push_tokens` | user_id, baby_id, token, platform (android/ios/web) |
| `push_log` | user_id, baby_id, type, title, body, sent_at, delivered |
| `streaks` | baby_id, current_streak, longest_streak, last_active_date |
| `notification_prefs` | user_id, baby_id, enabled, cat_feed, cat_diaper, cat_sleep |
| `feature_flags` | id, enabled, description (criada no guia anterior se já rodado) |
| `admin_broadcasts` | id, title, body, segment, sent_at (criada no guia anterior se já rodado) |
| `courtesy_log` | id, user_id, granted_by, days, expires_at (criada no guia anterior se já rodado) |

---

## STEP 1 — Migration: campos admin (rodar se ainda não rodou)

Se o ADMIN_IMPLEMENTATION_GUIDE.md já foi executado, as tabelas já existem. Verificar antes de rodar novamente.

**Criar:** `supabase/migrations/20260413_admin_v2.sql`

```sql
-- Só executa se ainda não existirem os campos

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS courtesy_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS courtesy_granted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS courtesy_reason TEXT,
  ADD COLUMN IF NOT EXISTS signup_platform TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_platform TEXT;

CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO feature_flags (id, enabled, description) VALUES
  ('push_routine_alerts', true, 'Alertas de rotina'),
  ('push_streak', true, 'Notificações de streak'),
  ('push_development_leaps', true, 'Saltos de desenvolvimento'),
  ('push_daily_summary', true, 'Resumo diário'),
  ('maintenance_mode', false, 'Modo manutenção')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "read_flags" ON feature_flags FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS "admin_write_flags" ON feature_flags FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  segment JSONB,
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id)
);

ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admin_broadcasts_policy" ON admin_broadcasts
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE TABLE IF NOT EXISTS courtesy_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  days INTEGER NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE courtesy_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "admin_courtesy_policy" ON courtesy_log
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Marcar Dyego como admin (buscar o user_id do email dyego.vnunes@gmail.com)
UPDATE profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'dyego.vnunes@gmail.com'
);
```

---

## STEP 2 — Estrutura de arquivos na landing-app

Adicionar os seguintes arquivos dentro de `landing-app/src/`:

```
landing-app/src/
├── admin/
│   ├── AdminApp.tsx              ← Router do painel (sub-router)
│   ├── lib/
│   │   ├── supabaseAdmin.ts     ← Cliente Supabase (pode reusar o da landing se existir)
│   │   └── adminAuth.ts         ← Check de acesso: is_admin + email autorizado
│   ├── hooks/
│   │   └── useAdminAuth.ts      ← Hook de autenticação admin
│   ├── pages/
│   │   ├── AdminLoginPage.tsx
│   │   ├── AdminDashboardPage.tsx
│   │   ├── AdminUsersPage.tsx
│   │   ├── AdminUserDetailPage.tsx
│   │   ├── AdminEngagementPage.tsx
│   │   ├── AdminPushPage.tsx
│   │   ├── AdminMonetizationPage.tsx
│   │   └── AdminConfigPage.tsx
│   └── components/
│       ├── AdminLayout.tsx       ← Bottom nav mobile
│       ├── AdminProtectedRoute.tsx
│       ├── StatCard.tsx
│       ├── CourtesyModal.tsx
│       └── PushComposer.tsx
```

No router principal da landing-app, adicionar:

```typescript
// landing-app/src/App.tsx (ou onde está o router principal)
import AdminApp from './admin/AdminApp';

// Dentro do <Routes>:
<Route path="/paineladmin/*" element={<AdminApp />} />
```

---

## STEP 3 — Autenticação com dupla verificação

### `admin/lib/adminAuth.ts`

```typescript
import { supabase } from './supabaseAdmin';

const ADMIN_EMAIL = 'dyego.vnunes@gmail.com';

export async function signInAdmin(email: string, password: string) {
  // Verifica email antes de tentar login
  if (email.toLowerCase() !== ADMIN_EMAIL) {
    throw new Error('Acesso não autorizado.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function checkAdminAccess(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Dupla verificação: email E is_admin no banco
  if (user.email?.toLowerCase() !== ADMIN_EMAIL) return false;

  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return data?.is_admin === true;
}

export async function signOutAdmin() {
  await supabase.auth.signOut();
}
```

### `admin/components/AdminProtectedRoute.tsx`

```typescript
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { checkAdminAccess } from '../lib/adminAuth';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authorized' | 'denied'>('loading');

  useEffect(() => {
    checkAdminAccess().then(ok => setStatus(ok ? 'authorized' : 'denied'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'denied') return <Navigate to="/paineladmin/login" replace />;

  return <>{children}</>;
}
```

---

## STEP 4 — Router do Admin (sub-router)

### `admin/AdminApp.tsx`

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import AdminEngagementPage from './pages/AdminEngagementPage';
import AdminPushPage from './pages/AdminPushPage';
import AdminMonetizationPage from './pages/AdminMonetizationPage';
import AdminConfigPage from './pages/AdminConfigPage';
import AdminLayout from './components/AdminLayout';

export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />
      <Route path="*" element={
        <AdminProtectedRoute>
          <AdminLayout>
            <Routes>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:id" element={<AdminUserDetailPage />} />
              <Route path="engagement" element={<AdminEngagementPage />} />
              <Route path="push" element={<AdminPushPage />} />
              <Route path="monetization" element={<AdminMonetizationPage />} />
              <Route path="config" element={<AdminConfigPage />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Routes>
          </AdminLayout>
        </AdminProtectedRoute>
      } />
    </Routes>
  );
}
```

---

## STEP 5 — Login Page (mobile)

### `admin/pages/AdminLoginPage.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAdmin } from '../lib/adminAuth';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('dyego.vnunes@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInAdmin(email, password);
      navigate('/paineladmin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-4xl">⚡</span>
          <h1 className="text-white text-2xl font-bold mt-2">Yaya Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Acesso restrito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            placeholder="Email"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            placeholder="Senha"
            autoComplete="current-password"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-purple-600 text-white rounded-xl py-3.5 font-semibold text-sm disabled:opacity-50 active:bg-purple-700"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## STEP 6 — Layout Mobile com Bottom Nav

### `admin/components/AdminLayout.tsx`

```typescript
import { useNavigate, useLocation } from 'react-router-dom';
import { signOutAdmin } from '../lib/adminAuth';

const NAV_ITEMS = [
  { path: 'dashboard', icon: '📊', label: 'Dashboard' },
  { path: 'users', icon: '👥', label: 'Usuários' },
  { path: 'push', icon: '🔔', label: 'Push' },
  { path: 'monetization', icon: '💰', label: 'Receita' },
  { path: 'config', icon: '⚙️', label: 'Config' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const current = location.pathname.split('/')[2] || 'dashboard';

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-4 pt-12 pb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-purple-400">⚡ Yaya Admin</h1>
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
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-2 pb-safe">
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
```

---

## STEP 7 — Dashboard Page

### `admin/pages/AdminDashboardPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseAdmin';

interface KPIs {
  totalUsers: number;
  newToday: number;
  newThisWeek: number;
  premiumUsers: number;
  activeStreak: number; // usuários com streak > 0
  totalLogs: number;
  logsToday: number;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  async function loadKPIs() {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { count: totalUsers },
      { count: newToday },
      { count: newThisWeek },
      { count: premiumUsers },
      { count: activeStreak },
      { count: totalLogs },
      { count: logsToday },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', today),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .eq('is_premium', true),
      supabase.from('streaks').select('*', { count: 'exact', head: true })
        .gt('current_streak', 0),
      supabase.from('logs').select('*', { count: 'exact', head: true }),
      supabase.from('logs').select('*', { count: 'exact', head: true })
        .gte('timestamp', today),
    ]);

    setKpis({
      totalUsers: totalUsers ?? 0,
      newToday: newToday ?? 0,
      newThisWeek: newThisWeek ?? 0,
      premiumUsers: premiumUsers ?? 0,
      activeStreak: activeStreak ?? 0,
      totalLogs: totalLogs ?? 0,
      logsToday: logsToday ?? 0,
    });
    setLoading(false);
  }

  if (loading) return <LoadingSpinner />;

  const conversionRate = kpis && kpis.totalUsers > 0
    ? ((kpis.premiumUsers / kpis.totalUsers) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-base font-bold text-gray-200">Visão Geral</h2>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Usuários" value={kpis!.totalUsers} icon="👤" />
        <StatCard label="Novos Hoje" value={kpis!.newToday} icon="🆕" highlight />
        <StatCard label="Esta Semana" value={kpis!.newThisWeek} icon="📅" />
        <StatCard label="Yaya+" value={kpis!.premiumUsers} icon="⭐" />
        <StatCard label="Conversão" value={`${conversionRate}%`} icon="💰" />
        <StatCard label="Com Streak" value={kpis!.activeStreak} icon="🔥" />
        <StatCard label="Logs Hoje" value={kpis!.logsToday} icon="📝" highlight />
        <StatCard label="Total Logs" value={kpis!.totalLogs} icon="📚" />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: {
  label: string; value: number | string; icon: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-purple-900/40 border border-purple-700/40' : 'bg-gray-900'}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-purple-300' : 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
```

---

## STEP 8 — Users Page (lista + busca)

### `admin/pages/AdminUsersPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseAdmin';

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
      .select(`
        id, is_premium, subscription_plan, signup_platform, created_at, courtesy_expires_at,
        auth_user:id (email)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'premium') query = query.eq('is_premium', true);
    if (filter === 'free') query = query.eq('is_premium', false);

    const { data } = await query;

    // Mapear email do auth
    const mapped = (data ?? []).map((u: any) => ({
      ...u,
      email: u.auth_user?.email ?? u.id,
    }));

    setUsers(mapped);
    setLoading(false);
  }

  const filtered = search
    ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()))
    : users;

  const platformIcon = (p: string | null) => {
    if (p === 'android') return '🤖';
    if (p === 'ios') return '🍎';
    return '🌐';
  };

  return (
    <div className="space-y-3 py-2">
      <h2 className="text-base font-bold text-gray-200">Usuários</h2>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por email..."
        className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
      />

      {/* Filters */}
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

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <button
              key={user.id}
              onClick={() => navigate(`/paineladmin/users/${user.id}`)}
              className="w-full bg-gray-900 rounded-xl px-4 py-3 text-left active:bg-gray-800 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{user.email}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {platformIcon(user.signup_platform)} {' '}
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
```

---

## STEP 9 — User Detail Page (com cortesia)

### `admin/pages/AdminUserDetailPage.tsx`

Tela de detalhe de usuário com:
- Dados: email, plano, plataforma, data de cadastro, streak
- Ações: dar cortesia temporária, ver logs recentes
- Contador de bebês e registros

```typescript
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseAdmin';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [babies, setBabies] = useState<any[]>([]);
  const [logCount, setLogCount] = useState(0);
  const [streak, setStreak] = useState<any>(null);
  const [showCourtesy, setShowCourtesy] = useState(false);
  const [courtesyDays, setCourtesyDays] = useState('7');
  const [courtesyReason, setCourtesyReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { if (id) loadUser(id); }, [id]);

  async function loadUser(userId: string) {
    const [profileRes, babiesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('baby_members').select('baby_id, babies(name, birth_date)').eq('user_id', userId),
    ]);

    setUser(profileRes.data);

    const babyIds = (babiesRes.data ?? []).map((b: any) => b.baby_id);
    setBabies(babiesRes.data ?? []);

    if (babyIds.length > 0) {
      const [logRes, streakRes] = await Promise.all([
        supabase.from('logs').select('*', { count: 'exact', head: true })
          .in('baby_id', babyIds),
        supabase.from('streaks').select('*').in('baby_id', babyIds).limit(1).single(),
      ]);
      setLogCount(logRes.count ?? 0);
      setStreak(streakRes.data);
    }
  }

  async function grantCourtesy() {
    if (!id || !courtesyDays) return;
    setSaving(true);

    const days = parseInt(courtesyDays);
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    await Promise.all([
      supabase.from('profiles').update({
        courtesy_expires_at: expiresAt,
        courtesy_granted_by: adminUser?.id,
        courtesy_reason: courtesyReason,
        is_premium: true,
      }).eq('id', id),
      supabase.from('courtesy_log').insert({
        user_id: id,
        granted_by: adminUser?.id,
        days,
        reason: courtesyReason,
        expires_at: expiresAt,
      }),
    ]);

    setSaving(false);
    setShowCourtesy(false);
    setToast(`Cortesia de ${days} dias concedida!`);
    loadUser(id);
    setTimeout(() => setToast(''), 3000);
  }

  if (!user) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isCourtesyActive = user.courtesy_expires_at && new Date(user.courtesy_expires_at) > new Date();

  return (
    <div className="space-y-4 py-2">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="text-gray-500 text-sm flex items-center gap-1">
        ← Voltar
      </button>

      {/* Header */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-white text-sm font-semibold">{user.email ?? id}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Cadastro: {new Date(user.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          {isCourtesyActive ? (
            <span className="text-[10px] bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full">Cortesia</span>
          ) : user.is_premium ? (
            <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full">Yaya+</span>
          ) : (
            <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Free</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-white font-bold">{babies.length}</div>
            <div className="text-gray-500 text-[10px]">Bebês</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-white font-bold">{logCount}</div>
            <div className="text-gray-500 text-[10px]">Registros</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-white font-bold">{streak?.current_streak ?? 0}🔥</div>
            <div className="text-gray-500 text-[10px]">Streak</div>
          </div>
        </div>
      </div>

      {/* Plataforma */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-gray-500 text-xs mb-2">Plataforma</p>
        <p className="text-white text-sm">
          {user.signup_platform === 'android' ? '🤖 Android' :
           user.signup_platform === 'ios' ? '🍎 iOS' : '🌐 Web'}
        </p>
      </div>

      {/* Plano */}
      {user.is_premium && (
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-2">Assinatura</p>
          <p className="text-white text-sm capitalize">{user.subscription_plan ?? 'premium'}</p>
          {isCourtesyActive && (
            <p className="text-amber-400 text-xs mt-1">
              Cortesia até {new Date(user.courtesy_expires_at).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="space-y-2">
        <button
          onClick={() => setShowCourtesy(true)}
          className="w-full bg-amber-600/20 text-amber-400 rounded-xl py-3 text-sm font-semibold active:bg-amber-600/30"
        >
          🎁 Dar cortesia temporária
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 bg-green-600 text-white text-sm text-center py-3 rounded-xl">
          {toast}
        </div>
      )}

      {/* Courtesy Modal */}
      {showCourtesy && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowCourtesy(false)}>
          <div className="bg-gray-900 w-full rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">Conceder cortesia</h3>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Dias de Yaya+</label>
              <div className="flex gap-2">
                {['7', '14', '30', '60'].map(d => (
                  <button
                    key={d}
                    onClick={() => setCourtesyDays(d)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
                      courtesyDays === d ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Motivo (opcional)</label>
              <input
                type="text"
                value={courtesyReason}
                onChange={e => setCourtesyReason(e.target.value)}
                placeholder="ex: Pedido via email, influencer..."
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCourtesy(false)}
                className="flex-1 bg-gray-800 text-gray-400 rounded-xl py-3 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={grantCourtesy}
                disabled={saving}
                className="flex-[2] bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Salvando...' : `Conceder ${courtesyDays} dias`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## STEP 10 — Push Page

### `admin/pages/AdminPushPage.tsx`

Tela com:
- KPIs de push enviados hoje/semana
- Formulário de broadcast com segmentação
- Histórico dos últimos broadcasts

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseAdmin';

export default function AdminPushPage() {
  const [stats, setStats] = useState({ today: 0, week: 0, delivered: 0 });
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<'all' | 'premium' | 'free'>('all');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [todayRes, weekRes, deliveredRes, broadcastsRes] = await Promise.all([
      supabase.from('push_log').select('*', { count: 'exact', head: true }).gte('sent_at', today),
      supabase.from('push_log').select('*', { count: 'exact', head: true }).gte('sent_at', weekAgo),
      supabase.from('push_log').select('*', { count: 'exact', head: true }).eq('delivered', true).gte('sent_at', weekAgo),
      supabase.from('admin_broadcasts').select('*').order('sent_at', { ascending: false }).limit(10),
    ]);

    setStats({ today: todayRes.count ?? 0, week: weekRes.count ?? 0, delivered: deliveredRes.count ?? 0 });
    setBroadcasts(broadcastsRes.data ?? []);
  }

  async function sendBroadcast() {
    if (!title || !body) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();

    // Buscar tokens alvo
    let tokenQuery = supabase.from('push_tokens').select('token, user_id');
    if (segment !== 'all') {
      const { data: profiles } = await supabase.from('profiles')
        .select('id').eq('is_premium', segment === 'premium');
      const ids = (profiles ?? []).map((p: any) => p.id);
      tokenQuery = tokenQuery.in('user_id', ids);
    }

    const { data: tokens } = await tokenQuery;
    const targetCount = tokens?.length ?? 0;

    // Registrar broadcast
    await supabase.from('admin_broadcasts').insert({
      title, body,
      segment: { plan: segment },
      target_count: targetCount,
      sent_count: targetCount, // será atualizado pelo Edge Function se implementado
      sent_by: user?.id,
    });

    // Aqui chamaria a Edge Function de push real:
    // await supabase.functions.invoke('send-broadcast', { body: { title, body, tokens } });

    setSending(false);
    setShowComposer(false);
    setTitle('');
    setBody('');
    setToast(`Broadcast enviado para ~${targetCount} dispositivos`);
    loadStats();
    setTimeout(() => setToast(''), 4000);
  }

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-200">Push Notifications</h2>
        <button
          onClick={() => setShowComposer(true)}
          className="bg-purple-600 text-white text-xs font-semibold px-3 py-2 rounded-lg active:bg-purple-700"
        >
          + Broadcast
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-xl">{stats.today}</div>
          <div className="text-gray-500 text-[10px]">Hoje</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-xl">{stats.week}</div>
          <div className="text-gray-500 text-[10px]">7 dias</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-xl">{stats.delivered}</div>
          <div className="text-gray-500 text-[10px]">Entregues</div>
        </div>
      </div>

      {/* Broadcasts history */}
      <div>
        <p className="text-gray-500 text-xs mb-2">Últimos broadcasts</p>
        {broadcasts.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">Nenhum broadcast enviado</p>
        ) : (
          <div className="space-y-2">
            {broadcasts.map(b => (
              <div key={b.id} className="bg-gray-900 rounded-xl p-3">
                <p className="text-white text-sm font-semibold">{b.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{b.body}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600 text-[10px]">
                    {new Date(b.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-gray-500 text-[10px]">{b.target_count} dispositivos</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 bg-green-600 text-white text-sm text-center py-3 rounded-xl">
          {toast}
        </div>
      )}

      {/* Broadcast Composer */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowComposer(false)}>
          <div className="bg-gray-900 w-full rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">Novo Broadcast</h3>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título da notificação"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Corpo da mensagem"
              rows={3}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none resize-none"
            />

            <div>
              <p className="text-gray-400 text-xs mb-2">Segmento</p>
              <div className="flex gap-2">
                {(['all', 'premium', 'free'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSegment(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                      segment === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {s === 'all' ? 'Todos' : s === 'premium' ? 'Yaya+' : 'Free'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowComposer(false)}
                className="flex-1 bg-gray-800 text-gray-400 rounded-xl py-3 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={sendBroadcast}
                disabled={sending || !title || !body}
                className="flex-[2] bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              >
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## STEP 11 — Monetização e Config (placeholders funcionais)

### `admin/pages/AdminMonetizationPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseAdmin';

export default function AdminMonetizationPage() {
  const [data, setData] = useState({ monthly: 0, annual: 0, lifetime: 0, free: 0 });

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('subscription_plan, is_premium');

      const counts = { monthly: 0, annual: 0, lifetime: 0, free: 0 };
      (profiles ?? []).forEach((p: any) => {
        if (!p.is_premium) { counts.free++; return; }
        if (p.subscription_plan === 'monthly') counts.monthly++;
        else if (p.subscription_plan === 'annual') counts.annual++;
        else if (p.subscription_plan === 'lifetime') counts.lifetime++;
      });
      setData(counts);
    }
    load();
  }, []);

  const mrr = data.monthly * 29.90 + data.annual * 16.90;

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-base font-bold text-gray-200">Monetização</h2>

      <div className="bg-purple-900/40 border border-purple-700/40 rounded-xl p-4 text-center">
        <p className="text-gray-400 text-xs mb-1">MRR estimado</p>
        <p className="text-3xl font-bold text-purple-300">R$ {mrr.toFixed(2)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{data.monthly}</div>
          <div className="text-gray-500 text-xs">Mensal (R$29,90)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{data.annual}</div>
          <div className="text-gray-500 text-xs">Anual (R$202,80)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{data.lifetime}</div>
          <div className="text-gray-500 text-xs">Vitalício (R$299,90)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{data.free}</div>
          <div className="text-gray-500 text-xs">Free</div>
        </div>
      </div>
    </div>
  );
}
```

### `admin/pages/AdminConfigPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseAdmin';

export default function AdminConfigPage() {
  const [flags, setFlags] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('feature_flags').select('*').then(({ data }) => setFlags(data ?? []));
  }, []);

  async function toggleFlag(id: string, current: boolean) {
    await supabase.from('feature_flags').update({ enabled: !current, updated_at: new Date().toISOString() }).eq('id', id);
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: !current } : f));
  }

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-base font-bold text-gray-200">Configurações</h2>

      <div className="space-y-2">
        {flags.map(flag => (
          <div key={flag.id} className="bg-gray-900 rounded-xl px-4 py-3.5 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-white text-sm">{flag.description || flag.id}</p>
              <p className="text-gray-600 text-[10px]">{flag.id}</p>
            </div>
            <button
              onClick={() => toggleFlag(flag.id, flag.enabled)}
              className={`w-11 h-6 rounded-full relative transition-colors ${flag.enabled ? 'bg-purple-500' : 'bg-gray-700'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${flag.enabled ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <p className="text-gray-500 text-xs">Links rápidos</p>
        {[
          { label: '🗄️ Supabase Dashboard', url: 'https://supabase.com/dashboard/project/kgfjfdizxziacblgvplh' },
          { label: '💳 RevenueCat', url: 'https://app.revenuecat.com' },
          { label: '🔥 Firebase Console', url: 'https://console.firebase.google.com' },
        ].map(link => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noreferrer"
            className="block w-full bg-gray-900 rounded-xl px-4 py-3 text-sm text-gray-300 active:bg-gray-800"
          >
            {link.label}
          </a>
        ))}
      </div>
    </div>
  );
}
```

---

## STEP 12 — Engagement Page (placeholder)

### `admin/pages/AdminEngagementPage.tsx`

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseAdmin';

export default function AdminEngagementPage() {
  const [stats, setStats] = useState({ avgLogsPerDay: 0, topEvent: '', multiCaregiver: 0 });

  useEffect(() => {
    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const { count: logsWeek } = await supabase
        .from('logs').select('*', { count: 'exact', head: true })
        .gte('timestamp', sevenDaysAgo);

      const { data: eventCounts } = await supabase
        .from('logs').select('event_id').gte('timestamp', sevenDaysAgo);

      const counts: Record<string, number> = {};
      (eventCounts ?? []).forEach((l: any) => {
        counts[l.event_id] = (counts[l.event_id] ?? 0) + 1;
      });
      const topEvent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

      const { data: multiCareg } = await supabase
        .from('baby_members')
        .select('baby_id')
        .limit(1000);

      const babyMemberCount: Record<string, number> = {};
      (multiCareg ?? []).forEach((m: any) => {
        babyMemberCount[m.baby_id] = (babyMemberCount[m.baby_id] ?? 0) + 1;
      });
      const multiCount = Object.values(babyMemberCount).filter(c => c > 1).length;

      setStats({
        avgLogsPerDay: Math.round((logsWeek ?? 0) / 7),
        topEvent,
        multiCaregiver: multiCount,
      });
    }
    load();
  }, []);

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-base font-bold text-gray-200">Engajamento</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-xl p-4 col-span-2">
          <div className="text-3xl font-bold text-white">{stats.avgLogsPerDay}</div>
          <div className="text-gray-500 text-xs mt-1">Registros/dia (média 7d)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-white font-bold text-lg capitalize">{stats.topEvent || '-'}</div>
          <div className="text-gray-500 text-xs mt-1">Evento mais registrado</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-white font-bold text-2xl">{stats.multiCaregiver}</div>
          <div className="text-gray-500 text-xs mt-1">Bebês com 2+ cuidadores</div>
        </div>
      </div>
    </div>
  );
}
```

---

## STEP 13 — Configurar rota no vite.config da landing-app

Verificar o `vite.config.ts` da `landing-app/`. A SPA precisa ter o fallback correto para que `/paineladmin/*` funcione no browser:

```typescript
// landing-app/vite.config.ts
export default defineConfig({
  // ... config existente
  build: {
    // ... build existente
  },
  // Garantir que o dev server redireciona /paineladmin/* para index.html
  server: {
    historyApiFallback: true,
  }
})
```

Se o deploy é via Vercel/Netlify, adicionar regra de rewrite:

**Vercel (`vercel.json` na landing-app/):**
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Netlify (`_redirects` na landing-app/public/):**
```
/*  /index.html  200
```

---

## STEP 14 — Checklist Final

- [ ] Migration SQL rodou sem erros
- [ ] `is_admin = true` para `dyego.vnunes@gmail.com` confirmado no Supabase
- [ ] Rota `/paineladmin/*` adicionada no router da landing-app
- [ ] Login funciona com `dyego.vnunes@gmail.com`
- [ ] Email diferente é bloqueado na tela de login
- [ ] Dashboard carrega KPIs reais
- [ ] Lista de usuários carrega e filtra
- [ ] Detalhe do usuário mostra dados corretos
- [ ] Cortesia temporária salva no banco e reflete no app
- [ ] Broadcast registra em `admin_broadcasts`
- [ ] Feature flags togglam corretamente
- [ ] Bottom nav navega entre todas as telas
- [ ] Logout funciona
- [ ] Deploy da landing-app atualizado em produção
