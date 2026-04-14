# Yaya — Push Notifications: Guia de Implementação para Claude Code
**Versão:** 1.0 | **Data:** 2026-04-12

> **INSTRUÇÕES:** Este documento contém TUDO que você precisa para implementar Push Notifications no Yaya Baby. Leia o documento inteiro antes de começar. Execute na ordem dos steps. Cada step tem contexto do que já existe e o que precisa ser criado. Para detalhes de produto (textos, regras, feature gate), consulte `PUSH_NOTIFICATIONS_SPEC.md`.

---

## Contexto do Projeto

- **Stack:** React 19 + Vite + TypeScript + Capacitor (iOS/Android) + Supabase (Auth, DB, Edge Functions)
- **App ID:** `app.yayababy`
- **Supabase:** SDK 2.101.1 já configurado
- **Monetização:** RevenueCat (entitlement: `yaya_plus`), contexto em `src/contexts/PurchaseContext.tsx`

---

## Mapa do que JÁ EXISTE (não recriar)

### Tabelas Supabase existentes:
| Tabela | Campos relevantes |
|--------|-------------------|
| `notification_prefs` | user_id, baby_id, enabled, cat_feed, cat_diaper, cat_sleep, cat_bath, quiet_enabled, quiet_start, quiet_end, pause_during_sleep |
| `interval_configs` | baby_id, category, minutes, warn, mode, scheduled_hours |
| `logs` | baby_id, event_id, timestamp, ml, duration, notes, created_by |
| `babies` | id, name, birth_date, gender, photo_url |
| `baby_members` | user_id, baby_id, display_name, role |
| `profiles` | id, is_premium, subscription_status, subscription_plan |

### Arquivos-chave existentes:
| Arquivo | O que faz |
|---------|-----------|
| `app/src/contexts/AppContext.tsx` | Carrega logs, intervals, baby, members, notification_prefs. Funções: addLog, updateLog, deleteLog, updateIntervals |
| `app/src/contexts/AuthContext.tsx` | Auth com Supabase. Teste: `teste@yayababy.app` / OTP `000000` |
| `app/src/contexts/PurchaseContext.tsx` | RevenueCat. `isPremium`, `subscriptionStatus`. Entitlement: `yaya_plus` |
| `app/src/pages/SettingsPage.tsx` | UI de configuração: janelas (feed 3h, diaper 2h, sleep_nap 1.5h, sleep_awake 2h, bath scheduled), quiet hours, pause during sleep |
| `app/src/lib/projections.ts` | Cálculo de próximo evento (getNextProjection, getSleepNapProjection, getBathProjection). Respeita quiet hours e pause during sleep |
| `app/src/lib/constants.ts` | DEFAULT_INTERVALS, DEFAULT_EVENTS com categorias |
| `app/src/lib/supabase.ts` | Cliente Supabase inicializado |
| `app/capacitor.config.ts` | appId: app.yayababy, webDir: dist, androidScheme: https |
| `app/.env` | VITE_REVENUECAT_IOS_KEY, VITE_REVENUECAT_ANDROID_KEY |
| `supabase/functions/revenuecat-webhook/index.ts` | Webhook RevenueCat → profiles |

### O que NÃO existe (precisa criar):
- ❌ Pacote `@capacitor/push-notifications` (não instalado)
- ❌ Firebase/FCM configuração (sem google-services.json, sem APNs)
- ❌ Tabelas: `push_tokens`, `push_preferences`, `streaks`, `push_log`
- ❌ Edge Functions: `push-scheduler`, `streak-checker`, `daily-summary`
- ❌ Serviço de push no frontend (`pushNotifications.ts`)
- ❌ Streak visual na home
- ❌ Card de saltos de desenvolvimento na home
- ❌ Bottom sheet de saltos
- ❌ Toggles de tipos de push na Settings

---

## STEP 1 — Tabelas Supabase + RLS

**Objetivo:** Criar as 4 tabelas novas e estender `notification_prefs` com campos novos.

### Migration 1: `supabase/migrations/20260412_push_tables.sql`

