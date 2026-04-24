// yaIA chat proxy (v11)
// - Parser remove prefixo '=' que o n8n vaza com expressoes em Respond With Text
// - Links em sources[] ganham UTM (utm_source=yaia, utm_medium=chat, utm_campaign=in_app)
// - DEBUG: grava body do n8n em yaia_debug_log pra diagnose fora de banda
// - Valida JWT do app
// - Confere membership + consent
// - Enforce limite free
// - Chama get_yaia_context e envia payload enriquecido pro n8n (sem history)
// - Guard-rail: se baby.name vier vazio, nega envio pro n8n (NO_CONTEXT)
// - Aceita resposta novo formato { messages, suggestions, sources } OU legado { reply }
// - Persiste conversa com separador "\n\n---\n\n" entre bubbles
//
// Historico da conversa do AI Agent agora e responsabilidade do Postgres Chat
// Memory do n8n (tabela yaia_agent_memory). O app le yaia_conversations
// apenas para render da UI.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const YAIA_N8N_URL = Deno.env.get('YAIA_N8N_URL') ?? '';
const YAIA_WEBHOOK_SECRET = Deno.env.get('YAIA_WEBHOOK_SECRET') ?? '';

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FREE_MONTHLY_LIMIT = 10;
const BUBBLE_SEPARATOR = '\n\n---\n\n';

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
    quiet_hours_start?: number | null;
    quiet_hours_end?: number | null;
  };
  recent_logs?: Array<{ event_id: string; timestamp: string; ml?: number; duration?: number; notes?: string }>;
  logs_summary_7d?: {
    total_sleep_minutes?: number;
    sleep_sessions?: number;
    wake_events?: number;
    total_bottle_ml?: number;
    bottle_sessions?: number;
    breast_sessions?: number;
    breast_left?: number;
    breast_right?: number;
    breast_both?: number;
    diaper_wet?: number;
    diaper_dirty?: number;
    bath_count?: number;
  };
  measurements?: Array<{ type: string; value: number; unit: string; measured_at: string; notes?: string }>;
  active_medications?: Array<{ name: string; dosage?: string; frequency_hours?: number; schedule_times?: unknown; notes?: string; last_given?: string; start_date?: string; end_date?: string }>;
  recent_inactive_medications?: Array<{ name: string; dosage?: string; start_date?: string; end_date?: string }>;
  vaccines_applied?: Array<{ vaccine_name: string; applied_at: string; location?: string }>;
  vaccines_pending?: Array<{ vaccine_name: string; status: string }>;
  vaccines_summary?: { applied_count: number; pending_count: number; overdue_count: number; total_count: number };
  milestones_achieved?: Array<{ milestone_name: string; category?: string; achieved_at: string; note?: string }>;
  milestones_summary_by_category?: Record<string, number>;
  leap_mood_recent?: Array<{ leap_id: string; mood: string; entry_date: string }>;
}

interface N8nResponse {
  messages?: string[];
  reply?: string; // fallback legado
  suggestions?: string[];
  sources?: Array<{ title: string; url: string }>;
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

    // Contexto real do bebe via RPC
    const { data: contextData, error: ctxErr } = await admin.rpc('get_yaia_context', {
      p_user_id: userId,
      p_baby_id: babyId,
    });
    if (ctxErr) console.error('[yaia] get_yaia_context failed', ctxErr);
    const context: YaiaContext = (contextData as YaiaContext) ?? {};

    // GUARD-RAIL: sem nome do bebe, nao tem como a IA responder sem inventar.
    if (!context.baby?.name) {
      console.error('[yaia] guard-rail: baby.name missing from context', { babyId, userId });
      return json({ error: 'NO_CONTEXT' }, 503);
    }

    // Historico da conversa: agora e responsabilidade do Postgres Chat Memory
    // do n8n (tabela yaia_agent_memory). Nao enviamos mais do edge.

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
        user_id: userId,
        baby_id: babyId,
        baby: context.baby,
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
    console.log('[yaia] n8n raw body (first 400 chars):', n8nBody.slice(0, 400));

