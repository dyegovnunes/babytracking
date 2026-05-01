// ════════════════════════════════════════════════════════════════════════════
// stripe-webhook
// ════════════════════════════════════════════════════════════════════════════
// Recebe eventos do Stripe. Trata:
//   checkout.session.completed       → compra de guia OU assinatura Yaya+ web
//   customer.subscription.deleted    → cancelamento Yaya+ web → revoga premium
//   invoice.paid                     → renovação Yaya+ web → confirma premium
//
// Variáveis de ambiente:
//   STRIPE_SECRET_KEY
//   STRIPE_WEBHOOK_SECRET     — whsec_... do endpoint configurado no Stripe
//   SUPABASE_URL              — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
//   RESEND_API_KEY            — re_...
//   RESEND_FROM_EMAIL         — ex: 'oi@yayababy.app'
//   GUIDE_BASE_URL            — ex: 'https://blog.yayababy.app/sua-biblioteca'
//   APP_URL                   — ex: 'https://yayababy.app'
// ════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const STRIPE_SECRET_KEY    = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL    = Deno.env.get('RESEND_FROM_EMAIL') ?? 'oi@yayababy.app'
const GUIDE_BASE_URL       = Deno.env.get('GUIDE_BASE_URL') ?? 'https://blog.yayababy.app/sua-biblioteca'
const APP_URL              = Deno.env.get('APP_URL') ?? 'https://yayababy.app'

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

const PLAN_LABEL: Record<string, string> = {
  monthly:  'Mensal',
  annual:   'Anual',
  lifetime: 'Vitalício',
}

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
      rawBody, signature, STRIPE_WEBHOOK_SECRET, undefined, cryptoProvider
    )
  } catch (err) {
    console.error('[stripe-webhook] signature validation failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.metadata?.guide_id) {
          // Compra de guia (fluxo original)
          await handleGuideCheckout(session)
        } else if (session.metadata?.plan) {
          // Assinatura Yaya+ via web
          await handleSubscriptionCheckout(session)
        } else {
          console.log('[stripe-webhook] checkout.session.completed sem metadata conhecida — ignorando')
        }
        break
      }
      case 'customer.subscription.deleted': {
        // Assinatura cancelada → revoga premium web
        await handleSubscriptionCancelled(event.data.object as Stripe.Subscription)
        break
      }
      case 'invoice.paid': {
        // Renovação de assinatura → confirma premium
        await handleInvoicePaid(event.data.object as Stripe.Invoice)
        break
      }
      default:
        console.log(`[stripe-webhook] ignoring event type: ${event.type}`)
    }
  } catch (err) {
    console.error('[stripe-webhook] error processing event:', err)
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSupabase() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

async function findOrCreateUser(supabase: ReturnType<typeof makeSupabase>, email: string): Promise<string | null> {
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const existing = existingUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) return existing.id

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (error || !created.user) {
    console.error('[stripe-webhook] failed to create user:', error)
    return null
  }
  return created.user.id
}

async function getEmailFromCustomer(customerId: string): Promise<string | null> {
  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer.deleted) return null
    return (customer as Stripe.Customer).email ?? null
  } catch (err) {
    console.error('[stripe-webhook] failed to fetch customer:', err)
    return null
  }
}

// ── Compra de guia (fluxo original) ─────────────────────────────────────────

