import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * send-immediate-push — Edge Function
 *
 * Envia uma notificação push imediata para parents/guardians de um bebê,
 * opcionalmente excluindo um user_id (ex: o próprio caregiver que disparou).
 *
 * Body (JSON):
 *   - babyId: string (obrigatório)
 *   - title: string
 *   - body: string
 *   - type: string (ex: "daily_summary")
 *   - excludeUserId?: string
 *   - data?: Record<string, string>
 *
 * Auth:
 *   - Aceita JWT de um usuário autenticado OU service_role.
 *   - Precisa pelo menos que o chamador exista (o banco garante RLS
 *     nas tabelas consultadas via service role).
 *
 * Quiet hours:
 *   - Respeita `notification_prefs.quiet_hours_enabled / start / end` por
 *     destinatário (mesma regra do push-scheduler).
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT')!;
const FCM_PROJECT_ID = 'babytracking-492412';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface PushMessage {
  title: string;
  body: string;
  type: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }

    const { babyId, title, body, type, excludeUserId, data } = payload as {
      babyId?: string;
      title?: string;
      body?: string;
      type?: string;
      excludeUserId?: string;
      data?: Record<string, string>;
    };

    if (!babyId || !title || !body || !type) {
      return jsonResponse({ error: 'babyId, title, body, type are required' }, 400);
    }

    // 1. Descobre destinatários: parent/guardian do bebê (exclui excludeUserId)
    const { data: members, error: membersErr } = await supabase
      .from('baby_members')
      .select('user_id, role')
      .eq('baby_id', babyId)
      .in('role', ['parent', 'guardian']);

    if (membersErr) {
      console.error('members query error', membersErr);
      return jsonResponse({ error: 'members_query_failed' }, 500);
    }

    const recipientIds = (members ?? [])
      .map((m: { user_id: string }) => m.user_id)
      .filter((id: string) => id !== excludeUserId);

    if (recipientIds.length === 0) {
      return jsonResponse({ sent: 0, reason: 'no_recipients' });
    }

    // 2. Tokens desses usuários (qualquer baby_id, porque push_tokens é por user)
    const { data: tokens, error: tokensErr } = await supabase
      .from('push_tokens')
      .select('token, user_id, baby_id, platform, last_seen_at')
      .in('user_id', recipientIds);

    if (tokensErr) {
      console.error('tokens query error', tokensErr);
      return jsonResponse({ error: 'tokens_query_failed' }, 500);
    }

    if (!tokens || tokens.length === 0) {
      return jsonResponse({ sent: 0, reason: 'no_tokens' });
    }

    // 3. Prefs (quiet_hours) por user+baby — usa o pref vinculado ao mesmo babyId se existir
    const { data: prefs } = await supabase
      .from('notification_prefs')
      .select('*')
      .eq('baby_id', babyId)
      .in('user_id', recipientIds);

    const prefsMap = new Map<string, Record<string, unknown>>();
    for (const p of prefs ?? []) {
      const key = `${(p as { user_id: string }).user_id}_${(p as { baby_id: string }).baby_id}`;
      prefsMap.set(key, p as Record<string, unknown>);
    }

    // Quiet hours (BRT)
    const now = new Date();
    const BRT_OFFSET = -3;
    const brtHour = (now.getUTCHours() + BRT_OFFSET + 24) % 24;

    const message: PushMessage = { title, body, type, data };

    let sent = 0;
    const results: Array<{ userId: string; ok: boolean; reason?: string }> = [];

    for (const t of tokens) {
      const pref = prefsMap.get(`${t.user_id}_${babyId}`) as
        | { quiet_hours_enabled?: boolean; quiet_hours_start?: number; quiet_hours_end?: number }
        | undefined;

      if (pref?.quiet_hours_enabled) {
        const qStart = pref.quiet_hours_start ?? 22;
        const qEnd = pref.quiet_hours_end ?? 7;
        if (inQuietHours(brtHour, qStart, qEnd)) {
          results.push({ userId: t.user_id, ok: false, reason: 'quiet_hours' });
          continue;
        }
      }

      const ok = await sendFCMPush(t.token, message);
      if (ok) {
        sent++;
        await logPush(t.user_id, babyId, type, title, body);
      }
      results.push({ userId: t.user_id, ok });
    }

    return jsonResponse({ sent, total: tokens.length, results });
  } catch (error) {
    console.error('send-immediate-push error', error);
    return jsonResponse({ error: String(error) }, 500);
  }
});

function inQuietHours(hour: number, start: number, end: number): boolean {
  // Wraparound (22→7): horas dentro = hour >= start OR hour < end
  if (start > end) return hour >= start || hour < end;
  return hour >= start && hour < end;
}

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
            notification: { title: message.title, body: message.body },
            data: { type: message.type, ...(message.data ?? {}) },
            android: { priority: 'HIGH', notification: { sound: 'default' } },
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
    if (err.includes('UNREGISTERED') || err.includes('INVALID_ARGUMENT')) {
      await supabase.from('push_tokens').delete().eq('token', token);
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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
