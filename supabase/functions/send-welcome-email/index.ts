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
import { EMAIL_TEMPLATE } from './template.ts'

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL    = Deno.env.get('RESEND_FROM_EMAIL') ?? 'oi@yayababy.app'
const APP_LINK             = 'https://yayababy.app/'
const PRIVACY_LINK         = 'https://yayababy.app/privacidade'

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
    .select('welcome_email_sent_at')
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

  const babyName = baby.name

  // Montar HTML a partir do template
  const html = buildEmailHTML()

  // Enviar email via Resend
  const sent = await sendEmail({
    to: email,
    subject: `O ${babyName} chegou ao Yaya.`,
    html,
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

// ── HTML do email M0 ─────────────────────────────────────────────────────────
// Template importado de template.ts (gerado do HTML do cowork).
// Tokens substituídos:
//   {{DEEP_LINK}}        → universal link que abre o app (iOS/Android) ou web
//   {{UNSUBSCRIBE_LINK}} → configurações do app
//   {{PRIVACY_LINK}}     → página de privacidade

function buildEmailHTML(): string {
  return EMAIL_TEMPLATE
    .replace(/\{\{DEEP_LINK\}\}/g, APP_LINK)
    .replace(/\{\{UNSUBSCRIBE_LINK\}\}/g, APP_LINK + 'configuracoes')
    .replace(/\{\{PRIVACY_LINK\}\}/g, PRIVACY_LINK)
}
