import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Admin Delete User — Edge Function
 *
 * Permite que um admin (profiles.is_admin=true) remova permanentemente outro
 * usuário. É diferente de `delete-account` (self-delete chamado pelo próprio
 * usuário) — este valida o caller como admin e apaga um TARGET.
 *
 * Body: { user_id: string }
 *
 * Fluxo:
 *  1. Valida JWT + caller é admin + target != caller
 *  2. Pra cada baby do target:
 *     - se é o único membro → deleta o baby (cascade limpa logs etc)
 *     - se é compartilhado → NULL as atribuições do target (logs.created_by,
 *       baby_milestones.recorded_by, etc) pra preservar conteúdo dos outros
 *       sem quebrar FKs
 *  3. NULL referências globais fora do escopo de baby (admin_broadcasts,
 *     feature_flags, invite_codes, profiles.courtesy_granted_by)
 *  4. DELETE courtesy_log (user_id / granted_by — FK NO ACTION)
 *  5. auth.admin.deleteUser → cascade limpa profiles, baby_members,
 *     push_tokens, push_log, notification_prefs, shared_reports etc.
 *
 * Retorna { ok: true, removed_babies: N, nullified_rows: N } em sucesso.
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
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    // ── 1. Autenticar caller e validar admin ────────────────────────────
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
    const callerId = userData.user.id

    const { data: callerProfile } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', callerId)
      .single()
    if (!callerProfile?.is_admin) {
      return json({ error: 'Not an admin' }, 403)
    }

    // ── 2. Parse body ───────────────────────────────────────────────────
    let body: any
    try {
      body = await req.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }
    const targetId = body?.user_id
    if (typeof targetId !== 'string' || targetId.length < 10) {
      return json({ error: 'Missing or invalid user_id' }, 400)
    }
    if (targetId === callerId) {
      return json(
        {
          error:
            'Admin não pode se auto-excluir por aqui. Use a função de conta (delete-account) ou outro admin.',
        },
        400,
      )
    }

    // ── 3. Descobrir babies do target ──────────────────────────────────
    const { data: memberships } = await admin
      .from('baby_members')
      .select('baby_id')
      .eq('user_id', targetId)
    const babyIds: string[] = (memberships ?? []).map(
      (m: { baby_id: string }) => m.baby_id,
    )

    const orphanBabies: string[] = []
    const sharedBabies: string[] = []

    for (const babyId of babyIds) {
      const { count } = await admin
        .from('baby_members')
        .select('*', { count: 'exact', head: true })
        .eq('baby_id', babyId)
        .neq('user_id', targetId)
      if ((count ?? 0) === 0) orphanBabies.push(babyId)
      else sharedBabies.push(babyId)
    }

    // ── 4. Apagar babies órfãos (cascade limpa logs/marcos/vacinas/meds) ─
    let removedBabies = 0
    for (const babyId of orphanBabies) {
      // storage best-effort
      try {
        await admin.storage.from('baby-photos').remove([
          `${babyId}/photo.jpg`,
          `${babyId}/photo.png`,
          `${babyId}/photo.jpeg`,
        ])
      } catch (e) {
        console.warn('storage remove failed', babyId, e)
      }
      const { error: delErr } = await admin.from('babies').delete().eq('id', babyId)
      if (delErr) {
        console.warn('baby delete failed', babyId, delErr.message)
      } else {
        removedBabies++
      }
    }

    // ── 5. Nulificar atribuições do target em babies compartilhados ─────
    // Preserva o conteúdo pros outros membros mas libera a FK pra o auth delete.
    let nullified = 0
    async function nullScoped(table: string, column: string) {
      if (sharedBabies.length === 0) return
      const { error, count } = await admin
        .from(table)
        .update({ [column]: null }, { count: 'exact' })
        .eq(column, targetId)
        .in('baby_id', sharedBabies)
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

    // ── 6. Nulificar refs globais (sem escopo de baby) ──────────────────
    async function nullGlobal(table: string, column: string) {
      const { error, count } = await admin
        .from(table)
        .update({ [column]: null }, { count: 'exact' })
        .eq(column, targetId)
      if (error) console.warn(`null ${table}.${column} failed`, error.message)
      else if (count) nullified += count
    }
    await nullGlobal('admin_broadcasts', 'sent_by')
    await nullGlobal('feature_flags', 'updated_by')
    await nullGlobal('invite_codes', 'created_by')
    await nullGlobal('invite_codes', 'used_by')
    await nullGlobal('profiles', 'courtesy_granted_by')

    // ── 7. Deletar rows de courtesy_log (FK NO ACTION, não cascata) ────
    await admin.from('courtesy_log').delete().or(`user_id.eq.${targetId},granted_by.eq.${targetId}`)

    // ── 8. Finalmente: auth.admin.deleteUser (cascade limpa o resto) ────
    const { error: delUserErr } = await admin.auth.admin.deleteUser(targetId)
    if (delUserErr) {
      console.error('auth.admin.deleteUser failed', delUserErr)
      return json(
        {
          error: delUserErr.message,
          hint:
            'Provavelmente resta alguma FK NO ACTION não tratada. Verifique logs do Supabase.',
        },
        500,
      )
    }

    return json(
      {
        ok: true,
        removed_babies: removedBabies,
        shared_babies: sharedBabies.length,
        nullified_rows: nullified,
      },
      200,
    )
  } catch (e) {
    console.error('admin-delete-user unexpected error', e)
    return json({ error: (e as Error).message ?? 'unknown' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}
