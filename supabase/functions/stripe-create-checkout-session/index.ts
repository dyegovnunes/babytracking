// ════════════════════════════════════════════════════════════════════════════
// stripe-create-checkout-session
// ════════════════════════════════════════════════════════════════════════════
// Chamado pela landing pública (/sua-biblioteca/[slug]) quando o usuário clica
// "Comprar". Recebe o slug do guia e os URLs de retorno; busca o stripe_price_id
// no DB; cria a sessão Stripe Checkout; devolve a URL pra fazer redirect.
//
// Body esperado: { guide_slug, success_url, cancel_url, email? }
// Resposta:      { url } | { error }
//
// Variáveis de ambiente:
//   STRIPE_SECRET_KEY        — sk_test_... ou sk_live_...
//   SUPABASE_URL             — automático
//   SUPABASE_SERVICE_ROLE_KEY — automático
// ════════════════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? ''

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  // Importante pro Deno: usar fetch ao invés de Node http
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
    const { guide_slug, success_url, cancel_url, email } = await req.json()

    if (!guide_slug || !success_url || !cancel_url) {
      return new Response(
        JSON.stringify({ error: 'guide_slug, success_url, cancel_url são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Busca o guia pelo slug — usa service_role pra contornar RLS de status='published'
    // (queremos permitir checkout mesmo durante teste com guide draft)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: guide, error: guideErr } = await supabase
      .from('guides')
      .select('id, title, price_cents, stripe_price_id')
      .eq('slug', guide_slug)
      .single()

    if (guideErr || !guide) {
      return new Response(
        JSON.stringify({ error: `Guia "${guide_slug}" não encontrado` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!guide.stripe_price_id) {
      return new Response(
        JSON.stringify({ error: `Guia "${guide_slug}" sem stripe_price_id configurado` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cria sessão Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: guide.stripe_price_id, quantity: 1 }],
      success_url,
      cancel_url,
      // Email pré-preenchido (se fornecido) acelera checkout
      customer_email: email || undefined,
      // Metadata vai pro webhook — o que importa pra processar a compra
      metadata: {
        guide_id: guide.id,
        guide_slug,
        guide_title: guide.title,
      },
      // Brasil: aceita cartão de crédito brasileiro + Pix (se ativado no Stripe Brasil)
      payment_method_types: ['card'],
      locale: 'pt-BR',
      // Permite ao Stripe coletar billing address (útil pra notas fiscais)
      billing_address_collection: 'auto',
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-create-checkout-session] error:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno ao criar sessão de checkout' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
