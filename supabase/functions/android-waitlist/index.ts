// ════════════════════════════════════════════════════════════════════════════
// android-waitlist
// ════════════════════════════════════════════════════════════════════════════
// Recebe email de interessados em testar o Yaya Android via Google Play.
// Insere na waitlist, cria/encontra user, concede 10 dias de cortesia Yaya+,
// notifica admin e confirma cadastro para o usuário.
//
// Body: { email: string }
// Response: { success: boolean, alreadySubscribed?: boolean }
//
// Variáveis de ambiente:
//   SUPABASE_URL              — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
//   RESEND_API_KEY            — re_...
//   RESEND_FROM_EMAIL         — ex: 'oi@yayababy.app'
// ════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'oi@yayababy.app'
const ADMIN_EMAIL       = 'dyego.vnunes@gmail.com'
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

  let body: { email?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid_body' }, 400)
  }

  const email = (body.email ?? '').trim().toLowerCase()

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
    .insert({ email, source: 'android_waitlist' })

  let alreadySubscribed = false
  if (waitlistErr) {
    if ((waitlistErr as { code?: string }).code === '23505') {
      alreadySubscribed = true
      console.log(`[android-waitlist] ${email} already on waitlist`)
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

  // 4. Notifica admin
  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[Yaya Android] Novo testador: ${email}`,
    html: adminNotificationHTML({ email, alreadySubscribed }),
  })

  // 5. Confirma para o usuário
  const userEmailResult = await sendEmail({
    to: email,
    subject: 'Voce esta na lista de testadores do Yaya Android! 💜',
    html: waitlistConfirmationHTML({ email }),
  })

  return jsonResponse({ success: true, alreadySubscribed, emailSent: userEmailResult.ok })
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

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<{ ok: boolean; status?: number; body?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[android-waitlist] RESEND_API_KEY missing — skipping email')
    return { ok: false, body: 'RESEND_API_KEY_MISSING' }
  }

  console.log(`[android-waitlist] sending email to ${to} from ${RESEND_FROM_EMAIL}`)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: `Yaya <${RESEND_FROM_EMAIL}>`, to: [to], subject, html }),
    })

    const txt = await res.text()
    if (!res.ok) {
      console.error('[android-waitlist] Resend failed:', res.status, txt)
      return { ok: false, status: res.status, body: txt }
    }
    console.log(`[android-waitlist] email sent to ${to}`, txt)
    return { ok: true, status: res.status, body: txt }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[android-waitlist] sendEmail threw:', msg)
    return { ok: false, body: msg }
  }
}

function adminNotificationHTML({ email, alreadySubscribed }: { email: string; alreadySubscribed: boolean }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a1f4d;padding:32px;max-width:480px;">
  <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7056e0;font-weight:700;margin:0 0 8px;">Yaya Android</p>
  <h1 style="margin:0 0 16px;font-size:22px;color:#2a1f4d;">Novo testador cadastrado</h1>
  <p style="font-size:18px;font-weight:700;margin:0 0 8px;padding:12px 16px;background:#f3f0ff;border-radius:8px;border-left:4px solid #7056e0;">${email}</p>
  ${alreadySubscribed ? '<p style="font-size:13px;color:#8678a8;margin:4px 0 0;">⚠️ Este email ja estava na lista (re-cadastro)</p>' : ''}
  <p style="font-size:14px;color:#4a3d70;margin:20px 0 8px;"><strong>Proximo passo:</strong> adicionar este email como testador interno no Google Play Console e enviar o convite.</p>
  <p style="font-size:12px;color:#8678a8;margin:0;padding-top:16px;border-top:1px solid #e8e3f0;">Yaya Baby &mdash; android-waitlist edge function</p>
</body>
</html>`
}

function waitlistConfirmationHTML({ email }: { email: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a1f4d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(112,86,224,0.08);">
        <tr><td style="padding:40px 40px 24px;">
          <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#7056e0;font-weight:700;">Yaya Android</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;color:#2a1f4d;font-weight:700;">Voce esta dentro! 🚀</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d70;">
            Que legal que voce quer ser um dos primeiros a testar o Yaya no Android!
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a3d70;">
            Seus <strong style="color:#7056e0;">10 dias de Yaya+</strong> ja foram liberados na sua conta. Vamos enviar um convite do Google Play para <strong>${email}</strong> em ate 2 horas. Quando chegar, toque em "Aceitar" para instalar o app.
          </p>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#8678a8;">
            Te avisamos tambem quando o app lançar oficialmente para todo mundo! 💜
          </p>
        </td></tr>
        <tr><td style="background:#f6f4fb;padding:20px 40px;border-top:1px solid #e8e3f0;">
          <p style="margin:0;font-size:12px;color:#8678a8;text-align:center;">
            Yaya &mdash; acompanhamento de bebe com inteligencia<br>
            <a href="https://yayababy.app" style="color:#7056e0;text-decoration:none;">yayababy.app</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
