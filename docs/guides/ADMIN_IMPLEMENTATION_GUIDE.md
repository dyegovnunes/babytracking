# Yaya — Admin Panel: Guia de Implementação para Claude Code
**Versão:** 1.0 | **Data:** 2026-04-12

> **INSTRUÇÕES:** Este documento contém TUDO que você precisa para criar o painel administrativo do Yaya Baby. Leia o documento inteiro antes de começar. Execute na ordem dos steps. O admin é um projeto SEPARADO da landing page e do app mobile.

---

## Contexto do Projeto

- **Yaya Baby** é um app de tracking de rotina de bebê (amamentação, sono, fraldas)
- **App mobile:** React 19 + Vite + Capacitor (em `app/`)
- **Landing page:** Vite + React (em `landing-app/`)
- **Backend:** Supabase (Auth, PostgreSQL, Edge Functions, RLS)
- **Monetização:** RevenueCat (entitlement: `yaya_plus`). Planos: monthly (R$29,90), annual (R$202,80), lifetime (R$299,90)
- **Supabase URL:** `https://kgfjfdizxziacblgvplh.supabase.co`
- **Supabase Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZmpmZGl6eHppYWNibGd2cGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEzMTAsImV4cCI6MjA5MDg3NzMxMH0.Qo5SJpaYpQx7NtmngxK6CWusKfPmYdEJYu7hVQC4dhU`

---

## Decisão de Arquitetura

A landing page é Vite+React SPA sem routing. Adicionar admin lá geraria complexidade desnecessária. O admin será um **projeto Vite+React separado** na pasta `admin/`, com deploy independente em subdomínio ou path (`yayababy.app/admin` via proxy ou `admin.yayababy.app`).

**Stack do admin:**
- Vite + React 19 + TypeScript
- Tailwind CSS v4 (mesma versão da landing)
- Recharts (gráficos)
- Supabase JS SDK (mesmo do app, queries diretas)
- React Router (navegação entre telas)
- date-fns (formatação de datas)

**Autenticação:** Supabase Auth (mesmo login). Campo `is_admin` na tabela `profiles`. Se `is_admin !== true`, redireciona para 403.

---

## Tabelas Supabase EXISTENTES (referência)

| Tabela | Campos relevantes para admin |
|--------|------------------------------|
| `profiles` | id, is_premium, subscription_status, subscription_plan, subscription_started_at, subscription_expires_at, subscription_cancelled_at, billing_provider, revenuecat_user_id |
| `babies` | id, name, birth_date, gender, photo_url |
| `baby_members` | user_id, baby_id, display_name, role |
| `logs` | id, baby_id, event_id, timestamp, ml, duration, notes, created_by |
| `notification_prefs` | user_id, baby_id, enabled, cat_feed, cat_diaper, cat_sleep, cat_bath, quiet_enabled, streak_alerts, development_leaps, smart_suggestions, daily_summary |
| `interval_configs` | baby_id, category, minutes, warn, mode |
| `push_tokens` | user_id, baby_id, token, platform (android/ios/web), created_at |
| `push_preferences` | user_id, baby_id, feeding_interval_min, sleep_wake_window_min, routine_alerts, etc. |
| `streaks` | baby_id, current_streak, longest_streak, last_active_date, freeze_used_this_week |
| `push_log` | user_id, baby_id, type, title, body, sent_at, delivered |

---

## STEP 1 — Migration: campos para admin e cortesia

**Criar:** `supabase/migrations/20260412_admin_fields.sql`

```sql
-- ============================================
-- ADMIN PANEL — Campos necessários
-- ============================================

-- 1. Flag de admin no profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Cortesia temporária (premium grátis com expiração)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS courtesy_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS courtesy_granted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS courtesy_reason TEXT;

-- 3. Campo para rastrear plataforma de signup
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS signup_platform TEXT, -- 'android', 'ios', 'web'
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_seen_platform TEXT;

-- 4. Tabela de feature flags globais
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  enabled BOOLEAN DEFAULT true,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Feature flags iniciais
INSERT INTO feature_flags (id, enabled, description) VALUES
  ('push_routine_alerts', true, 'Alertas de rotina por push'),
  ('push_streak', true, 'Notificações de streak'),
  ('push_development_leaps', true, 'Notificações de saltos de desenvolvimento'),
  ('push_daily_summary', true, 'Resumo diário por push'),
  ('push_smart_suggestions', true, 'Sugestões inteligentes de ajuste'),
  ('push_celebrations', true, 'Celebrações e marcos'),
  ('maintenance_mode', false, 'Modo manutenção (bloqueia app)')
ON CONFLICT (id) DO NOTHING;

-- RLS feature_flags
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read flags" ON feature_flags FOR SELECT USING (true);
CREATE POLICY "Only admins update flags" ON feature_flags FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
);

