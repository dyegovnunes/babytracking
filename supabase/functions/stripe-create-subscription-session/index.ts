// ════════════════════════════════════════════════════════════════════════════
// stripe-create-subscription-session
// ════════════════════════════════════════════════════════════════════════════
// Cria sessão Stripe Checkout para assinatura Yaya+ via web (fora das lojas).
//
// Body: { plan: 'monthly' | 'annual' | 'lifetime', success_url, cancel_url, email? }
// Resposta: { url } | { error }
//
// Variáveis de ambiente:
//   STRIPE_SECRET_KEY
//   STRIPE_PRICE_MENSAL      — price_id do plano mensal
//   STRIPE_PRICE_ANUAL       — price_id do plano anual
//   STRIPE_PRICE_VITALICIO   — price_id do plano vitalício (one-time)
//   SUPABASE_URL             — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
// ════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

const PRICE_IDS: Record<string, string> = {
  monthly:  Deno.env.get('STRIPE_PRICE_MENSAL')    ?? '',
  annual:   Deno.env.get('STRIPE_PRICE_ANUAL')     ?? '',
  lifetime: Deno.env.get('STRIPE_PRICE_VITALICIO') ?? '',
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { plan, success_url, cancel_url, email } = await req.json()

    if (!plan || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'plan, success_url, cancel_url são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const priceId = PRICE_IDS[plan]
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Plano inválido: ${plan}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Vitalício é pagamento único; mensal e anual são recorrentes
    const isLifetime = plan === 'lifetime'

    const session = await stripe.checkout.sessions.create({
      mode: isLifetime ? 'payment' : 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url,
      cancel_url,
      customer_email: email || undefined,
      metadata: { plan },
      payment_method_types: ['card'],
      locale: 'pt-BR',
      billing_address_collection: 'auto',
      // Para assinaturas: permite trial e mostra fatura detalhada
      ...(isLifetime ? {} : {
        subscription_data: {
          metadata: { plan },
        },
      }),
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-create-subscription-session] error:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno ao criar sessão de checkout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
