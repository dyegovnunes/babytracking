import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSheetBackClose } from '../../hooks/useSheetBackClose';
import { formatRelativeShort } from '../../lib/formatters';

// ── Tipos das RPCs ──────────────────────────────────────────────────────

interface OverviewMetrics {
  signups: number;
  onboarded: number;
  activated: number;
  paywall_views: number;
  conversions: number;
  distinct_users: number;
  total_events: number;
}

interface OverviewResp {
  period_days: number;
  platform: string | null;
  first_event_at: string | null;
  current: OverviewMetrics;
  previous: OverviewMetrics;
}

interface FunnelStep {
  key: string;
  label: string;
  count: number;
}

interface FunnelResp {
  period_days: number;
  platform: string | null;
  steps: FunnelStep[];
}

interface TriggerRow {
  trigger: string;
  views: number;
  unique_views: number;
  dismissed: number;
  subscribed: number;
}

interface MonetizationResp {
  period_days: number;
  platform: string | null;
  unique_paywall_views: number;
  unique_subscriptions: number;
  overall_conversion_pct: number;
  by_trigger: TriggerRow[];
}

interface LastTouchEntry {
  event: string;
  conversions: number;
  pct: number;
}

interface LastTouchResp {
  period_days: number;
  window_hours: number;
  platform: string | null;
  total_conversions: number;
  attributed: number;
  cold_conversions: number;
  breakdown: LastTouchEntry[];
}

interface TimeToEventPair {
  from_e: string;
  to_e: string;
  label: string;
  n: number;
  median_seconds: number;
  p75_seconds: number;
  p90_seconds: number;
}

interface TimeToEventResp {
  period_days: number;
  platform: string | null;
  pairs: TimeToEventPair[];
}

interface CohortRow {
  cohort_week: string;
  size: number;
  w0: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  w5: number;
  w6: number;
  w7: number;
}

interface CohortResp {
  weeks: number;
  platform: string | null;
  cohorts: CohortRow[];
}

interface DailySeriesResp {
  days: string[];
  signups: number[];
  onboarded: number[];
  activated: number[];
  paywall_views: number[];
  conversions: number[];
  active_users: number[];
}

interface DropoffUser {
  user_id: string;
  email: string;
  reached_at: string;
  last_seen_at: string | null;
  last_seen_platform: string | null;
  signup_platform: string | null;
  created_at: string;
}

