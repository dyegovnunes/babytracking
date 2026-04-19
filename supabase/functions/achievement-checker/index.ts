import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Achievement Checker — Edge Function
 *
 * Avalia os triggers da jornada-v1 e insere rows em `app_achievements`
 * quando um user destrava um marco.
 *
 * Duas formas de invocação:
 *   1. RPC imediato (via supabase.functions.invoke com body { user_id }):
 *      chamado pelo client logo após ação relevante (abrir tela de feature,
 *      primeiro log). Processa só aquele user. Rápido.
 *   2. Cron (pg_cron, 5min): body vazio ou { user_id: null }. Processa
 *      users ativos nas últimas 24h. Pega triggers temporais (first_week,
 *      thirty_days_streak, baby_one_month).
 *
 * Esta versão v1 cobre os triggers mais importantes:
 *   - `first_log` (baby scope)
 *   - `discovered_*` (user scope — 5 triggers)
 *
 * Triggers restantes (three_different_kinds, first_full_day, first_week,
 * ten_feeds, first_caregiver, baby_one_month, hundred_entries,
 * first_full_night, thirty_days_streak, first_shared_report) ficam pra
 * próximo deploy desta mesma função, não precisa de outra função.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Mapa feature_key → achievement_key pra descobertas
const DISCOVERY_MAP: Record<string, string> = {
  insights: 'discovered_insights',
  milestones: 'discovered_milestones',
  vaccines: 'discovered_vaccines',
  leaps: 'discovered_leaps',
  medications: 'discovered_medications',
}

/** Insere um achievement se ainda não existe pra aquele user+baby+key */
async function unlockIfNew(
  userId: string,
  achievementKey: string,
  babyId: string | null = null,
): Promise<boolean> {
  // Insert com ON CONFLICT DO NOTHING via upsert
  const { error } = await supabase
    .from('app_achievements')
    .insert({
      user_id: userId,
      baby_id: babyId,
      achievement_key: achievementKey,
    })

  if (error) {
    // Unique violation é esperado quando já existe — ignora
    if (error.code === '23505') return false
    console.error('[unlockIfNew] insert failed', { achievementKey, error })
    return false
  }
  return true
}

/**
 * Avalia um único user — versão enxuta que cobre discovery + first_log.
 * Se achievement key já existe, skip.
 */
async function checkUser(userId: string): Promise<{ unlocked: string[] }> {
  const unlocked: string[] = []

  // 1. Pega features que o user viu
  const { data: seenRows } = await supabase
    .from('user_feature_seen')
    .select('feature_key')
    .eq('user_id', userId)

  const featuresSeen = new Set((seenRows ?? []).map((r) => r.feature_key))

  // 2. Pega achievements já desbloqueados pra esse user
  const { data: existingRows } = await supabase
    .from('app_achievements')
    .select('achievement_key, baby_id')
    .eq('user_id', userId)

  const existing = new Set(
    (existingRows ?? []).map((r) => `${r.achievement_key}::${r.baby_id ?? ''}`),
  )

  // 3. Avalia cada achievement de descoberta
  for (const [featureKey, achievementKey] of Object.entries(DISCOVERY_MAP)) {
    if (!featuresSeen.has(featureKey)) continue
    if (existing.has(`${achievementKey}::`)) continue
    const ok = await unlockIfNew(userId, achievementKey, null)
    if (ok) unlocked.push(achievementKey)
  }

  // 4. Avalia `first_log` — precisa iterar pelos babies do user
  // (pode ter múltiplos). Só dispara 1 vez por bebê.
  const { data: memberRows } = await supabase
    .from('baby_members')
    .select('baby_id')
    .eq('user_id', userId)

  const babyIds = (memberRows ?? []).map((r) => r.baby_id as string)

  for (const babyId of babyIds) {
    if (existing.has(`first_log::${babyId}`)) continue

    // Tem pelo menos 1 log pra esse bebê?
    const { count } = await supabase
      .from('logs')
      .select('id', { count: 'exact', head: true })
      .eq('baby_id', babyId)
      .limit(1)

    if ((count ?? 0) >= 1) {
      const ok = await unlockIfNew(userId, 'first_log', babyId)
      if (ok) unlocked.push(`first_log::${babyId}`)
    }
  }

  return { unlocked }
}

serve(async (req) => {
  // CORS básico — a app chama via supabase.functions.invoke
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    let body: { user_id?: string } = {}
    try {
      body = await req.json()
    } catch {
      /* body vazio — modo cron */
    }

    let usersToCheck: string[] = []

    if (body.user_id) {
      // Modo RPC: só 1 user
      usersToCheck = [body.user_id]
    } else {
      // Modo cron: users ativos nas últimas 24h
      // Usa streaks.updated_at como proxy de atividade (última vez que o app
      // processou algo pro user). Alternativa seria auth.users.last_sign_in_at.
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: activeUsers } = await supabase
        .from('streaks')
        .select('baby_id')
        .gte('updated_at', cutoff)
      const activeBabyIds = (activeUsers ?? []).map((r) => r.baby_id)

      if (activeBabyIds.length > 0) {
        const { data: members } = await supabase
          .from('baby_members')
          .select('user_id')
          .in('baby_id', activeBabyIds)
        usersToCheck = Array.from(
          new Set((members ?? []).map((m) => m.user_id as string)),
        )
      }
    }

    const results: Record<string, string[]> = {}
    for (const uid of usersToCheck) {
      const { unlocked } = await checkUser(uid)
      if (unlocked.length > 0) results[uid] = unlocked
    }

    return new Response(
      JSON.stringify({ ok: true, checked: usersToCheck.length, results }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      },
    )
  } catch (err) {
    console.error('[achievement-checker] crashed', err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
