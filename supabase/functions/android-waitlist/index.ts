// ════════════════════════════════════════════════════════════════════════════
// android-waitlist
// ════════════════════════════════════════════════════════════════════════════
// Recebe email + telefone (opcional) de interessados em testar a versão Android.
// Insere na waitlist, cria/encontra user, concede 10 dias de cortesia Yaya+,
// gera magic link e envia por email via Resend.
//
// Body: { email: string, phone?: string }
// Response: { success: boolean, alreadySubscribed?: boolean }
//
// Variáveis de ambiente:
//   SUPABASE_URL              — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
//   RESEND_API_KEY            — re_...
//   RESEND_FROM_EMAIL         — ex: 'oi@yayababy.app'
//   APP_URL                   — ex: 'https://yayababy.app'
// ════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'oi@yayababy.app'
const APP_URL           = Deno.env.get('APP_URL') ?? 'https://yayababy.app'
const COURTESY_DAYS     = 10

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  let body: { email?: string; phone?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400)
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const phone = (body.phone ?? '').trim() || null

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'invalid_email' }, 400)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Insere na waitlist (idempotente via UNIQUE em email)
  const { error: waitlistErr } = await supabase
    .from('waitlist')
    .insert({ email, phone, source: 'android_waitlist' })

  let alreadySubscribed = false
  if (waitlistErr) {
    if ((waitlistErr as { code?: string }).code === '23505') {
      alreadySubscribed = true
      console.log(`[android-waitlist] ${email} already on waitlist — re-sending link`)
    } else {
      console.error('[android-waitlist] waitlist insert failed:', waitlistErr)
      return jsonResponse({ error: 'waitlist_failed' }, 500)
    }
  }

  // 2. Encontra ou cria user
  const userId = await findOrCreateUser(supabase, email)
  if (!userId) {
    return jsonResponse({ error: 'user_failed' }, 500)
  }

  // 3. Concede 10 dias de cortesia (GREATEST pra não conflitar com cortesia/premium existente)
  const { data: profile } = await supabase
    .from('profiles')
    .select('courtesy_expires_at')
    .eq('id', userId)
    .single()

  const now = new Date()
  const currentExpiry = profile?.courtesy_expires_at ? new Date(profile.courtesy_expires_at) : null
  const baseDate = currentExpiry && currentExpiry > now ? currentExpiry : now
  const newExpiry = new Date(baseDate.getTime() + COURTESY_DAYS * 24 * 60 * 60 * 1000)

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({
      is_premium: true,
      courtesy_expires_at: newExpiry.toISOString(),
      courtesy_reason: 'Tester Android',
    })
    .eq('id', userId)

  if (profileErr) {
    console.error('[android-waitlist] profile update failed:', profileErr)
  }

  // Log de cortesia (best-effort)
  await supabase.from('courtesy_log').insert({
    user_id: userId,
    granted_by: null,
    days: COURTESY_DAYS,
    reason: 'Tester Android',
    expires_at: newExpiry.toISOString(),
  })

  // 4. Gera magic link e envia email
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${APP_URL}/mobile` },
  })

  if (linkErr || !linkData?.properties?.action_link) {
    console.error('[android-waitlist] magic link failed:', linkErr)
    return jsonResponse({ error: 'link_failed' }, 500)
  }

  const magicLink = linkData.properties.action_link

  await sendEmail({
    to: email,
    subject: 'Seus 10 dias de Yaya+ chegaram 💜',
    html: welcomeEmailHTML({ magicLink }),
  })

  return jsonResponse({ success: true, alreadySubscribed })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function findOrCreateUser(supabase: ReturnType<typeof createClient>, email: string): Promise<string | null> {
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) return existing.id

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (error || !created.user) {
    console.error('[android-waitlist] failed to create user:', error)
    return null
  }
  return created.user.id
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.warn('[android-waitlist] RESEND_API_KEY missing — skipping email')
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: `Yaya <${RESEND_FROM_EMAIL}>`, to: [to], subject, html }),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error('[android-waitlist] Resend failed:', res.status, txt)
  } else {
    console.log(`[android-waitlist] email sent to ${to}`)
  }
}

function welcomeEmailHTML({ magicLink }: { magicLink: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a1f4d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(112,86,224,0.08);">
        <tr><td style="padding:40px 40px 24px;">
          <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7056e0;font-weight:700;">Yaya+ liberado</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#2a1f4d;font-weight:700;">Seus 10 dias de Yaya+ começaram 💜</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d70;">
            Obrigado por entrar na lista de espera Android! Enquanto o Google libera o app, você já pode testar tudo pelo navegador do seu celular com Yaya+ ativo.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a3d70;">
            Clique no botão abaixo pelo seu <strong>celular</strong> para entrar:
          </p>
          <p style="margin:0 0 24px;text-align:center;">
            <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#7056e0,#a98ef0);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px;">Acessar o Yaya</a>
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#8678a8;">
            O link funciona melhor pelo celular. Quando o app Android lançar, te avisamos por email!
          </p>
        </td></tr>
        <tr><td style="background:#f6f4fb;padding:20px 40px;border-top:1px solid #e8e3f0;">
          <p style="margin:0;font-size:12px;color:#8678a8;text-align:center;">
            Yaya — acompanhamento de bebê com inteligência<br>
            <a href="https://yayababy.app" style="color:#7056e0;text-decoration:none;">yayababy.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
