import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

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

// ── Helpers ─────────────────────────────────────────────────────────────

function deltaPct(current: number, previous: number): { value: number; sign: 'up' | 'down' | 'flat' | 'na' } {
  if (previous === 0 && current === 0) return { value: 0, sign: 'flat' };
  if (previous === 0) return { value: 100, sign: 'na' }; // sem base de comparação
  const v = ((current - previous) / previous) * 100;
  return {
    value: Math.round(v * 10) / 10,
    sign: v > 0.5 ? 'up' : v < -0.5 ? 'down' : 'flat',
  };
}

function formatPctDelta(d: ReturnType<typeof deltaPct>): string {
  if (d.sign === 'na') return 'sem base';
  if (d.sign === 'flat') return 'estável';
  const sign = d.value > 0 ? '+' : '';
  return `${sign}${d.value}%`;
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

// ── Página ──────────────────────────────────────────────────────────────

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const platArg = platform === 'all' ? null : platform;
      const [ovRes, fnRes, monRes, ltRes] = await Promise.all([
        supabase.rpc('analytics_overview', { p_days: period, p_platform: platArg }),
        supabase.rpc('analytics_discovery_funnel', { p_days: period, p_platform: platArg }),
        supabase.rpc('analytics_monetization_funnel', { p_days: period, p_platform: platArg }),
        supabase.rpc('analytics_last_touch', { p_days: period, p_window_hours: touchWindow, p_platform: platArg }),
      ]);
      if (cancelled) return;
      const firstErr = ovRes.error || fnRes.error || monRes.error || ltRes.error;
      if (firstErr) {
        setError(firstErr.message);
      } else {
        setOverview(ovRes.data as OverviewResp);
        setFunnel(fnRes.data as FunnelResp);
        setMonetization(monRes.data as MonetizationResp);
        setLastTouch(ltRes.data as LastTouchResp);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [period, platform, touchWindow]);

  const isEmpty = useMemo(() => {
    if (!overview) return false;
    return overview.first_event_at === null;
  }, [overview]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="font-headline text-xl font-bold text-on-surface">Analytics</h2>
        <div className="flex gap-2 flex-wrap">
          <SegmentedFilter
            options={[
              { value: 7, label: '7d' },
              { value: 30, label: '30d' },
              { value: 90, label: '90d' },
            ]}
            value={period}
            onChange={(v) => setPeriod(v as Period)}
          />
          <SegmentedFilter
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'ios', label: 'iOS' },
              { value: 'android', label: 'Android' },
              { value: 'web', label: 'Web' },
            ]}
            value={platform}
            onChange={(v) => setPlatform(v as Platform)}
          />
        </div>
      </div>

      {/* Empty state global */}
      {!loading && isEmpty && (
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-6 py-10 text-center mb-6">
          <span className="material-symbols-outlined text-on-surface-variant/40 text-5xl">
            insights
          </span>
          <h3 className="font-headline text-lg font-semibold text-on-surface mt-3">
            Aguardando primeiros eventos
          </h3>
          <p className="font-body text-sm text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed">
            A coleta foi implantada mas nenhum evento chegou ainda.
            Assim que usuários começarem a usar o app na nova versão, os dados aparecem aqui.
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
          {/* OVERVIEW */}
          {overview && !isEmpty && <OverviewSection data={overview} />}

          {/* DISCOVERY FUNNEL */}
          {funnel && !isEmpty && <DiscoveryFunnelSection data={funnel} />}

          {/* MONETIZATION */}
          {monetization && !isEmpty && <MonetizationSection data={monetization} />}

          {/* LAST-TOUCH */}
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
    </div>
  );
}

// ── Sections ────────────────────────────────────────────────────────────

function OverviewSection({ data }: { data: OverviewResp }) {
  const { current: c, previous: p } = data;
  return (
    <>
      <SectionLabel>Visão geral · últimos {data.period_days} dias</SectionLabel>
      <div className="grid gap-3 mb-7" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <Kpi label="Novos signups" current={c.signups} previous={p.signups} />
        <Kpi label="Onboarding completo" current={c.onboarded} previous={p.onboarded} />
        <Kpi label="Ativados (1º registro)" current={c.activated} previous={p.activated} />
        <Kpi label="Viram paywall" current={c.paywall_views} previous={p.paywall_views} />
        <Kpi label="Assinaturas" current={c.conversions} previous={p.conversions} accent />
        <Kpi label="Usuários ativos" current={c.distinct_users} previous={p.distinct_users} />
      </div>
    </>
  );
}

function DiscoveryFunnelSection({ data }: { data: FunnelResp }) {
  const top = data.steps[0]?.count ?? 0;
  return (
    <>
      <SectionLabel>
        Funil de descoberta
        <Hint>cada etapa é subconjunto da anterior</Hint>
      </SectionLabel>
      <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-5 mb-7">
        {data.steps.length === 0 || top === 0 ? (
          <EmptyHint>Sem cohort no período. Aguardando onboarding_completed.</EmptyHint>
        ) : (
          <div className="flex flex-col gap-3">
            {data.steps.map((s, i) => {
              const prev = i === 0 ? null : data.steps[i - 1].count;
              const widthPct = top > 0 ? Math.max(2, (s.count / top) * 100) : 0;
              const stepConvPct = prev != null && prev > 0 ? Math.round((s.count / prev) * 1000) / 10 : null;
              const cohortPct = top > 0 ? Math.round((s.count / top) * 1000) / 10 : 0;
              const dropPct = prev != null && prev > 0 ? Math.round(((prev - s.count) / prev) * 1000) / 10 : null;
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
                        <span className="ml-2 text-on-surface-variant/60">
                          {stepConvPct}% da anterior
                        </span>
                      )}
                      {i > 0 && (
                        <span className="ml-2 text-on-surface-variant/40">
                          · {cohortPct}% do cohort
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-7 rounded-md bg-surface-container-lowest overflow-hidden flex items-center">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  {dropPct != null && dropPct >= 30 && (
                    <div className="font-label text-[11px] text-error/80 mt-1">
                      ⚠ Drop alto: {dropPct}% perdidos vs etapa anterior
                    </div>
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
            {/* Header */}
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
          onChange={(v) => onWindow(v as 24 | 48 | 168)}
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

// ── Building blocks ─────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-label text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center gap-2">
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
    <div className="text-center font-label text-sm text-on-surface-variant/50 py-3">
      {children}
    </div>
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

function Kpi({
  label,
  current,
  previous,
  accent,
}: {
  label: string;
  current: number;
  previous: number;
  accent?: boolean;
}) {
  const d = deltaPct(current, previous);
  const valueColor = accent ? 'text-primary' : 'text-on-surface';
  return (
    <div
      className={`rounded-md px-5 py-4 border ${
        accent
          ? 'bg-primary/10 border-primary/20'
          : 'bg-surface-container-low border-outline-variant/30'
      }`}
    >
      <div className="font-label text-[11px] text-on-surface-variant/70 uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className={`font-headline text-2xl font-bold ${valueColor}`}>{current}</div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className={`font-label text-[11px] font-semibold ${deltaColor(d.sign)}`}>
          {d.sign === 'up' ? '↑' : d.sign === 'down' ? '↓' : '·'} {formatPctDelta(d)}
        </span>
        <span className="font-label text-[11px] text-on-surface-variant/50">
          vs. anterior ({previous})
        </span>
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
