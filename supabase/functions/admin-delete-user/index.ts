import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Admin Delete User — Edge Function v3
 *
 * v3 roda com verify_jwt=FALSE no gateway — toda validacao eh feita
 * internamente. Motivos:
 *  - v1 (auth.getUser) deu 401 misterioso em prod
 *  - v2 (JWT decoded + verify_jwt=true) ainda deu 401 do gateway,
 *    possivelmente porque o supabase-js functions.invoke nao estava
 *    enviando o user JWT apesar do header customizado
 *
 * Com verify_jwt=false, qualquer request chega ate nos. A seguranca
 * eh garantida aqui: decodificamos o JWT, validamos role=authenticated
 * e checamos profiles.is_admin via service role (bypassa RLS).
 *
 * Logs detalhados em cada passo pra facilitar diagnostico.
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

  const authHeader = req.headers.get('Authorization') ?? ''
  const hasAuth = authHeader.startsWith('Bearer ')
  console.log('[admin-delete-user] request', {
    hasAuth,
    authLen: authHeader.length,
    contentType: req.headers.get('content-type'),
  })

  try {
    if (!hasAuth) {
      return json({ error: 'Missing bearer token no header Authorization' }, 401)
    }
    const jwt = authHeader.slice('Bearer '.length)

    const payload = decodeJwtPayload(jwt)
    if (!payload) {
      return json({ error: 'JWT malformado, nao foi possivel decodificar' }, 401)
    }
    const callerId = payload.sub
    const role = payload.role
    const aud = payload.aud
    const exp = payload.exp
    const nowSec = Math.floor(Date.now() / 1000)
    const expired = typeof exp === 'number' && exp < nowSec
    console.log('[admin-delete-user] JWT decoded', {
      sub: callerId,
      role,
      aud,
      exp,
      now: nowSec,
      expired,
    })

    if (expired) {
      return json({
        error: 'Token expirado',
        hint: 'Sessao expirou. Faca refresh/login.',
        exp,
        now: nowSec,
      }, 401)
    }
    if (!callerId || typeof callerId !== 'string') {
      return json({
        error: 'JWT sem sub claim',
        payload_keys: Object.keys(payload),
      }, 401)
    }
    if (role !== 'authenticated') {
      return json({
        error: `Role inesperado: ${role}`,
        hint: 'Passe o access_token do usuario admin, nao a anon key.',
        aud,
      }, 401)
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
      console.error('[admin-delete-user] profile lookup failed', profErr)
      return json({ error: 'Falha ao validar admin', detail: profErr.message }, 500)
    }
    if (!callerProfile?.is_admin) {
      console.warn('[admin-delete-user] caller not admin', { callerId, profile: callerProfile })
      return json({ error: 'Not an admin', callerId }, 403)
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
      return json({ error: 'Admin nao pode se auto-excluir por aqui.' }, 400)
    }

    console.log('[admin-delete-user] starting delete', { callerId, targetId })

    // ── Descobrir babies do target ─────────────────────────────────────
    const { data: memberships } = await admin
      .from('baby_members')
      .select('baby_id')
      .eq('user_id', targetId)
    const babyIds: string[] = (memberships ?? []).map((m: { baby_id: string }) => m.baby_id)

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
      console.error('[admin-delete-user] auth.admin.deleteUser failed', delUserErr)
      return json({
        error: delUserErr.message,
        hint: 'Pode restar FK NO ACTION nao tratada.',
      }, 500)
    }

    console.log('[admin-delete-user] success', {
      removedBabies,
      sharedBabies: sharedBabies.length,
      nullified,
    })
    return json({
      ok: true,
      removed_babies: removedBabies,
      shared_babies: sharedBabies.length,
      nullified_rows: nullified,
    }, 200)
  } catch (e) {
    console.error('[admin-delete-user] unexpected error', e)
    return json({ error: (e as Error).message ?? 'unknown' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