```sql
-- ============================================
-- PUSH NOTIFICATIONS — Tabelas e extensões
-- ============================================

-- 1. Tokens de push por dispositivo
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, token)
);

-- RLS push_tokens
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);

-- 2. Preferências de push por cuidador/bebê
CREATE TABLE IF NOT EXISTS push_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  -- Janelas definidas pelo usuário (minutos)
  feeding_interval_min INTEGER DEFAULT 180,
  sleep_wake_window_min INTEGER DEFAULT 90,
  diaper_interval_min INTEGER,  -- NULL = desativado
  alert_advance_min INTEGER DEFAULT 15,
  -- Tipos de alerta (toggles)
  routine_alerts BOOLEAN DEFAULT true,
  smart_suggestions BOOLEAN DEFAULT true,
  development_leaps BOOLEAN DEFAULT true,
  celebrations BOOLEAN DEFAULT true,
  streak_alerts BOOLEAN DEFAULT true,
  daily_summary BOOLEAN DEFAULT true,
  caregiver_activity BOOLEAN DEFAULT false,
  -- Horário de silêncio
  quiet_start TIME DEFAULT '22:00',
  quiet_end TIME DEFAULT '06:00',
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, baby_id)
);

-- RLS push_preferences
ALTER TABLE push_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own push prefs" ON push_preferences
  FOR ALL USING (auth.uid() = user_id);

-- 3. Streaks de registro
CREATE TABLE IF NOT EXISTS streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  freeze_used_this_week BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(baby_id)
);

-- RLS streaks — membros do bebê podem ler/atualizar
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can read baby streaks" ON streaks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM baby_members WHERE baby_members.baby_id = streaks.baby_id AND baby_members.user_id = auth.uid())
  );
CREATE POLICY "Members can update baby streaks" ON streaks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM baby_members WHERE baby_members.baby_id = streaks.baby_id AND baby_members.user_id = auth.uid())
  );
CREATE POLICY "Members can insert baby streaks" ON streaks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM baby_members WHERE baby_members.baby_id = streaks.baby_id AND baby_members.user_id = auth.uid())
  );

-- 4. Log de pushes enviados (para anti-spam)
CREATE TABLE IF NOT EXISTS push_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered BOOLEAN DEFAULT false
);

-- RLS push_log
ALTER TABLE push_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own push log" ON push_log
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Estender notification_prefs existente com campos de push
-- (esses campos complementam a tabela existente)
ALTER TABLE notification_prefs
  ADD COLUMN IF NOT EXISTS streak_alerts BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS development_leaps BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS smart_suggestions BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS daily_summary BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS caregiver_activity BOOLEAN DEFAULT false;

-- 6. Index para queries frequentes do scheduler
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_baby ON push_tokens(baby_id);
CREATE INDEX IF NOT EXISTS idx_push_log_user_sent ON push_log(user_id, sent_at);
CREATE INDEX IF NOT EXISTS idx_push_log_baby_type ON push_log(baby_id, type, sent_at);
CREATE INDEX IF NOT EXISTS idx_logs_baby_timestamp ON logs(baby_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_streaks_baby ON streaks(baby_id);
```

**Execução:** Rodar via Supabase CLI (`supabase db push`) ou aplicar diretamente no dashboard SQL Editor.

**Nota sobre `push_preferences` vs `notification_prefs`:** As duas tabelas coexistem. `notification_prefs` controla o comportamento in-app (alertas visuais, sons). `push_preferences` controla o push nativo (FCM/APNs). O STEP 5 vai sincronizar as janelas entre elas. No futuro, pode-se unificar, mas por ora manter separadas evita breaking changes.

---

## STEP 2 — Instalar Capacitor Push Plugin + Firebase

**Objetivo:** Instalar dependências, configurar Firebase, registrar token.

### 2a. Instalar pacotes

```bash
cd app
npm install @capacitor/push-notifications
npx cap sync
```

### 2b. Configurar Firebase (Android)

1. Criar projeto Firebase em https://console.firebase.google.com (se não existir)
2. Registrar app Android com package `app.yayababy`
3. Baixar `google-services.json` e colocar em `app/android/app/google-services.json`
4. Editar `app/android/app/build.gradle` — adicionar no topo:
```groovy
apply plugin: 'com.google.gms.google-services'
```
5. Editar `app/android/build.gradle` — adicionar no `dependencies`:
```groovy
classpath 'com.google.gms:google-services:4.4.0'
```

### 2c. Configurar APNs (iOS)

1. No Apple Developer, habilitar Push Notifications no App ID `app.yayababy`
2. Gerar APNs Authentication Key (.p8) ou certificado
3. Adicionar a key no Firebase Console → Project Settings → Cloud Messaging → APNs
4. No Xcode, habilitar capability "Push Notifications" no target

### 2d. Criar serviço de push no frontend

**Criar arquivo:** `app/src/lib/pushNotifications.ts`

```typescript
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

/**
 * Inicializa push notifications.
 * Chamar APÓS o primeiro registro do usuário (não no onboarding).
 */
export async function initPushNotifications(userId: string, babyId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[Push] Not native platform, skipping');
    return;
  }

  // Verificar/solicitar permissão
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    console.log('[Push] Permission not granted');
    return;
  }

  // Registrar no sistema nativo
  await PushNotifications.register();

  // Listener: token recebido
  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('[Push] Token:', token.value);
    await saveToken(userId, babyId, token.value);
  });

  // Listener: erro no registro
  PushNotifications.addListener('registrationError', (error) => {
    console.error('[Push] Registration error:', error);
  });

  // Listener: push recebido com app aberto (não mostrar notificação nativa)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Received in foreground:', notification);
    // Opcionalmente mostrar um toast/banner in-app
  });

  // Listener: push clicado (app aberto via push)
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    console.log('[Push] Action performed:', action);
    // Navegar para tela relevante baseado em action.notification.data.type
    handlePushAction(action);
  });
}

/**
 * Salva ou atualiza token no Supabase
 */
async function saveToken(userId: string, babyId: string, token: string): Promise<void> {
  const platform = Capacitor.getPlatform(); // 'android' | 'ios'

  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        user_id: userId,
        baby_id: babyId,
        token,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,token' }
    );

  if (error) {
    console.error('[Push] Error saving token:', error);
  }
}

/**
 * Remove token (logout ou desativar push)
 */
export async function removePushToken(userId: string): Promise<void> {
  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('[Push] Error removing token:', error);
  }
}

/**
 * Trata ação quando usuário clica no push
 */
function handlePushAction(action: ActionPerformed): void {
  const data = action.notification.data;

  switch (data?.type) {
    case 'routine_alert':
      // Navegar para tracker
      window.location.href = '/tracker';
      break;
    case 'streak_risk':
      // Navegar para tracker
      window.location.href = '/tracker';
      break;
    case 'development_leap':
      // Mostrar bottom sheet do salto (disparar evento custom)
      window.dispatchEvent(new CustomEvent('show-leap-detail', { detail: data }));
      break;
    case 'daily_summary':
      // Navegar para histórico
      window.location.href = '/history';
      break;
    default:
      window.location.href = '/tracker';
  }
}
```

