import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Push Scheduler — Edge Function
 *
 * Chamada via pg_cron a cada 5 minutos.
 * Verifica intervalos de cada bebê e envia push quando:
 *   - Intervalo de amamentação atingiu warn (80%) ou expirou (100%)
 *   - Intervalo de fralda atingiu warn ou expirou
 *   - Soneca excedeu duração configurada
 *   - Janela de sono excedeu duração configurada
 *   - Banho: 15 min antes do horário agendado
 *
 * Anti-spam:
 *   - Verifica push_log para não enviar duplicata no mesmo intervalo
 *   - Respeita quiet hours do usuário
 *   - Respeita pause_during_sleep
 *   - Não envia se app aberto recentemente (last_seen < 2min)
 *   - Respeita toggles por categoria
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')!;
const FCM_PROJECT_ID = 'babytracking-492412';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushTarget {
  token: string;
  userId: string;
  babyId: string;
  platform: string;
}

interface PushMessage {
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  try {
    // Auth: accept cron (no auth) or service_role
    const authHeader = req.headers.get('Authorization');
    if (authHeader && !authHeader.includes(SUPABASE_SERVICE_ROLE_KEY)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const now = new Date();
    const nowTs = now.getTime();
    // BRT = UTC-3 (all users are in Brazil for now)
    const BRT_OFFSET = -3;
    const brtHour = (now.getUTCHours() + BRT_OFFSET + 24) % 24;

    // 1. Get all babies with active tokens
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, user_id, baby_id, platform, last_seen_at');

    if (!tokens || tokens.length === 0) {
      return jsonResponse({ sent: 0, reason: 'no tokens' });
    }

    // Group tokens by baby_id
    const babyTokens = new Map<string, PushTarget[]>();
    const userLastSeen = new Map<string, string>();

    for (const t of tokens) {
      // Skip if user has app open (last_seen < 2 min ago)
      if (t.last_seen_at) {
        const seenAgo = nowTs - new Date(t.last_seen_at).getTime();
        if (seenAgo < 120_000) continue; // 2 minutes
        userLastSeen.set(t.user_id, t.last_seen_at);
      }

      if (!babyTokens.has(t.baby_id)) babyTokens.set(t.baby_id, []);
      babyTokens.get(t.baby_id)!.push({
        token: t.token,
        userId: t.user_id,
        babyId: t.baby_id,
        platform: t.platform,
      });
    }

    const babyIds = [...babyTokens.keys()];
    if (babyIds.length === 0) {
      return jsonResponse({ sent: 0, reason: 'all users active' });
    }

    // 2. Get notification prefs for all users
    const { data: allPrefs } = await supabase
      .from('notification_prefs')
      .select('*')
      .in('baby_id', babyIds);

    const prefsMap = new Map<string, any>();
    for (const p of allPrefs ?? []) {
      prefsMap.set(`${p.user_id}_${p.baby_id}`, p);
    }

    // 3. Get latest logs for each baby
    const { data: allLogs } = await supabase
      .from('logs')
      .select('baby_id, event_id, timestamp')
      .in('baby_id', babyIds)
      .order('timestamp', { ascending: false });

    // Get latest log per baby per category
    const latestByBabyCategory = new Map<string, number>();
    for (const log of allLogs ?? []) {
      const cat = eventToCategory(log.event_id);
      if (!cat) continue;
      const key = `${log.baby_id}_${cat}`;
      if (!latestByBabyCategory.has(key)) {
        latestByBabyCategory.set(key, log.timestamp);
      }
    }

    // 4. Get interval configs for all babies
    const { data: allIntervals } = await supabase
      .from('interval_configs')
      .select('baby_id, category, minutes, warn, mode, scheduled_hours')
      .in('baby_id', babyIds);

    const intervalMap = new Map<string, any>();
    for (const ic of allIntervals ?? []) {
      intervalMap.set(`${ic.baby_id}_${ic.category}`, ic);
    }

    // 5. Get recent push_log to avoid duplicates (last 30 min)
    const thirtyMinAgo = new Date(nowTs - 30 * 60_000).toISOString();
    const { data: recentPushes } = await supabase
      .from('push_log')
      .select('user_id, baby_id, type')
      .gte('sent_at', thirtyMinAgo);

    const recentPushSet = new Set<string>();
    for (const p of recentPushes ?? []) {
      recentPushSet.add(`${p.user_id}_${p.baby_id}_${p.type}`);
    }

    // 6. Get babies info for names
    const { data: babies } = await supabase
      .from('babies')
      .select('id, name')
      .in('id', babyIds);

    const babyNames = new Map<string, string>();
    for (const b of babies ?? []) {
      babyNames.set(b.id, b.name);
    }

    // 7. Process each baby and generate push messages
    let totalSent = 0;
    const pushPromises: Promise<void>[] = [];

    for (const [babyId, targets] of babyTokens) {
      const babyName = babyNames.get(babyId) ?? 'Bebê';

      // Check routine intervals: feed, diaper, sleep
      const categories = ['feed', 'diaper', 'sleep_nap', 'sleep_awake'];

      for (const cat of categories) {
        const interval = intervalMap.get(`${babyId}_${cat}`);
        if (!interval) continue;

        const lastLogTs = latestByBabyCategory.get(`${babyId}_${cat}`);
        if (!lastLogTs) continue;

        const elapsed = nowTs - lastLogTs;
        const intervalMs = interval.minutes * 60_000;
        const warnMs = (interval.warn ?? interval.minutes * 0.8) * 60_000;

        // Check if interval expired or warning
        let pushType: string | null = null;
        let message: PushMessage | null = null;

        if (elapsed >= intervalMs) {
          pushType = `${cat}_expired`;
          message = getExpiredMessage(cat, interval.minutes, babyName);
        } else if (elapsed >= warnMs && elapsed < intervalMs) {
          pushType = `${cat}_warn`;
          message = getWarnMessage(cat, interval.minutes, babyName);
        }

        if (!message || !pushType) continue;

        // Send to each target for this baby
        for (const target of targets) {
          const prefs = prefsMap.get(`${target.userId}_${babyId}`);

          // Check if enabled
          if (prefs && !prefs.enabled) continue;

          // Check category toggle
          if (prefs && !isCategoryEnabled(prefs, cat)) continue;

          // Check quiet hours
          if (prefs && isInQuietHours(prefs, now)) continue;

          // Check pause during sleep
          if (prefs?.pause_during_sleep && (cat === 'feed' || cat === 'diaper')) {
            const lastSleep = latestByBabyCategory.get(`${babyId}_sleep_nap`);
            const lastWake = latestByBabyCategory.get(`${babyId}_sleep_awake`);
            if (lastSleep && (!lastWake || lastSleep > lastWake)) continue; // Baby is sleeping
          }

          // Check duplicate
          const dupeKey = `${target.userId}_${babyId}_${pushType}`;
          if (recentPushSet.has(dupeKey)) continue;

          // Send!
          recentPushSet.add(dupeKey);
          pushPromises.push(
            sendFCMPush(target.token, message).then(async (success) => {
              if (success) {
                totalSent++;
                await logPush(target.userId, babyId, pushType!, message!.title, message!.body);
              }
            })
          );
        }
      }

      // Check bath schedule
      const bathConfig = intervalMap.get(`${babyId}_bath`);
      if (bathConfig?.scheduled_hours) {
        const hours: number[] = JSON.parse(bathConfig.scheduled_hours);
        const userHour = (now.getUTCHours() - 3 + 24) % 24; // BRT = UTC-3
        const userMinute = now.getMinutes();

        for (const h of hours) {
          // Alert 15 min before
          const alertMinute = h * 60 - 15;
          const currentMinute = userHour * 60 + userMinute;

          if (Math.abs(currentMinute - alertMinute) <= 3) { // within 3 min window
            const message: PushMessage = {
              title: `Hora do banho! 🛁`,
              body: `Banho de ${babyName} em 15 minutos`,
              type: 'bath_reminder',
            };

            for (const target of targets) {
              const prefs = prefsMap.get(`${target.userId}_${babyId}`);
              if (prefs && !prefs.enabled) continue;
              if (prefs && !prefs.cat_bath) continue;
              if (prefs && isInQuietHours(prefs, now)) continue;

              const dupeKey = `${target.userId}_${babyId}_bath_${h}`;
              if (recentPushSet.has(dupeKey)) continue;
              recentPushSet.add(dupeKey);

              pushPromises.push(
                sendFCMPush(target.token, message).then(async (success) => {
                  if (success) {
                    totalSent++;
                    await logPush(target.userId, babyId, `bath_${h}`, message.title, message.body);
                  }
                })
              );
            }
          }
        }
      }
    }

    await Promise.allSettled(pushPromises);

    return jsonResponse({ sent: totalSent, checked: babyIds.length });
  } catch (error: any) {
    console.error('Push scheduler error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});

// ─── HELPERS ────────────────────────────────

function eventToCategory(eventId: string): string | null {
  if (eventId.startsWith('breast_') || eventId === 'bottle') return 'feed';
  if (eventId === 'diaper_wet' || eventId === 'diaper_dirty') return 'diaper';
  if (eventId === 'sleep_start' || eventId === 'sleep') return 'sleep_nap';
  if (eventId === 'sleep_end' || eventId === 'wake') return 'sleep_awake';
  if (eventId === 'bath') return 'bath';
  return null;
}

function isCategoryEnabled(prefs: any, cat: string): boolean {
  if (cat === 'feed') return prefs.cat_feed !== false;
  if (cat === 'diaper') return prefs.cat_diaper !== false;
  if (cat === 'sleep_nap' || cat === 'sleep_awake') return prefs.cat_sleep !== false;
  if (cat === 'bath') return prefs.cat_bath !== false;
  return true;
}

function isInQuietHours(prefs: any, now: Date): boolean {
  if (!prefs.quiet_enabled) return false;
  // Convert UTC to BRT (UTC-3) — all users are in Brazil for now
  const hour = (now.getUTCHours() - 3 + 24) % 24;
  const start = prefs.quiet_start ?? 22;
  const end = prefs.quiet_end ?? 7;

  if (start < end) {
    return hour >= start && hour < end;
  } else {
    // Overnight: e.g., 22-07
    return hour >= start || hour < end;
  }
}

function getWarnMessage(cat: string, minutes: number, babyName: string): PushMessage {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const timeStr = h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;

  switch (cat) {
    case 'feed':
      return {
        title: `Amamentação se aproximando ⏰`,
        body: `Última mamada de ${babyName} foi há quase ${timeStr}`,
        type: 'routine_alert',
        data: { category: 'feed' },
      };
    case 'diaper':
      return {
        title: `Hora de verificar a fralda 💧`,
        body: `Última troca de ${babyName} foi há quase ${timeStr}`,
        type: 'routine_alert',
        data: { category: 'diaper' },
      };
    case 'sleep_nap':
      return {
        title: `Soneca longa 😴`,
        body: `${babyName} está dormindo há quase ${timeStr}`,
        type: 'routine_alert',
        data: { category: 'sleep' },
      };
    case 'sleep_awake':
      return {
        title: `Janela de sono chegando 🌙`,
        body: `${babyName} está acordado há quase ${timeStr}`,
        type: 'routine_alert',
        data: { category: 'sleep' },
      };
    default:
      return { title: 'Yaya Baby', body: 'Verifique os registros', type: 'routine_alert' };
  }
}

function getExpiredMessage(cat: string, minutes: number, babyName: string): PushMessage {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const timeStr = h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;

  switch (cat) {
    case 'feed':
      return {
        title: `Hora da amamentação! 🍼`,
        body: `Última mamada de ${babyName} foi há ${timeStr}`,
        type: 'routine_alert',
        data: { category: 'feed' },
      };
    case 'diaper':
      return {
        title: `Hora de trocar a fralda! 💧`,
        body: `Última troca de ${babyName} foi há ${timeStr}`,
        type: 'routine_alert',
        data: { category: 'diaper' },
      };
    case 'sleep_nap':
      return {
        title: `Soneca passou do tempo ⏰`,
        body: `${babyName} está dormindo há mais de ${timeStr}`,
        type: 'routine_alert',
        data: { category: 'sleep' },
      };
    case 'sleep_awake':
      return {
        title: `Hora de dormir! 🌙`,
        body: `${babyName} está acordado há mais de ${timeStr}. Hora da soneca?`,
        type: 'routine_alert',
        data: { category: 'sleep' },
      };
    default:
      return { title: 'Yaya Baby', body: 'Verifique os registros', type: 'routine_alert' };
  }
}

// ─── FCM V1 API with Service Account JWT ────

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt - 60_000) {
    return cachedAccessToken.token;
  }

  const sa = JSON.parse(FCM_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);

  // Create JWT header and claim set
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();

  // Base64url encode
  const b64url = (data: Uint8Array): string => {
    let binary = '';
    for (const byte of data) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = b64url(encoder.encode(JSON.stringify(header)));
  const claimB64 = b64url(encoder.encode(JSON.stringify(claimSet)));
  const signInput = `${headerB64}.${claimB64}`;

  // Import private key and sign
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signInput)
  );

  const signatureB64 = b64url(new Uint8Array(signature));
  const jwt = `${signInput}.${signatureB64}`;

  // Exchange JWT for access token
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

async function sendFCMPush(token: string, message: PushMessage): Promise<boolean> {
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
            notification: {
              title: message.title,
              body: message.body,
            },
            data: {
              type: message.type,
              ...(message.data ?? {}),
            },
            android: {
              priority: 'HIGH',
              notification: { sound: 'default' },
            },
            apns: {
              payload: {
                aps: { sound: 'default', badge: 1, 'content-available': 1 },
              },
            },
          },
        }),
      }
    );

    if (res.ok) return true;
    const err = await res.text();
    console.error('FCM V1 error:', err);
    // Remove stale tokens (UNREGISTERED, INVALID_ARGUMENT)
    if (err.includes('UNREGISTERED') || err.includes('INVALID_ARGUMENT')) {
      await supabase.from('push_tokens').delete().eq('token', token);
      console.log('Removed stale token:', token.slice(0, 20));
    }
    return false;
  } catch (error) {
    console.error('FCM send error:', error);
    return false;
  }
}

async function logPush(userId: string, babyId: string, type: string, title: string, body: string): Promise<void> {
  await supabase.from('push_log').insert({
    user_id: userId,
    baby_id: babyId,
    type,
    title,
    body,
    sent_at: new Date().toISOString(),
    delivered: true,
  });
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
