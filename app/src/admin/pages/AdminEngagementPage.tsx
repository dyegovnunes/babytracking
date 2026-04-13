import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminEngagementPage() {
  const [stats, setStats] = useState({ avgLogsPerDay: 0, topEvent: '', multiCaregiver: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const { count: logsWeek } = await supabase
        .from('logs').select('*', { count: 'exact', head: true })
        .gte('timestamp', Date.parse(sevenDaysAgo));

      const { data: eventCounts } = await supabase
        .from('logs').select('event_id').gte('timestamp', Date.parse(sevenDaysAgo));

      const counts: Record<string, number> = {};
      (eventCounts ?? []).forEach((l: any) => {
        counts[l.event_id] = (counts[l.event_id] ?? 0) + 1;
      });
      const topEvent = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';

      const { data: multiCareg } = await supabase
        .from('baby_members')
        .select('baby_id')
        .limit(1000);

      const babyMemberCount: Record<string, number> = {};
      (multiCareg ?? []).forEach((m: any) => {
        babyMemberCount[m.baby_id] = (babyMemberCount[m.baby_id] ?? 0) + 1;
      });
      const multiCount = Object.values(babyMemberCount).filter(c => c > 1).length;

      setStats({
        avgLogsPerDay: Math.round((logsWeek ?? 0) / 7),
        topEvent,
        multiCaregiver: multiCount,
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 py-2">
      <h2 className="text-base font-bold text-gray-200">Engajamento</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-900 rounded-xl p-4 col-span-2">
          <div className="text-3xl font-bold text-white">{stats.avgLogsPerDay}</div>
          <div className="text-gray-500 text-xs mt-1">Registros/dia (media 7d)</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-white font-bold text-lg capitalize">{stats.topEvent || '-'}</div>
          <div className="text-gray-500 text-xs mt-1">Evento mais registrado</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-4">
          <div className="text-white font-bold text-2xl">{stats.multiCaregiver}</div>
          <div className="text-gray-500 text-xs mt-1">Bebes com 2+ cuidadores</div>
        </div>
      </div>
    </div>
  );
}