### 2e. Integrar no AppContext ou AuthContext

No `AuthContext.tsx`, após login bem-sucedido e quando o usuário tiver um bebê ativo, chamar `initPushNotifications`. NÃO chamar imediatamente no login — esperar até que o usuário tenha feito pelo menos 1 registro (para não assustar com pedido de permissão antes de usar o app).

Sugestão de trigger: no `AppContext.tsx`, quando `addLog` é chamado e `logs.length === 0` (primeiro registro), chamar `initPushNotifications`.

```typescript
// Dentro de addLog no AppContext:
const addLog = async (log: LogEntry) => {
  // ... lógica existente de salvar log ...

  // Após primeiro registro, inicializar push
  if (logs.length === 0 && user && activeBaby) {
    const { initPushNotifications } = await import('../lib/pushNotifications');
    initPushNotifications(user.id, activeBaby.id);
  }
};
```

---

## STEP 3 — Ajustar UI de Settings

**Objetivo:** Adicionar toggles dos novos tipos de push na tela de Settings existente.

**Arquivo a editar:** `app/src/pages/SettingsPage.tsx`

**O que já existe na Settings:**
- Seção "Intervalos e horários" com sliders para feed/diaper/sleep/bath
- Seção "Notificações" com toggles globais e por categoria
- Quiet hours com time pickers
- Pause during sleep toggle

**O que adicionar:**
Na seção "Notificações", abaixo dos toggles existentes (cat_feed, cat_diaper, cat_sleep, cat_bath), adicionar:

```
── Tipos de Notificação Push ──

☑ Alertas de rotina          (usa as janelas configuradas acima)
☑ Sugestões inteligentes      (quando sua rotina real divergir da janela)
☑ Saltos de desenvolvimento   [🔒 Yaya+]
☑ Celebrações e marcos
☑ Streak de registro
☑ Resumo diário              [🔒 Yaya+]
```

**Regras de UI:**
- Toggles que são Yaya+ mostram ícone 🔒 e abrem PaywallModal ao ativar (se não premium)
- Default: todos ON (exceto caregiver_activity que é OFF)
- Salvar em `notification_prefs` (campos adicionados no STEP 1: streak_alerts, development_leaps, smart_suggestions, daily_summary)
- NÃO criar tela separada agora — isso fica pro P1 de reorganização de Settings

**Persistência:** Usar a mesma lógica de `updateNotificationPrefs` que já existe no AppContext para salvar os campos novos na tabela `notification_prefs`.

---

## STEP 4 — Edge Function: push-scheduler

**Objetivo:** Enviar pushes de rotina baseados nas janelas do usuário.

