import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Streak Checker — Edge Function
 *
 * Chamada via pg_cron 1x/dia às 20:00 UTC-3 (23:00 UTC).
 * Verifica usuários que têm streak ativo mas NÃO registraram nada hoje.
 * Envia push alertando para não perder o streak.
 *
 * Anti-spam:
 *   - Envia no máximo 1x/dia
 *   - Respeita enabled e streak_alerts toggle
 *   - Não envia se user fez registro hoje
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')!;
const FCM_PROJECT_ID = 'babytracking-492412';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** Computes today's date in Brazil local time (UTC-3) as YYYY-MM-DD */
function getBrazilTodayString(now: Date): string {
  const brazilMs = now.getTime() - 3 * 60 * 60 * 1000;
  const brazilDate = new Date(brazilMs);
  const y = brazilDate.getUTCFullYear();
  const m = (brazilDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = brazilDate.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns the current hour (0-23) in Brazil local time */
function getBrazilHour(now: Date): number {
  return (now.getUTCHours() - 3 + 24) % 24;
}

/** Checks if current Brazil time is within quiet hours */
function isInQuietHours(prefs: any, now: Date): boolean {
  if (!prefs?.quiet_enabled) return false;
  const hour = getBrazilHour(now);
  const start = prefs.quiet_start ?? 22;
  const end = prefs.quiet_end ?? 7;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

serve(async (req) => {
  try {
    const now = new Date();
    const todayStr = getBrazilTodayString(now);

    // 1. Get all active streaks
    const { data: streaks } = await supabase
      .from('streaks')
      .select('baby_id, current_streak, last_active_date')
      .gt('current_streak', 0);

    if (!streaks || streaks.length === 0) {
      return jsonResponse({ sent: 0, reason: 'no active streaks' });
    }

    // Filter: only users who haven't logged today
    const atRiskStreaks = streaks.filter(s => s.last_active_date !== todayStr);

    if (atRiskStreaks.length === 0) {
      return jsonResponse({ sent: 0, reason: 'all streaks safe' });
    }

    const babyIds = atRiskStreaks.map(s => s.baby_id);

    // 2. Get tokens for these babies
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, user_id, baby_id, platform')
      .in('baby_id', babyIds);

    if (!tokens || tokens.length === 0) {
      return jsonResponse({ sent: 0, reason: 'no tokens for at-risk babies' });
    }

    // 3. Get notification prefs (including quiet hours and pause_during_sleep)
    const { data: allPrefs } = await supabase
      .from('notification_prefs')
      .select('user_id, baby_id, enabled, streak_alerts, quiet_enabled, quiet_start, quiet_end, pause_during_sleep')
      .in('baby_id', babyIds);

    const prefsMap = new Map<string, any>();
    for (const p of allPrefs ?? []) {
      prefsMap.set(`${p.user_id}_${p.baby_id}`, p);
    }

    // 4. Check push_log for today to avoid duplicates
    const { data: todayPushes } = await supabase
      .from('push_log')
      .select('user_id, baby_id, type')
      .eq('type', 'streak_risk')
      .gte('sent_at', todayStr + 'T00:00:00.000Z');

    const sentToday = new Set<string>();
    for (const p of todayPushes ?? []) {
      sentToday.add(`${p.user_id}_${p.baby_id}`);
    }

    // 5. Get baby names + gender (gender used for pt-BR copy: "do" / "da")
    const { data: babies } = await supabase
      .from('babies')
      .select('id, name, gender')
      .in('id', babyIds);

    const babyNames = new Map<string, string>();
    const babyGenders = new Map<string, 'boy' | 'girl' | null>();
    for (const b of babies ?? []) {
      babyNames.set(b.id, b.name);
      babyGenders.set(b.id, (b.gender === 'boy' || b.gender === 'girl') ? b.gender : null);
    }

    const deOf = (g: 'boy' | 'girl' | null): string =>
      g === 'boy' ? 'do' : g === 'girl' ? 'da' : 'de';

    // Create streak map
    const streakMap = new Map<string, number>();
    for (const s of atRiskStreaks) {
      streakMap.set(s.baby_id, s.current_streak);
    }

    // 6. Send pushes
    let totalSent = 0;
    const pushPromises: Promise<void>[] = [];

    for (const token of tokens) {
      const prefs = prefsMap.get(`${token.user_id}_${token.baby_id}`);

      // Check enabled
      if (prefs && !prefs.enabled) continue;

      // Check streak_alerts toggle
      if (prefs && prefs.streak_alerts === false) continue;

      // Respect quiet hours
      if (prefs && isInQuietHours(prefs, now)) continue;

      // Check duplicate
      if (sentToday.has(`${token.user_id}_${token.baby_id}`)) continue;

      const streakDays = streakMap.get(token.baby_id) ?? 0;
      const babyName = babyNames.get(token.baby_id) ?? 'Bebê';
      const babyGender = babyGenders.get(token.baby_id) ?? null;

      const message = {
        title: `Seu streak de ${streakDays} dias está em risco! 🔥`,
        body: `Registre algo ${deOf(babyGender)} ${babyName} hoje para não perder sua sequência`,
        type: 'streak_risk',
      };

      sentToday.add(`${token.user_id}_${token.baby_id}`);

      pushPromises.push(
        sendFCMPush(token.token, message).then(async (success) => {
          if (success) {
            totalSent++;
            await supabase.from('push_log').insert({
              user_id: token.user_id,
              baby_id: token.baby_id,
              type: 'streak_risk',
              title: message.title,
              body: message.body,
              sent_at: new Date().toISOString(),
              delivered: true,
            });
          }
        })
      );
    }

    await Promise.allSettled(pushPromises);

    return jsonResponse({
      sent: totalSent,
      atRisk: atRiskStreaks.length,
      checked: streaks.length,
    });
  } catch (error: any) {
    console.error('Streak checker error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ─── FCM V1 API with Service Account JWT ────

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const sa = JSON.parse(FCM_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const b64url = (data: Uint8Array): string => {
    let binary = '';
    for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = b64url(encoder.encode(JSON.stringify(header)));
  const claimB64 = b64url(encoder.encode(JSON.stringify(claimSet)));
  const signInput = `${headerB64}.${claimB64}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(signInput)
  );

  const signatureB64 = b64url(new Uint8Array(signature));
  const jwt = `${signInput}.${signatureB64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  cachedAccessToken = {
    token: tokenData.access_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  };
  return cachedAccessToken.token;
}

async function sendFCMPush(token: string, message: { title: string; body: string; type: string }): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body },
            data: { type: message.type },
            android: { priority: 'HIGH', notification: { sound: 'default' } },
            apns: { payload: { aps: { sound: 'default' } } },
          },
        }),
      }
    );

    if (res.ok) return true;
    const err = await res.text();
    console.error('FCM V1 error:', err);
    if (err.includes('UNREGISTERED') || err.includes('INVALID_ARGUMENT')) {
      await supabase.from('push_tokens').delete().eq('token', token);
    }
    return false;
  } catch {
    return false;
  }
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
