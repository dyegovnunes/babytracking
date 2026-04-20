import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSheetBackClose } from '../../hooks/useSheetBackClose';

export default function AdminPushPage() {
  const [stats, setStats] = useState({ today: 0, week: 0, delivered: 0, totalTokens: 0 });
  const [segmentCounts, setSegmentCounts] = useState({ all: 0, paying: 0, courtesy: 0, free: 0 });
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<'all' | 'paying' | 'courtesy' | 'free'>('all');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  useSheetBackClose(showComposer, () => setShowComposer(false));

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [todayRes, weekRes, deliveredRes, broadcastsRes, tokensRes, profilesRes] = await Promise.all([
      supabase.from('push_log').select('*', { count: 'exact', head: true }).gte('sent_at', today),
      supabase.from('push_log').select('*', { count: 'exact', head: true }).gte('sent_at', weekAgo),
      supabase.from('push_log').select('*', { count: 'exact', head: true }).eq('delivered', true).gte('sent_at', weekAgo),
      supabase.from('admin_broadcasts').select('*').order('sent_at', { ascending: false }).limit(10),
      supabase.from('push_tokens').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('subscription_plan, is_premium, courtesy_expires_at'),
    ]);

    setStats({
      today: todayRes.count ?? 0,
      week: weekRes.count ?? 0,
      delivered: deliveredRes.count ?? 0,
      totalTokens: tokensRes.count ?? 0,
    });
    setBroadcasts(broadcastsRes.data ?? []);

    // Contagem por segmento pra mostrar no composer
    const counts = { all: 0, paying: 0, courtesy: 0, free: 0 };
    (profilesRes.data ?? []).forEach((p: any) => {
      counts.all++;
      if (
        p.subscription_plan === 'courtesy_lifetime' ||
        (p.courtesy_expires_at && new Date(p.courtesy_expires_at) > new Date())
      ) {
        counts.courtesy++;
        return;
      }
      if (!p.is_premium) counts.free++;
      else if (p.subscription_plan && ['monthly', 'annual', 'lifetime'].includes(p.subscription_plan)) {
        counts.paying++;
      }
    });
    setSegmentCounts(counts);
  }

  async function sendBroadcast() {
    if (!title || !body) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();

    let tokenQuery = supabase.from('push_tokens').select('token, user_id');
    if (segment !== 'all') {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, subscription_plan, is_premium, courtesy_expires_at');
      const ids = (profiles ?? [])
        .filter((p: any) => {
          const hasCourtesy =
            p.subscription_plan === 'courtesy_lifetime' ||
            (p.courtesy_expires_at && new Date(p.courtesy_expires_at) > new Date());
          if (segment === 'courtesy') return hasCourtesy;
          if (segment === 'paying') {
            return (
              !hasCourtesy &&
              p.is_premium &&
              p.subscription_plan &&
              ['monthly', 'annual', 'lifetime'].includes(p.subscription_plan)
            );
          }
          if (segment === 'free') return !p.is_premium && !hasCourtesy;
          return true;
        })
        .map((p: any) => p.id);
      if (ids.length > 0) tokenQuery = tokenQuery.in('user_id', ids);
      else tokenQuery = tokenQuery.in('user_id', ['00000000-0000-0000-0000-000000000000']); // força 0 resultados
    }

    const { data: tokens } = await tokenQuery;
    const targetCount = tokens?.length ?? 0;

    await supabase.from('admin_broadcasts').insert({
      title,
      body,
      segment: { plan: segment },
      target_count: targetCount,
      sent_count: targetCount,
      sent_by: user?.id,
    });

    setSending(false);
    setShowComposer(false);
    setTitle('');
    setBody('');
    setToast(`Broadcast registrado para ~${targetCount} dispositivos`);
    loadStats();
    setTimeout(() => setToast(''), 4000);
  }

  const smallEnv = segmentCounts.paying <= 1 && segmentCounts.all < 50;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-headline text-xl font-bold text-on-surface">Push Notifications</h2>
        <button
          onClick={() => setShowComposer(true)}
          className="bg-primary text-on-primary font-label text-sm font-semibold px-4 py-2.5 rounded-md border-none cursor-pointer active:opacity-80 transition-opacity"
        >
          + Novo Broadcast
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
        <StatCard value={stats.today} label="Enviados hoje" highlight />
        <StatCard value={stats.week} label="Últimos 7 dias" />
        <StatCard value={stats.delivered} label="Entregues (7d)" success />
        <StatCard value={stats.totalTokens} label="Tokens ativos" accent />
      </div>

      {/* Aviso de ambiente pequeno */}
      {smallEnv && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/25 px-4 py-3 mb-5 font-label text-xs text-amber-500 leading-relaxed">
          <span className="font-semibold">Base pequena / ambiente de teste —</span> segmentação
          por plano pode não ter alcance expressivo. Hoje: {segmentCounts.paying} pagantes,{' '}
          {segmentCounts.courtesy} cortesia, {segmentCounts.free} free.
        </div>
      )}

      {/* Broadcast history */}
      <h3 className="font-label text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-3">
        Histórico de broadcasts
      </h3>
      {broadcasts.length === 0 ? (
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4 text-center font-label text-sm text-on-surface-variant/50">
          Nenhum broadcast enviado
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {broadcasts.map(b => (
            <div key={b.id} className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4">
              <div className="font-body text-base font-semibold text-on-surface">{b.title}</div>
              <div className="font-label text-sm text-on-surface-variant mt-1">{b.body}</div>
              <div className="flex justify-between mt-2 font-label text-[11px] text-on-surface-variant/60">
                <span>
                  {new Date(b.sent_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span>{b.target_count} dispositivos</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-5 right-5 mx-auto max-w-md bg-green-600 text-white font-label text-sm text-center px-4 py-3.5 rounded-md z-50">
          {toast}
        </div>
      )}

      {/* Composer modal */}
      {showComposer && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5"
          onClick={() => setShowComposer(false)}
        >
          <div
            className="bg-surface-container-high border border-outline-variant/30 rounded-md p-7 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Novo Broadcast</h3>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Título da notificação"
              className="w-full rounded-md px-4 py-3 text-sm bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/30 mb-3"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Corpo da mensagem"
              rows={3}
              className="w-full rounded-md px-4 py-3 text-sm bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/30 resize-none mb-4"
            />

            <div className="mb-5">
              <div className="font-label text-[11px] text-on-surface-variant/70 uppercase tracking-wider mb-2">
                Segmento
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['all', 'paying', 'courtesy', 'free'] as const).map(s => {
                  const labelMap = { all: 'Todos', paying: 'Pagantes', courtesy: 'Cortesia', free: 'Free' };
                  const active = segment === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setSegment(s)}
                      className={`font-label text-xs py-2.5 rounded-md border-none cursor-pointer transition-colors ${
                        active
                          ? 'bg-primary/20 text-primary font-semibold'
                          : 'bg-surface-container-lowest text-on-surface-variant font-medium'
                      }`}
                    >
                      {labelMap[s]}
                      <span className="font-normal ml-1 opacity-70">({segmentCounts[s]})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowComposer(false)}
                className="flex-1 py-3.5 rounded-md bg-surface-container-lowest text-on-surface-variant font-label text-sm font-semibold border-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={sendBroadcast}
                disabled={sending || !title || !body}
                className="flex-[2] py-3.5 rounded-md bg-primary text-on-primary font-label text-sm font-bold border-none cursor-pointer disabled:opacity-50 active:opacity-80 transition-opacity"
              >
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  value,
  label,
  highlight,
  success,
  accent,
}: {
  value: number;
  label: string;
  highlight?: boolean;
  success?: boolean;
  accent?: boolean;
}) {
  const color = highlight
    ? 'text-tertiary'
    : success
      ? 'text-green-500'
      : accent
        ? 'text-primary'
        : 'text-on-surface';
  return (
    <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4">
      <div className={`font-headline text-2xl font-bold ${color}`}>{value}</div>
      <div className="font-label text-[11px] text-on-surface-variant/60 mt-0.5">{label}</div>
    </div>
  );
}
