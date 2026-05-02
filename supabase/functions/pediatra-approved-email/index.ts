// pediatra-approved-email — envia email de boas-vindas quando uma pediatra é aprovada.
//
// Env vars necessárias (já configuradas em outras functions):
//   SUPABASE_URL              — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
//   RESEND_API_KEY            — re_...
//   RESEND_FROM_EMAIL         — ex: 'oi@yayababy.app'
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY        = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL     = Deno.env.get('RESEND_FROM_EMAIL') ?? 'oi@yayababy.app'
const PORTAL_URL            = 'https://pediatra.yayababy.app'

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

  // Verificar que quem chama é admin autenticado via JWT
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }
  const { data: { user }, error: authErr } = await adminClient.auth.getUser(jwt)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  // Verificar que é admin
  const { data: profile } = await adminClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
  }

  // Ler pediatrician_id do body
  let body: { pediatrician_id: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 })
  }

  const { pediatrician_id } = body
  if (!pediatrician_id) {
    return new Response(JSON.stringify({ error: 'missing_pediatrician_id' }), { status: 400 })
  }

  // Buscar dados da pediatra
  const { data: ped, error: pedErr } = await adminClient
    .from('pediatricians')
    .select('name, user_id, crm, crm_state')
    .eq('id', pediatrician_id)
    .single()

  if (pedErr || !ped) {
    return new Response(JSON.stringify({ error: 'pediatrician_not_found' }), { status: 404 })
  }

  // Buscar email da pediatra via auth.users (service role)
  const { data: authUser, error: userErr } = await adminClient.auth.admin.getUserById(ped.user_id)
  if (userErr || !authUser?.user?.email) {
    console.error('[pediatra-approved-email] Failed to get user email', userErr)
    return new Response(JSON.stringify({ error: 'email_not_found' }), { status: 404 })
  }

  const email = authUser.user.email
  const firstName = ped.name.split(' ')[0]

  await sendEmail({
    to: email,
    subject: 'Sua conta no Portal Yaya foi aprovada 💜',
    html: approvalEmailHTML({ name: firstName, crmFull: `${ped.crm}/${ped.crm_state}`, portalUrl: PORTAL_URL }),
  })

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ── Email ────────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.warn('[pediatra-approved-email] RESEND_API_KEY missing — skipping email')
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
    console.error('[pediatra-approved-email] Resend error', res.status, txt)
  }
}

// ── HTML do email ─────────────────────────────────────────────────────────────

function approvalEmailHTML({
  name,
  crmFull,
  portalUrl,
}: {
  name: string
  crmFull: string
  portalUrl: string
}): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Conta aprovada — Portal Yaya Pediatra</title>
</head>
<body style="margin:0;padding:0;background:#f8f7ff;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f7ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(112,86,224,0.10);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#b79fff 0%,#7056e0 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Portal Yaya</p>
              <p style="margin:6px 0 0;font-size:14px;color:rgba(255,255,255,0.85);">Pediatra</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#1c1b2b;">Ola, ${name}! 👋</p>
              <p style="margin:0 0 24px;font-size:15px;color:#6f6896;line-height:1.6;">
                Sua conta no Portal Yaya foi <strong style="color:#7056e0;">aprovada</strong>. A partir de agora voce pode acessar o portal e acompanhar os pacientes que compartilharem o acesso com voce.
              </p>

              <table cellpadding="0" cellspacing="0" style="background:#f3f0ff;border-radius:10px;padding:20px 24px;margin-bottom:28px;width:100%;box-sizing:border-box;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9e9cb0;text-transform:uppercase;letter-spacing:0.08em;">CRM cadastrado</p>
                    <p style="margin:0;font-size:16px;font-weight:700;color:#1c1b2b;">${crmFull}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;color:#6f6896;line-height:1.5;">
                Para iniciar, peca aos responsaveis dos seus pacientes que instalem o app Yaya e vinculem a conta de voce usando o codigo de convite disponivel no seu painel.
              </p>

              <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" style="display:inline-block;background:linear-gradient(135deg,#b79fff 0%,#7056e0 100%);color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:8px;letter-spacing:0.01em;">
                      Acessar o Portal
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #ede9f9;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9e9cb0;">
                Portal Yaya Pediatra &bull; <a href="${portalUrl}" style="color:#7056e0;text-decoration:none;">${portalUrl.replace('https://', '')}</a>
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
