import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Delete Account Pediatrician — Edge Function (portal pediatra)
 *
 * Chamado quando o pediatra pede pra remover a conta dele do portal
 * pediatra.yayababy.app.
 *
 * Comportamento condicional:
 *
 *  CASO A — usuário é APENAS pediatra (não tem baby_members):
 *    Full delete: chama auth.admin.deleteUser. Cascata via FK
 *    pediatricians.user_id (CASCADE) limpa o registro de pediatra
 *    e pediatrician_patients (também CASCADE). Mais profiles, etc.
 *
 *  CASO B — usuário também é pai/cuidador (tem baby_members):
 *    Pediatrician-only delete: DELETE FROM pediatricians WHERE user_id
 *    = me. Cascata limpa pediatrician_patients automaticamente. NÃO
 *    chama auth.admin.deleteUser e NÃO toca em baby_members ou
 *    profiles. O usuário continua podendo logar no app de pais com a
 *    mesma conta — só perdeu o papel de pediatra.
 *
 * Validação: verify_jwt=false no gateway, mas o JWT é decodificado e
 * validado dentro da função (mesma estratégia do admin-delete-user).
 * O usuário só pode deletar a própria conta — sub do JWT é o target.
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
    return JSON.parse(atob(b64))
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
    if (!payload) return json({ error: 'JWT malformado' }, 401)
    const userId = payload.sub
    const role = payload.role
    const exp = payload.exp
    const nowSec = Math.floor(Date.now() / 1000)
    if (typeof exp === 'number' && exp < nowSec) {
      return json({ error: 'Token expirado', hint: 'Faça login de novo.' }, 401)
    }
    if (!userId || typeof userId !== 'string') {
      return json({ error: 'JWT sem sub claim' }, 401)
    }
    if (role !== 'authenticated') {
      return json({ error: `Role inesperado: ${role}` }, 401)
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // Confirma que o usuário tem mesmo um registro de pediatra
    const { data: pedRow } = await admin
      .from('pediatricians')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!pedRow) {
      return json({
        error: 'Usuário não é pediatra cadastrado.',
        hint: 'Use a função delete-account no app de pais.',
      }, 400)
    }

    // ── Detecta papel duplo ────────────────────────────────────────────
    const { count: babyMembersCount } = await admin
      .from('baby_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    const isAlsoParent = (babyMembersCount ?? 0) > 0

    // ═══════════════════════════════════════════════════════════════════
    // CASO B: pediatra-only — só apaga o registro de pediatra
    // ═══════════════════════════════════════════════════════════════════
    if (isAlsoParent) {
      // pediatrician_patients cascata via FK pediatrician_id → CASCADE
      const { error: delPedErr } = await admin
        .from('pediatricians')
        .delete()
        .eq('user_id', userId)
      if (delPedErr) {
        console.error('[delete-account-pediatrician] delete pediatricians failed', delPedErr)
        return json({ error: delPedErr.message }, 500)
      }
      console.log('[delete-account-pediatrician] pediatrician_only', { userId })
      return json({
        ok: true,
        action: 'pediatrician_only',
        kept_parent: true,
      }, 200)
    }

    // ═══════════════════════════════════════════════════════════════════
    // CASO A: full delete — não tem outros papéis, apaga auth.users
    // ═══════════════════════════════════════════════════════════════════
    // O auth.admin.deleteUser cascateia:
    //  - pediatricians (FK user_id → CASCADE)
    //  - pediatrician_patients (cascade via pediatricians.id)
    //  - profiles, push_tokens, notification_prefs etc. (CASCADE)
    //
    // Refs globais que não cascateiam (admin_broadcasts.sent_by etc.)
    // precisam ser nullificadas antes pra não bloquear.
    async function nullGlobal(table: string, column: string) {
      await admin
        .from(table)
        .update({ [column]: null })
        .eq(column, userId)
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
      console.error('[delete-account-pediatrician] auth.admin.deleteUser failed', delUserErr)
      return json({ error: delUserErr.message }, 500)
    }

    console.log('[delete-account-pediatrician] full', { userId })
    return json({ ok: true, action: 'full' }, 200)
  } catch (e) {
    console.error('[delete-account-pediatrician] unexpected', e)
    return json({ error: (e as Error).message ?? 'unknown' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
