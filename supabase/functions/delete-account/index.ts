import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Delete Account — Edge Function
 *
 * Obrigatório pela Apple App Review (Guideline 5.1.1(v), desde 2022).
 * Chamada pelo client via `fetch(/functions/v1/delete-account)` com o
 * access_token do usuário no header Authorization.
 *
 * Fluxo:
 *   1. Valida o JWT do caller e extrai o user.id
 *   2. Descobre babies onde esse usuário é membro
 *   3. Para cada baby, remove o baby_member do caller
 *   4. Se o baby ficou órfão (nenhum member restante), apaga o baby
 *      (ON DELETE CASCADE limpa logs/milestones/vaccines/medications/...)
 *      e tenta remover as fotos em storage
 *   5. Apaga o auth.users.id — o resto das FKs com ON DELETE CASCADE
 *      nas tabelas profiles / invites / etc cai junto
 *
 * Storage: baby-photos/{baby_id}/photo.jpg|png|jpeg
 *
 * Não retorna 500 pra erros em limpeza de storage/members — apenas loga.
 * O que importa é `auth.admin.deleteUser` bater, o resto é best-effort.
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
    return new Response('Method not allowed', {
      status: 405,
      headers: corsHeaders,
    })
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

    // Valida o JWT e descobre quem é o caller
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return json({ error: 'Invalid token' }, 401)
    }
    const userId = userData.user.id

    // 1. Descobre babies onde ele é membro
    const { data: memberships } = await admin
      .from('baby_members')
      .select('baby_id')
      .eq('user_id', userId)

    const babyIds = (memberships ?? []).map((m: { baby_id: string }) => m.baby_id)

    // 2. Remove o caller de cada baby_members
    if (babyIds.length > 0) {
      await admin.from('baby_members').delete().eq('user_id', userId)
    }

    // 3. Para cada baby afetado, se ficou sem membros, apaga o baby
    //    (e tenta remover fotos em storage). ON DELETE CASCADE nas FKs
    //    de logs/milestones/medications/vaccines limpa o resto.
    for (const babyId of babyIds) {
      const { count } = await admin
        .from('baby_members')
        .select('*', { count: 'exact', head: true })
        .eq('baby_id', babyId)
      if ((count ?? 0) === 0) {
        // Storage best-effort (extensões possíveis)
        try {
          await admin.storage.from('baby-photos').remove([
            `${babyId}/photo.jpg`,
            `${babyId}/photo.png`,
            `${babyId}/photo.jpeg`,
          ])
        } catch (e) {
          console.warn('storage remove failed for', babyId, e)
        }
        const { error: delBabyErr } = await admin
          .from('babies')
          .delete()
          .eq('id', babyId)
        if (delBabyErr) {
          console.warn('baby delete failed', babyId, delBabyErr.message)
        }
      }
    }

    // 4. Apaga o auth.users (fim da linha — cascade limpa profiles, etc)
    const { error: delUserErr } = await admin.auth.admin.deleteUser(userId)
    if (delUserErr) {
      console.error('deleteUser failed', delUserErr)
      return json({ error: delUserErr.message }, 500)
    }

    return json({ ok: true }, 200)
  } catch (e) {
    console.error('delete-account unexpected error', e)
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