-- 5. Tabela de broadcasts enviados pelo admin
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  segment JSONB, -- {"platform": "android", "plan": "free", "baby_age_range": "0-3m"}
  target_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID REFERENCES auth.users(id)
);

ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins manage broadcasts" ON admin_broadcasts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- 6. Tabela de cortesias concedidas (histórico)
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
CREATE POLICY "Only admins manage courtesy log" ON courtesy_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- 7. Index para queries do admin dashboard
CREATE INDEX IF NOT EXISTS idx_profiles_admin ON profiles(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_profiles_premium ON profiles(is_premium);
CREATE INDEX IF NOT EXISTS idx_profiles_signup_platform ON profiles(signup_platform);
CREATE INDEX IF NOT EXISTS idx_profiles_courtesy ON profiles(courtesy_expires_at) WHERE courtesy_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_push_log_sent ON push_log(sent_at DESC);

-- 8. Marcar o Dyego como admin (executar DEPOIS de saber o user_id dele)
-- UPDATE profiles SET is_admin = true WHERE id = 'SEU_USER_ID_AQUI';
```

**IMPORTANTE sobre cortesia temporária:**

A lógica de premium no app (`checkIsPremium` em `app/src/lib/purchases.ts`) precisa ser estendida para checar `courtesy_expires_at`. Adicionar este check na função:

```typescript
// Dentro de checkIsPremium, ANTES do check RevenueCat:
// Check cortesia ativa
const { data: courtesy } = await supabase
  .from('profiles')
  .select('courtesy_expires_at')
  .eq('id', user.id)
  .single();

if (courtesy?.courtesy_expires_at && new Date(courtesy.courtesy_expires_at) > new Date()) {
  return true;
}
```

Isso garante que cortesias funcionam independente do RevenueCat.

---

## STEP 2 — Scaffold do projeto admin

**Criar projeto em:** `admin/`

```bash
cd /path/to/BabyTracking
npm create vite@latest admin -- --template react-ts
cd admin
npm install @supabase/supabase-js react-router-dom recharts date-fns lucide-react
npm install -D @tailwindcss/vite
```

### Estrutura de diretórios:

```
admin/
├── src/
│   ├── main.tsx
│   ├── App.tsx                      ← Router principal
│   ├── globals.css                  ← Tailwind + tema admin
│   ├── lib/
│   │   ├── supabase.ts             ← Cliente Supabase (mesmo URL/key)
│   │   ├── auth.ts                 ← Login + check is_admin
│   │   └── queries.ts              ← Todas as queries do dashboard
│   ├── hooks/
│   │   ├── useAuth.ts              ← Hook de autenticação admin
│   │   ├── useDashboard.ts         ← Hook com KPIs
│   │   └── useUsers.ts             ← Hook de listagem/busca users
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx       ← KPIs e funil
│   │   ├── UsersPage.tsx           ← Lista + detalhe + ações
│   │   ├── UserDetailPage.tsx      ← Detalhe de um usuário
│   │   ├── EngagementPage.tsx      ← Métricas de engajamento
│   │   ├── PushPage.tsx            ← Visão + gestão + ações push
│   │   ├── MonetizationPage.tsx    ← Assinaturas e receita
│   │   └── ConfigPage.tsx          ← Feature flags + links
│   ├── components/
│   │   ├── Layout.tsx              ← Sidebar + header
│   │   ├── Sidebar.tsx             ← Navegação lateral
│   │   ├── StatCard.tsx            ← Card de KPI
│   │   ├── DataTable.tsx           ← Tabela genérica com sort/filter
│   │   ├── ChartCard.tsx           ← Wrapper para gráficos
│   │   ├── CourtesyModal.tsx       ← Modal de cortesia temporária
│   │   ├── PushComposer.tsx        ← Formulário de broadcast
│   │   ├── UserActions.tsx         ← Dropdown de ações do usuário
│   │   └── ProtectedRoute.tsx      ← Guard de rota admin
│   └── types/
│       └── index.ts                ← Types do admin
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### vite.config.ts:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/admin/',  // importante para deploy em subpath
});
```

---

## STEP 3 — Autenticação e proteção

### `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kgfjfdizxziacblgvplh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZmpmZGl6eHppYWNibGd2cGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEzMTAsImV4cCI6MjA5MDg3NzMxMH0.Qo5SJpaYpQx7NtmngxK6CWusKfPmYdEJYu7hVQC4dhU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### `src/lib/auth.ts`

```typescript
import { supabase } from './supabase';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function checkIsAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return data?.is_admin === true;
}

export async function signOut() {
  await supabase.auth.signOut();
}
```

### `src/components/ProtectedRoute.tsx`

```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  if (!user) return <Navigate to="/admin/login" />;
  if (!isAdmin) return <div className="flex items-center justify-center h-screen text-red-500">Acesso negado. Você não é administrador.</div>;

  return <>{children}</>;
}
```