interface DropoffResp {
  from_event: string;
  to_event: string;
  period_days: number;
  total: number;
  users: DropoffUser[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

function deltaPct(current: number, previous: number): { value: number; sign: 'up' | 'down' | 'flat' | 'na' } {
  if (previous === 0 && current === 0) return { value: 0, sign: 'flat' };
  if (previous === 0) return { value: 100, sign: 'na' };
  const v = ((current - previous) / previous) * 100;
  return {
    value: Math.round(v * 10) / 10,
    sign: v > 0.5 ? 'up' : v < -0.5 ? 'down' : 'flat',
  };
}

function formatPctDelta(d: ReturnType<typeof deltaPct>): string {
  if (d.sign === 'na') return 'sem base';
  if (d.sign === 'flat') return 'estável';
  return `${d.value > 0 ? '+' : ''}${d.value}%`;
}

function deltaColor(sign: 'up' | 'down' | 'flat' | 'na'): string {
  if (sign === 'up') return 'text-green-500';
  if (sign === 'down') return 'text-error';
  return 'text-on-surface-variant/60';
}

function eventLabel(key: string): string {
  const map: Record<string, string> = {
    yaia_first_message: '1ª msg na YA·IA',
    yaia_session_deep: 'Sessão profunda YA·IA',
    super_report_viewed: 'Viu Super Relatório',
    super_report_generated: 'Gerou Super Relatório',
    super_report_shared: 'Compartilhou Super Relatório',
    insights_tab_opened: 'Abriu Insights',
    milestone_registered: 'Registrou marco',
    development_leap_opened: 'Abriu salto de dev.',
    vaccine_record_opened: 'Abriu vacinas',
    blog_article_opened: 'Leu artigo do blog',
    first_record_created: 'Criou 1º registro',
    records_day_5plus: 'Dia com 5+ registros',
    streak_day_3: 'Streak 3 dias',
    streak_day_7: 'Streak 7 dias',
    onboarding_completed: 'Completou onboarding',
  };
  return map[key] ?? key;
}

function formatDuration(seconds: number): string {
  if (seconds == null || isNaN(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
  if (seconds < 86400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.round((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

/**
 * Cor de fundo pra célula da tabela de cohort retention.
 * % alto → primary com opacidade alta. Baixo → quase transparente.
 */
function cohortHeatColor(pct: number): string {
  if (pct === 0) return 'bg-surface-container-lowest text-on-surface-variant/40';
  if (pct >= 70) return 'bg-primary text-on-primary';
  if (pct >= 40) return 'bg-primary/60 text-on-primary';
  if (pct >= 20) return 'bg-primary/30 text-on-surface';
  return 'bg-primary/15 text-on-surface-variant';
}

/**
 * Gera CSV de objeto plano. Aceita rows como array de objetos, ou seções.
 */
function downloadCsv(filename: string, sections: { title: string; headers: string[]; rows: (string | number | null | undefined)[][] }[]) {
  const escape = (v: string | number | null | undefined): string => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines: string[] = [];
  for (const sec of sections) {
    lines.push(`# ${sec.title}`);
    lines.push(sec.headers.map(escape).join(','));
    for (const row of sec.rows) {
      lines.push(row.map(escape).join(','));
    }
    lines.push('');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Página principal ────────────────────────────────────────────────────

type Period = 7 | 30 | 90;
type Platform = 'all' | 'ios' | 'android' | 'web';

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>(30);
  const [platform, setPlatform] = useState<Platform>('all');
  const [touchWindow, setTouchWindow] = useState<24 | 48 | 168>(24);

  const [overview, setOverview] = useState<OverviewResp | null>(null);
  const [funnel, setFunnel] = useState<FunnelResp | null>(null);
  const [monetization, setMonetization] = useState<MonetizationResp | null>(null);
  const [lastTouch, setLastTouch] = useState<LastTouchResp | null>(null);
  const [timeToEvent, setTimeToEvent] = useState<TimeToEventResp | null>(null);
  const [cohort, setCohort] = useState<CohortResp | null>(null);
  const [series, setSeries] = useState<DailySeriesResp | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drilldown, setDrilldown] = useState<{ from: string; to: string; label: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const platArg = platform === 'all' ? null : platform;
      const [ov, fn, mon, lt, tte, ch, sr] = await Promise.all([
        supabase.rpc('analytics_overview', { p_days: period, p_platform: platArg }),
        supabase.rpc('analytics_discovery_funnel', { p_days: period, p_platform: platArg }),
        supabase.rpc('analytics_monetization_funnel', { p_days: period, p_platform: platArg }),
        supabase.rpc('analytics_last_touch', { p_days: period, p_window_hours: touchWindow, p_platform: platArg }),
        supabase.rpc('analytics_time_to_event', { p_days: period, p_platform: platArg }),
        supabase.rpc('analytics_cohort_retention', { p_weeks: 8, p_platform: platArg }),
        supabase.rpc('analytics_daily_series', { p_days: 14, p_platform: platArg }),
      ]);
      if (cancelled) return;
      const firstErr = ov.error || fn.error || mon.error || lt.error || tte.error || ch.error || sr.error;
      if (firstErr) {
        setError(firstErr.message);
      } else {
        setOverview(ov.data as OverviewResp);
        setFunnel(fn.data as FunnelResp);
        setMonetization(mon.data as MonetizationResp);
        setLastTouch(lt.data as LastTouchResp);
        setTimeToEvent(tte.data as TimeToEventResp);
        setCohort(ch.data as CohortResp);
        setSeries(sr.data as DailySeriesResp);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, platform, touchWindow]);

  const isEmpty = useMemo(() => overview?.first_event_at == null && (overview?.current.signups ?? 0) === 0, [overview]);

  function exportCsv() {
    if (!overview || !funnel || !monetization || !lastTouch || !timeToEvent || !cohort) return;
    const sections: { title: string; headers: string[]; rows: (string | number | null | undefined)[][] }[] = [];

    sections.push({
      title: `Overview · últimos ${period} dias · platform=${platform}`,
      headers: ['metric', 'current', 'previous', 'delta_pct'],
      rows: (
        [
          ['signups', overview.current.signups, overview.previous.signups],
          ['onboarded', overview.current.onboarded, overview.previous.onboarded],
          ['activated', overview.current.activated, overview.previous.activated],
          ['paywall_views', overview.current.paywall_views, overview.previous.paywall_views],
          ['conversions', overview.current.conversions, overview.previous.conversions],
          ['distinct_users', overview.current.distinct_users, overview.previous.distinct_users],
        ] as [string, number, number][]
      ).map(([m, c, p]) => [m, c, p, deltaPct(c, p).value]),
    });

    sections.push({
      title: 'Funil de descoberta',
      headers: ['step', 'label', 'count', 'pct_of_cohort'],
      rows: funnel.steps.map((s, i) => [
        i + 1,
        s.label,
        s.count,
        funnel.steps[0].count > 0 ? Math.round((s.count / funnel.steps[0].count) * 1000) / 10 : 0,
      ]),
    });

    sections.push({
      title: 'Funil de monetização — por trigger',
      headers: ['trigger', 'views', 'unique_views', 'dismissed', 'subscribed', 'conv_pct'],
      rows: monetization.by_trigger.map(t => [
        t.trigger,
        t.views,
        t.unique_views,
        t.dismissed,
        t.subscribed,
        t.unique_views > 0 ? Math.round((t.subscribed / t.unique_views) * 1000) / 10 : 0,
      ]),
    });

    sections.push({
      title: `Last-touch · janela ${touchWindow}h`,
      headers: ['event', 'conversions', 'pct'],
      rows: lastTouch.breakdown.map(b => [b.event, b.conversions, b.pct]),
    });

    sections.push({
      title: 'Tempo entre etapas (segundos)',
      headers: ['from', 'to', 'label', 'n', 'median', 'p75', 'p90'],
      rows: timeToEvent.pairs.map(p => [
        p.from_e,
        p.to_e,
        p.label,
        p.n,
        p.median_seconds,
        p.p75_seconds,
        p.p90_seconds,
      ]),
    });

    sections.push({
      title: 'Cohort retention semanal (% retidos)',
      headers: ['cohort_week', 'size', 'w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7'],
      rows: cohort.cohorts.map(c => [
        c.cohort_week,
        c.size,
        c.size > 0 ? Math.round((c.w0 / c.size) * 1000) / 10 : 0,
        c.size > 0 ? Math.round((c.w1 / c.size) * 1000) / 10 : 0,
        c.size > 0 ? Math.round((c.w2 / c.size) * 1000) / 10 : 0,
        c.size > 0 ? Math.round((c.w3 / c.size) * 1000) / 10 : 0,
        c.size > 0 ? Math.round((c.w4 / c.size) * 1000) / 10 : 0,
        c.size > 0 ? Math.round((c.w5 / c.size) * 1000) / 10 : 0,
        c.size > 0 ? Math.round((c.w6 / c.size) * 1000) / 10 : 0,
        c.size > 0 ? Math.round((c.w7 / c.size) * 1000) / 10 : 0,
      ]),
    });

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`yaya_analytics_${stamp}_${period}d_${platform}.csv`, sections);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-headline text-xl font-bold text-on-surface">Analytics</h2>
        <div className="flex gap-2 flex-wrap items-center">
          <SegmentedFilter
            options={[
              { value: 7, label: '7d' },
              { value: 30, label: '30d' },
              { value: 90, label: '90d' },
            ]}
            value={period}
            onChange={v => setPeriod(v as Period)}
          />
          <SegmentedFilter
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'ios', label: 'iOS' },
              { value: 'android', label: 'Android' },
              { value: 'web', label: 'Web' },
            ]}
            value={platform}
            onChange={v => setPlatform(v as Platform)}
          />
          <button
            onClick={exportCsv}
            disabled={loading || isEmpty}
            className="inline-flex items-center gap-1.5 font-label text-xs px-3 py-1.5 rounded-md bg-surface-container-lowest border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">download</span>
            CSV
          </button>
        </div>
      </div>

      {!loading && isEmpty && (
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-6 py-10 text-center mb-6">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-5xl">insights</span>
          <h3 className="font-headline text-lg font-semibold text-on-surface mt-3">
            Aguardando primeiros eventos
          </h3>
          <p className="font-body text-sm text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed">
            A coleta foi implantada mas nenhum evento chegou ainda. Assim que usuários começarem
            a usar o app na nova versão, os dados aparecem aqui.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-error/10 border border-error/25 rounded-md px-4 py-3 mb-5 font-label text-xs text-error">
          Erro: {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">
            progress_activity
          </span>
        </div>
      ) : (
        <>
          {overview && !isEmpty && series && <OverviewSection data={overview} series={series} />}
          {funnel && !isEmpty && (
            <DiscoveryFunnelSection
              data={funnel}
              onDrilldown={(from, to, label) => setDrilldown({ from, to, label })}
            />
          )}
          {timeToEvent && !isEmpty && <TimeToEventSection data={timeToEvent} />}
          {cohort && !isEmpty && <CohortRetentionSection data={cohort} />}
          {monetization && !isEmpty && <MonetizationSection data={monetization} />}
          {lastTouch && !isEmpty && (
            <LastTouchSection data={lastTouch} window={touchWindow} onWindow={setTouchWindow} />
          )}

          {!isEmpty && overview?.first_event_at && (
            <div className="mt-6 p-3 rounded-md bg-surface-container-lowest border border-outline-variant/20 font-label text-xs text-on-surface-variant/80 leading-relaxed">
              <span className="text-on-surface font-semibold">Coleta iniciada:</span>{' '}
              {new Date(overview.first_event_at).toLocaleDateString('pt-BR')} · Eventos antes
              dessa data não existem (cohort retroativo é parcial). Comparações com período
              anterior podem ser distorcidas até completar 1 ciclo de coleta.
            </div>
          )}
        </>
      )}

      {drilldown && (
        <DropoffModal
          fromEvent={drilldown.from}
          toEvent={drilldown.to}
          label={drilldown.label}
          period={period}
          platform={platform}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}

// ── Sections ────────────────────────────────────────────────────────────

function OverviewSection({ data, series }: { data: OverviewResp; series: DailySeriesResp }) {
  const { current: c, previous: p } = data;
  return (
    <>
      <SectionLabel>Visão geral · últimos {data.period_days} dias</SectionLabel>
      <div className="grid gap-3 mb-7" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Kpi label="Novos signups" current={c.signups} previous={p.signups} sparkline={series.signups} />
        <Kpi label="Onboarding completo" current={c.onboarded} previous={p.onboarded} sparkline={series.onboarded} />
        <Kpi label="Ativados (1º registro)" current={c.activated} previous={p.activated} sparkline={series.activated} />
        <Kpi label="Viram paywall" current={c.paywall_views} previous={p.paywall_views} sparkline={series.paywall_views} />
        <Kpi label="Assinaturas" current={c.conversions} previous={p.conversions} sparkline={series.conversions} accent />
        <Kpi label="Usuários ativos" current={c.distinct_users} previous={p.distinct_users} sparkline={series.active_users} />
      </div>
    </>
  );
}

function DiscoveryFunnelSection({
  data,
  onDrilldown,
}: {
  data: FunnelResp;
  onDrilldown: (from: string, to: string, label: string) => void;
}) {
  const top = data.steps[0]?.count ?? 0;
  return (
    <>
      <SectionLabel>
        Funil de descoberta
        <Hint>cada etapa é subconjunto da anterior · clique no drop ⚠ pra ver quem parou ali</Hint>
      </SectionLabel>
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-5 mb-7">
        {data.steps.length === 0 || top === 0 ? (
          <EmptyHint>Sem cohort no período. Aguardando onboarding_completed.</EmptyHint>
        ) : (
          <div className="flex flex-col gap-3">
            {data.steps.map((s, i) => {
              const prev = i === 0 ? null : data.steps[i - 1];
              const widthPct = top > 0 ? Math.max(2, (s.count / top) * 100) : 0;
              const stepConvPct = prev != null && prev.count > 0 ? Math.round((s.count / prev.count) * 1000) / 10 : null;
              const cohortPct = top > 0 ? Math.round((s.count / top) * 1000) / 10 : 0;
              const dropPct = prev != null && prev.count > 0 ? Math.round(((prev.count - s.count) / prev.count) * 1000) / 10 : null;
              const showDrillBtn = prev != null && dropPct != null && dropPct >= 30;
              return (
                <div key={s.key}>
                  <div className="flex items-baseline justify-between font-label text-xs mb-1.5">
                    <span className="text-on-surface font-semibold">
                      <span className="text-on-surface-variant/60 mr-1.5">{i + 1}.</span>
                      {s.label}
                    </span>
                    <span className="text-on-surface-variant/70 tabular-nums">
                      <span className="text-on-surface font-semibold">{s.count}</span>
                      {stepConvPct != null && (
                        <span className="ml-2 text-on-surface-variant/60">{stepConvPct}% da anterior</span>
                      )}
                      {i > 0 && (
                        <span className="ml-2 text-on-surface-variant/40">· {cohortPct}% do cohort</span>
                      )}
                    </span>
                  </div>
                  <div className="h-7 rounded-md bg-surface-container-lowest overflow-hidden flex items-center">
                    <div className="h-full bg-primary transition-all" style={{ width: `${widthPct}%` }} />
                  </div>
                  {showDrillBtn && prev && (
                    <button
                      onClick={() => onDrilldown(prev.key, s.key, `${prev.label} → ${s.label}`)}
                      className="mt-1 font-label text-[11px] text-error/90 hover:text-error bg-transparent border-none cursor-pointer underline decoration-dotted underline-offset-2 inline-flex items-center gap-1"
                    >
                      ⚠ Drop alto: {dropPct}% perdidos · ver quem parou aqui →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function TimeToEventSection({ data }: { data: TimeToEventResp }) {
  return (
    <>
      <SectionLabel>
        Tempo entre etapas
        <Hint>quanto tempo o usuário leva pra avançar · mediana · p75 · p90</Hint>
      </SectionLabel>
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4 mb-7">
        {data.pairs.length === 0 ? (
          <EmptyHint>Sem pares de eventos completos no período.</EmptyHint>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="grid font-label text-[10px] text-on-surface-variant/60 uppercase tracking-wider px-2 mb-1" style={{ gridTemplateColumns: '2fr 60px 80px 80px 80px' }}>
              <span>Etapa</span>
              <span className="text-right">N</span>
              <span className="text-right">Mediana</span>
              <span className="text-right">P75</span>
              <span className="text-right">P90</span>
            </div>
            {data.pairs.map(p => (
              <div
                key={`${p.from_e}__${p.to_e}`}
                className="grid items-center px-2 py-2 rounded-md bg-surface-container-lowest font-label text-sm"
                style={{ gridTemplateColumns: '2fr 60px 80px 80px 80px' }}
              >
                <span className="text-on-surface font-medium truncate">
                  {p.label}
                  <span className="text-on-surface-variant/50 text-[11px] ml-1.5">
                    {p.from_e} → {p.to_e}
                  </span>
                </span>
                <span className="text-right text-on-surface-variant tabular-nums">{p.n}</span>
                <span className="text-right text-on-surface tabular-nums font-semibold">
                  {formatDuration(p.median_seconds)}
                </span>
                <span className="text-right text-on-surface-variant tabular-nums">
                  {formatDuration(p.p75_seconds)}
                </span>
                <span className="text-right text-on-surface-variant/70 tabular-nums">
                  {formatDuration(p.p90_seconds)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function CohortRetentionSection({ data }: { data: CohortResp }) {
  return (
    <>
      <SectionLabel>
        Retenção por coorte
        <Hint>% de usuários ativos na semana N pós-signup · cores indicam intensidade</Hint>
      </SectionLabel>
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4 mb-7 overflow-x-auto">
        {data.cohorts.length === 0 ? (
          <EmptyHint>Sem coortes no período.</EmptyHint>
        ) : (
          <table className="w-full font-label text-xs" style={{ minWidth: 700 }}>
            <thead>
              <tr className="text-on-surface-variant/60 text-[10px] uppercase tracking-wider">
                <th className="text-left py-2 pr-3">Coorte</th>
                <th className="text-right py-2 pr-3">Tam.</th>
                {[0, 1, 2, 3, 4, 5, 6, 7].map(w => (
                  <th key={w} className="text-center py-2 px-1">
                    S{w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map(c => {
                const sz = c.size || 1;
                const cells = [c.w0, c.w1, c.w2, c.w3, c.w4, c.w5, c.w6, c.w7];
                return (
                  <tr key={c.cohort_week} className="border-t border-outline-variant/10">
                    <td className="text-on-surface font-medium py-2 pr-3 whitespace-nowrap">
                      {new Date(c.cohort_week).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="text-right text-on-surface-variant py-2 pr-3 tabular-nums">{c.size}</td>
                    {cells.map((v, i) => {
                      const pct = Math.round((v / sz) * 1000) / 10;
                      return (
                        <td key={i} className="px-1 py-1">
                          <div className={`text-center rounded-sm py-1 tabular-nums ${cohortHeatColor(pct)}`}>
                            {v === 0 && i > 0 ? '—' : `${pct.toFixed(0)}%`}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function MonetizationSection({ data }: { data: MonetizationResp }) {
  return (
    <>
      <SectionLabel>Funil de monetização</SectionLabel>
      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <SimpleStat label="Viram paywall (únicos)" value={data.unique_paywall_views} />
        <SimpleStat label="Assinaram (únicos)" value={data.unique_subscriptions} accent />
        <SimpleStat
          label="Conversão geral"
          value={`${data.overall_conversion_pct}%`}
          accent={data.overall_conversion_pct >= 5}
        />
      </div>

      <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4 mb-7">
        <div className="font-label text-[11px] text-on-surface-variant/70 uppercase tracking-wider mb-3">
          Por trigger
        </div>
        {data.by_trigger.length === 0 ? (
          <EmptyHint>Sem visualizações de paywall no período.</EmptyHint>
        ) : (
          <div className="flex flex-col gap-2">
            <div
              className="grid font-label text-[10px] text-on-surface-variant/60 uppercase tracking-wider px-2"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}
            >
              <span>Trigger</span>
              <span className="text-right">Views</span>
              <span className="text-right">Únicos</span>
              <span className="text-right">Dismiss</span>
              <span className="text-right">Conv.</span>
            </div>
            {data.by_trigger.map(t => {
              const convRate = t.unique_views > 0 ? Math.round((t.subscribed / t.unique_views) * 1000) / 10 : 0;
              return (
                <div
                  key={t.trigger}
                  className="grid items-center px-2 py-2 rounded-md bg-surface-container-lowest font-label text-sm"
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr' }}
                >
                  <span className="text-on-surface font-medium truncate" title={t.trigger}>
                    {t.trigger}
                  </span>
                  <span className="text-right text-on-surface-variant tabular-nums">{t.views}</span>
                  <span className="text-right text-on-surface-variant tabular-nums">{t.unique_views}</span>
                  <span className="text-right text-on-surface-variant/60 tabular-nums">{t.dismissed}</span>
                  <span className="text-right tabular-nums">
                    <span className="text-primary font-semibold">{t.subscribed}</span>
                    {t.unique_views > 0 && (
                      <span className="text-on-surface-variant/50 text-[11px] ml-1">({convRate}%)</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function LastTouchSection({
  data,
  window,
  onWindow,
}: {
  data: LastTouchResp;
  window: number;
  onWindow: (v: 24 | 48 | 168) => void;
}) {
  const top = data.breakdown[0]?.conversions ?? 0;
  return (
    <>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <SectionLabel>Last-touch antes da assinatura</SectionLabel>
        <SegmentedFilter
          options={[
            { value: 24, label: '24h' },
            { value: 48, label: '48h' },
            { value: 168, label: '7d' },
          ]}
          value={window}
          onChange={v => onWindow(v as 24 | 48 | 168)}
          small
        />
      </div>

      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <SimpleStat label="Conversões totais" value={data.total_conversions} />
        <SimpleStat label="Atribuídas" value={data.attributed} />
        <SimpleStat
          label="Cold (sem touch)"
          value={data.cold_conversions}
          warn={data.cold_conversions > data.attributed && data.total_conversions > 0}
        />
      </div>

      <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4 mb-3">
        {data.breakdown.length === 0 ? (
          <EmptyHint>Nenhuma conversão atribuída na janela {window}h.</EmptyHint>
        ) : (
          <div className="flex flex-col gap-2">
            {data.breakdown.map(b => {
              const widthPct = top > 0 ? Math.max(3, (b.conversions / top) * 100) : 0;
              return (
                <div key={b.event}>
                  <div className="flex items-baseline justify-between font-label text-xs mb-1">
                    <span className="text-on-surface font-medium">{eventLabel(b.event)}</span>
                    <span className="text-on-surface-variant/70 tabular-nums">
                      <span className="text-on-surface font-semibold">{b.conversions}</span>
                      <span className="text-on-surface-variant/60 ml-2">{b.pct}%</span>
                    </span>
                  </div>
                  <div className="h-5 rounded-md bg-surface-container-lowest overflow-hidden">
                    <div className="h-full bg-tertiary" style={{ width: `${widthPct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ── Modal de drill-down ─────────────────────────────────────────────────

function DropoffModal({
  fromEvent,
  toEvent,
  label,
  period,
  platform,
  onClose,
}: {
  fromEvent: string;
  toEvent: string;
  label: string;
  period: number;
  platform: Platform;
  onClose: () => void;
}) {
  const [data, setData] = useState<DropoffResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSheetBackClose(true, onClose);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc('analytics_dropoff_users', {
        p_from_event: fromEvent,
        p_to_event: toEvent,
        p_days: period,
        p_platform: platform === 'all' ? null : platform,
        p_limit: 100,
      });
      if (cancelled) return;
      if (error) setError(error.message);
      else setData(data as DropoffResp);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fromEvent, toEvent, period, platform]);

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-high border border-outline-variant/30 rounded-md p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-headline text-base font-bold text-on-surface">Drop-off</h3>
            <div className="font-label text-xs text-on-surface-variant/70 mt-0.5">{label}</div>
          </div>
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="material-symbols-outlined text-primary text-2xl animate-spin">
              progress_activity
            </span>
          </div>
        ) : error ? (
          <div className="bg-error/10 border border-error/25 rounded-md px-3 py-2 font-label text-xs text-error">
            Erro: {error}
          </div>
        ) : !data || data.users.length === 0 ? (
          <EmptyHint>Nenhum usuário caiu nesse drop. Tudo certo aqui!</EmptyHint>
        ) : (
          <>
            <div className="font-label text-xs text-on-surface-variant mb-3">
              <strong className="text-on-surface">{data.total}</strong> usuário(s) chegaram em{' '}
              <code className="text-[11px] bg-surface-container-low px-1 py-0.5 rounded">
                {fromEvent}
              </code>{' '}
              mas não fizeram{' '}
              <code className="text-[11px] bg-surface-container-low px-1 py-0.5 rounded">
                {toEvent}
              </code>
              {data.users.length < data.total && ` · mostrando ${data.users.length} mais recentes`}
            </div>
            <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
              {data.users.map(u => (
                <a
                  key={u.user_id}
                  href={`/paineladmin/users/${u.user_id}`}
                  className="block bg-surface-container-lowest border border-outline-variant/30 rounded-md px-3 py-2 hover:bg-surface-container-low no-underline"
                >
                  <div className="font-body text-sm font-medium text-on-surface truncate">{u.email}</div>
                  <div className="font-label text-[11px] text-on-surface-variant/60 mt-0.5">
                    Chegou aqui {formatRelativeShort(u.reached_at)} · Último acesso {formatRelativeShort(u.last_seen_at)}
                    {u.signup_platform && ` · ${u.signup_platform}`}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Building blocks ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-label text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2 flex-wrap">
      {children}
    </h3>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-label text-[10px] normal-case tracking-normal text-on-surface-variant/50">
      ({children})
    </span>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center font-label text-sm text-on-surface-variant/50 py-3">{children}</div>
  );
}

function SegmentedFilter<T extends string | number>({
  options,
  value,
  onChange,
  small,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className="inline-flex bg-surface-container-lowest border border-outline-variant/30 rounded-md p-0.5">
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            className={`font-label rounded-md transition-colors cursor-pointer border-none ${
              small ? 'text-[11px] px-2.5 py-1' : 'text-xs px-3 py-1.5'
            } ${
              active
                ? 'bg-primary/15 text-primary font-semibold'
                : 'bg-transparent text-on-surface-variant hover:bg-surface-container-low font-medium'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Sparkline({ values, accent }: { values: number[]; accent?: boolean }) {
  if (!values || values.length === 0) return null;
  const max = Math.max(...values, 1);
  const w = 80;
  const h = 20;
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = h - (v / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="block mt-1.5">
      <polyline
        points={points}
        fill="none"
        stroke={accent ? 'var(--color-primary)' : 'var(--color-on-surface-variant)'}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Kpi({
  label,
  current,
  previous,
  sparkline,
  accent,
}: {
  label: string;
  current: number;
  previous: number;
  sparkline?: number[];
  accent?: boolean;
}) {
  const d = deltaPct(current, previous);
  const valueColor = accent ? 'text-primary' : 'text-on-surface';
  return (
    <div
      className={`rounded-md px-5 py-4 border ${
        accent ? 'bg-primary/10 border-primary/20' : 'bg-surface-container-low border-outline-variant/30'
      }`}
    >
      <div className="font-label text-[11px] text-on-surface-variant/70 uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className={`font-headline text-2xl font-bold ${valueColor}`}>{current}</div>
        {sparkline && sparkline.length > 0 && <Sparkline values={sparkline} accent={accent} />}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={`font-label text-[11px] font-semibold ${deltaColor(d.sign)}`}>
          {d.sign === 'up' ? '↑' : d.sign === 'down' ? '↓' : '·'} {formatPctDelta(d)}
        </span>
        <span className="font-label text-[11px] text-on-surface-variant/50">vs. anterior ({previous})</span>
      </div>
    </div>
  );
}

function SimpleStat({
  label,
  value,
  accent,
  warn,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  warn?: boolean;
}) {
  const color = warn ? 'text-error' : accent ? 'text-primary' : 'text-on-surface';
  const bg = warn
    ? 'bg-error/8 border-error/25'
    : accent
      ? 'bg-primary/10 border-primary/20'
      : 'bg-surface-container-low border-outline-variant/30';
  return (
    <div className={`rounded-md px-5 py-4 border ${bg}`}>
      <div className={`font-headline text-2xl font-bold ${color}`}>{value}</div>
      <div className="font-label text-[11px] text-on-surface-variant/70 mt-0.5">{label}</div>
    </div>
  );
}