    // DEBUG: grava body bruto em yaia_debug_log pra diagnose.
    await admin.from('yaia_debug_log').insert({
      user_id: userId,
      baby_id: babyId,
      stage: 'n8n_response',
      status: n8nResp.status,
      raw_body: n8nBody,
    }).then(() => {}).catch(() => {});

    const n8nData = tolerantParseN8n(n8nBody);
    if (!n8nData) {
      await admin.from('yaia_debug_log').insert({
        user_id: userId,
        baby_id: babyId,
        stage: 'parse_fail',
        status: n8nResp.status,
        raw_body: n8nBody,
        error_msg: 'tolerantParseN8n returned null',
      }).then(() => {}).catch(() => {});
      return json({
        error: 'Resposta invalida da yaIA.',
        debug: { stage: 'parse_fail', preview: n8nBody.slice(0, 300) },
      }, 502);
    }

    const messages = normalizeMessages(n8nData);
    if (!messages.length) {
      await admin.from('yaia_debug_log').insert({
        user_id: userId,
        baby_id: babyId,
        stage: 'no_messages',
        status: n8nResp.status,
        raw_body: n8nBody,
        parsed: n8nData as unknown as Record<string, unknown>,
        error_msg: `normalizeMessages returned empty; keys: ${Object.keys(n8nData).join(',')}`,
      }).then(() => {}).catch(() => {});
      return json({
        error: 'Resposta invalida da yaIA.',
        debug: { stage: 'no_messages', keys: Object.keys(n8nData), preview: n8nBody.slice(0, 300) },
      }, 502);
    }

    const suggestions = Array.isArray(n8nData.suggestions)
      ? n8nData.suggestions.filter((s) => typeof s === 'string' && s.trim().length > 0).slice(0, 3)
      : [];
    const sources = Array.isArray(n8nData.sources)
      ? n8nData.sources
          .filter((s) => s && typeof s.title === 'string' && typeof s.url === 'string')
          .slice(0, 3)
          .map((s) => ({ title: s.title, url: appendUtm(s.url) }))
      : [];

    // Persistencia: 1 linha user + 1 linha assistant (separador junta os bubbles).
    const nowIso = new Date().toISOString();
    const assistantContent = messages.join(BUBBLE_SEPARATOR);
    const { data: inserted } = await admin
      .from('yaia_conversations')
      .insert([
        { user_id: userId, baby_id: babyId, role: 'user', content: message, created_at: nowIso },
        {
          user_id: userId,
          baby_id: babyId,
          role: 'assistant',
          content: assistantContent,
          created_at: new Date(Date.now() + 1).toISOString(),
        },
      ])
      .select('id, role');
    const assistantRow = inserted?.find((r) => r.role === 'assistant');
    const assistantMessageId = assistantRow?.id as string | undefined;

    return json({
      messages,
      suggestions,
      sources,
      message_id: assistantMessageId,
      remaining,
    }, 200);
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

// Adiciona UTM params pra identificar clique vindo do chat da yaIA.
// Preserva params existentes; se a URL ja tem utm_source, nao sobrescreve.
function appendUtm(url: string): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'yaia');
    if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'chat');
    if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', 'in_app');
    return u.toString();
  } catch {
    return url;
  }
}

