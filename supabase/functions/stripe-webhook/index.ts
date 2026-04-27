// ════════════════════════════════════════════════════════════════════════════
// stripe-webhook
// ════════════════════════════════════════════════════════════════════════════
// Recebe eventos do Stripe (configurar endpoint no Stripe Dashboard apontando
// pra esta function). Trata `checkout.session.completed`:
//   1. Valida Stripe-Signature
//   2. Encontra ou cria user via auth.admin API (sem senha)
//   3. Chama process_guide_purchase() — INSERT compra + 30d Yaya+ cortesia
//   4. Envia email de boas-vindas com magic link via Resend
//
// Variáveis de ambiente:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET     — whsec_... do endpoint configurado no Stripe
//   SUPABASE_URL              — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
//   RESEND_API_KEY            — re_...
//   RESEND_FROM_EMAIL         — ex: 'oi@yayababy.app'
//   GUIDE_BASE_URL            — ex: 'https://blog.yayababy.app/sua-biblioteca'
//
// Idempotência: 100% via UNIQUE(provider, provider_session_id) na tabela
// guide_purchases — função SQL retorna a mesma compra em re-execuções.
// ════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'oi@yayababy.app'
const GUIDE_BASE_URL = Deno.env.get('GUIDE_BASE_URL') ?? 'https://blog.yayababy.app/sua-biblioteca'

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

// Cryptography provider explícito (necessário em Deno pra constructEventAsync)
const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  if (!signature) {
    console.error('[stripe-webhook] missing stripe-signature header')
    return new Response('No signature', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    )
  } catch (err) {
    console.error('[stripe-webhook] signature validation failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Stripe espera 200 mesmo se o processamento falhar internamente — re-tentativas
  // são pra problemas reais de rede/server. Erros de lógica são logados, não 500.

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    } else {
      console.log(`[stripe-webhook] ignoring event type: ${event.type}`)
    }
  } catch (err) {
    console.error('[stripe-webhook] error processing event:', err)
    // Retornamos 200 mesmo assim — re-tentativa não vai ajudar se o erro é nosso
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ───────────────────────────────────────────────────────────────────────────
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email ?? session.customer_email
  const guideId = session.metadata?.guide_id
  const guideSlug = session.metadata?.guide_slug
  const guideTitle = session.metadata?.guide_title ?? 'Seu guia'
  const sessionId = session.id
  const amountCents = session.amount_total ?? 0

  if (!email || !guideId || !guideSlug) {
    console.error('[stripe-webhook] missing required fields:', { email, guideId, guideSlug })
    return
  }

  // Idempotência: o SQL já trata, mas não custa um log claro
  console.log(`[stripe-webhook] processing checkout ${sessionId} for ${email} → ${guideSlug}`)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Encontra ou cria o usuário (sem senha — magic link cuida do resto)
  let userId: string | null = null
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    userId = existing.id
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,  // já marcado como verificado
    })
    if (createErr || !created.user) {
      console.error('[stripe-webhook] failed to create user:', createErr)
      return
    }
    userId = created.user.id
  }

  // 2. Processa a compra (idempotente via UNIQUE constraint)
  const { data: purchaseId, error: rpcErr } = await supabase.rpc('process_guide_purchase', {
    p_user_id: userId,
    p_guide_id: guideId,
    p_email: email,
    p_provider: 'stripe',
    p_session_id: sessionId,
    p_amount_cents: amountCents,
    p_metadata: session as unknown as Record<string, unknown>,
  })

  if (rpcErr) {
    console.error('[stripe-webhook] process_guide_purchase failed:', rpcErr)
    return
  }
  console.log(`[stripe-webhook] purchase ${purchaseId} registered`)

  // 3. Gera magic link
  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${GUIDE_BASE_URL}/${guideSlug}/ler`,
    },
  })

  if (linkErr || !linkData) {
    console.error('[stripe-webhook] failed to generate magic link:', linkErr)
    return
  }

  const magicLink = linkData.properties?.action_link
  if (!magicLink) {
    console.error('[stripe-webhook] magic link missing in response')
    return
  }

  // 4. Envia email de boas-vindas
  await sendWelcomeEmail({ email, guideTitle, magicLink })
}

// ───────────────────────────────────────────────────────────────────────────
async function sendWelcomeEmail(params: {
  email: string
  guideTitle: string
  magicLink: string
}) {
  if (!RESEND_API_KEY) {
    console.warn('[stripe-webhook] RESEND_API_KEY missing — skipping email')
    return
  }

  const html = welcomeEmailHTML(params)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Yaya <${RESEND_FROM_EMAIL}>`,
      to: [params.email],
      subject: `Bem-vinda à Sua Biblioteca Yaya 💜`,
      html,
    }),
  })

  if (!res.ok) {
    const txt = await res.text()
    console.error('[stripe-webhook] Resend failed:', res.status, txt)
  } else {
    console.log(`[stripe-webhook] welcome email sent to ${params.email}`)
  }
}

// HTML do email — tom Yaya, sem labels frias
function welcomeEmailHTML({ guideTitle, magicLink }: { guideTitle: string; magicLink: string }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bem-vinda à Sua Biblioteca Yaya</title>
</head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a1f4d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(112,86,224,0.08);">
        <tr><td style="padding:40px 40px 24px;">
          <p style="margin:0 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#7056e0;font-weight:700;">Sua Biblioteca Yaya</p>
          <h1 style="margin:0 0 24px;font-size:28px;line-height:1.25;color:#2a1f4d;font-weight:700;">Sua compra chegou — e a leitura começa quando você quiser.</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#4a3f6a;">
            Você acabou de garantir o <strong>${guideTitle}</strong> e ganhou <strong>30 dias do Yaya+</strong> de cortesia para acompanhar a rotina do bebê com calma.
          </p>
          <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#4a3f6a;">
            Clique no botão abaixo pra entrar direto na sua leitura — sem precisar criar senha.
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr><td>
              <a href="${magicLink}" style="display:inline-block;padding:14px 28px;background:#7056e0;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
                Entrar na minha leitura
              </a>
            </td></tr>
          </table>
          <p style="margin:32px 0 8px;font-size:13px;line-height:1.5;color:#7a6e9a;">
            Esse link é único e expira em 24 horas. Se precisar de outro, é só responder esse email que a gente reenvia.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#faf8ff;border-top:1px solid #ece7f9;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#7a6e9a;">
            <strong>O que você encontra na sua biblioteca:</strong><br>
            ✦ O guia completo organizado por partes<br>
            ✦ Quiz de perfil parental personalizado<br>
            ✦ Checklists imprimíveis e PDF para download<br>
            ✦ Espaço pra anotações e marcações pessoais
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9b8fbf;">
            Yaya · Acompanhando a maternidade com você
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