**Criar:** `supabase/functions/push-scheduler/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const fcmServerKey = Deno.env.get('FCM_SERVER_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // 1. Buscar todos os bebês ativos com tokens de push
    const { data: tokens, error: tokensErr } = await supabase
      .from('push_tokens')
      .select(`
        user_id,
        baby_id,
        token,
        platform,
        babies!inner(name, birth_date),
        baby_members!inner(role)
      `)
      .order('baby_id');

    if (tokensErr || !tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no tokens' }), { status: 200 });
    }

    let sentCount = 0;
    const now = new Date();

    // Agrupar por baby_id para processar cada bebê uma vez
    const babyGroups = groupBy(tokens, 'baby_id');

    for (const [babyId, babyTokens] of Object.entries(babyGroups)) {
      const babyName = babyTokens[0].babies.name;

      // 2. Buscar intervalo configurado pelo usuário
      const { data: intervals } = await supabase
        .from('interval_configs')
        .select('*')
        .eq('baby_id', babyId);

      // 3. Buscar último registro por tipo
      const { data: lastLogs } = await supabase
        .from('logs')
        .select('event_id, timestamp')
        .eq('baby_id', babyId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (!intervals || !lastLogs) continue;

      // 4. Para cada categoria (feed, sleep, diaper)
      const categories = [
        { cat: 'feed', eventPrefix: 'feed', label: 'amamentação', emoji: '🍼' },
        { cat: 'sleep_awake', eventPrefix: 'sleep', label: 'sono', emoji: '😴' },
        { cat: 'diaper', eventPrefix: 'diaper', label: 'fralda', emoji: '🧷' },
      ];

      for (const { cat, eventPrefix, label, emoji } of categories) {
        const interval = intervals.find(i => i.category === cat);
        if (!interval) continue;

        const lastLog = lastLogs.find(l => l.event_id?.startsWith(eventPrefix));
        if (!lastLog) continue;

        const lastTime = new Date(lastLog.timestamp);
        const nextTime = new Date(lastTime.getTime() + interval.minutes * 60 * 1000);
        const alertTime = new Date(nextTime.getTime() - 15 * 60 * 1000); // 15min antes

        // Se estamos na janela de alerta (entre alertTime e nextTime)
        if (now >= alertTime && now <= nextTime) {
          // Enviar para cada cuidador com token
          for (const t of babyTokens) {
            // Checar anti-spam, quiet hours, preferências
            const canSend = await checkCanSend(t.user_id, babyId, 'routine_alert', now);
            if (!canSend) continue;

            const title = `${emoji} ${babyName}`;
            const body = cat === 'sleep_awake'
              ? `${babyName} está acordado há ${formatDuration(now.getTime() - lastTime.getTime())} — hora de preparar o sono`
              : `Próxim${cat === 'feed' ? 'a' : 'a'} ${label} em ~15 min`;

            await sendPush(t.token, title, body, { type: 'routine_alert', category: cat, babyId });
            await logPush(t.user_id, babyId, 'routine_alert', title, body);
            sentCount++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, timestamp: now.toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

// ─── Helpers ─────────────────────────────────────────

async function checkCanSend(userId: string, babyId: string, type: string, now: Date): Promise<boolean> {
  // 1. Buscar preferências
  const { data: prefs } = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .eq('baby_id', babyId)
    .single();

  if (!prefs?.enabled) return false;

  // 2. Quiet hours
  if (prefs.quiet_enabled) {
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    const start = prefs.quiet_start;
    const end = prefs.quiet_end;
    if (start > end) {
      // Overnight: 22:00 - 06:00
      if (currentTime >= start || currentTime < end) return false;
    } else {
      if (currentTime >= start && currentTime < end) return false;
    }
  }

  // 3. Max 8 pushes/dia
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from('push_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('sent_at', todayStart.toISOString());

  if ((count || 0) >= 8) return false;

  // 4. Cooldown 30min mesmo tipo
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const { count: recentSame } = await supabase
    .from('push_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', type)
    .gte('sent_at', thirtyMinAgo.toISOString());

  if ((recentSame || 0) > 0) return false;

  return true;
}

async function sendPush(token: string, title: string, body: string, data: Record<string, string>): Promise<void> {
  // FCM HTTP v1 API
  const response = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `key=${fcmServerKey}`,
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { sound: 'default', channel_id: 'yaya_routine' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    }),
  });

  if (!response.ok) {
    console.error('[Push] FCM error:', await response.text());
  }
}

async function logPush(userId: string, babyId: string, type: string, title: string, body: string): Promise<void> {
  await supabase.from('push_log').insert({ user_id: userId, baby_id: babyId, type, title, body });
}

function groupBy<T>(arr: T[], key: string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = (item as any)[key];
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h${m > 0 ? m + 'min' : ''}`;
  return `${m}min`;
}
```

### Agendar com pg_cron (executar no SQL Editor do Supabase):

```sql
-- Habilitar extensão pg_cron (se não habilitada)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Scheduler a cada 5 minutos
SELECT cron.schedule(
  'push-scheduler',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/push-scheduler',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**IMPORTANTE:** Para o pg_cron funcionar chamando Edge Functions, a extensão `pg_net` também precisa estar habilitada:

```sql
CREATE EXTENSION IF NOT EXISTS pg_net;
```

**Variável de ambiente necessária:** Adicionar `FCM_SERVER_KEY` nos secrets do Supabase Edge Functions:
```bash
supabase secrets set FCM_SERVER_KEY=your_fcm_server_key_here
```

---

## STEP 5 — Streak de Registro

**Objetivo:** Contador de dias consecutivos, visual na home, push de proteção, badges.

### 5a. Lógica de atualização do streak

**Criar:** `app/src/lib/streak.ts`

```typescript
import { supabase } from './supabase';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezeUsedThisWeek: boolean;
}

export const STREAK_BADGES = [
  { days: 7, label: '1 semana', badge: 'bronze', emoji: '🥉' },
  { days: 14, label: '2 semanas', badge: 'silver', emoji: '🥈' },
  { days: 30, label: '1 mês', badge: 'gold', emoji: '🥇' },
  { days: 60, label: '60 dias', badge: 'platinum', emoji: '💎' },
  { days: 100, label: '100 dias', badge: 'diamond', emoji: '👑' },
] as const;

/**
 * Atualiza streak quando um log é adicionado.
 * Chamar dentro de addLog no AppContext.
 */
export async function updateStreak(babyId: string): Promise<StreakData> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Buscar streak atual
  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('baby_id', babyId)
    .single();

  if (!streak) {
    // Primeiro registro: criar streak
    const newStreak = {
      baby_id: babyId,
      current_streak: 1,
      longest_streak: 1,
      last_active_date: today,
    };
    await supabase.from('streaks').insert(newStreak);
    return {
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
      freezeUsedThisWeek: false,
    };
  }

  // Já registrou hoje? Não incrementar
  if (streak.last_active_date === today) {
    return {
      currentStreak: streak.current_streak,
      longestStreak: streak.longest_streak,
      lastActiveDate: streak.last_active_date,
      freezeUsedThisWeek: streak.freeze_used_this_week,
    };
  }

  // Verificar se é dia consecutivo
  const lastDate = new Date(streak.last_active_date + 'T00:00:00');
  const todayDate = new Date(today + 'T00:00:00');
  const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / 86400000);

  let newCurrent = streak.current_streak;

  if (diffDays === 1) {
    // Dia consecutivo: incrementar
    newCurrent = streak.current_streak + 1;
  } else if (diffDays === 2 && streak.freeze_used_this_week) {
    // Pulou 1 dia mas freeze ativo: manter
    newCurrent = streak.current_streak + 1;
  } else {
    // Streak quebrado: resetar
    newCurrent = 1;
  }

  const newLongest = Math.max(newCurrent, streak.longest_streak);

  await supabase
    .from('streaks')
    .update({
      current_streak: newCurrent,
      longest_streak: newLongest,
      last_active_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('baby_id', babyId);

  return {
    currentStreak: newCurrent,
    longestStreak: newLongest,
    lastActiveDate: today,
    freezeUsedThisWeek: streak.freeze_used_this_week,
  };
}

/**
 * Busca streak atual do bebê
 */
export async function getStreak(babyId: string): Promise<StreakData | null> {
  const { data } = await supabase
    .from('streaks')
    .select('*')
    .eq('baby_id', babyId)
    .single();

  if (!data) return null;

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastActiveDate: data.last_active_date,
    freezeUsedThisWeek: data.freeze_used_this_week,
  };
}

/**
 * Retorna o badge atual baseado no streak
 */
export function getCurrentBadge(streak: number) {
  const earned = STREAK_BADGES.filter(b => streak >= b.days);
  return earned.length > 0 ? earned[earned.length - 1] : null;
}
```

### 5b. Componente visual do streak na home

**Criar:** `app/src/components/StreakBadge.tsx`

Componente compacto para o header da TrackerPage. Mostra "🔥 12" com o badge se aplicável. Tap abre modal com detalhes (streak atual, longest, próximo badge, freeze disponível).

Design:
- Discreto, no header ao lado do nome do bebê
- Fundo transparente, texto bold
- Se streak = 0, não mostrar
- Se streak em risco (0 registros hoje após 20h), pulsar levemente

### 5c. Integrar no AppContext

Dentro de `addLog` no AppContext, após salvar o log com sucesso:

```typescript
import { updateStreak } from '../lib/streak';

// Dentro de addLog, após o insert:
const streakData = await updateStreak(activeBaby.id);
// Atualizar state local do streak (adicionar ao AppContext state)
```

---

## STEP 6 — Edge Function: streak-checker

**Criar:** `supabase/functions/streak-checker/index.ts`

Roda às 23h55 via pg_cron. Para cada bebê com streak > 0:
1. Verificar se houve registro hoje
2. Se não: checar se tem freeze (Yaya+ only, via `profiles.is_premium`)
3. Sem registro e sem freeze → zerar streak + enviar push
4. Sem registro mas com freeze → manter streak, marcar freeze_used

**Agendar:**
```sql
SELECT cron.schedule(
  'streak-checker',
  '55 23 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/streak-checker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Push de proteção (20h):** Adicionar um segundo cron:
```sql
SELECT cron.schedule(
  'streak-risk-alert',
  '0 20 * * *',
  $$
  -- Mesma Edge Function com parâmetro mode=risk_alert
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/streak-checker',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"mode": "risk_alert"}'::jsonb
  );
  $$
);
```

Na Edge Function, se `mode === 'risk_alert'`: verificar bebês com streak > 0 e 0 registros hoje → enviar push "🔥 Seu streak de X dias está em risco!"

**Reset semanal do freeze:** Adicionar cron toda segunda-feira:
```sql
SELECT cron.schedule(
  'streak-freeze-reset',
  '0 0 * * 1',
  $$
  UPDATE streaks SET freeze_used_this_week = false WHERE freeze_used_this_week = true;
  $$
);
```

---

## STEP 7 — Saltos de Desenvolvimento (Wonder Weeks)

**Objetivo:** Card na home quando salto ativo, push 1 semana antes, bottom sheet com info.

### 7a. Dados dos saltos

**Criar:** `app/src/lib/developmentLeaps.ts`

```typescript
export interface DevelopmentLeap {
  id: number;
  weekStart: number;
  weekEnd: number;
  name: string;
  subtitle: string;
  pushText: string;
  description: string;
  whatToExpect: string[];
  tips: string[];
  registroImpact: string; // como aparece nos registros do Yaya
}