// Aceita qualquer shape razoavel que o n8n possa devolver:
// 1. Objeto direto: { messages: [...], ... }
// 2. String JSON: "{\"messages\":[...]}" (duplo-encoded)
// 3. Array: [{ messages: [...] }] ou [{ output: { messages: [...] } }]
// 4. Objeto com output aninhado: { output: { messages: [...] } }
// 5. Objeto com output como string JSON: { output: "{\"messages\":[...]}" }
// Retorna null se nao achar shape utilizavel.
function tolerantParseN8n(body: string): N8nResponse | null {
  let trimmed = body.trim();
  if (!trimmed) return null;

  // n8n com "Respond With: Text" + expressao `={{ ... }}` as vezes vaza o
  // prefixo '=' literal no output. Tira antes de tentar JSON.parse.
  if (trimmed.startsWith('=')) trimmed = trimmed.slice(1).trim();

  // Tenta parsear JSON. Se falhar, game over (nao eh JSON).
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }

  // Desembrulha ate achar algo que pareca N8nResponse.
  for (let i = 0; i < 4 && parsed != null; i++) {
    // Array -> pega primeiro item
    if (Array.isArray(parsed)) {
      parsed = parsed[0];
      continue;
    }
    // String -> tenta parsear de novo (double-encoded)
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
        continue;
      } catch {
        return null;
      }
    }
    if (typeof parsed !== 'object') return null;

    const obj = parsed as Record<string, unknown>;

    // Shape direto: tem messages ou reply no root
    if (Array.isArray(obj.messages) || typeof obj.reply === 'string') {
      return obj as N8nResponse;
    }

    // Shape com output: { output: ... }
    if ('output' in obj) {
      parsed = obj.output;
      continue;
    }

    // Sem output, sem messages, sem reply: da up.
    return null;
  }

  return null;
}

function normalizeMessages(data: N8nResponse): string[] {
  if (Array.isArray(data.messages)) {
    return data.messages
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0)
      .slice(0, 3)
      .map((m) => m.trim());
  }
  if (typeof data.reply === 'string' && data.reply.trim().length > 0) {
    const parts = data.reply
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.slice(0, 2);
  }
  return [];
}

