// send-welcome-email — envia email M0 de boas-vindas após onboarding finalizado.
//
// Chamado pelo app via supabase.functions.invoke() imediatamente após o onboarding.
// Idempotente: verifica profiles.welcome_email_sent_at antes de enviar.
//
// Env vars necessárias (já configuradas no projeto):
//   SUPABASE_URL              — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
//   RESEND_API_KEY            — re_...
//   RESEND_FROM_EMAIL         — ex: 'oi@yayababy.app'
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL    = Deno.env.get('RESEND_FROM_EMAIL') ?? 'oi@yayababy.app'
const APP_LINK             = 'https://yayababy.app'

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  // Verificar JWT do usuário (enviado automaticamente pelo supabase.functions.invoke)
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const { data: { user }, error: authErr } = await adminClient.auth.getUser(jwt)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  // Ler babyId do body
  let body: { babyId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  const { babyId } = body
  if (!babyId) {
    return new Response(JSON.stringify({ error: 'missing_babyId' }), { status: 400 })
  }

  // Buscar perfil do usuário + verificar se já enviou
  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, welcome_email_sent_at')
    .eq('id', user.id)
    .single()

  if (profile?.welcome_email_sent_at) {
    // Já enviado — retornar sucesso sem enviar novamente
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Buscar nome do bebê
  const { data: baby } = await adminClient
    .from('babies')
    .select('name')
    .eq('id', babyId)
    .single()

  if (!baby) {
    return new Response(JSON.stringify({ error: 'baby_not_found' }), { status: 404 })
  }

  // Buscar email do usuário
  const email = user.email
  if (!email) {
    console.error('[send-welcome-email] No email for user', user.id)
    return new Response(JSON.stringify({ error: 'no_email' }), { status: 422 })
  }

  const parentName = profile?.full_name
    ? profile.full_name.split(' ')[0]
    : 'você'
  const babyName = baby.name

  // Enviar email via Resend
  const sent = await sendEmail({
    to: email,
    subject: `O ${babyName} chegou ao Yaya.`,
    html: welcomeEmailHTML({ parentName, babyName, appLink: APP_LINK }),
  })

  if (!sent) {
    return new Response(JSON.stringify({ error: 'email_failed' }), { status: 502 })
  }

  // Marcar como enviado (idempotência)
  await adminClient
    .from('profiles')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('id', user.id)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ── Email ────────────────────────────────────────────────────────────────────

async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[send-welcome-email] RESEND_API_KEY missing — skipping email')
    return false
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Yaya <${RESEND_FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error('[send-welcome-email] Resend error', res.status, txt)
    return false
  }

  return true
}

// ── HTML placeholder do email M0 ─────────────────────────────────────────────
// TODO: substituir pelo template final do cowork quando disponível.

function welcomeEmailHTML({
  parentName,
  babyName,
  appLink,
}: {
  parentName: string
  babyName: string
  appLink: string
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>O ${babyName} chegou ao Yaya.</title>
</head>
<body style="margin:0;padding:0;background:#f8f7ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(112,86,224,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#b79fff 0%,#7056e0 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Yaya</p>
              <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">acompanhamento do bebê</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;font-size:20px;font-weight:800;color:#1c1b2b;">Oi, ${parentName}!</p>
              <p style="margin:0 0 16px;font-size:15px;color:#6f6896;line-height:1.7;">
                O perfil do ${babyName} está criado. A partir de agora, o Yaya vai guardar a rotina dele pra você.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#6f6896;line-height:1.7;">
                O primeiro passo é simples: fazer o primeiro registro. Sono, amamentação, fralda, o que aconteceu agora. Leva uns 10 segundos.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#6f6896;line-height:1.7;">
                Quanto mais você registrar, mais o Yaya vai entendendo a rotina do ${babyName} e mostrando padrões que você talvez não esteja percebendo no dia a dia.
              </p>

              <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${appLink}" style="display:inline-block;background:linear-gradient(135deg,#b79fff 0%,#7056e0 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;letter-spacing:0.01em;">
                      Fazer primeiro registro
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:#9e9cb0;line-height:1.6;">
                A gente está aqui se precisar.<br>
                <strong style="color:#7056e0;">Yaya</strong>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #ede9f9;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9e9cb0;">
                Yaya Baby &bull; <a href="${appLink}" style="color:#7056e0;text-decoration:none;">yayababy.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