export const DEVELOPMENT_LEAPS: DevelopmentLeap[] = [
  {
    id: 1,
    weekStart: 5,
    weekEnd: 6,
    name: 'Sensações',
    subtitle: 'O mundo fica mais nítido',
    pushText: 'Salto de desenvolvimento se aproximando (~semana 5). {name} pode ficar mais agitado. Normal!',
    description: 'O bebê começa a perceber o mundo de forma mais intensa. Sensações que antes eram neutras agora chamam atenção.',
    whatToExpect: [
      'Mais choroso e grudento',
      'Pode querer mamar mais',
      'Sono pode ficar mais agitado',
      'Duração: ~1 semana',
    ],
    tips: [
      'Acolha — não é manha, é desenvolvimento',
      'Ofereça o peito/mamadeira com mais frequência se pedir',
      'Não se assuste com mudança no padrão de sono',
    ],
    registroImpact: 'Amamentações podem aumentar 20-30%. Sono pode diminuir.',
  },
  {
    id: 2,
    weekStart: 8,
    weekEnd: 9,
    name: 'Padrões',
    subtitle: 'Reconhecendo repetições',
    pushText: 'Salto 2 chegando. Pode haver mudança no sono e na amamentação.',
    description: 'O bebê começa a reconhecer padrões simples — mão, objetos, sons repetidos.',
    whatToExpect: [
      'Observa as próprias mãos',
      'Pode ficar mais agitado',
      'Sono e amamentação irregulares',
      'Duração: ~2 semanas',
    ],
    tips: [
      'Brinquedos de alto contraste ajudam',
      'Paciência com a irregularidade da rotina',
      'Vai passar — registre tudo para comparar depois',
    ],
    registroImpact: 'Intervalos de amamentação podem ficar irregulares. Normal.',
  },
  {
    id: 3,
    weekStart: 12,
    weekEnd: 13,
    name: 'Transições suaves',
    subtitle: 'Movimentos mais fluidos',
    pushText: 'Salto 3 se aproximando. Movimentos mais suaves e curiosidade aumentando.',
    description: 'Os movimentos ficam mais suaves e controlados. O bebê interage mais com o ambiente.',
    whatToExpect: [
      'Pega objetos com mais intenção',
      'Movimentos mais controlados',
      'Pode recusar dormir por curiosidade',
      'Duração: ~1 semana',
    ],
    tips: [
      'Ofereça objetos para segurar',
      'Ambiente calmo para sonecas — muita estimulação atrapalha',
      'Registre mudanças no sono — pode melhorar logo depois',
    ],
    registroImpact: 'Sonecas podem ficar mais curtas temporariamente.',
  },
  {
    id: 4,
    weekStart: 19,
    weekEnd: 23,
    name: 'Eventos',
    subtitle: 'O salto mais longo',
    pushText: 'Salto 4 é um dos maiores. Pode durar até 5 semanas. Paciência!',
    description: 'O maior e mais desafiador salto dos primeiros meses. O bebê entende sequências de eventos.',
    whatToExpect: [
      'Muito mais choroso e clingy',
      'Sono pode piorar significativamente',
      'Pode recusar colo de outras pessoas',
      'Duração: até 5 semanas (o mais longo)',
    ],
    tips: [
      'Esse é o mais difícil — peça ajuda',
      'Manter registros ajuda a ver que vai melhorar',
      'O Yaya mostra a tendência: confie nos dados',
    ],
    registroImpact: 'Sono pode diminuir 2-3h/dia. Amamentações podem dobrar. Fraldas geralmente estáveis.',
  },
  {
    id: 5,
    weekStart: 26,
    weekEnd: 28,
    name: 'Relações',
    subtitle: 'Entendendo distância',
    pushText: 'Salto 5. {name} começa a entender distância e pode estranhar.',
    description: 'O bebê compreende que objetos e pessoas existem mesmo quando não vê. Início da ansiedade de separação.',
    whatToExpect: [
      'Ansiedade de separação (estranha)',
      'Chora quando você sai do campo de visão',
      'Pode ter dificuldade para dormir sozinho',
      'Duração: ~3 semanas',
    ],
    tips: [
      'Brincadeiras de esconder e aparecer ajudam',
      'Despedidas curtas e consistentes',
      'Não saia "escondido" — gera mais ansiedade',
    ],
    registroImpact: 'Sono noturno pode ficar mais fragmentado.',
  },
  {
    id: 6,
    weekStart: 37,
    weekEnd: 39,
    name: 'Categorias',
    subtitle: 'Agrupando o mundo',
    pushText: 'Salto 6. Agrupando objetos, reconhecendo padrões.',
    description: 'O bebê começa a categorizar: animais, comida, pessoas. Compara objetos.',
    whatToExpect: [
      'Examina objetos com mais atenção',
      'Pode ficar frustrado ao não conseguir algo',
      'Mais birras',
      'Duração: ~4 semanas',
    ],
    tips: [
      'Nomear categorias ajuda: "isso é uma fruta"',
      'Paciência com a frustração',
      'Bons registros agora ajudam na introdução alimentar',
    ],
    registroImpact: 'Se em IA, pode recusar alimentos que antes aceitava. Temporário.',
  },
  {
    id: 7,
    weekStart: 46,
    weekEnd: 48,
    name: 'Sequências',
    subtitle: 'Primeiras "conversas"',
    pushText: 'Salto 7. Sequências de ações e primeira "conversa".',
    description: 'O bebê entende que ações têm consequências em sequência. Tenta "conversar" e imitar.',
    whatToExpect: [
      'Imita ações simples',
      'Faz barulhos com intenção',
      'Tenta fazer coisas "por conta"',
      'Duração: ~5 semanas',
    ],
    tips: [
      'Converse e responda os sons do bebê',
      'Deixe tentar sozinho (com supervisão)',
      'Rotina consistente ajuda na segurança',
    ],
    registroImpact: 'Rotina pode ficar mais previsível após o salto.',
  },
  {
    id: 8,
    weekStart: 55,
    weekEnd: 58,
    name: 'Programas',
    subtitle: 'Personalidade aparecendo',
    pushText: 'Salto 8. Birras, decisões próprias, personalidade aparecendo.',
    description: 'O bebê tenta "programar" suas ações. Quer fazer do jeito dele. Birras são normais.',
    whatToExpect: [
      'Birras frequentes',
      'Quer fazer tudo sozinho',
      'Testa limites constantemente',
      'Duração: ~4 semanas',
    ],
    tips: [
      'Dê opções em vez de ordens ("quer a azul ou a vermelha?")',
      'Birras não são manha — é frustração legítima',
      'Manter rotina é ainda mais importante agora',
    ],
    registroImpact: 'Alimentação pode ficar seletiva. Sono geralmente estável.',
  },
  {
    id: 9,
    weekStart: 64,
    weekEnd: 67,
    name: 'Princípios',
    subtitle: 'Negociação e empatia',
    pushText: 'Salto 9. Negociação, humor, empatia emergindo.',
    description: 'A criança começa a entender princípios: justo/injusto, meu/seu, regras.',
    whatToExpect: [
      'Negocia e argumenta',
      'Mostra empatia (abraça quem está triste)',
      'Testa regras para entender limites',
      'Duração: ~5 semanas',
    ],
    tips: [
      'Explique as razões (mesmo que simplifique)',
      'Celebre demonstrações de empatia',
      'Consistência: regra é regra',
    ],
    registroImpact: 'Rotina geralmente estável. Bom momento para revisar hábitos.',
  },
  {
    id: 10,
    weekStart: 75,
    weekEnd: 78,
    name: 'Sistemas',
    subtitle: 'Pensamento abstrato',
    pushText: 'Salto 10. Pensamento abstrato, faz de conta, criatividade.',
    description: 'O último grande salto. A criança já pensa de forma abstrata: faz de conta, imaginação, criatividade.',
    whatToExpect: [
      'Brincadeiras de faz de conta',
      'Perguntas sobre "por quê?"',
      'Imaginação ativa (amigos imaginários)',
      'Duração: ~4 semanas',
    ],
    tips: [
      'Incentive o faz de conta',
      'Responda os "por quê" com paciência',
      'Parabéns — você passou por todos os saltos!',
    ],
    registroImpact: 'Rotina estável. Bom momento para o Yaya gerar relatório de evolução completo.',
  },
];

