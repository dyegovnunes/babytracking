import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as hexEncode } from 'https://deno.land/std@0.168.0/encoding/hex.ts';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rate limit: 5 falhas → 15 min de bloqueio. Erro sempre genérico "Senha incorreta"
// pra não vazar se o link está bloqueado, expirado ou se a senha realmente bateu.
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;
const GENERIC_AUTH_ERROR = 'Senha incorreta';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return json({ error: 'Token e senha obrigatorios' }, 400);
    }

    // 1. Buscar report pelo token
    const { data: report, error: reportErr } = await supabase
      .from('shared_reports')
      .select('*')
      .eq('token', token)
      .single();

    if (reportErr || !report) {
      return json({ error: 'Relatorio nao encontrado' }, 404);
    }

    // 2. Verificar se está habilitado
    if (!report.enabled) {
      return json({ error: 'Este relatorio foi desativado' }, 403);
    }

    // 3. Verificar expiração
    if (report.expires_at && new Date(report.expires_at) < new Date()) {
      return json({ error: 'Este relatorio expirou' }, 403);
    }

    // 4. Rate limit — se lockout ativo, retorna erro genérico sem verificar senha.
    //    Não vaza estado de bloqueio nem incrementa contador (evita loop de ataque).
    if (report.locked_until && new Date(report.locked_until) > new Date()) {
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    }

    // 5. Verificar senha — aceita bcrypt (novo) e sha256 (legado, migra no sucesso).
    const algo = report.password_algo ?? 'sha256';
    let passwordOk = false;
    if (algo === 'bcrypt') {
      passwordOk = await bcrypt.compare(password, report.password_hash);
    } else {
      const sha = await sha256Hex(password);
      passwordOk = sha === report.password_hash;
    }

    if (!passwordOk) {
      const newFailed = (report.failed_attempts ?? 0) + 1;
      const patch: Record<string, unknown> = { failed_attempts: newFailed };
      if (newFailed >= MAX_FAILED_ATTEMPTS) {
        patch.locked_until = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
        patch.failed_attempts = 0; // zera após aplicar lock (próximo ciclo recomeça)
      }
      await supabase.from('shared_reports').update(patch).eq('id', report.id);
      return json({ error: GENERIC_AUTH_ERROR }, 401);
    }

    // 6. Acesso aceito — zera falhas, incrementa contador, atualiza last_accessed_at.
    //    Se o hash era SHA-256, migra pra bcrypt agora (transparente pro usuário).
    const updatePatch: Record<string, unknown> = {
      failed_attempts: 0,
      locked_until: null,
      access_count: (report.access_count ?? 0) + 1,
      last_accessed_at: new Date().toISOString(),
    };
    if (algo === 'sha256') {
      updatePatch.password_hash = await bcrypt.hash(password);
      updatePatch.password_algo = 'bcrypt';
    }
    await supabase.from('shared_reports').update(updatePatch).eq('id', report.id);

    // 5. Buscar dados do bebê (incluindo foto e quiet hours)
    const { data: baby } = await supabase
      .from('babies')
      .select('id, name, birth_date, gender, photo_url, quiet_hours_start, quiet_hours_end')
      .eq('id', report.baby_id)
      .single();

    if (!baby) {
      return json({ error: 'Bebe nao encontrado' }, 404);
    }

    // 6. Buscar todos os logs (filtro de período fica no front-end)
    const { data: logs } = await supabase
      .from('logs')
      .select('event_id, timestamp, ml, duration, notes')
      .eq('baby_id', report.baby_id)
      .order('timestamp', { ascending: false })
      .limit(5000);

    // 7. Buscar measurements
    const { data: measurements } = await supabase
      .from('measurements')
      .select('type, value, unit, measured_at')
      .eq('baby_id', report.baby_id)
      .order('measured_at', { ascending: false })
      .limit(50);

    // 8. Buscar streak
    const { data: streak } = await supabase
      .from('streaks')
      .select('current_streak, longest_streak')
      .eq('baby_id', report.baby_id)
      .single();

    // 9. Vacinas aplicadas (JOIN com catálogo vaccines para ter code/name/idade recomendada).
    const { data: vaccines } = await supabase
      .from('baby_vaccines')
      .select('applied_at, vaccines(code, short_name, name, recommended_age_days, dose_label, source)')
      .eq('baby_id', report.baby_id)
      .order('applied_at', { ascending: false });

    // 10. Marcos atingidos (achieved_at não nulo).
    const { data: milestones } = await supabase
      .from('baby_milestones')
      .select('achieved_at, photo_url, note, milestones(code)')
      .eq('baby_id', report.baby_id)
      .not('achieved_at', 'is', null)
      .order('achieved_at', { ascending: false });

    // 11. Notas de saltos.
    const { data: leapNotes } = await supabase
      .from('leap_notes')
      .select('leap_id, note, updated_at')
      .eq('baby_id', report.baby_id);

    // 12. Medicamentos ativos + logs dos últimos 30 dias.
    const { data: medications } = await supabase
      .from('medications')
      .select('id, name, dosage, frequency_hours, schedule_times, duration_type, start_date, end_date, is_active')
      .eq('baby_id', report.baby_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: medicationLogs } = await supabase
      .from('medication_logs')
      .select('medication_id, administered_at')
      .eq('baby_id', report.baby_id)
      .gte('administered_at', thirtyDaysAgo)
      .order('administered_at', { ascending: false })
      .limit(500);

    return json({
      report: {
        name: report.name,
        expires_at: report.expires_at,
        audience: report.audience ?? 'pediatrician',
      },
      baby: {
        name: baby.name,
        birthDate: baby.birth_date,
        gender: baby.gender,
        photoUrl: baby.photo_url,
        quietHoursStart: baby.quiet_hours_start ?? 22,
        quietHoursEnd: baby.quiet_hours_end ?? 7,
      },
      logs: logs ?? [],
      measurements: measurements ?? [],
      streak: streak ?? null,
      vaccines: (vaccines ?? []).map((v: any) => ({
        appliedAt: v.applied_at,
        code: v.vaccines?.code ?? null,
        name: v.vaccines?.short_name ?? v.vaccines?.name ?? 'Vacina',
        fullName: v.vaccines?.name ?? null,
        doseLabel: v.vaccines?.dose_label ?? null,
        recommendedAgeDays: v.vaccines?.recommended_age_days ?? null,
        source: v.vaccines?.source ?? null,
      })),
      milestones: (milestones ?? []).map((m: any) => ({
        code: m.milestones?.code ?? null,
        achievedAt: m.achieved_at,
        photoUrl: m.photo_url,
        note: m.note,
      })),
      leapNotes: (leapNotes ?? []).map((l: any) => ({
        leapId: l.leap_id,
        note: l.note,
        updatedAt: l.updated_at,
      })),
      medications: (medications ?? []).map((m: any) => ({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        frequencyHours: Number(m.frequency_hours),
        scheduleTimes: m.schedule_times ?? [],
        durationType: m.duration_type,
        startDate: m.start_date,
        endDate: m.end_date,
      })),
      medicationLogs: (medicationLogs ?? []).map((l: any) => ({
        medicationId: l.medication_id,
        administeredAt: l.administered_at,
      })),
    });
  } catch (error: any) {
    console.error('Report view error:', error);
    return json({ error: 'Erro interno' }, 500);
  }
});

// Links novos nascem com SHA-256 (Web Crypto, disponível no browser). Na PRIMEIRA
// autenticação bem-sucedida a edge function migra o hash pra bcrypt, de forma
// transparente pro usuário. Esta função valida o hash legado.
async function sha256Hex(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return new TextDecoder().decode(hexEncode(hashArray));
}

function json(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