### `src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { EngagementPage } from './pages/EngagementPage';
import { PushPage } from './pages/PushPage';
import { MonetizationPage } from './pages/MonetizationPage';
import { ConfigPage } from './pages/ConfigPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/admin/login" element={<LoginPage />} />
          <Route path="/admin" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:userId" element={<UserDetailPage />} />
            <Route path="engagement" element={<EngagementPage />} />
            <Route path="push" element={<PushPage />} />
            <Route path="monetization" element={<MonetizationPage />} />
            <Route path="config" element={<ConfigPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

---

## STEP 4 — Queries do Dashboard

### `src/lib/queries.ts`

Este arquivo centraliza TODAS as queries Supabase usadas pelo admin. Usar `supabase.rpc()` para queries complexas ou queries diretas para dados simples.

```typescript
import { supabase } from './supabase';
import { startOfDay, subDays, format } from 'date-fns';

// ─── DASHBOARD KPIs ────────────────────────────

export async function getKPIs() {
  const today = startOfDay(new Date()).toISOString();
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  // Total users
  const { count: totalUsers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Novos hoje
  const { count: newToday } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today);

  // Novos últimos 7 dias
  const { count: newWeek } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo);

  // DAU (usuários com log hoje)
  const { data: dauData } = await supabase
    .from('logs')
    .select('created_by')
    .gte('timestamp', today);
  const dau = new Set(dauData?.map(l => l.created_by)).size;

  // MAU (usuários com log últimos 30 dias)
  const { data: mauData } = await supabase
    .from('logs')
    .select('created_by')
    .gte('timestamp', thirtyDaysAgo);
  const mau = new Set(mauData?.map(l => l.created_by)).size;

  // Premium ativos
  const { count: premiumCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_premium', true);

  // Por plano
  const { data: planData } = await supabase
    .from('profiles')
    .select('subscription_plan')
    .eq('is_premium', true);

  const planBreakdown = {
    monthly: planData?.filter(p => p.subscription_plan === 'monthly').length || 0,
    annual: planData?.filter(p => p.subscription_plan === 'annual').length || 0,
    lifetime: planData?.filter(p => p.subscription_plan === 'lifetime').length || 0,
  };

  // Cortesias ativas
  const { count: courtesyCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .gt('courtesy_expires_at', new Date().toISOString());

  return {
    totalUsers: totalUsers || 0,
    newToday: newToday || 0,
    newWeek: newWeek || 0,
    dau,
    mau,
    premiumCount: premiumCount || 0,
    planBreakdown,
    courtesyCount: courtesyCount || 0,
  };
}

// ─── FUNIL ─────────────────────────────────────

export async function getFunnel() {
  // Total signups
  const { count: signups } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Com pelo menos 1 log
  const { data: usersWithLogs } = await supabase
    .from('logs')
    .select('created_by');
  const withFirstLog = new Set(usersWithLogs?.map(l => l.created_by)).size;

  // Ativos 7 dias (log nos últimos 7 dias E nos primeiros 7 dias de uso)
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  const { data: recentUsers } = await supabase
    .from('logs')
    .select('created_by')
    .gte('timestamp', sevenDaysAgo);
  const activeWeek = new Set(recentUsers?.map(l => l.created_by)).size;

  // Premium (conversões)
  const { count: converted } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_premium', true);

  return {
    signups: signups || 0,
    firstLog: withFirstLog,
    activeWeek,
    converted: converted || 0,
  };
}

// ─── USERS ─────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  is_premium: boolean;
  subscription_plan: string | null;
  subscription_status: string | null;
  subscription_expires_at: string | null;
  signup_platform: string | null;
  last_seen_at: string | null;
  last_seen_platform: string | null;
  courtesy_expires_at: string | null;
  is_admin: boolean;
}

export async function getUsers(params: {
  search?: string;
  plan?: string;
  platform?: string;
  page?: number;
  pageSize?: number;
}) {
  const { search, plan, platform, page = 1, pageSize = 50 } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('profiles')
    .select(`
      id,
      email:id,
      created_at,
      is_premium,
      subscription_plan,
      subscription_status,
      subscription_expires_at,
      signup_platform,
      last_seen_at,
      last_seen_platform,
      courtesy_expires_at,
      is_admin
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (plan === 'free') query = query.eq('is_premium', false);
  if (plan === 'premium') query = query.eq('is_premium', true);
  if (plan === 'monthly') query = query.eq('subscription_plan', 'monthly');
  if (plan === 'annual') query = query.eq('subscription_plan', 'annual');
  if (plan === 'lifetime') query = query.eq('subscription_plan', 'lifetime');
  if (plan === 'courtesy') query = query.gt('courtesy_expires_at', new Date().toISOString());

  if (platform) query = query.eq('signup_platform', platform);

  // Nota: busca por email requer acesso a auth.users que o anon key não tem.
  // Para busca, usar edge function ou RPC. Alternativa: buscar por user_id.

  const { data, count, error } = await query;
  return { users: data || [], total: count || 0, error };
}

export async function getUserDetail(userId: string) {
  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // Babies
  const { data: memberships } = await supabase
    .from('baby_members')
    .select(`
      role,
      display_name,
      babies (id, name, birth_date, gender)
    `)
    .eq('user_id', userId);

  // Log count
  const { count: logCount } = await supabase
    .from('logs')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId);

  // Streak (via babies)
  const babyIds = memberships?.map(m => (m.babies as any)?.id).filter(Boolean) || [];
  let streakData = null;
  if (babyIds.length > 0) {
    const { data } = await supabase
      .from('streaks')
      .select('*')
      .in('baby_id', babyIds);
    streakData = data;
  }

  // Push tokens
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('platform, created_at, updated_at')
    .eq('user_id', userId);

  // Push log recente
  const { data: recentPushes } = await supabase
    .from('push_log')
    .select('type, title, body, sent_at, delivered')
    .eq('user_id', userId)
    .order('sent_at', { ascending: false })
    .limit(20);

  // Courtesy log
  const { data: courtesyHistory } = await supabase
    .from('courtesy_log')
    .select('days, reason, expires_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return {
    profile,
    babies: memberships || [],
    logCount: logCount || 0,
    streaks: streakData,
    pushTokens: tokens || [],
    recentPushes: recentPushes || [],
    courtesyHistory: courtesyHistory || [],
  };
}

// ─── AÇÕES DO ADMIN ────────────────────────────

export async function grantCourtesy(params: {
  userId: string;
  days: number;
  reason: string;
  adminId: string;
}) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + params.days);

  // Atualizar profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      is_premium: true,
      courtesy_expires_at: expiresAt.toISOString(),
      courtesy_granted_by: params.adminId,
      courtesy_reason: params.reason,
    })
    .eq('id', params.userId);

  if (profileError) throw profileError;

  // Registrar no log
  const { error: logError } = await supabase
    .from('courtesy_log')
    .insert({
      user_id: params.userId,
      granted_by: params.adminId,
      days: params.days,
      reason: params.reason,
      expires_at: expiresAt.toISOString(),
    });

  if (logError) throw logError;

  return { expiresAt };
}

export async function revokeCourtesy(userId: string) {
  return supabase
    .from('profiles')
    .update({
      courtesy_expires_at: null,
      courtesy_granted_by: null,
      courtesy_reason: null,
      // Só remover is_premium se não tem assinatura real
      // Isso precisa de check adicional
    })
    .eq('id', userId);
}

