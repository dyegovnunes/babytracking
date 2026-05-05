/**
 * push-debug — Edge Function de diagnóstico
 *
 * Recebe eventos do device durante o fluxo de push registration e
 * grava na tabela `push_debug_log`. Permite diagnosticar problemas
 * de iOS sem precisar de Mac/Safari Web Inspector.
 *
 * Body: { user_id?: string, platform: string, step: string, data?: any }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const { user_id, platform, step, data } = await req.json()
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    await admin.from('push_debug_log').insert({
      user_id: user_id ?? null,
      platform: platform ?? 'unknown',
      step,
      data: data ?? null,
    })
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
