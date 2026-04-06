import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';

serve(async (req) => {
  // Verificar authorization
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== REVENUECAT_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const event = await req.json();
  const { type, app_user_id } = event.event;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // Eventos que concedem ou revogam premium
  const GRANT_EVENTS = [
    'INITIAL_PURCHASE',
    'NON_SUBSCRIPTION_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'RESTORE',
  ];

  const REVOKE_EVENTS = ['EXPIRATION', 'BILLING_ISSUE'];

  if (GRANT_EVENTS.includes(type)) {
    await supabase
      .from('profiles')
      .update({
        is_premium: true,
        premium_purchased_at: new Date().toISOString(),
        revenuecat_user_id: app_user_id,
      })
      .eq('id', app_user_id);
  }

  if (REVOKE_EVENTS.includes(type)) {
    // Para compra única (Non-Consumable), EXPIRATION não deve ocorrer.
    // Manter aqui como segurança, mas não esperado no modelo lifetime.
    await supabase
      .from('profiles')
      .update({ is_premium: false })
      .eq('id', app_user_id);
  }

  return new Response('OK', { status: 200 });
});
