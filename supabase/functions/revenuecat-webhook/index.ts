import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

// Map RevenueCat product IDs to plan types
function getPlanFromProductId(productId: string): 'monthly' | 'annual' | 'lifetime' | null {
  if (!productId) return null;
  const id = productId.toLowerCase();
  if (id.includes('monthly')) return 'monthly';
  if (id.includes('annual')) return 'annual';
  if (id.includes('lifetime')) return 'lifetime';
  return null;
}

function getBillingProvider(store: string): 'apple' | 'google' | 'stripe' | null {
  if (store === 'APP_STORE' || store === 'MAC_APP_STORE') return 'apple';
  if (store === 'PLAY_STORE') return 'google';
  if (store === 'STRIPE') return 'stripe';
  return null;
}

serve(async (req) => {
  // Verificar authorization
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== REVENUECAT_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await req.json();
  const event = body.event;
  const { type, app_user_id, product_id, store, expiration_at_ms } = event;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const plan = getPlanFromProductId(product_id ?? '');
  const billingProvider = getBillingProvider(store ?? '');

  // GRANT events — purchase, renewal, restore
  const GRANT_EVENTS = [
    'INITIAL_PURCHASE',
    'NON_SUBSCRIPTION_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'RESTORE',
  ];

  // CANCELLATION — user cancelled but still has access until expiry
  // EXPIRATION / BILLING_ISSUE — access revoked

  if (GRANT_EVENTS.includes(type)) {
    const isLifetime = plan === 'lifetime' || type === 'NON_SUBSCRIPTION_PURCHASE';
    const expiresAt = isLifetime
      ? null
      : expiration_at_ms
        ? new Date(expiration_at_ms).toISOString()
        : null;

    await supabase
      .from('profiles')
      .update({
        is_premium: true,
        premium_purchased_at: new Date().toISOString(),
        revenuecat_user_id: app_user_id,
        subscription_status: 'active',
        subscription_plan: isLifetime ? 'lifetime' : (plan ?? 'monthly'),
        subscription_started_at: new Date().toISOString(),
        subscription_expires_at: expiresAt,
        subscription_cancelled_at: null,
        billing_provider: billingProvider,
      })
      .eq('id', app_user_id);

    // MGM: se plano é anual/vitalício, recompensa o indicador (free → 30d cortesia).
    // Mensal não dispara (ainda: cheap para gerar fraude em massa).
    const subscribedPlan = isLifetime ? 'lifetime' : plan;
    if (subscribedPlan === 'annual' || subscribedPlan === 'lifetime') {
      await supabase.rpc('process_referral_paid_subscription', {
        p_user_id: app_user_id,
        p_plan: subscribedPlan,
      });
    }
  }

  if (type === 'CANCELLATION') {
    // User cancelled — still has access until subscription_expires_at
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        subscription_cancelled_at: new Date().toISOString(),
      })
      .eq('id', app_user_id);
  }

  if (type === 'EXPIRATION') {
    await supabase
      .from('profiles')
      .update({
        is_premium: false,
        subscription_status: 'expired',
      })
      .eq('id', app_user_id);
  }

  if (type === 'BILLING_ISSUE') {
    await supabase
      .from('profiles')
      .update({
        subscription_status: 'grace_period',
      })
      .eq('id', app_user_id);
  }

  return new Response('OK', { status: 200 });
});
