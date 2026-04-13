import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminPushPage() {
  const [stats, setStats] = useState({ today: 0, week: 0, delivered: 0 });
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<'all' | 'premium' | 'free'>('all');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [todayRes, weekRes, deliveredRes, broadcastsRes] = await Promise.all([
      supabase.from('push_log').select('*', { count: 'exact', head: true }).gte('sent_at', today),
      supabase.from('push_log').select('*', { count: 'exact', head: true }).gte('sent_at', weekAgo),
      supabase.from('push_log').select('*', { count: 'exact', head: true }).eq('delivered', true).gte('sent_at', weekAgo),
      supabase.from('admin_broadcasts').select('*').order('sent_at', { ascending: false }).limit(10),
    ]);

    setStats({ today: todayRes.count ?? 0, week: weekRes.count ?? 0, delivered: deliveredRes.count ?? 0 });
    setBroadcasts(broadcastsRes.data ?? []);
  }

  async function sendBroadcast() {
    if (!title || !body) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();

    let tokenQuery = supabase.from('push_tokens').select('token, user_id');
    if (segment !== 'all') {
      const { data: profiles } = await supabase.from('profiles')
        .select('id').eq('is_premium', segment === 'premium');
      const ids = (profiles ?? []).map((p: any) => p.id);
      if (ids.length > 0) {
        tokenQuery = tokenQuery.in('user_id', ids);
      }
    }

    const { data: tokens } = await tokenQuery;
    const targetCount = tokens?.length ?? 0;

    await supabase.from('admin_broadcasts').insert({
      title, body,
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

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-200">Push Notifications</h2>
        <button
          onClick={() => setShowComposer(true)}
          className="bg-purple-600 text-white text-xs font-semibold px-3 py-2 rounded-lg active:bg-purple-700"
        >
          + Broadcast
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-xl">{stats.today}</div>
          <div className="text-gray-500 text-[10px]">Hoje</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-xl">{stats.week}</div>
          <div className="text-gray-500 text-[10px]">7 dias</div>
        </div>
        <div className="bg-gray-900 rounded-xl p-3 text-center">
          <div className="text-white font-bold text-xl">{stats.delivered}</div>
          <div className="text-gray-500 text-[10px]">Entregues</div>
        </div>
      </div>

      <div>
        <p className="text-gray-500 text-xs mb-2">Ultimos broadcasts</p>
        {broadcasts.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-4">Nenhum broadcast enviado</p>
        ) : (
          <div className="space-y-2">
            {broadcasts.map(b => (
              <div key={b.id} className="bg-gray-900 rounded-xl p-3">
                <p className="text-white text-sm font-semibold">{b.title}</p>
                <p className="text-gray-400 text-xs mt-0.5">{b.body}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600 text-[10px]">
                    {new Date(b.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-gray-500 text-[10px]">{b.target_count} dispositivos</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-4 right-4 bg-green-600 text-white text-sm text-center py-3 rounded-xl z-50">
          {toast}
        </div>
      )}

      {showComposer && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowComposer(false)}>
          <div className="bg-gray-900 w-full rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">Novo Broadcast</h3>

            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titulo da notificacao"
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none"
            />
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Corpo da mensagem"
              rows={3}
              className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none resize-none"
            />

            <div>
              <p className="text-gray-400 text-xs mb-2">Segmento</p>
              <div className="flex gap-2">
                {(['all', 'premium', 'free'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSegment(s)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                      segment === s ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {s === 'all' ? 'Todos' : s === 'premium' ? 'Yaya+' : 'Free'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowComposer(false)}
                className="flex-1 bg-gray-800 text-gray-400 rounded-xl py-3 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={sendBroadcast}
                disabled={sending || !title || !body}
                className="flex-[2] bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
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
