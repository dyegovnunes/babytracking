import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface Stats {
  total_users: number;
  new_today: number;
  new_this_week: number;
  premium_users: number;
  free_users: number;
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
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div style={{ width: 32, height: 32, border: '2px solid #b79fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const conversionRate = stats.total_users > 0
    ? ((stats.premium_users / stats.total_users) * 100).toFixed(1)
    : '0';

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e7e2ff', marginBottom: 20 }}>Visão Geral</h2>

      {/* Top row — key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Card label="Usuários" value={stats.total_users} sub={`+${stats.new_this_week} esta semana`} accent />
        <Card label="Bebês" value={stats.total_babies} sub={`${stats.avg_users_per_baby} cuid./bebê`} />
        <Card label="Premium (Yaya+)" value={stats.premium_users} sub={`${conversionRate}% conversão`} accent />
        <Card label="Free" value={stats.free_users} sub={`${stats.total_users - stats.premium_users - stats.free_users} sem plano`} />
      </div>

      {/* Activity */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(231,226,255,0.55)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Atividade</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        <MiniCard label="DAU" value={stats.dau} />
        <MiniCard label="WAU (7d)" value={stats.wau} />
        <MiniCard label="MAU (30d)" value={stats.mau} />
        <MiniCard label="Registros hoje" value={stats.logs_today} highlight />
        <MiniCard label="Registros (7d)" value={stats.logs_this_week} />
        <MiniCard label="Total registros" value={stats.total_logs} />
      </div>

      {/* Engagement */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(231,226,255,0.55)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Engajamento</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        <MiniCard label="Streaks ativos" value={stats.active_streaks} />
        <MiniCard label="Bebês 2+ cuidadores" value={stats.multi_caregiver_babies} />
        <MiniCard label="Novos hoje" value={stats.new_today} highlight />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

function Card({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? 'rgba(183,159,255,0.1)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${accent ? 'rgba(183,159,255,0.2)' : 'rgba(183,159,255,0.08)'}`,
      borderRadius: 14,
      padding: '20px 18px',
    }}>
      <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: accent ? '#b79fff' : '#e7e2ff' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'rgba(231,226,255,0.4)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function MiniCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'rgba(255,150,185,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${highlight ? 'rgba(255,150,185,0.15)' : 'rgba(183,159,255,0.06)'}`,
      borderRadius: 12,
      padding: '14px 16px',
    }}>
      <div style={{ fontSize: 24, fontWeight: 700, color: highlight ? '#ff96b9' : '#e7e2ff' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.45)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
