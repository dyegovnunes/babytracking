import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Stats {
  total_users: number;
  new_today: number;
  new_this_week: number;
  premium_users: number; // is_premium=true (inclui cortesia) — DEPRECATED para UI
  free_users: number;
  paying_users?: number; // só subscription_plan in (monthly, annual, lifetime) e sem cortesia
  courtesy_users?: number; // subscription_plan=courtesy_lifetime ou courtesy_expires_at > now
  total_babies: number;
  total_logs: number;
  logs_today: number;
  logs_this_week: number;
  active_streaks: number;
  dau: number;
  wau: number;
  mau: number;
  avg_users_per_baby: number;
  multi_caregiver_babies: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc('admin_get_stats').then(({ data }) => {
      if (data) setStats(data as Stats);
      setLoading(false);
    });
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-20">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  // Valores derivados. Se a RPC ainda não trouxer paying/courtesy, derivamos
  // conservador: paying = premium_users - courtesy (fallback 0 se não souber);
  // courtesy = 0.
  const paying = stats.paying_users ?? 0;
  const courtesy = stats.courtesy_users ?? stats.premium_users - paying;
  // Conversão real: só pagantes dividido por (pagantes + free). Cortesia e
  // admin ficam de fora — cortesia não é receita, admin não conta como mercado.
  const convertible = paying + stats.free_users;
  const realConversion = convertible > 0 ? ((paying / convertible) * 100).toFixed(1) : '0';

  return (
    <div>
      <h2 className="font-headline text-xl font-bold text-on-surface mb-5">Visão Geral</h2>

      {/* Top row — key metrics */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Card label="Usuários" value={stats.total_users} sub={`+${stats.new_this_week} esta semana`} />
        <Card label="Bebês" value={stats.total_babies} sub={`${stats.avg_users_per_baby} cuid./bebê`} />
        <Card label="Pagantes (Yaya+)" value={paying} sub={`${realConversion}% conversão real`} accent />
        <Card label="Cortesia" value={courtesy} sub="Ativas" amber />
        <Card label="Free" value={stats.free_users} sub="Sem plano" />
      </div>

      {/* Activity */}
      <SectionLabel>Atividade</SectionLabel>
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <MiniCard label="DAU" value={stats.dau} />
        <MiniCard label="WAU (7d)" value={stats.wau} />
        <MiniCard label="MAU (30d)" value={stats.mau} />
        <MiniCard label="Registros hoje" value={stats.logs_today} highlight />
        <MiniCard label="Registros (7d)" value={stats.logs_this_week} />
        <MiniCard label="Total registros" value={stats.total_logs} />
      </div>

      {/* Engagement */}
      <SectionLabel>Engajamento</SectionLabel>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <MiniCard label="Streaks ativos" value={stats.active_streaks} />
        <MiniCard label="Bebês 2+ cuidadores" value={stats.multi_caregiver_babies} />
        <MiniCard label="Novos hoje" value={stats.new_today} highlight />
      </div>

      {/* Nota pra quem lê: a diferença entre "Pagantes" e conversão real */}
      <div className="mt-6 p-3 rounded-md bg-surface-container-lowest border border-outline-variant/20 font-label text-xs text-on-surface-variant/80 leading-relaxed">
        <span className="text-on-surface font-semibold">Como a conversão real é calculada: </span>
        pagantes / (pagantes + free). Cortesia e contas admin ficam de fora — não
        representam receita nem mercado endereçável.
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-label text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

function Card({
  label,
  value,
  sub,
  accent,
  amber,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  amber?: boolean;
}) {
  const valueColor = amber ? 'text-amber-500' : accent ? 'text-primary' : 'text-on-surface';
  const bgClass = accent
    ? 'bg-primary/10 border-primary/20'
    : amber
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-surface-container-low border-outline-variant/30';
  return (
    <div className={`rounded-md px-5 py-5 border ${bgClass}`}>
      <div className="font-label text-[11px] text-on-surface-variant/70 uppercase tracking-wider mb-2">
        {label}
      </div>
      <div className={`font-headline text-3xl font-bold ${valueColor}`}>{value}</div>
      {sub && <div className="font-label text-xs text-on-surface-variant/60 mt-1">{sub}</div>}
    </div>
  );
}

function MiniCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md px-4 py-3 border ${
        highlight
          ? 'bg-tertiary/10 border-tertiary/25'
          : 'bg-surface-container-lowest border-outline-variant/30'
      }`}
    >
      <div className={`font-headline text-2xl font-bold ${highlight ? 'text-tertiary' : 'text-on-surface'}`}>
        {value}
      </div>
      <div className="font-label text-[11px] text-on-surface-variant/60 mt-0.5">{label}</div>
    </div>
  );
}