function buildContextSummary(ctx: YaiaContext): string {
  const parts: string[] = [];
  parts.push('=== CONTEXTO REAL DO BEBE (use esses dados, nunca invente) ===');

  // Dados basicos
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
    if (ctx.baby.quiet_hours_start != null && ctx.baby.quiet_hours_end != null) {
      parts.push(`Horario noturno configurado: das ${ctx.baby.quiet_hours_start}h as ${ctx.baby.quiet_hours_end}h`);
    }
  } else {
    parts.push('Nome: nao disponivel');
  }

  // Medidas (peso, altura, periimetro)
  const meas = ctx.measurements ?? [];
  if (meas.length) {
    parts.push('');
    parts.push('-- Medidas recentes (peso, altura, perimetro) --');
    for (const m of meas.slice(0, 10)) {
      const when = typeof m.measured_at === 'string' ? m.measured_at.slice(0, 10) : '';
      parts.push(`- ${when} | ${m.type}: ${m.value}${m.unit ?? ''}${m.notes ? ' (' + m.notes + ')' : ''}`);
    }
  }

  // Resumo agregado ultimos 7 dias
  const s7 = ctx.logs_summary_7d;
  if (s7) {
    parts.push('');
    parts.push('-- Resumo dos ultimos 7 dias --');
    if (s7.sleep_sessions) {
      const hours = Math.round((s7.total_sleep_minutes ?? 0) / 6) / 10;
      parts.push(`- Sono: ${s7.sleep_sessions} sessoes${hours > 0 ? `, ~${hours}h totais` : ''}`);
    }
    if (s7.breast_sessions || s7.bottle_sessions) {
      const feeds: string[] = [];
      if (s7.breast_sessions) feeds.push(`${s7.breast_sessions} mamadas no peito (esq ${s7.breast_left ?? 0} / dir ${s7.breast_right ?? 0} / ambos ${s7.breast_both ?? 0})`);
      if (s7.bottle_sessions) feeds.push(`${s7.bottle_sessions} mamadeiras`);
      if (s7.total_bottle_ml) feeds.push(`${s7.total_bottle_ml}ml em mamadeiras`);
      parts.push(`- Alimentacao: ${feeds.join(', ')}`);
    }
    const diapers = (s7.diaper_wet ?? 0) + (s7.diaper_dirty ?? 0);
    if (diapers) {
      parts.push(`- Fraldas: ${diapers} trocas (${s7.diaper_wet ?? 0} xixi, ${s7.diaper_dirty ?? 0} coco)`);
    }
    if (s7.bath_count) parts.push(`- Banhos: ${s7.bath_count}`);
  }

  // Logs recentes (detalhados)
  const logs = ctx.recent_logs ?? [];
  if (logs.length) {
    parts.push('');
    parts.push(`-- Ultimos ${Math.min(logs.length, 30)} registros (mais recente primeiro) --`);
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
    parts.push('-- Registros: nenhum log nos ultimos 30 dias. Se o pai/mae perguntar sobre padrao de sono/fralda/alimentacao, diga que ainda nao ha dados suficientes. --');
  }

  // Medicamentos ativos
  const meds = ctx.active_medications ?? [];
  if (meds.length) {
    parts.push('');
    parts.push('-- Medicamentos ATIVOS --');
    for (const m of meds) {
      const bits = [m.name];
      if (m.dosage) bits.push(m.dosage);
      if (m.frequency_hours) bits.push(`a cada ${m.frequency_hours}h`);
      if (m.last_given) bits.push(`ultima dose: ${m.last_given}`);
      if (m.start_date) bits.push(`desde ${m.start_date}`);
      if (m.end_date) bits.push(`ate ${m.end_date}`);
      parts.push(`- ${bits.join(' | ')}`);
    }
  }

  // Medicamentos inativos recentes (historico)
  const medsOff = ctx.recent_inactive_medications ?? [];
  if (medsOff.length) {
    parts.push('');
    parts.push('-- Medicamentos recentes (ja encerrados, ultimos 90 dias) --');
    for (const m of medsOff) {
      parts.push(`- ${m.name}${m.dosage ? ' ' + m.dosage : ''} (de ${m.start_date ?? '?'} a ${m.end_date ?? '?'})`);
    }
  }

  // Vacinas
  const vSum = ctx.vaccines_summary;
  const vApplied = ctx.vaccines_applied ?? [];
  const vPending = ctx.vaccines_pending ?? [];
  if (vSum || vApplied.length || vPending.length) {
    parts.push('');
    parts.push('-- Vacinas --');
    if (vSum) {
      parts.push(`Resumo: ${vSum.applied_count} aplicadas, ${vSum.pending_count} pendentes, ${vSum.overdue_count} atrasadas (total ${vSum.total_count}).`);
    }
    if (vApplied.length) {
      parts.push(`Aplicadas (${vApplied.length}):`);
      for (const v of vApplied) {
        const when = typeof v.applied_at === 'string' ? v.applied_at.slice(0, 10) : '?';
        parts.push(`- ${v.vaccine_name} em ${when}${v.location ? ' (' + v.location + ')' : ''}`);
      }
    }
    if (vPending.length) {
      parts.push(`Pendentes/Atrasadas (${vPending.length}):`);
      for (const v of vPending) parts.push(`- ${v.vaccine_name} (${v.status})`);
    }
  }

  // Marcos atingidos + resumo por categoria
  const mils = ctx.milestones_achieved ?? [];
  const milSum = ctx.milestones_summary_by_category ?? {};
  if (mils.length) {
    parts.push('');
    parts.push(`-- Marcos atingidos (${mils.length}) --`);
    const catBits = Object.entries(milSum).map(([c, n]) => `${c}: ${n}`);
    if (catBits.length) parts.push(`Por categoria: ${catBits.join(', ')}`);
    for (const m of mils.slice(0, 20)) {
      const when = typeof m.achieved_at === 'string' ? m.achieved_at.slice(0, 10) : '';
      const cat = m.category ? ` [${m.category}]` : '';
      parts.push(`- ${m.milestone_name}${cat} em ${when}${m.note ? ': ' + m.note : ''}`);
    }
  }

  // Saltos (leap mood entries recentes)
  const mood = ctx.leap_mood_recent ?? [];
  if (mood.length) {
    parts.push('');
    parts.push('-- Registros de humor em saltos (ultimos 14 dias) --');
    for (const me of mood.slice(0, 20)) {
      const when = typeof me.entry_date === 'string' ? me.entry_date.slice(0, 10) : '';
      parts.push(`- ${when} | salto ${me.leap_id}: ${me.mood}`);
    }
  }

  parts.push('');
  parts.push('=== FIM DO CONTEXTO ===');
  return parts.join('\n');
}
