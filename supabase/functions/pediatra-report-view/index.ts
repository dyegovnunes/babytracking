import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, apikey, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // 1. Extrair JWT do header
    const authHeader = req.headers.get('authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '').trim()
    if (!jwt) return json({ error: 'Não autorizado' }, 401)

    // 2. Verificar usuário via JWT
    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !user) return json({ error: 'Não autorizado' }, 401)

    // 3. Verificar que é uma pediatra aprovada
    const { data: ped } = await supabase
      .from('pediatricians')
      .select('id, name, approved_at')
      .eq('user_id', user.id)
      .single()

    if (!ped || !ped.approved_at) return json({ error: 'Acesso negado' }, 403)

    // 4. Ler baby_id do body
    const { baby_id } = await req.json()
    if (!baby_id) return json({ error: 'baby_id obrigatório' }, 400)

    // 5. Verificar vínculo ativo
    const { data: link } = await supabase
      .from('pediatrician_patients')
      .select('id')
      .eq('pediatrician_id', ped.id)
      .eq('baby_id', baby_id)
      .is('unlinked_at', null)
      .single()

    if (!link) return json({ error: 'Paciente não vinculado' }, 403)

    // 6. Buscar dados do bebê
    const { data: baby } = await supabase
      .from('babies')
      .select('id, name, birth_date, gender, photo_url, quiet_hours_start, quiet_hours_end')
      .eq('id', baby_id)
      .single()

    if (!baby) return json({ error: 'Bebê não encontrado' }, 404)

    // 7. Logs dos últimos 30 dias
    // IMPORTANTE: a coluna `timestamp` em `logs` é bigint (ms desde epoch),
    // não timestamptz — comparar com número, não com string ISO.
    const thirtyDaysAgoMs = Date.now() - 30 * 86400000
    const { data: logs } = await supabase
      .from('logs')
      .select('event_id, timestamp, ml, duration, notes')
      .eq('baby_id', baby_id)
      .gte('timestamp', thirtyDaysAgoMs)
      .order('timestamp', { ascending: false })
      .limit(2000)

    // 8. Medições (para curva de crescimento)
    const { data: measurements } = await supabase
      .from('measurements')
      .select('type, value, unit, measured_at')
      .eq('baby_id', baby_id)
      .order('measured_at', { ascending: false })
      .limit(50)

    // 9. Vacinas aplicadas
    const { data: vaccines } = await supabase
      .from('baby_vaccines')
      .select('applied_at, vaccines(code, short_name, name, recommended_age_days, dose_label, source)')
      .eq('baby_id', baby_id)
      .order('applied_at', { ascending: false })

    // 10. Todos os marcos do catálogo + quais foram alcançados
    const [{ data: allMilestones }, { data: achieved }] = await Promise.all([
      supabase.from('milestones').select('code, title, category, age_min_days, age_max_days').order('age_min_days'),
      supabase.from('baby_milestones').select('achieved_at, photo_url, note, milestones(code, title)').eq('baby_id', baby_id).not('achieved_at', 'is', null),
    ])

    // 11. Medicamentos ativos
    const { data: medications } = await supabase
      .from('medications')
      .select('id, name, dosage, frequency_hours, schedule_times, duration_type, start_date, end_date, is_active')
      .eq('baby_id', baby_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data: medicationLogs } = await supabase
      .from('medication_logs')
      .select('medication_id, administered_at')
      .eq('baby_id', baby_id)
      .gte('administered_at', sevenDaysAgo)
      .order('administered_at', { ascending: false })
      .limit(200)

    return json({
      baby: {
        id: baby.id,
        name: baby.name,
        birthDate: baby.birth_date,
        gender: baby.gender,
        photoUrl: baby.photo_url,
        quietHoursStart: baby.quiet_hours_start ?? 22,
        quietHoursEnd: baby.quiet_hours_end ?? 7,
      },
      logs: (logs ?? []).map((l: any) => ({
        eventId: l.event_id,
        // timestamp é bigint (ms) no banco — converter para número JS para
        // evitar que o JSON serializer o trate como string em alguns ambientes
        timestamp: new Date(Number(l.timestamp)).toISOString(),
        ml: l.ml,
        duration: l.duration,
        notes: l.notes,
      })),
      measurements: (measurements ?? []).map((m: any) => ({
        type: m.type,
        value: m.value,
        unit: m.unit,
        measuredAt: m.measured_at,
      })),
      vaccines: (vaccines ?? []).map((v: any) => ({
        appliedAt: v.applied_at,
        code: v.vaccines?.code ?? null,
        name: v.vaccines?.short_name ?? v.vaccines?.name ?? 'Vacina',
        fullName: v.vaccines?.name ?? null,
        doseLabel: v.vaccines?.dose_label ?? null,
        recommendedAgeDays: v.vaccines?.recommended_age_days ?? null,
        source: v.vaccines?.source ?? null,
      })),
      allMilestones: (allMilestones ?? []).map((m: any) => ({
        code: m.code,
        title: m.title,
        category: m.category,
        ageMinDays: m.age_min_days,
        ageMaxDays: m.age_max_days,
      })),
      achievedMilestones: (achieved ?? []).map((m: any) => ({
        code: m.milestones?.code ?? null,
        title: m.milestones?.title ?? null,
        achievedAt: m.achieved_at,
        photoUrl: m.photo_url,
        note: m.note,
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
    })
  } catch (err: any) {
    console.error('pediatra-report-view error:', err)
    return json({ error: 'Erro interno' }, 500)
  }
})

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
