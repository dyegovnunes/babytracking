import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface KPIs {
  totalUsers: number;
  newToday: number;
  newThisWeek: number;
  premiumUsers: number;
  activeStreak: number;
  totalLogs: number;
  logsToday: number;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadKPIs();
  }, []);

  async function loadKPIs() {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [
      { count: totalUsers },
      { count: newToday },
      { count: newThisWeek },
      { count: premiumUsers },
      { count: activeStreak },
      { count: totalLogs },
      { count: logsToday },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', today),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .eq('is_premium', true),
      supabase.from('streaks').select('*', { count: 'exact', head: true })
        .gt('current_streak', 0),
      supabase.from('logs').select('*', { count: 'exact', head: true }),
      supabase.from('logs').select('*', { count: 'exact', head: true })
        .gte('timestamp', Date.parse(today)),
    ]);

    setKpis({
      totalUsers: totalUsers ?? 0,
      newToday: newToday ?? 0,
      newThisWeek: newThisWeek ?? 0,
      premiumUsers: premiumUsers ?? 0,
      activeStreak: activeStreak ?? 0,
      totalLogs: totalLogs ?? 0,
      logsToday: logsToday ?? 0,
    });
    setLoading(false);
  }

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const conversionRate = kpis.totalUsers > 0
    ? ((kpis.premiumUsers / kpis.totalUsers) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-base font-bold text-gray-200">Visao Geral</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Usuarios" value={kpis.totalUsers} icon={'\u{1F464}'} />
        <StatCard label="Novos Hoje" value={kpis.newToday} icon={'\u{1F195}'} highlight />
        <StatCard label="Esta Semana" value={kpis.newThisWeek} icon={'\u{1F4C5}'} />
        <StatCard label="Yaya+" value={kpis.premiumUsers} icon={'\u2B50'} />
        <StatCard label="Conversao" value={`${conversionRate}%`} icon={'\u{1F4B0}'} />
        <StatCard label="Com Streak" value={kpis.activeStreak} icon={'\u{1F525}'} />
        <StatCard label="Logs Hoje" value={kpis.logsToday} icon={'\u{1F4DD}'} highlight />
        <StatCard label="Total Logs" value={kpis.totalLogs} icon={'\u{1F4DA}'} />
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, highlight }: {
  label: string; value: number | string; icon: string; highlight?: boolean
}) {
  return (
    <div className={`rounded-xl p-4 ${highlight ? 'bg-purple-900/40 border border-purple-700/40' : 'bg-gray-900'}`}>
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${highlight ? 'text-purple-300' : 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}
