import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Delete Account — Edge Function (parent app)
 *
 * Obrigatório pela Apple App Review (Guideline 5.1.1(v), desde 2022).
 *
 * Comportamento condicional pra usuários com papel duplo:
 *
 *  CASO A — usuário é APENAS pai/cuidador (não tem registro em pediatricians):
 *    Full delete: apaga babies órfãs, libera babies compartilhadas e
 *    chama auth.admin.deleteUser. Cascata limpa profiles, baby_members
 *    e tudo mais. Comportamento histórico, sem mudança.
 *
 *  CASO B — usuário também é pediatra (tem registro em pediatricians):
 *    Parent-only delete: apaga babies órfãs, remove o usuário das
 *    babies compartilhadas, NULLifica suas atribuições nos registros
 *    daquelas babies. NÃO chama auth.admin.deleteUser e NÃO toca em
 *    pediatricians/pediatrician_patients. O usuário continua podendo
 *    logar no portal pediatra.yayababy.app com a mesma conta.
 *
 * Resposta inclui `action: 'parent_only' | 'full'` pra o frontend
 * mostrar a mensagem certa ("conta deletada" vs "papel de pai removido,
 * pediatra preservado").
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Missing bearer token' }, 401)
    }
    const jwt = authHeader.slice('Bearer '.length)

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return json({ error: 'Invalid token' }, 401)
    }
    const userId = userData.user.id

    // ── Detecta papel duplo ────────────────────────────────────────────
    const { data: pedRow } = await admin
      .from('pediatricians')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    const isAlsoPediatrician = !!pedRow

    // ── Inventário de babies do usuário ────────────────────────────────
    const { data: memberships } = await admin
      .from('baby_members')
      .select('baby_id')
      .eq('user_id', userId)
    const babyIds: string[] = (memberships ?? []).map(
      (m: { baby_id: string }) => m.baby_id,
    )

    const orphan: string[] = []
    const shared: string[] = []
    for (const babyId of babyIds) {
      const { count } = await admin
        .from('baby_members')
        .select('*', { count: 'exact', head: true })
        .eq('baby_id', babyId)
        .neq('user_id', userId)
      if ((count ?? 0) === 0) orphan.push(babyId)
      else shared.push(babyId)
    }

    // ── Apaga babies órfãs (cascata limpa logs/marcos/vacinas etc.) ───
    let removedBabies = 0
    for (const babyId of orphan) {
      try {
        await admin.storage.from('baby-photos').remove([
          `${babyId}/photo.jpg`,
          `${babyId}/photo.png`,
          `${babyId}/photo.jpeg`,
        ])
      } catch (e) {
        console.warn('storage remove failed', babyId, e)
      }
      const { error: delBabyErr } = await admin
        .from('babies')
        .delete()
        .eq('id', babyId)
      if (delBabyErr) {
        console.warn('baby delete failed', babyId, delBabyErr.message)
      } else {
        removedBabies++
      }
    }

    // ── Remove o usuário das babies compartilhadas ─────────────────────
    if (shared.length > 0) {
      await admin
        .from('baby_members')
        .delete()
        .eq('user_id', userId)
        .in('baby_id', shared)
    }

    // ── NULLifica atribuições do usuário em babies compartilhadas ─────
    // Necessário porque várias FKs são NO ACTION (logs.created_by etc)
    // e bloqueariam o auth.admin.deleteUser. No caso parent-only, é
    // bom higiênico também: remove o nome dele das atribuições.
    let nullified = 0
    async function nullScoped(table: string, column: string) {
      if (shared.length === 0) return
      const { error, count } = await admin
        .from(table)
        .update({ [column]: null }, { count: 'exact' })
        .eq(column, userId)
        .in('baby_id', shared)
      if (error) console.warn(`null ${table}.${column} failed`, error.message)
      else if (count) nullified += count
    }
    await nullScoped('logs', 'created_by')
    await nullScoped('medication_logs', 'administered_by')
    await nullScoped('baby_milestones', 'recorded_by')
    await nullScoped('baby_vaccines', 'recorded_by')
    await nullScoped('leap_notes', 'recorded_by')
    await nullScoped('leap_mood_entries', 'recorded_by')
    await nullScoped('measurements', 'measured_by')
    await nullScoped('medications', 'created_by')
    if (shared.length > 0) {
      const { count } = await admin
        .from('babies')
        .update({ created_by: null }, { count: 'exact' })
        .eq('created_by', userId)
        .in('id', shared)
      if (count) nullified += count
    }

    // ═══════════════════════════════════════════════════════════════════
    // CASO B: parent-only (também é pediatra) — para aqui
    // ═══════════════════════════════════════════════════════════════════
    if (isAlsoPediatrician) {
      console.log('[delete-account] parent_only', { userId, removedBabies, shared: shared.length, nullified })
      return json({
        ok: true,
        action: 'parent_only',
        kept_pediatrician: true,
        removed_babies: removedBabies,
        shared_babies: shared.length,
        nullified_rows: nullified,
      }, 200)
    }

    // ═══════════════════════════════════════════════════════════════════
    // CASO A: full delete — auth.users + cascade
    // ═══════════════════════════════════════════════════════════════════
    // Refs globais que não cascateiam: precisa nullificar/deletar antes
    async function nullGlobal(table: string, column: string) {
      const { error, count } = await admin
        .from(table)
        .update({ [column]: null }, { count: 'exact' })
        .eq(column, userId)
      if (error) console.warn(`null ${table}.${column} failed`, error.message)
      else if (count) nullified += count
    }
    await nullGlobal('admin_broadcasts', 'sent_by')
    await nullGlobal('feature_flags', 'updated_by')
    await nullGlobal('invite_codes', 'created_by')
    await nullGlobal('invite_codes', 'used_by')
    await nullGlobal('profiles', 'courtesy_granted_by')
    await nullGlobal('profiles', 'referred_by')

    await admin
      .from('courtesy_log')
      .delete()
      .or(`user_id.eq.${userId},granted_by.eq.${userId}`)

    const { error: delUserErr } = await admin.auth.admin.deleteUser(userId)
    if (delUserErr) {
      console.error('[delete-account] auth.admin.deleteUser failed', delUserErr)
      return json({ error: delUserErr.message }, 500)
    }

    console.log('[delete-account] full', { userId, removedBabies, nullified })
    return json({
      ok: true,
      action: 'full',
      removed_babies: removedBabies,
      shared_babies: shared.length,
      nullified_rows: nullified,
    }, 200)
  } catch (e) {
    console.error('[delete-account] unexpected', e)
    return json({ error: (e as Error).message ?? 'unknown' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
