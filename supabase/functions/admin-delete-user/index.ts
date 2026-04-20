import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Admin Delete User — Edge Function v2
 *
 * Permite que um admin (profiles.is_admin=true) remova permanentemente outro
 * usuário. Body: { user_id: string }
 *
 * v2: JWT é DECODIFICADO manualmente pra extrair o sub — `admin.auth.getUser(jwt)`
 * com client service-role apresentou 401 intermitente em prod. A validação de
 * assinatura já aconteceu no gateway do Supabase (verify_jwt: true), então
 * decodar o payload só pra pegar sub+role é seguro. Depois consultamos
 * profiles.is_admin via service role (bypassa RLS).
 *
 * Fluxo:
 *  1. Decode JWT → callerId + role (tem que ser 'authenticated')
 *  2. Query profiles.is_admin pra validar
 *  3. Pra cada baby do target: órfão → delete (cascade), compartilhado → NULL
 *  4. NULL refs globais (admin_broadcasts, feature_flags, invite_codes,
 *     profiles.courtesy_granted_by)
 *  5. DELETE courtesy_log
 *  6. auth.admin.deleteUser → cascade limpa o resto
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function decodeJwtPayload(jwt: string): Record<string, any> | null {
  try {
    const parts = jwt.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/') +
      '=='.slice((payload.length + 2) % 4)
    const json = atob(b64)
    return JSON.parse(json)
  } catch (e) {
    console.warn('decodeJwtPayload failed', e)
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Missing bearer token' }, 401)
    }
    const jwt = authHeader.slice('Bearer '.length)

    const payload = decodeJwtPayload(jwt)
    const callerId = payload?.sub
    const role = payload?.role
    if (!callerId || typeof callerId !== 'string') {
      console.warn('JWT sem sub claim', { role, keys: Object.keys(payload ?? {}) })
      return json({ error: 'Invalid JWT — sem sub claim', role: role ?? null }, 401)
    }
    if (role !== 'authenticated') {
      console.warn('JWT role inesperado', { role, sub: callerId })
      return json(
        {
          error: `Role não autenticado: ${role}`,
          hint: 'Passe o access_token do usuário no header Authorization, não a anon key.',
        },
        401,
      )
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: callerProfile, error: profErr } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('id', callerId)
      .maybeSingle()
    if (profErr) {
      console.error('profile lookup failed', profErr)
      return json({ error: 'Falha ao validar admin', detail: profErr.message }, 500)
    }
    if (!callerProfile?.is_admin) {
      return json({ error: 'Not an admin' }, 403)
    }

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
      return json({ error: 'Admin não pode se auto-excluir por aqui.' }, 400)
    }

    // ── Descobrir babies do target ─────────────────────────────────────
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

    let removedBabies = 0
    for (const babyId of orphanBabies) {
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
      if (delErr) console.warn('baby delete failed', babyId, delErr.message)
      else removedBabies++
    }

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

    await admin
      .from('courtesy_log')
      .delete()
      .or(`user_id.eq.${targetId},granted_by.eq.${targetId}`)

    const { error: delUserErr } = await admin.auth.admin.deleteUser(targetId)
    if (delUserErr) {
      console.error('auth.admin.deleteUser failed', delUserErr)
      return json(
        {
          error: delUserErr.message,
          hint: 'Pode restar FK NO ACTION não tratada.',
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
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
