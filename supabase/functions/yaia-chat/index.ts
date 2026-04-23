// yaIA chat proxy
// - Valida JWT do app
// - Confere membership do usuário no baby_id
// - Verifica consent (profiles.yaia_consent_at)
// - Enforce limite free (10/mês) via INSERT ON CONFLICT atômico em yaia_usage
// - Persiste user + assistant messages em yaia_conversations (single writer)
// - Proxy para n8n via header secreto X-YaIA-Secret
//
// n8n URL e secret ficam em secrets:
//   YAIA_N8N_URL, YAIA_WEBHOOK_SECRET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const YAIA_N8N_URL = Deno.env.get('YAIA_N8N_URL')!;
const YAIA_WEBHOOK_SECRET = Deno.env.get('YAIA_WEBHOOK_SECRET')!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FREE_MONTHLY_LIMIT = 10;
const HISTORY_LIMIT = 20;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validar JWT — client envia Authorization: Bearer <session.access_token>
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Não autenticado' }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: 'Não autenticado' }, 401);
    }
    const userId = userData.user.id;

    // 2. Validar body
    const body = await req.json().catch(() => null);
    const message: string | undefined = body?.message;
    const babyId: string | undefined = body?.baby_id;
    if (!message || !babyId || typeof message !== 'string' || typeof babyId !== 'string') {
      return json({ error: 'message e baby_id obrigatórios' }, 400);
    }
    if (message.length > 2000) {
      return json({ error: 'Mensagem muito longa (máx 2000 caracteres)' }, 400);
    }

    // 3. Membership — usuário precisa ter acesso ao bebê
    const { data: membership } = await admin
      .from('baby_members')
      .select('role')
      .eq('user_id', userId)
      .eq('baby_id', babyId)
      .maybeSingle();
    if (!membership) {
      return json({ error: 'Sem acesso a este bebê' }, 403);
    }

    // 4. Consent
    const { data: profile } = await admin
      .from('profiles')
      .select('yaia_consent_at')
      .eq('id', userId)
      .maybeSingle();
    if (!profile?.yaia_consent_at) {
      return json({ error: 'CONSENT_REQUIRED' }, 428);
    }

    // 5. Premium do bebê (fonte de verdade = babies.is_premium,
    //    mesmo critério usado em useBabyPremium no app)
    const { data: baby } = await admin
      .from('babies')
      .select('id, name, gender, birth_date, is_premium')
      .eq('id', babyId)
      .maybeSingle();
    if (!baby) {
      return json({ error: 'Bebê não encontrado' }, 404);
    }
    const isPremium = !!baby.is_premium;

    // 6. Limite free: INSERT ON CONFLICT atômico.
    //    Incrementa ANTES de chamar n8n — se falhar, pagamos uma chamada
    //    a mais mas não sub-contamos (o oposto seria pior).
    let remaining: number | null = null;
    if (!isPremium) {
      const monthKey = toMonthKey(new Date());
      const { data: usage, error: usageErr } = await admin.rpc('yaia_increment_usage', {
        p_user_id: userId,
        p_month_key: monthKey,
      }).maybeSingle();

      // RPC ainda não existe? Fallback: upsert + leitura.
      let newCount: number;
      if (usageErr || !usage) {
        const { data: existing } = await admin
          .from('yaia_usage')
          .select('count')
          .eq('user_id', userId)
          .eq('month_key', monthKey)
          .maybeSingle();
        newCount = (existing?.count ?? 0) + 1;
        await admin
          .from('yaia_usage')
          .upsert(
            { user_id: userId, month_key: monthKey, count: newCount, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,month_key' },
          );
      } else {
        // @ts-expect-error — RPC custom retorna { count }
        newCount = usage.count as number;
      }

      if (newCount > FREE_MONTHLY_LIMIT) {
        // Decrementa a contagem excedida pra não "queimar" a pergunta
        // que nem chegou a ser respondida.
        await admin
          .from('yaia_usage')
          .update({ count: FREE_MONTHLY_LIMIT, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('month_key', monthKey);
        return json({ error: 'LIMIT_REACHED', remaining: 0 }, 402);
      }
      remaining = FREE_MONTHLY_LIMIT - newCount;
    }

    // 7. Histórico pra contextualizar o modelo (últimas N mensagens do mesmo bebê).
    const { data: historyRows } = await admin
      .from('yaia_conversations')
      .select('role, content, created_at')
      .eq('user_id', userId)
      .eq('baby_id', babyId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    const history = (historyRows ?? [])
      .slice()
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    // 8. Chamada ao n8n com secret header
    const n8nResp = await fetch(YAIA_N8N_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YaIA-Secret': YAIA_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        message,
        history,
        user_id: userId,
        baby_id: babyId,
        baby: {
          id: baby.id,
          name: baby.name,
          gender: baby.gender,
          birth_date: baby.birth_date,
        },
      }),
    });

    if (!n8nResp.ok) {
      const errText = await n8nResp.text().catch(() => '');
      console.error('n8n error', n8nResp.status, errText);
      return json({ error: 'Não consegui falar com a yaIA agora. Tenta em alguns instantes.' }, 502);
    }

    const n8nData = await n8nResp.json().catch(() => ({}));
    const reply: string | undefined = typeof n8nData?.reply === 'string' ? n8nData.reply : undefined;
    if (!reply) {
      return json({ error: 'Resposta inválida da yaIA' }, 502);
    }

    // 9. Persistir user + assistant (single writer)
    const nowIso = new Date().toISOString();
    await admin.from('yaia_conversations').insert([
      { user_id: userId, baby_id: babyId, role: 'user', content: message, created_at: nowIso },
      {
        user_id: userId,
        baby_id: babyId,
        role: 'assistant',
        content: reply,
        // +1ms pra garantir ordenação estável (user antes do assistant)
        created_at: new Date(Date.now() + 1).toISOString(),
      },
    ]);

    return json({ reply, remaining }, 200);
  } catch (err) {
    console.error('yaia-chat error', err);
    return json({ error: 'Erro interno' }, 500);
  }
});

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toMonthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