/**
 * Retorna o salto ativo baseado na idade do bebê em semanas
 */
export function getActiveLeap(birthDate: string): DevelopmentLeap | null {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageWeeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86400000));

  return DEVELOPMENT_LEAPS.find(
    leap => ageWeeks >= leap.weekStart - 1 && ageWeeks <= leap.weekEnd + 1
  ) || null;
}

/**
 * Retorna o próximo salto que ainda não começou
 */
export function getUpcomingLeap(birthDate: string): { leap: DevelopmentLeap; weeksUntil: number } | null {
  const birth = new Date(birthDate);
  const now = new Date();
  const ageWeeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86400000));

  const upcoming = DEVELOPMENT_LEAPS.find(leap => leap.weekStart > ageWeeks + 1);
  if (!upcoming) return null;

  return {
    leap: upcoming,
    weeksUntil: upcoming.weekStart - ageWeeks,
  };
}
```

### 7b. Card de salto na home

**Criar:** `app/src/components/LeapCard.tsx`

Card compacto para a TrackerPage. Mostra quando um salto está ativo ou se aproximando (dentro de 1 semana). Tap → bottom sheet com detalhes.

Design:
- Background: gradiente roxo suave → cor do accent (#7C4DFF com 10% opacity)
- Ícone ⚡ no canto
- Título: "Salto 4 — Eventos (semanas 19-23)"
- Subtítulo: "{nome} pode estar mais agitado e com sono irregular."
- Botões: [Saiba mais] [Dispensar]
- Se dispensado, não mostrar de novo (salvar dismiss no localStorage ou async storage)

### 7c. Bottom sheet de detalhes do salto

**Criar:** `app/src/components/LeapDetail.tsx`

Modal/bottom sheet com:
- Nome e número do salto
- O que esperar (lista)
- Dicas práticas
- Como aparece nos registros
- Duração estimada
- Botão "Entendi" para fechar

---

## STEP 8 — Sugestões Inteligentes de Ajuste

**Objetivo:** Detectar divergência > 20% entre janela configurada e média real, mostrar card na home.

### Lógica (pode ser implementada client-side ou como Edge Function):

1. A cada abertura do app (ou 1x/dia), calcular média real dos últimos 3 dias para cada categoria
2. Comparar com `interval_configs` do usuário
3. Se divergência > 20%, gerar card de sugestão:
   ```
   A média real de amamentação do Miguel nos últimos 3 dias é 2h30.
   Sua janela está configurada para 3h.
   [Ajustar para 2h30] [Manter 3h]
   ```
4. Se usuário clica "Manter", não resugerir por 14 dias (salvar timestamp de dismiss)
5. Se usuário clica "Ajustar", atualizar `interval_configs`

**Implementação recomendada:** Client-side, dentro de um hook `useSmartSuggestions.ts` que roda no mount da TrackerPage. Mais simples que Edge Function e não precisa de push.

---

## STEP 9 — Melhorias Detectadas (Push positivo)

**Objetivo:** Pushes celebratórios quando padrão melhora.

Implementar dentro do `push-scheduler` como check adicional (ou como Edge Function separada rodando 1x/dia às 10h):

| Métrica | Cálculo | Push |
|---------|---------|------|
| Sono consolidando | Maior bloco noturno (hoje) > média(7d) + 30min | "🌙 Sono noturno do {nome} aumentou: {atual} vs {media7d}" |
| Amamentação espaçando | Intervalo médio(3d) > intervalo médio(14d antes) + 20% | "🍼 Amamentação espaçando naturalmente" |
| Ritmo circadiano | 3d consecutivos sono noturno > diurno | "🌙 Ritmo circadiano se formando!" |
| Rotina estável | Desvio padrão < 15% por 7d | "🧷 Rotina de fraldas estável. Ótimo sinal." |

---

## STEP 10 — Edge Function: daily-summary

**Criar:** `supabase/functions/daily-summary/index.ts`

Roda às 21h. Para cada bebê ativo com cuidadores que têm `daily_summary = true`:
1. Agregar logs do dia: COUNT por tipo, SUM sono
2. Comparar com média dos 7 dias anteriores
3. Verificar se há salto ativo
4. Gerar texto: "📊 Dia do Miguel: 8 amamentações · 6 fraldas · 14h sono. Dentro do esperado."
5. Feature gate: só enviar se cuidador tem Yaya+ (checar `profiles.is_premium`)

**Agendar:**
```sql
SELECT cron.schedule(
  'daily-summary',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/daily-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## STEP 11 — Anti-spam (revisão final)

Verificar que TODAS as regras abaixo estão implementadas no `push-scheduler` e demais Edge Functions:

| Regra | Implementação | Onde |
|-------|---------------|------|
| Max 8 pushes/dia por cuidador | COUNT push_log WHERE sent_at >= today | push-scheduler, streak-checker, daily-summary |
| Não repetir mesmo tipo em < 30min | COUNT push_log WHERE type = X AND sent_at >= now - 30min | push-scheduler |
| Horário de silêncio absoluto | quiet_start/quiet_end da notification_prefs | Todas Edge Functions |
| Não enviar se app aberto | Checar last_seen_at (precisa ser implementado — campo no push_tokens) | push-scheduler |
| Cool-down após dismiss | 3 ignored consecutivos → parar tipo por 7 dias | Futuro — v2 |
| Sugestão rejeitada | Não resugerir por 14 dias | Client-side (localStorage) |

**Campo adicional sugerido em `push_tokens`:**
```sql
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
```
Atualizar `last_seen_at` no frontend a cada abertura do app (via `useEffect` no App.tsx).

---

## ORDEM DE EXECUÇÃO RECOMENDADA

```
STEP 1  → Tabelas SQL (5 min, pode fazer direto no SQL Editor)
STEP 2a → npm install @capacitor/push-notifications + sync (2 min)
STEP 2b → Firebase config Android (precisa google-services.json manual)
STEP 2c → APNs config iOS (precisa Apple Developer manual)
STEP 2d → pushNotifications.ts (criar arquivo)
STEP 2e → Integrar no AppContext (editar AppContext.tsx)
STEP 3  → Toggles novos na SettingsPage (editar SettingsPage.tsx)
STEP 5  → streak.ts + StreakBadge + integrar no AppContext
STEP 7  → developmentLeaps.ts + LeapCard + LeapDetail
STEP 8  → useSmartSuggestions hook (client-side)
STEP 4  → push-scheduler Edge Function + pg_cron
STEP 6  → streak-checker Edge Function + pg_cron
STEP 10 → daily-summary Edge Function + pg_cron
STEP 9  → Melhorias detectadas (dentro do scheduler ou separado)
STEP 11 → Revisão anti-spam em todas as functions
```

**Nota:** Steps 2b/2c requerem configuração manual no Firebase Console e Apple Developer. O Claude Code pode criar os arquivos e código, mas os JSONs/certificados precisam ser baixados manualmente pelo Dyego.

---

## REFERÊNCIAS

- **Spec completa:** `PUSH_NOTIFICATIONS_SPEC.md` (textos, feature gate, regras de negócio)
- **Contextos existentes:** `app/src/contexts/AppContext.tsx` (funções addLog, updateIntervals, etc.)
- **Settings existente:** `app/src/pages/SettingsPage.tsx` (UI de notification prefs)
- **Projeções existente:** `app/src/lib/projections.ts` (lógica de timing reutilizável)
- **Constantes:** `app/src/lib/constants.ts` (DEFAULT_INTERVALS, DEFAULT_EVENTS)

---

## REGRAS DE UX (OBRIGATÓRIO)

1. **Nunca usar "mamada"** — sempre "amamentação"
2. **Mínimo de cliques** — pai com sono e uma mão livre. Se precisa de > 2 toques para a ação principal, está errado
3. **Defaults inteligentes** — tudo funciona sem configurar nada. Configuração é para quem quer ajustar.
4. **App é para o dia todo** — não posicionar como ferramenta noturna
5. **Headline oficial:** "A rotina do seu bebê, com 1 toque, na palma da sua mão."
