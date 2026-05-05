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
    // Most recent log of any type per baby (for no-record-5h and reactivation checks)
    const lastLogByBaby = new Map<string, number>();
    for (const log of allLogs ?? []) {
      const cat = eventToCategory(log.event_id);
      if (cat) {
        const key = `${log.baby_id}_${cat}`;
        if (!latestByBabyCategory.has(key)) {
          latestByBabyCategory.set(key, log.timestamp);
        }
      }
      if (!lastLogByBaby.has(log.baby_id)) {
        lastLogByBaby.set(log.baby_id, log.timestamp);
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

    // 5. Get push_log from last 24h to deduplicate — routine alerts fire at most
    // once per interval cycle (i.e., not again until user makes a new log entry).
    const { data: recentPushes } = await supabase
      .from('push_log')
      .select('user_id, baby_id, type, sent_at')
      .gte('sent_at', new Date(nowTs - 24 * 3600_000).toISOString());

    // Map of lastSentAt per (userId_babyId_type) for cycle-aware dedup
    const lastSentAtMap = new Map<string, number>();
    for (const p of recentPushes ?? []) {
      const key = `${p.user_id}_${p.baby_id}_${p.type}`;
      const ts = new Date(p.sent_at).getTime();
      if (!lastSentAtMap.has(key) || lastSentAtMap.get(key)! < ts) {
        lastSentAtMap.set(key, ts);
      }
    }
    // For non-routine types (bath, etc.) keep a simple set for fast dedup
    const recentPushSet = new Set<string>(lastSentAtMap.keys());

    // 6. Get babies info for names, birth_date, created_at and quiet hours (per-baby source of truth)
    const { data: babies } = await supabase
      .from('babies')
      .select('id, name, birth_date, created_at, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
      .in('id', babyIds);

    const babyNames = new Map<string, string>();
    const babyBirthDates = new Map<string, string>();
    const babyCreatedAt = new Map<string, string>();
    const babyQuietHours = new Map<string, { enabled: boolean; start: number; end: number }>();
    for (const b of babies ?? []) {
      babyNames.set(b.id, b.name);
      if (b.birth_date) babyBirthDates.set(b.id, b.birth_date);
      if (b.created_at) babyCreatedAt.set(b.id, b.created_at);
      babyQuietHours.set(b.id, {
        enabled: b.quiet_hours_enabled ?? false,
        start: b.quiet_hours_start ?? 22,
        end: b.quiet_hours_end ?? 7,
      });
    }

    // Enrich prefsMap com quiet hours per-baby (sobrescreve campos per-user de notification_prefs)
    for (const [key, p] of prefsMap.entries()) {
      const bq = babyQuietHours.get(p.baby_id);
      if (bq) {
        prefsMap.set(key, {
          ...p,
          quiet_enabled: bq.enabled,
          quiet_start: bq.start,
          quiet_end: bq.end,
        });
      }
    }

    // 7. Process each baby and generate push messages
    let totalSent = 0;
    const pushPromises: Promise<void>[] = [];

    for (const [babyId, targets] of babyTokens) {
      const babyName = babyNames.get(babyId) ?? 'Bebê';

      // Compute baby age in months for age-conditional push copy
      const birthDate = babyBirthDates.get(babyId);
      const babyAgeMonths = birthDate
        ? (nowTs - new Date(birthDate).getTime()) / (30.4375 * 86400000)
        : 0;

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
        // sleep_nap expired fires at 120% of configured interval
        const expiredMs = cat === 'sleep_nap' ? intervalMs * 1.2 : intervalMs;

        // Disabled push types — skip entirely
        const disabledTypes = new Set(['feed_expired', 'diaper_warn', 'sleep_awake_expired', 'sleep_nap_warn']);

        // Check if interval expired or warning
        let pushType: string | null = null;
        let message: PushMessage | null = null;

        if (elapsed >= expiredMs) {
          pushType = `${cat}_expired`;
          if (!disabledTypes.has(pushType)) {
            message = getExpiredMessage(cat, interval.minutes, babyName, babyAgeMonths);
          }
        } else if (elapsed >= warnMs && elapsed < expiredMs) {
          pushType = `${cat}_warn`;
          if (!disabledTypes.has(pushType)) {
            message = getWarnMessage(cat, interval.minutes, babyName, babyAgeMonths);
          }
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

          // Cycle-aware dedup: only fire once per interval cycle.
          // If this push was already sent AFTER the last log of this category, skip.
          const dupeKey = `${target.userId}_${babyId}_${pushType}`;
          const lastSent = lastSentAtMap.get(dupeKey);
          if (lastSent && lastSent >= lastLogTs) continue;

          // Send!
          lastSentAtMap.set(dupeKey, nowTs); // optimistic dedup
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
          // Alert 30 min before
          const alertMinute = h * 60 - 30;
          const currentMinute = userHour * 60 + userMinute;

          if (Math.abs(currentMinute - alertMinute) <= 3) { // within 3 min window
            const message: PushMessage = {
              title: `Hora do banho! 🛁`,
              body: `Daqui a 30 minutos é hora do banho do ${babyName} 🛁`,
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

    // ─── 1.3 SLEEP INSIGHT — desativado por ora ──────────────────────────────
    if (false) {
    // Fires during the 21h BRT window. Checks if each baby's total sleep today
    // is below 80% of the minimum reference for their age band. Dedup: once
    // per baby per calendar day (BRT) using type = sleep_insight_YYYY-MM-DD.
    if (brtHour === 21) {
      const brtDateStr = new Date(now.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
      const dedupType = `sleep_insight_${brtDateStr}`;

      // BRT midnight = UTC 03:00 on the same BRT calendar date.
      const brtMidnightUTC = new Date(brtDateStr + 'T03:00:00.000Z');
      const brtMidnightMs = brtMidnightUTC.getTime();

      // Check which (user, baby) pairs already got this push today.
      const { data: todayInsights } = await supabase
        .from('push_log')
        .select('user_id, baby_id')
        .eq('type', dedupType)
        .gte('sent_at', brtMidnightUTC.toISOString());
      const insightSentToday = new Set(
        (todayInsights ?? []).map((r: { user_id: string; baby_id: string }) => `${r.user_id}_${r.baby_id}`),
      );

      // Fetch today's sleep/wake logs for all babies.
      const { data: todaySleepLogs } = await supabase
        .from('logs')
        .select('baby_id, event_id, timestamp')
        .in('baby_id', babyIds)
        .in('event_id', ['sleep_start', 'sleep', 'sleep_end', 'wake'])
        .gte('timestamp', brtMidnightMs)
        .order('timestamp', { ascending: true });

      for (const [babyId, targets] of babyTokens) {
        const birthDate = babyBirthDates.get(babyId);
        if (!birthDate) continue;

        const ageMonths = (nowTs - new Date(birthDate).getTime()) / (30.4375 * 86400000);
        const minSleepMin = getSleepMinMinutes(ageMonths);
        if (!minSleepMin) continue; // no reference for this age (>30m)

        const sleepLogs = (todaySleepLogs ?? []).filter(
          (l: { baby_id: string; event_id: string; timestamp: number }) => l.baby_id === babyId,
        );
        const totalSleepMin = computeTotalSleepMinutes(sleepLogs, nowTs);

        // Only push if below 80% of minimum reference.
        if (totalSleepMin >= minSleepMin * 0.8) continue;

        const babyName = babyNames.get(babyId) ?? 'Bebê';
        const sleepH = Math.floor(totalSleepMin / 60);
        const sleepM = totalSleepMin % 60;
        const sleepStr = sleepH > 0
          ? `${sleepH}h${sleepM > 0 ? sleepM + 'min' : ''}`
          : `${sleepM}min`;
        const message: PushMessage = {
          title: `Sono de ${babyName} hoje 😴`,
          body: totalSleepMin === 0
            ? `Nenhum registro de sono de ${babyName} hoje ainda.`
            : `${babyName} dormiu ${sleepStr} hoje, menos do que o esperado para a idade.`,
          type: 'sleep_insight',
        };

        for (const target of targets) {
          if (insightSentToday.has(`${target.userId}_${babyId}`)) continue;

          const prefs = prefsMap.get(`${target.userId}_${babyId}`);
          if (prefs && !prefs.enabled) continue;
          if (prefs && !isCategoryEnabled(prefs, 'sleep_nap')) continue;
          if (prefs && isInQuietHours(prefs, now)) continue;

          insightSentToday.add(`${target.userId}_${babyId}`); // optimistic dedup
          pushPromises.push(
            sendFCMPush(target.token, message).then(async (success) => {
              if (success) {
                totalSent++;
                await logPush(target.userId, babyId, dedupType, message.title, message.body);
              }
            }),
          );
        }
      }
    }
    } // end if (false) — sleep_insight disabled
    // ─── 2.5 PHASE TRANSITION 6 MONTHS (once per baby, lifetime dedup) ───────
    // Fires every run but sends at most once per baby (dedup type = phase_6m_{babyId}).
    // Checks if today (BRT) matches the baby's exact 6-month birthday.
    {
      const brtDateStr = new Date(now.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);

      for (const [babyId, targets] of babyTokens) {
        const birthDate = babyBirthDates.get(babyId);
        if (!birthDate) continue;

        // Calculate exact 6-month date (setMonth handles month-length edge cases)
        const d = new Date(birthDate);
        d.setMonth(d.getMonth() + 6);
        const sixMonthDateStr = d.toISOString().slice(0, 10);
        if (brtDateStr !== sixMonthDateStr) continue;

        // Lifetime dedup: only ever send once per baby
        const dedupType = `phase_6m_${babyId}`;
        const { data: existingLog } = await supabase
          .from('push_log')
          .select('id')
          .eq('baby_id', babyId)
          .eq('type', dedupType)
          .limit(1);
        if (existingLog && existingLog.length > 0) continue;

        const babyName = babyNames.get(babyId) ?? 'Bebê';
        const message: PushMessage = {
          title: `${babyName} completa 6 meses hoje! 🎉`,
          body: `Uma fase incrível começa: introdução alimentar, mais autonomia e muita descoberta. Registre cada momento!`,
          type: 'phase_transition',
        };

        for (const target of targets) {
          const prefs = prefsMap.get(`${target.userId}_${babyId}`);
          if (prefs && !prefs.enabled) continue;
          if (prefs && isInQuietHours(prefs, now)) continue;

          pushPromises.push(
            sendFCMPush(target.token, message).then(async (success) => {
              if (success) {
                totalSent++;
                await logPush(target.userId, babyId, dedupType, message.title, message.body);
              }
            }),
          );
          break; // Send only to first token per user (avoid duplicates across devices)
        }
      }
    }
    // ─── P2 — Sem registro há 5h (apenas horário diurno) ─────────────────────
    // Dispara quando nenhum registro foi criado nos últimos 5h consecutivos
    // dentro do horário diurno (entre quiet_end e quiet_start).
    // Máximo 1x por dia por bebê.
    for (const [babyId, targets] of babyTokens) {
      const bq = babyQuietHours.get(babyId) ?? { enabled: true, start: 22, end: 7 };

      // isDaytime: entre quiet_end (manhã) e quiet_start (noite)
      const isDaytime = bq.end <= bq.start
        ? (brtHour >= bq.end && brtHour < bq.start)
        : (brtHour >= bq.end || brtHour < bq.start);
      if (!isDaytime) continue;

      const lastLogTs = lastLogByBaby.get(babyId);
      if (!lastLogTs) continue; // nunca teve log — não enviar para usuários sem histórico

      const hoursSinceLastLog = (nowTs - lastLogTs) / 3_600_000;
      if (hoursSinceLastLog < 5) continue;

      // Dedup: máximo 1x por dia diurno
      const brtDateStr = new Date(nowTs - 3 * 3600 * 1000).toISOString().slice(0, 10);
      const quietEndUTC = (bq.end + 3) % 24;
      const dayStart = new Date(`${brtDateStr}T${String(quietEndUTC).padStart(2, '0')}:00:00.000Z`);

      const { count: sentToday } = await supabase
        .from('push_log')
        .select('id', { count: 'exact', head: true })
        .eq('baby_id', babyId)
        .eq('type', 'no_record_5h')
        .gte('sent_at', dayStart.toISOString());

      if ((sentToday ?? 0) > 0) continue;

      const h = Math.floor(hoursSinceLastLog);
      const timeStr = `${h}h`;
      const babyName = babyNames.get(babyId) ?? 'Bebê';
      const msg: PushMessage = {
        title: `Cadê vocês? Estou sentindo falta do ${babyName}.`,
        body: `Faz ${timeStr} desde o último registro do ${babyName}. Aconteceu algo diferente hoje?`,
        type: 'no_record_5h',
        data: { category: 'no_record' },
      };

      for (const target of targets) {
        const prefs = prefsMap.get(`${target.userId}_${babyId}`);
        if (prefs && !prefs.enabled) continue;
        if (prefs && isInQuietHours(prefs, now)) continue;

        pushPromises.push(
          sendFCMPush(target.token, msg).then(async (ok) => {
            if (ok) {
              totalSent++;
              await logPush(target.userId, babyId, 'no_record_5h', msg.title, msg.body);
            }
          }),
        );
      }
    }

    // ─── Reativação: D0+2h e D1 ───────────────────────────────────────────────
    // Dispara uma única vez para usuários que se cadastraram mas ainda não
    // fizeram nenhum registro. D0+2h: ~2h após criar o bebê. D1: ~20h após.
    {
      const D0_MIN = 110 * 60_000;  // 1h50m
      const D0_MAX = 130 * 60_000;  // 2h10m
      const D1_MIN = 1190 * 60_000; // 19h50m
      const D1_MAX = 1210 * 60_000; // 20h10m

      for (const [babyId, targets] of babyTokens) {
        const createdAt = babyCreatedAt.get(babyId);
        if (!createdAt) continue;

        const ageMs = nowTs - new Date(createdAt).getTime();

        let reactType: string | null = null;
        let reactMsg: PushMessage | null = null;
        const babyName = babyNames.get(babyId) ?? 'Bebê';

        if (ageMs >= D0_MIN && ageMs <= D0_MAX) {
          reactType = 'reactivation_d0';
          reactMsg = {
            title: 'Oi!',
            body: `O ${babyName} está te esperando no app. Vai levar uns 10 segundos pro primeiro registro.`,
            type: 'reactivation',
          };
        } else if (ageMs >= D1_MIN && ageMs <= D1_MAX) {
          reactType = 'reactivation_d1';
          reactMsg = {
            title: `Como está sendo a rotina do ${babyName}?`,
            body: 'O Yaya está aqui quando você precisar.',
            type: 'reactivation',
          };
        }

        if (!reactType || !reactMsg) continue;

        // Só envia se o usuário não tem nenhum registro (objetivo: primeiro uso)
        if (lastLogByBaby.has(babyId)) continue;

        // Dedup lifetime: não reenviar para este bebê
        const { count: existingCount } = await supabase
          .from('push_log')
          .select('id', { count: 'exact', head: true })
          .eq('baby_id', babyId)
          .eq('type', reactType);

        if ((existingCount ?? 0) > 0) continue;

        for (const target of targets) {
          const prefs = prefsMap.get(`${target.userId}_${babyId}`);
          if (prefs && !prefs.enabled) continue;
          if (prefs && isInQuietHours(prefs, now)) continue;

          const msgCopy = reactMsg!;
          const typeCopy = reactType!;
          pushPromises.push(
            sendFCMPush(target.token, msgCopy).then(async (ok) => {
              if (ok) {
                totalSent++;
                await logPush(target.userId, babyId, typeCopy, msgCopy.title, msgCopy.body);
              }
            }),
          );
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

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

function getWarnMessage(cat: string, minutes: number, babyName: string, babyAgeMonths = 0): PushMessage {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const timeStr = h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;

  switch (cat) {
    case 'feed': {
      const isSolid = babyAgeMonths >= 6;
      return {
        title: isSolid ? 'Hora do lanche!' : 'Hora do tetê!',
        body: `Acho que o ${babyName} vai querer ${isSolid ? 'comer' : 'tetê'} em breve. Faz ${timeStr} desde a última vez.`,
        type: 'routine_alert',
        data: { category: 'feed' },
      };
    }
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
        title: 'zzZzzZzzZzz...',
        body: `O ${babyName} pode começar a ficar com sono nos próximos minutos.`,
        type: 'routine_alert',
        data: { category: 'sleep' },
      };
    default:
      return { title: 'Yaya Baby', body: 'Verifique os registros', type: 'routine_alert' };
  }
}

function getExpiredMessage(cat: string, minutes: number, babyName: string, babyAgeMonths = 0): PushMessage {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const timeStr = h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;

  switch (cat) {
    case 'feed': {
      const isSolid = babyAgeMonths >= 6;
      return {
        title: isSolid ? 'Hora do lanche!' : 'Hora do tetê!',
        body: `Acho que o ${babyName} vai querer ${isSolid ? 'comer' : 'tetê'} em breve. Faz ${timeStr} desde a última vez.`,
        type: 'routine_alert',
        data: { category: 'feed' },
      };
    }
    case 'diaper':
      return {
        title: `Hora de trocar a fralda! 💧`,
        body: `Última troca de ${babyName} foi há ${timeStr}`,
        type: 'routine_alert',
        data: { category: 'diaper' },
      };
    case 'sleep_nap':
      return {
        title: 'Que soneca boa!',
        body: `Passando pra avisar que o ${babyName} está dormindo há um tempo. Talvez seja hora de acordar.`,
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

// ─── SLEEP INSIGHT HELPERS ──────────────────────────────────────────────────

/**
 * Minimum sleep minutes per day by age band (WHO/NSF reference).
 * Returns null if age is outside the 0–30m range we cover.
 */
function getSleepMinMinutes(ageMonths: number): number | null {
  if (ageMonths < 0 || ageMonths > 30) return null;
  if (ageMonths < 3)  return 840;  // 14h min (0–3m)
  if (ageMonths < 6)  return 720;  // 12h min (3–6m)
  if (ageMonths < 9)  return 720;  // 12h min (6–9m)
  if (ageMonths < 12) return 660;  // 11h min (9–12m)
  return 660;                       // 11h min (12–30m)
}

/**
 * Computes total sleep in minutes from an ordered list of sleep/wake events.
 * Pairs sleep_start/sleep → sleep_end/wake. Truncates open sessions at nowTs.
 */
function computeTotalSleepMinutes(
  logs: Array<{ event_id: string; timestamp: number }>,
  nowTs: number,
): number {
  const SLEEP_STARTS = new Set(['sleep_start', 'sleep']);
  const SLEEP_ENDS   = new Set(['sleep_end', 'wake']);

  let totalMs = 0;
  let sleepStart: number | null = null;

  for (const log of logs) {
    if (SLEEP_STARTS.has(log.event_id)) {
      if (sleepStart === null) sleepStart = log.timestamp;
    } else if (SLEEP_ENDS.has(log.event_id) && sleepStart !== null) {
      totalMs += log.timestamp - sleepStart;
      sleepStart = null;
    }
  }
  // If baby is still sleeping, count up to now
  if (sleepStart !== null) {
    totalMs += nowTs - sleepStart;
  }

  return Math.round(totalMs / 60_000);
}
