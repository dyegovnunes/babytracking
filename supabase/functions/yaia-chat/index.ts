// yaIA chat proxy
// - Valida JWT do app
// - Confere membership do usuario no baby_id
// - Verifica consent (profiles.yaia_consent_at)
// - Enforce limite free (10/mes) em yaia_usage
// - Busca contexto real do bebe via RPC get_yaia_context e envia pro n8n
// - Persiste user + assistant messages em yaia_conversations (single writer)
// - Proxy para n8n via header secreto X-YaIA-Secret

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const YAIA_N8N_URL = Deno.env.get('YAIA_N8N_URL') ?? '';
const YAIA_WEBHOOK_SECRET = Deno.env.get('YAIA_WEBHOOK_SECRET') ?? '';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FREE_MONTHLY_LIMIT = 10;
const HISTORY_LIMIT = 20;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface YaiaContext {
  baby?: {
    name?: string;
    gender?: string;
    birth_date?: string;
    age_days?: number;
    age_weeks?: number;
    age_months?: number;
  };
  recent_logs?: Array<{ event_id: string; timestamp: string; ml?: number; duration?: number; notes?: string }>;
  active_medications?: Array<{ name: string; dosage?: string; frequency_hours?: number; schedule_times?: unknown; notes?: string; last_given?: string }>;
  vaccines_pending?: Array<{ vaccine_name: string; status: string; applied_at?: string }>;
  recent_milestones?: Array<{ milestone_name: string; category?: string; registered_at: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Nao autenticado' }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Nao autenticado' }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const message: string | undefined = body?.message;
    const babyId: string | undefined = body?.baby_id;
    if (!message || !babyId || typeof message !== 'string' || typeof babyId !== 'string') {
      return json({ error: 'message e baby_id obrigatorios' }, 400);
    }
    if (message.length > 2000) return json({ error: 'Mensagem muito longa (max 2000 caracteres)' }, 400);

    const { data: membership } = await admin
      .from('baby_members')
      .select('role')
      .eq('user_id', userId)
      .eq('baby_id', babyId)
      .maybeSingle();
    if (!membership) return json({ error: 'Sem acesso a este bebe' }, 403);

    const { data: profile } = await admin
      .from('profiles')
      .select('yaia_consent_at')
      .eq('id', userId)
      .maybeSingle();
    if (!profile?.yaia_consent_at) return json({ error: 'CONSENT_REQUIRED' }, 428);

    const { data: baby } = await admin
      .from('babies')
      .select('id, is_premium')
      .eq('id', babyId)
      .maybeSingle();
    if (!baby) return json({ error: 'Bebe nao encontrado' }, 404);
    const isPremium = !!baby.is_premium;

    // Limite free
    let remaining: number | null = null;
    if (!isPremium) {
      const monthKey = toMonthKey(new Date());
      const { data: existing } = await admin
        .from('yaia_usage')
        .select('count')
        .eq('user_id', userId)
        .eq('month_key', monthKey)
        .maybeSingle();
      const newCount = (existing?.count ?? 0) + 1;
      if (newCount > FREE_MONTHLY_LIMIT) return json({ error: 'LIMIT_REACHED', remaining: 0 }, 402);
      await admin
        .from('yaia_usage')
        .upsert(
          { user_id: userId, month_key: monthKey, count: newCount, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,month_key' },
        );
      remaining = FREE_MONTHLY_LIMIT - newCount;
    }

    // Historico da conversa
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

    // Contexto real do bebe via RPC
    const { data: contextData, error: ctxErr } = await admin.rpc('get_yaia_context', {
      p_user_id: userId,
      p_baby_id: babyId,
    });
    if (ctxErr) {
      console.error('[yaia] get_yaia_context failed', ctxErr);
    }
    const context: YaiaContext = (contextData as YaiaContext) ?? {};
    const contextSummary = buildContextSummary(context);

    // Chamada pro n8n
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
        baby: context.baby ?? null,
        context,
        context_summary: contextSummary,
      }),
    });

    if (!n8nResp.ok) {
      const errText = await n8nResp.text().catch(() => '');
      console.error('[yaia] n8n non-ok', n8nResp.status, errText.slice(0, 200));
      return json({ error: 'Nao consegui falar com a yaIA agora. Tenta em alguns instantes.' }, 502);
    }

    const n8nBody = await n8nResp.text();
    let n8nData: { reply?: string } = {};
    try {
      n8nData = JSON.parse(n8nBody);
    } catch {
      console.error('[yaia] failed to parse n8n body', n8nBody.slice(0, 200));
      return json({ error: 'Resposta invalida da yaIA.' }, 502);
    }

    const reply = typeof n8nData?.reply === 'string' ? n8nData.reply : undefined;
    if (!reply) {
      console.error('[yaia] n8n missing reply', Object.keys(n8nData));
      return json({ error: 'Resposta invalida da yaIA.' }, 502);
    }

    const nowIso = new Date().toISOString();
    await admin.from('yaia_conversations').insert([
      { user_id: userId, baby_id: babyId, role: 'user', content: message, created_at: nowIso },
      {
        user_id: userId,
        baby_id: babyId,
        role: 'assistant',
        content: reply,
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

// Monta bloco pronto pra ser colado no system prompt do AI Agent no n8n.
// Use esse texto diretamente: {{ $json.context_summary }}
function buildContextSummary(ctx: YaiaContext): string {
  const parts: string[] = [];
  parts.push('=== CONTEXTO REAL DO BEBE (use esses dados, nunca invente) ===');

  if (ctx.baby?.name) {
    const g = ctx.baby.gender === 'boy' ? 'masculino' : ctx.baby.gender === 'girl' ? 'feminino' : 'nao informado';
    const agePieces: string[] = [];
    if (typeof ctx.baby.age_months === 'number') agePieces.push(`${ctx.baby.age_months} meses`);
    if (typeof ctx.baby.age_weeks === 'number') agePieces.push(`${ctx.baby.age_weeks} semanas`);
    if (typeof ctx.baby.age_days === 'number') agePieces.push(`${ctx.baby.age_days} dias`);
    parts.push(`Nome: ${ctx.baby.name}`);
    parts.push(`Genero: ${g}`);
    parts.push(`Nascimento: ${ctx.baby.birth_date ?? 'nao informado'}`);
    if (agePieces.length) parts.push(`Idade: ${agePieces.join(' / ')}`);
  } else {
    parts.push('Nome: nao disponivel');
  }

  const logs = ctx.recent_logs ?? [];
  if (logs.length) {
    parts.push('');
    parts.push(`-- Ultimos ${logs.length} registros (mais recente primeiro) --`);
    for (const l of logs.slice(0, 30)) {
      const when = typeof l.timestamp === 'string' ? l.timestamp.replace('T', ' ').slice(0, 16) : '';
      const bits = [when, l.event_id];
      if (l.ml != null) bits.push(`${l.ml}ml`);
      if (l.duration != null) bits.push(`${l.duration}min`);
      if (l.notes) bits.push(`"${l.notes}"`);
      parts.push(`- ${bits.join(' | ')}`);
    }
  } else {
    parts.push('');
    parts.push('-- Registros: nenhum log registrado ainda. Se o pai/mae perguntar sobre padrao de sono/fralda/alimentacao, diga que ainda nao ha dados suficientes e sugira comecar a registrar no app. --');
  }

  const meds = ctx.active_medications ?? [];
  if (meds.length) {
    parts.push('');
    parts.push('-- Medicamentos ativos --');
    for (const m of meds) {
      const bits = [m.name];
      if (m.dosage) bits.push(m.dosage);
      if (m.frequency_hours) bits.push(`a cada ${m.frequency_hours}h`);
      if (m.last_given) bits.push(`ultima dose: ${m.last_given}`);
      parts.push(`- ${bits.join(' | ')}`);
    }
  }

  const vacs = ctx.vaccines_pending ?? [];
  if (vacs.length) {
    parts.push('');
    parts.push('-- Vacinas pendentes/atrasadas --');
    for (const v of vacs) parts.push(`- ${v.vaccine_name} (${v.status})`);
  }

  const mils = ctx.recent_milestones ?? [];
  if (mils.length) {
    parts.push('');
    parts.push('-- Marcos recentes --');
    for (const ms of mils.slice(0, 10)) {
      const when = typeof ms.registered_at === 'string' ? ms.registered_at.slice(0, 10) : '';
      parts.push(`- ${ms.milestone_name}${when ? ' em ' + when : ''}`);
    }
  }

  parts.push('');
  parts.push('=== FIM DO CONTEXTO ===');
  return parts.join('\n');
}