async function handleGuideCheckout(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email ?? session.customer_email
  const guideId    = session.metadata?.guide_id
  const guideSlug  = session.metadata?.guide_slug
  const guideTitle = session.metadata?.guide_title ?? 'Seu guia'
  const sessionId  = session.id
  const amountCents = session.amount_total ?? 0

  if (!email || !guideId || !guideSlug) {
    console.error('[stripe-webhook] handleGuideCheckout: missing fields', { email, guideId, guideSlug })
    return
  }

  console.log(`[stripe-webhook] guide checkout ${sessionId} for ${email} → ${guideSlug}`)

  const supabase = makeSupabase()
  const userId = await findOrCreateUser(supabase, email)
  if (!userId) return

  const { data: purchaseId, error: rpcErr } = await supabase.rpc('process_guide_purchase', {
    p_user_id:     userId,
    p_guide_id:    guideId,
    p_email:       email,
    p_provider:    'stripe',
    p_session_id:  sessionId,
    p_amount_cents: amountCents,
    p_metadata:    session as unknown as Record<string, unknown>,
  })

  if (rpcErr) {
    console.error('[stripe-webhook] process_guide_purchase failed:', rpcErr)
    return
  }
  console.log(`[stripe-webhook] purchase ${purchaseId} registered`)

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${GUIDE_BASE_URL}/${guideSlug}/ler` },
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

  await sendEmail({
    to: email,
    subject: 'Bem-vinda à Sua Biblioteca Yaya 💜',
    html: guideWelcomeEmailHTML({ guideTitle, magicLink }),
  })
}

// ── Assinatura Yaya+ via web ─────────────────────────────────────────────────

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const email = session.customer_details?.email ?? session.customer_email
  const plan  = session.metadata?.plan as 'monthly' | 'annual' | 'lifetime' | undefined

  if (!email || !plan) {
    console.error('[stripe-webhook] handleSubscriptionCheckout: missing email or plan', { email, plan })
    return
  }

  console.log(`[stripe-webhook] subscription checkout for ${email} → plan=${plan}`)

  const supabase = makeSupabase()
  const userId = await findOrCreateUser(supabase, email)
  if (!userId) return

  const subscriptionPlan = plan === 'monthly' ? 'monthly' : plan === 'annual' ? 'annual' : 'lifetime'

  const { error } = await supabase
    .from('profiles')
    .update({ is_premium: true, subscription_plan: subscriptionPlan })
    .eq('id', userId)

  if (error) {
    console.error('[stripe-webhook] failed to update profile:', error)
    return
  }

  console.log(`[stripe-webhook] Yaya+ ${subscriptionPlan} granted to ${email}`)

  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: APP_URL },
  })

  const magicLink = linkData?.properties?.action_link ?? APP_URL

  await sendEmail({
    to: email,
    subject: `Yaya+ ${PLAN_LABEL[plan] ?? plan} ativado 💜`,
    html: subscriptionWelcomeEmailHTML({ plan: PLAN_LABEL[plan] ?? plan, magicLink }),
  })
}

// ── Cancelamento de assinatura ───────────────────────────────────────────────

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  const email = await getEmailFromCustomer(customerId)
  if (!email) {
    console.error('[stripe-webhook] handleSubscriptionCancelled: could not get email for customer', customerId)
    return
  }

  console.log(`[stripe-webhook] subscription cancelled for ${email}`)

  const supabase = makeSupabase()
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const user = existingUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    console.warn('[stripe-webhook] user not found for cancelled subscription:', email)
    return
  }

  // Só revoga se o plano atual não é do RevenueCat (IAP)
  // Verificamos pelo subscription_plan — RC usa os mesmos valores, então
  // não temos como distinguir sem stripe_customer_id. Por segurança,
  // apenas revogamos se is_premium for true (evita sobrescrever estado RC).
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_premium, subscription_plan')
    .eq('id', user.id)
    .single()

  if (!profile?.is_premium) {
    console.log('[stripe-webhook] user already not premium — nothing to revoke')
    return
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_premium: false, subscription_plan: null })
    .eq('id', user.id)

  if (error) {
    console.error('[stripe-webhook] failed to revoke premium:', error)
    return
  }

  console.log(`[stripe-webhook] Yaya+ revoked for ${email}`)
}

// ── Renovação de assinatura ──────────────────────────────────────────────────

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Apenas para faturas de assinatura (não avulsas)
  if (!invoice.subscription) return

  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : (invoice.customer as Stripe.Customer)?.id

  if (!customerId) return

  const email = await getEmailFromCustomer(customerId)
  if (!email) return

  // Busca plano da subscription
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id

  let plan: string | null = null
  try {
    const sub = await stripe.subscriptions.retrieve(subscriptionId)
    plan = sub.metadata?.plan ?? null
  } catch {
    // ignora — renovaremos sem atualizar o plano
  }

  console.log(`[stripe-webhook] invoice paid for ${email}, plan=${plan}`)

  const supabase = makeSupabase()
  const { data: existingUsers } = await supabase.auth.admin.listUsers()
  const user = existingUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) return

  const update: Record<string, unknown> = { is_premium: true }
  if (plan) update.subscription_plan = plan === 'monthly' ? 'monthly' : 'annual'

  await supabase.from('profiles').update(update).eq('id', user.id)
  console.log(`[stripe-webhook] Yaya+ renewed for ${email}`)
}

// ── Email ────────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.warn('[stripe-webhook] RESEND_API_KEY missing — skipping email')
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
    console.error('[stripe-webhook] Resend failed:', res.status, txt)
  } else {
    console.log(`[stripe-webhook] email sent to ${to}`)
  }
}

// ── Templates de email ───────────────────────────────────────────────────────

function guideWelcomeEmailHTML({ guideTitle, magicLink }: { guideTitle: string; magicLink: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a1f4d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(112,86,224,0.08);">
        <tr><td style="padding:40px 40px 24px;">
          <p style="margin:0 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#7056e0;font-weight:700;">Sua Biblioteca Yaya</p>
          <h1 style="margin:0 0 24px;font-size:28px;line-height:1.25;color:#2a1f4d;font-weight:700;">Sua compra chegou. A leitura come&ccedil;a quando voc&ecirc; quiser.</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#4a3f6a;">
            Voc&ecirc; acabou de garantir o <strong>${guideTitle}</strong> e ganhou <strong>30 dias do Yaya+</strong> de cortesia para acompanhar a rotina do beb&ecirc; com calma.
          </p>
          <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#4a3f6a;">
            Clique no bot&atilde;o abaixo para entrar direto na sua leitura, sem precisar criar senha.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${magicLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
              Entrar na minha leitura
            </a>
          </td></tr></table>
          <p style="margin:32px 0 8px;font-size:13px;line-height:1.5;color:#7a6e9a;">
            Esse link &eacute; &uacute;nico e expira em 24 horas. Se precisar de outro, &eacute; s&oacute; responder esse email.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9b8fbf;">Yaya &middot; Acompanhando a maternidade com voc&ecirc;</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function subscriptionWelcomeEmailHTML({ plan, magicLink }: { plan: string; magicLink: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f4fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2a1f4d;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4fb;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(112,86,224,0.08);">
        <tr><td style="padding:40px 40px 24px;">
          <p style="margin:0 0 8px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#7056e0;font-weight:700;">Yaya+</p>
          <h1 style="margin:0 0 24px;font-size:28px;line-height:1.25;color:#2a1f4d;font-weight:700;">Seu Yaya+ ${plan} est&aacute; ativo.</h1>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#4a3f6a;">
            Agora voc&ecirc; tem acesso completo ao app Yaya e a toda a Biblioteca Yaya, incluindo todos os guias dispon&iacute;veis e os pr&oacute;ximos que vierem.
          </p>
          <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#4a3f6a;">
            Use o bot&atilde;o abaixo para entrar com o mesmo email desta compra.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${magicLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:16px;">
              Acessar o Yaya+
            </a>
          </td></tr></table>
          <p style="margin:32px 0 8px;font-size:13px;line-height:1.5;color:#7a6e9a;">
            Esse link &eacute; &uacute;nico e expira em 24 horas. Se precisar de outro, &eacute; s&oacute; responder esse email.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#faf8ff;border-top:1px solid #ece7f9;">
          <p style="margin:0;font-size:13px;line-height:1.5;color:#7a6e9a;">
            <strong>O que est&aacute; incluso no Yaya+:</strong><br>
            Registro de alimenta&ccedil;&atilde;o, sono e fraldas<br>
            Insights e tend&ecirc;ncias da rotina do beb&ecirc;<br>
            Marcos de desenvolvimento e vacinas<br>
            Relat&oacute;rio completo para o pediatra<br>
            Acesso a toda a Biblioteca Yaya
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9b8fbf;">Yaya &middot; Acompanhando a maternidade com voc&ecirc;</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