export async function togglePremium(userId: string, isPremium: boolean) {
  return supabase
    .from('profiles')
    .update({ is_premium: isPremium })
    .eq('id', userId);
}

// ─── ENGAGEMENT ────────────────────────────────

export async function getLogsPerDay(days: number = 30) {
  const since = subDays(new Date(), days).toISOString();

  const { data } = await supabase
    .from('logs')
    .select('timestamp, event_id')
    .gte('timestamp', since)
    .order('timestamp', { ascending: true });

  // Agrupar por dia e tipo
  const byDay: Record<string, { feed: number; sleep: number; diaper: number; care: number }> = {};

  data?.forEach(log => {
    const day = format(new Date(log.timestamp), 'yyyy-MM-dd');
    if (!byDay[day]) byDay[day] = { feed: 0, sleep: 0, diaper: 0, care: 0 };

    if (log.event_id?.startsWith('feed')) byDay[day].feed++;
    else if (log.event_id?.startsWith('sleep')) byDay[day].sleep++;
    else if (log.event_id?.startsWith('diaper')) byDay[day].diaper++;
    else byDay[day].care++;
  });

  return Object.entries(byDay).map(([date, counts]) => ({ date, ...counts }));
}

export async function getStreakDistribution() {
  const { data } = await supabase
    .from('streaks')
    .select('current_streak');

  const buckets = { '0': 0, '1-6': 0, '7-13': 0, '14-29': 0, '30-59': 0, '60-99': 0, '100+': 0 };

  data?.forEach(s => {
    const v = s.current_streak;
    if (v === 0) buckets['0']++;
    else if (v < 7) buckets['1-6']++;
    else if (v < 14) buckets['7-13']++;
    else if (v < 30) buckets['14-29']++;
    else if (v < 60) buckets['30-59']++;
    else if (v < 100) buckets['60-99']++;
    else buckets['100+']++;
  });

  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

export async function getBabyAgeDistribution() {
  const { data } = await supabase
    .from('babies')
    .select('birth_date');

  const now = new Date();
  const buckets = { '0-1m': 0, '1-3m': 0, '3-6m': 0, '6-9m': 0, '9-12m': 0, '12-18m': 0, '18-24m': 0, '24m+': 0 };

  data?.forEach(b => {
    const months = (now.getTime() - new Date(b.birth_date).getTime()) / (30.44 * 86400000);
    if (months < 1) buckets['0-1m']++;
    else if (months < 3) buckets['1-3m']++;
    else if (months < 6) buckets['3-6m']++;
    else if (months < 9) buckets['6-9m']++;
    else if (months < 12) buckets['9-12m']++;
    else if (months < 18) buckets['12-18m']++;
    else if (months < 24) buckets['18-24m']++;
    else buckets['24m+']++;
  });

  return Object.entries(buckets).map(([range, count]) => ({ range, count }));
}

export async function getPeakHours() {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const { data } = await supabase
    .from('logs')
    .select('timestamp')
    .gte('timestamp', thirtyDaysAgo);

  const hours = new Array(24).fill(0);
  data?.forEach(l => {
    const h = new Date(l.timestamp).getHours();
    hours[h]++;
  });

  return hours.map((count, hour) => ({ hour: `${hour}h`, count }));
}

// ─── PUSH ──────────────────────────────────────

export async function getPushStats(days: number = 30) {
  const since = subDays(new Date(), days).toISOString();

  const { data } = await supabase
    .from('push_log')
    .select('type, sent_at, delivered')
    .gte('sent_at', since)
    .order('sent_at', { ascending: true });

  // Total enviados
  const total = data?.length || 0;
  const delivered = data?.filter(p => p.delivered).length || 0;

  // Por tipo
  const byType: Record<string, { sent: number; delivered: number }> = {};
  data?.forEach(p => {
    if (!byType[p.type]) byType[p.type] = { sent: 0, delivered: 0 };
    byType[p.type].sent++;
    if (p.delivered) byType[p.type].delivered++;
  });

  // Por dia
  const byDay: Record<string, number> = {};
  data?.forEach(p => {
    const day = format(new Date(p.sent_at), 'yyyy-MM-dd');
    byDay[day] = (byDay[day] || 0) + 1;
  });

  return {
    total,
    delivered,
    deliveryRate: total > 0 ? (delivered / total * 100).toFixed(1) : '0',
    byType: Object.entries(byType).map(([type, stats]) => ({ type, ...stats })),
    byDay: Object.entries(byDay).map(([date, count]) => ({ date, count })),
  };
}

export async function getPushTokenStats() {
  const { data } = await supabase
    .from('push_tokens')
    .select('platform');

  const platforms = { android: 0, ios: 0, web: 0 };
  data?.forEach(t => {
    if (t.platform in platforms) platforms[t.platform as keyof typeof platforms]++;
  });

  return { total: data?.length || 0, platforms };
}

export async function getBroadcastHistory() {
  const { data } = await supabase
    .from('admin_broadcasts')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(50);

  return data || [];
}

export async function sendBroadcast(params: {
  title: string;
  body: string;
  segment: {
    platform?: 'android' | 'ios' | 'all';
    plan?: 'free' | 'premium' | 'all';
    babyAgeRange?: string;
  };
  adminId: string;
}) {
  // 1. Buscar tokens que matcham o segmento
  let query = supabase.from('push_tokens').select('token, user_id, platform, baby_id');

  if (params.segment.platform && params.segment.platform !== 'all') {
    query = query.eq('platform', params.segment.platform);
  }

  const { data: tokens } = await query;
  if (!tokens?.length) return { sent: 0 };

  // 2. Filtrar por plano se necessário
  let filteredTokens = tokens;
  if (params.segment.plan && params.segment.plan !== 'all') {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, is_premium')
      .in('id', tokens.map(t => t.user_id));

    const premiumUserIds = new Set(
      profiles?.filter(p => params.segment.plan === 'premium' ? p.is_premium : !p.is_premium)
        .map(p => p.id)
    );
    filteredTokens = tokens.filter(t => premiumUserIds.has(t.user_id));
  }

  // 3. Enviar via Edge Function (chamar push-broadcast)
  const { data, error } = await supabase.functions.invoke('push-broadcast', {
    body: {
      tokens: filteredTokens.map(t => t.token),
      title: params.title,
      body: params.body,
    },
  });

  // 4. Registrar broadcast
  await supabase.from('admin_broadcasts').insert({
    title: params.title,
    body: params.body,
    segment: params.segment,
    target_count: filteredTokens.length,
    sent_count: data?.sent || 0,
    sent_by: params.adminId,
  });

  // 5. Registrar no push_log individual
  const pushLogEntries = filteredTokens.map(t => ({
    user_id: t.user_id,
    baby_id: t.baby_id,
    type: 'admin_broadcast',
    title: params.title,
    body: params.body,
  }));

  await supabase.from('push_log').insert(pushLogEntries);

  return { sent: filteredTokens.length };
}

// ─── MONETIZATION ──────────────────────────────

export async function getMonetizationStats() {
  // Assinantes por plano
  const { data: subscribers } = await supabase
    .from('profiles')
    .select('subscription_plan, subscription_status, subscription_started_at, billing_provider')
    .eq('is_premium', true);

  // Cortesias ativas
  const { data: courtesies } = await supabase
    .from('profiles')
    .select('id, courtesy_expires_at, courtesy_reason')
    .gt('courtesy_expires_at', new Date().toISOString());

  // MRR aproximado
  const prices = { monthly: 29.90, annual: 202.80 / 12, lifetime: 0 };
  const mrr = subscribers?.reduce((acc, s) => {
    return acc + (prices[s.subscription_plan as keyof typeof prices] || 0);
  }, 0) || 0;

  return {
    totalPremium: subscribers?.length || 0,
    byPlan: {
      monthly: subscribers?.filter(s => s.subscription_plan === 'monthly').length || 0,
      annual: subscribers?.filter(s => s.subscription_plan === 'annual').length || 0,
      lifetime: subscribers?.filter(s => s.subscription_plan === 'lifetime').length || 0,
    },
    byProvider: {
      apple: subscribers?.filter(s => s.billing_provider === 'apple').length || 0,
      google: subscribers?.filter(s => s.billing_provider === 'google').length || 0,
    },
    mrr: mrr.toFixed(2),
    courtesiesActive: courtesies?.length || 0,
    courtesies: courtesies || [],
  };
}

// ─── FEATURE FLAGS ─────────────────────────────

export async function getFeatureFlags() {
  const { data } = await supabase
    .from('feature_flags')
    .select('*')
    .order('id');

  return data || [];
}

export async function updateFeatureFlag(id: string, enabled: boolean, adminId: string) {
  return supabase
    .from('feature_flags')
    .update({ enabled, updated_at: new Date().toISOString(), updated_by: adminId })
    .eq('id', id);
}
```

---

## STEP 5 — Dashboard Page (tela principal)

### `src/pages/DashboardPage.tsx`

Layout:
```
┌──────────────────────────────────────────────────┐
│  📊 Dashboard                          12/04/2026│
├──────────┬──────────┬──────────┬─────────────────┤
│ Users    │ Novos    │ DAU/MAU  │ Premium         │
│ 1.247    │ +23 hoje │ 342/891  │ 67 (5.4%)       │
│          │ +156 sem │          │ 12mo/43an/12life│
├──────────┴──────────┴──────────┴─────────────────┤
│                                                   │
│  FUNIL DE CONVERSÃO (horizontal bar chart)        │
│  ┌ Signup      1.247  ████████████████████ 100%   │
│  ├ 1º Log        934  ██████████████████   74.9%  │
│  ├ Ativo 7d      342  ██████████           27.4%  │
│  └ Premium        67  ███                   5.4%  │
│                                                   │
├───────────────────────────────────────────────────┤
│  NOVOS USUÁRIOS (últimos 30 dias, line chart)     │
│  ┌─────────────────────────────────────┐          │
│  │    ╱╲    ╱╲                         │          │
│  │   ╱  ╲  ╱  ╲     ╱╲               │          │
│  │  ╱    ╲╱    ╲   ╱  ╲              │          │
│  │ ╱            ╲─╱    ╲             │          │
│  └─────────────────────────────────────┘          │
├───────────────────────────────────────────────────┤
│  PLATAFORMA        │  ÚLTIMAS ATIVIDADES          │
│  Android: 876 (70%)│  • João se cadastrou (2min)  │
│  iOS:     371 (30%)│  • Maria assinou anual (15m) │
│                    │  • Pedro: 30 dias streak     │
└────────────────────┴──────────────────────────────┘
```

Componentes: StatCard (4x topo), FunnelChart (Recharts BarChart horizontal), LineChart (novos/dia), PieChart (plataformas), ActivityFeed (últimos eventos).

---

## STEP 6 — Users Page

### `src/pages/UsersPage.tsx`

**Lista:**
```
┌──────────────────────────────────────────────────────────────┐
│  👥 Usuários (1.247)                                          │
│  🔍 [Buscar por email/nome...]  [Plano ▾]  [Plataforma ▾]   │
├──────┬──────────────────┬────────┬──────────┬────────┬───────┤
│ Plat │ Email            │ Plano  │ Streak   │ Último │ Ações │
├──────┼──────────────────┼────────┼──────────┼────────┼───────┤
│ 🤖   │ joao@email.com   │ Free   │ 🔥 12    │ 2h     │  ⋮   │
│ 🍎   │ maria@email.com  │ Anual  │ 🔥 45    │ 30min  │  ⋮   │
│ 🤖   │ pedro@email.com  │ Cortesia│ 🔥 8    │ 1d     │  ⋮   │
└──────┴──────────────────┴────────┴──────────┴────────┴───────┘
```

- 🤖 = Android, 🍎 = iOS
- Filtros: Plano (Free/Premium/Monthly/Annual/Lifetime/Cortesia), Plataforma (Android/iOS/Todos)
- Coluna "Plano" mostra badge colorido: Free (cinza), Monthly (azul), Annual (roxo), Lifetime (dourado), Cortesia (verde com ícone 🎁)
- "Último" = tempo desde last_seen_at
- Menu ⋮: Ver detalhes, Dar cortesia, Dar/remover premium, Enviar push, Desativar

### `src/pages/UserDetailPage.tsx`

**Detalhe do usuário:** rota `/admin/users/:userId`

```
┌──────────────────────────────────────────────────┐
│  ← Voltar    joao@email.com                      │
├──────────────────────────────────────────────────┤
│  PERFIL                                          │
│  ID: abc-123-def    Plataforma: 🤖 Android       │
│  Cadastro: 01/03/2026   Último acesso: há 2h     │
│  Plano: Free             Streak: 🔥 12 dias      │
│                                                   │
│  [🎁 Dar Cortesia]  [💎 Toggle Premium]  [📱 Push]│
├──────────────────────────────────────────────────┤
│  BEBÊ(S)                                         │
│  👶 Miguel · 2 meses · ♂ · 847 logs              │
│     Cuidadores: João (pai), Maria (mãe)          │
├──────────────────────────────────────────────────┤
│  DISPOSITIVOS                                    │
│  📱 Android · Token: abcf...1234 · Atualizado 2h │
├──────────────────────────────────────────────────┤
│  HISTÓRICO DE CORTESIAS                          │
│  🎁 7 dias · "early adopter" · Expira 20/04      │
│  🎁 14 dias · "teste pediatra" · Expirou 05/04   │
├──────────────────────────────────────────────────┤
│  PUSHES RECENTES (últimos 20)                    │
│  🍼 Alerta rotina · 14:30 · ✅ Entregue          │
│  🔥 Streak risco · 20:00 · ✅ Entregue            │
│  📊 Resumo diário · 21:00 · ❌ Falhou             │
└──────────────────────────────────────────────────┘
```

### `src/components/CourtesyModal.tsx`

Modal de cortesia temporária:
```
┌──────────────────────────────────────┐
│  🎁 Cortesia Temporária              │
│                                      │
│  Usuário: joao@email.com             │
│                                      │
│  Duração:                            │
│  [7 dias] [14 dias] [30 dias] [___]  │
│                                      │
│  Motivo:                             │
│  [________________________]          │
│  Ex: "Early adopter", "Teste beta",  │
│  "Parceria pediatra", "Compensação"  │
│                                      │
│  ⚠️ O usuário terá Yaya+ até         │
│     19/04/2026 (7 dias)              │
│                                      │
│        [Cancelar]  [Conceder]        │
└──────────────────────────────────────┘
```

Campos: duração (presets 7/14/30 + custom), motivo (texto livre, obrigatório). Preview da data de expiração. Botão confirmar chama `grantCourtesy()`.

---

## STEP 7 — Push Page

### `src/pages/PushPage.tsx`

Três seções em tabs ou scroll:

**Tab 1 — Visão Geral:**
```
┌──────────────────────────────────────────────────┐
│  📊 Últimos 30 dias                              │
│  Enviados: 12.456  Entregues: 11.890 (95.5%)    │
│  Tokens ativos: 1.102 (🤖 780 · 🍎 322)         │
├──────────────────────────────────────────────────┤
│  POR TIPO (bar chart horizontal)                 │
│  routine_alert     ████████████████  8.234       │
│  streak            ██████            2.100       │
│  celebration       ████              1.050       │
│  daily_summary     ███                 890       │
│  development_leap  █                   182       │
├──────────────────────────────────────────────────┤
│  VOLUME DIÁRIO (area chart, últimos 30 dias)     │
│  ┌─────────────────────────────────────┐         │
│  │     ╱╲                              │         │
│  │    ╱  ╲    ╱╲╱╲                    │         │
│  │   ╱    ╲──╱    ╲                   │         │
│  └─────────────────────────────────────┘         │
├──────────────────────────────────────────────────┤
│  PUSHES FALHADOS (últimos, lista)                │
│  ❌ joao@... · routine_alert · Token inválido     │
│  ❌ maria@... · daily_summary · Quota exceeded    │
└──────────────────────────────────────────────────┘
```

**Tab 2 — Gestão:**
```
┌──────────────────────────────────────────────────┐
│  ⚙️ Configuração de Push                         │
│                                                   │
│  SCHEDULER                                       │
│  Status: ✅ Ativo (último run: há 3 min)          │
│  Frequência: a cada 5 min                        │
│  [⏸ Pausar Scheduler]                            │
│                                                   │
│  CRON JOBS                                       │
│  push-scheduler    */5 * * * *   ✅ Ativo         │
│  streak-checker    55 23 * * *   ✅ Ativo         │
│  streak-risk       0 20 * * *    ✅ Ativo         │
│  daily-summary     0 21 * * *    ✅ Ativo         │
│  freeze-reset      0 0 * * 1     ✅ Ativo         │
│                                                   │
│  TEMPLATES DE TEXTO                              │
│  routine_feed: "🍼 Próxima amamentação..."  [✏️]  │
│  routine_sleep: "😴 {name} está acordado..." [✏️] │
│  streak_risk: "🔥 Seu streak de..."          [✏️] │
│  (editável — salva em feature_flags ou tabela)   │
└──────────────────────────────────────────────────┘
```

**Tab 3 — Enviar Broadcast:**
```
┌──────────────────────────────────────────────────┐
│  📢 Enviar Push Broadcast                        │
│                                                   │
│  Título: [_______________________________]       │
│  Mensagem: [_____________________________]       │
│            [_____________________________]       │
│                                                   │
│  SEGMENTO                                        │
│  Plataforma: (•) Todos  ( ) Android  ( ) iOS     │
│  Plano:      (•) Todos  ( ) Free     ( ) Premium │
│  Faixa bebê: (•) Todos  ( ) 0-3m ( ) 3-6m ...   │
│                                                   │
│  👁 PREVIEW                                      │
│  ┌────────────────────────────────┐              │
│  │ 🔔 Yaya Baby                   │              │
│  │ Título do push aqui            │              │
│  │ Mensagem do push aqui          │              │
│  └────────────────────────────────┘              │
│                                                   │
│  Destinatários estimados: 876 dispositivos       │
│                                                   │
│        [Cancelar]  [📢 Enviar para 876]          │
├──────────────────────────────────────────────────┤
│  HISTÓRICO DE BROADCASTS                         │
│  📢 "Nova funcionalidade!" · 876 enviados · 12/04│
│  📢 "Versão 1.2 disponível" · 1102 env · 05/04  │
└──────────────────────────────────────────────────┘
```

---

## STEP 8 — Engagement Page

### `src/pages/EngagementPage.tsx`

```
┌──────────────────────────────────────────────────┐
│  📈 Engajamento                                   │
├──────────────────────────────────────────────────┤
│  LOGS POR DIA (stacked area: feed/sleep/diaper)  │
│  [gráfico Recharts AreaChart, últimos 30 dias]   │
├─────────────────────┬────────────────────────────┤
│  POR TIPO (donut)   │  HORÁRIOS DE PICO (bar)    │
│  Feed: 54%          │  06h ███████               │
│  Sleep: 28%         │  10h ████████████          │
│  Diaper: 15%        │  14h ███████████           │
│  Care: 3%           │  18h ████████████████      │
│                     │  22h ██████████████         │
├─────────────────────┴────────────────────────────┤
│  STREAKS (bar chart por faixa)                   │
│  0 dias:   456  ████████████████████             │
│  1-6:      312  ██████████████                   │
│  7-13:     203  ██████████                       │
│  14-29:    142  ███████                          │
│  30-59:     89  ████                             │
│  60-99:     31  ██                               │
│  100+:      14  █                                │
├──────────────────────────────────────────────────┤
│  BEBÊS POR FAIXA ETÁRIA (bar chart)              │
│  0-1m: 89  ██████                                │
│  1-3m: 234 ██████████████████                    │
│  3-6m: 312 ████████████████████████              │
│  6-9m: 189 █████████████                         │
│  ...                                             │
├──────────────────────────────────────────────────┤
│  MULTI-CUIDADOR                                  │
│  1 cuidador: 78%  │  2: 18%  │  3+: 4%          │
└──────────────────────────────────────────────────┘
```

---

## STEP 9 — Monetization Page

### `src/pages/MonetizationPage.tsx`

```
┌──────────────────────────────────────────────────┐
│  💰 Monetização                                   │
├──────────┬──────────┬──────────┬─────────────────┤
│ MRR      │ Premium  │ Conv.    │ Cortesias       │
│ R$1.247  │ 67       │ 5.4%    │ 3 ativas        │
├──────────┴──────────┴──────────┴─────────────────┤
│  POR PLANO (donut)          POR STORE (donut)    │
│  Monthly: 12 (18%)          Apple: 28 (42%)      │
│  Annual:  43 (64%)          Google: 39 (58%)     │
│  Lifetime: 12 (18%)                              │
├──────────────────────────────────────────────────┤
│  CONVERSÕES RECENTES                             │
│  🎉 maria@... → Annual (Apple) · há 2h           │
│  🎉 pedro@... → Monthly (Google) · há 5h         │
│  🎉 ana@... → Lifetime (Apple) · há 1d           │
├──────────────────────────────────────────────────┤
│  CORTESIAS ATIVAS                                │
│  🎁 joao@... · 7 dias · "early adopter" · 5d rest│
│  🎁 teste@... · 30 dias · "pediatra" · 22d rest  │
│  🎁 beta@... · 14 dias · "beta tester" · 1d rest │
└──────────────────────────────────────────────────┘
```

---

## STEP 10 — Config Page

### `src/pages/ConfigPage.tsx`

```
┌──────────────────────────────────────────────────┐
│  ⚙️ Configurações                                 │
├──────────────────────────────────────────────────┤
│  FEATURE FLAGS                                   │
│  ☑ push_routine_alerts    Alertas de rotina      │
│  ☑ push_streak            Streak notifications   │
│  ☑ push_development_leaps Saltos de desenv.      │
│  ☑ push_daily_summary     Resumo diário          │
│  ☑ push_smart_suggestions Sugestões inteligentes │
│  ☑ push_celebrations      Celebrações e marcos   │
│  ☐ maintenance_mode       Modo manutenção ⚠️     │
├──────────────────────────────────────────────────┤
│  LINKS RÁPIDOS                                   │
│  🔗 Supabase Dashboard                           │
│  🔗 RevenueCat Dashboard                         │
│  🔗 Firebase Console                             │
│  🔗 Google Play Console                          │
│  🔗 App Store Connect                            │
│  🔗 Codemagic (builds)                           │
├──────────────────────────────────────────────────┤
│  SISTEMA                                         │
│  Supabase: ✅ Conectado                           │
│  Edge Functions: 3 ativas                        │
│  Último deploy: 12/04/2026 14:30                 │
└──────────────────────────────────────────────────┘
```

---

## STEP 11 — Edge Function: push-broadcast

**Criar:** `supabase/functions/push-broadcast/index.ts`

Edge Function que recebe lista de tokens + título + body e envia push em batch via FCM.

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')!;

serve(async (req) => {
  // Verificar que a chamada vem de um admin (via service role key ou JWT check)
  const { tokens, title, body, data } = await req.json();

  if (!tokens?.length || !title || !body) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }

  let sent = 0;
  let failed = 0;

  // FCM suporta multicast para até 500 tokens por request
  const batches = chunk(tokens, 500);

  for (const batch of batches) {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        registration_ids: batch,
        notification: { title, body },
        data: data || { type: 'admin_broadcast' },
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      }),
    });

    if (response.ok) {
      const result = await response.json();
      sent += result.success || 0;
      failed += result.failure || 0;
    } else {
      failed += batch.length;
    }
  }

  return new Response(JSON.stringify({ sent, failed, total: tokens.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
```

---

## STEP 12 — Layout e componentes compartilhados

### `src/components/Layout.tsx`

Sidebar fixa à esquerda + área de conteúdo. Outlet do React Router.

```
┌────────────┬─────────────────────────────────────┐
│            │                                     │
│  🟣 YAYA   │  [Conteúdo da página ativa]         │
│  Admin     │                                     │
│            │                                     │
│  📊 Dash   │                                     │
│  👥 Users  │                                     │
│  📈 Engage │                                     │
│  🔔 Push   │                                     │
│  💰 Money  │                                     │
│  ⚙️ Config  │                                     │
│            │                                     │
│            │                                     │
│            │                                     │
│  🚪 Sair   │                                     │
│            │                                     │
└────────────┴─────────────────────────────────────┘
```

### `src/components/StatCard.tsx`

```typescript
interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string }; // +23% vs semana passada
  color?: 'default' | 'green' | 'blue' | 'purple' | 'gold';
}
```

### `src/components/DataTable.tsx`

Tabela genérica com: header sortable, paginação, loading state. Usa `<table>` simples com Tailwind, sem lib pesada.

---

## STEP 13 — Tema visual

### `src/globals.css`

```css
@import "tailwindcss";

@theme {
  --color-bg: #0f0f23;
  --color-surface: #1a1a2e;
  --color-surface-hover: #222240;
  --color-border: rgba(139, 92, 246, 0.15);
  --color-accent: #8b5cf6;
  --color-accent-light: #a78bfa;
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #3b82f6;
  --color-text: #e2e8f0;
  --color-text-muted: #94a3b8;
  --color-text-dim: #64748b;

  --font-sans: 'Inter', system-ui, sans-serif;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
}
```

Visual: dark mode (mesmo tom do app Yaya), roxo como accent, cards com borda sutil, gráficos com paleta consistente.

---

## STEP 14 — Deploy

**Opção A (recomendada): subpath no mesmo domínio**

Se a landing page está hospedada na Vercel/Netlify, adicionar o admin como projeto separado com rewrite:

```
# vercel.json da landing-app
{
  "rewrites": [
    { "source": "/admin/:path*", "destination": "https://yaya-admin.vercel.app/admin/:path*" }
  ]
}
```

**Opção B: subdomínio**

Deploy em `admin.yayababy.app` — mais simples, sem proxy.

**Opção C: mesma build**

Mesclar admin/ no landing-app/ com React Router. Mais complexo, não recomendado por ora.

---

## ORDEM DE EXECUÇÃO RECOMENDADA

```
STEP 1  → Migration SQL (campos admin + cortesia + feature flags)
STEP 2  → Scaffold projeto admin/ (vite, dependências, estrutura)
STEP 12 → Layout + Sidebar + componentes base (StatCard, DataTable)
STEP 13 → Tema visual (globals.css)
STEP 3  → Auth (login, check admin, protected route)
STEP 4  → Queries (arquivo central de todas as queries)
STEP 5  → Dashboard page (KPIs + funil)
STEP 6  → Users page (lista + detalhe + cortesia)
STEP 7  → Push page (visão + gestão + broadcast)
STEP 8  → Engagement page
STEP 9  → Monetization page
STEP 10 → Config page (feature flags + links)
STEP 11 → Edge Function push-broadcast
STEP 14 → Deploy
```

**Nota:** Após o STEP 1, executar manualmente no SQL Editor do Supabase:
```sql
UPDATE profiles SET is_admin = true WHERE id = 'SEU_USER_ID';
```

---

## REGRAS DE UX DO ADMIN

1. **Tudo carrega rápido** — queries com limit, paginação, sem fetch desnecessário
2. **Ações destrutivas pedem confirmação** — toggle premium, desativar conta, broadcast
3. **Feedback visual imediato** — toast de sucesso/erro após cada ação
4. **Mobile-friendly** — sidebar colapsável, tabelas responsivas (Dyego pode acessar do celular)
5. **Dados sensíveis** — não mostrar conteúdo dos logs (LGPD), só contagens. Não mostrar dados pessoais do bebê além de nome e idade.

---

## REFERÊNCIAS

- **Supabase client:** Mesmo URL e anon key do app (`app/src/lib/supabase.ts`)
- **Premium logic:** `app/src/lib/purchases.ts` — precisa adicionar check de `courtesy_expires_at`
- **Push spec:** `PUSH_NOTIFICATIONS_SPEC.md` — tipos, textos, regras
- **Tabelas:** migration anterior `supabase/migrations/20260412_push_tables.sql` cria push_tokens, push_log, streaks
- **TASKS.md:** Items P1-ADMIN-1 até P1-ADMIN-7
