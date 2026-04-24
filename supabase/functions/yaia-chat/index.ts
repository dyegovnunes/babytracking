// yaIA chat proxy (v14 — agentic)
// Arquitetura nova: a IA acessa dados do bebe via tools/RPCs no n8n, em vez
// de receber um context_summary gigante pré-montado. Este edge function
// agora é SLIM: valida auth, limites, consent, e manda um payload pequeno
// pro n8n (só message + baby_id + baby basics). O AI Agent do n8n chama as
// tools yaia_activity / yaia_growth / yaia_vaccines / yaia_milestones /
// yaia_medications / yaia_logs_detail conforme precisa responder.

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

interface BabyBasics {
  name: string;
  gender?: string;
  birth_date?: string;
  age_days?: number;
  age_weeks?: number;
  age_months?: number;
  quiet_hours_start?: number | null;
  quiet_hours_end?: number | null;
}

interface N8nResponse {
  messages?: string[];
  reply?: string;
  suggestions?: string[];
  sources?: Array<{ title: string; url: string }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    // Auth: membership no bebê
    const { data: membership } = await admin
      .from('baby_members')
      .select('role')
      .eq('user_id', userId)
      .eq('baby_id', babyId)
      .maybeSingle();
    if (!membership) return json({ error: 'Sem acesso a este bebe' }, 403);

    // Consent
    const { data: profile } = await admin
      .from('profiles')
      .select('yaia_consent_at')
      .eq('id', userId)
      .maybeSingle();
    if (!profile?.yaia_consent_at) return json({ error: 'CONSENT_REQUIRED' }, 428);

    // Premium + limite free
    const { data: baby } = await admin
      .from('babies')
      .select('id, is_premium')
      .eq('id', babyId)
      .maybeSingle();
    if (!baby) return json({ error: 'Bebe nao encontrado' }, 404);
    const isPremium = !!baby.is_premium;

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
      await admin.from('yaia_usage').upsert(
        { user_id: userId, month_key: monthKey, count: newCount, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,month_key' },
      );
      remaining = FREE_MONTHLY_LIMIT - newCount;
    }

    // Baby basics (sempre chamada — IA precisa pra saudar e saber idade).
    // Inline aqui pra evitar 1 tool call a mais. Outros dados ficam com as tools.
    const { data: basics, error: basicsErr } = await admin.rpc('yaia_baby_basics', { p_baby_id: babyId });
    if (basicsErr || !basics) {
      console.error('[yaia] yaia_baby_basics failed', basicsErr);
      return json({ error: 'NO_CONTEXT' }, 503);
    }
    const babyBasics = basics as BabyBasics;
    if (!babyBasics.name) {
      console.error('[yaia] guard-rail: baby.name missing', { babyId, userId });
      return json({ error: 'NO_CONTEXT' }, 503);
    }

    // Chamada slim pro n8n. Sem context, sem context_summary.
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
        baby: babyBasics,
      }),
    });

    if (!n8nResp.ok) {
      const errText = await n8nResp.text().catch(() => '');
      console.error('[yaia] n8n non-ok', n8nResp.status, errText.slice(0, 200));
      return json({ error: 'Nao consegui falar com a yaIA agora. Tenta em alguns instantes.' }, 502);
    }

    const n8nBody = await n8nResp.text();
    await admin.from('yaia_debug_log').insert({
      user_id: userId, baby_id: babyId, stage: 'n8n_response', status: n8nResp.status, raw_body: n8nBody,
    }).then(() => {}).catch(() => {});

    const n8nData = tolerantParseN8n(n8nBody);
    if (!n8nData) {
      return json({ error: 'Resposta invalida da yaIA.', debug: { preview: n8nBody.slice(0, 300) } }, 502);
    }

    const messages = normalizeMessages(n8nData);
    if (!messages.length) {
      return json({ error: 'Resposta invalida da yaIA.', debug: { keys: Object.keys(n8nData) } }, 502);
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

    const nowIso = new Date().toISOString();
    const assistantContent = messages.join(BUBBLE_SEPARATOR);
    const { data: inserted } = await admin
      .from('yaia_conversations')
      .insert([
        { user_id: userId, baby_id: babyId, role: 'user', content: message, created_at: nowIso },
        {
          user_id: userId, baby_id: babyId, role: 'assistant', content: assistantContent,
          created_at: new Date(Date.now() + 1).toISOString(),
        },
      ])
      .select('id, role');
    const assistantRow = inserted?.find((r) => r.role === 'assistant');

    return json({
      messages,
      suggestions,
      sources,
      message_id: assistantRow?.id,
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

function tolerantParseN8n(body: string): N8nResponse | null {
  let trimmed = body.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('=')) trimmed = trimmed.slice(1).trim();
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?\s*\n?/i, '').trim();
    if (trimmed.endsWith('```')) trimmed = trimmed.slice(0, -3).trim();
  }
  let parsed: unknown;
  try { parsed = JSON.parse(trimmed); } catch { return null; }
  for (let i = 0; i < 4 && parsed != null; i++) {
    if (Array.isArray(parsed)) { parsed = parsed[0]; continue; }
    if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); continue; } catch { return null; } }
    if (typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.messages) || typeof obj.reply === 'string') return obj as N8nResponse;
    if ('output' in obj) { parsed = obj.output; continue; }
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
    const parts = data.reply.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    return parts.slice(0, 2);
  }
  return [];
}
