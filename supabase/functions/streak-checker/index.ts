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
const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayStart = new Date(todayStr + 'T00:00:00.000Z').getTime();

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

    // 3. Get notification prefs
    const { data: allPrefs } = await supabase
      .from('notification_prefs')
      .select('user_id, baby_id, enabled, streak_alerts')
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

    // 5. Get baby names
    const { data: babies } = await supabase
      .from('babies')
      .select('id, name')
      .in('id', babyIds);

    const babyNames = new Map<string, string>();
    for (const b of babies ?? []) {
      babyNames.set(b.id, b.name);
    }

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

      // Check duplicate
      if (sentToday.has(`${token.user_id}_${token.baby_id}`)) continue;

      const streakDays = streakMap.get(token.baby_id) ?? 0;
      const babyName = babyNames.get(token.baby_id) ?? 'Bebê';

      const message = {
        title: `Seu streak de ${streakDays} dias está em risco! 🔥`,
        body: `Registre algo de ${babyName} hoje para não perder sua sequência`,
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

async function sendFCMPush(token: string, message: { title: string; body: string; type: string }): Promise<boolean> {
  try {
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: message.title,
          body: message.body,
          sound: 'default',
        },
        data: { type: message.type },
        priority: 'high',
      }),
    });

    const result = await res.json();
    return result.success === 1;
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
