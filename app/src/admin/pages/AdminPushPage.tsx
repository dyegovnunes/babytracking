import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminPushPage() {
  const [stats, setStats] = useState({ today: 0, week: 0, delivered: 0, totalTokens: 0 });
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

    const [todayRes, weekRes, deliveredRes, broadcastsRes, tokensRes] = await Promise.all([
      supabase.from('push_log').select('*', { count: 'exact', head: true }).gte('sent_at', today),
      supabase.from('push_log').select('*', { count: 'exact', head: true }).gte('sent_at', weekAgo),
      supabase.from('push_log').select('*', { count: 'exact', head: true }).eq('delivered', true).gte('sent_at', weekAgo),
      supabase.from('admin_broadcasts').select('*').order('sent_at', { ascending: false }).limit(10),
      supabase.from('push_tokens').select('*', { count: 'exact', head: true }),
    ]);

    setStats({ today: todayRes.count ?? 0, week: weekRes.count ?? 0, delivered: deliveredRes.count ?? 0, totalTokens: tokensRes.count ?? 0 });
    setBroadcasts(broadcastsRes.data ?? []);
  }

  async function sendBroadcast() {
    if (!title || !body) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();

    let tokenQuery = supabase.from('push_tokens').select('token, user_id');
    if (segment !== 'all') {
      const { data: profiles } = await supabase.from('profiles').select('id').eq('is_premium', segment === 'premium');
      const ids = (profiles ?? []).map((p: any) => p.id);
      if (ids.length > 0) tokenQuery = tokenQuery.in('user_id', ids);
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

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(183,159,255,0.08)',
    borderRadius: 14,
    padding: '18px 20px',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(183,159,255,0.1)',
    borderRadius: 12, padding: '12px 16px', color: '#e7e2ff', fontSize: 14, outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e7e2ff' }}>Push Notifications</h2>
        <button
          onClick={() => setShowComposer(true)}
          style={{ background: '#b79fff', color: '#0d0a27', fontSize: 13, fontWeight: 600, padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer' }}
        >
          + Novo Broadcast
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#ff96b9' }}>{stats.today}</div>
          <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.45)' }}>Enviados hoje</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#e7e2ff' }}>{stats.week}</div>
          <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.45)' }}>Últimos 7 dias</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#4CAF50' }}>{stats.delivered}</div>
          <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.45)' }}>Entregues (7d)</div>
        </div>
        <div style={cardStyle}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#b79fff' }}>{stats.totalTokens}</div>
          <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.45)' }}>Tokens ativos</div>
        </div>
      </div>

      {/* Broadcast history */}
      <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Histórico de broadcasts</div>
      {broadcasts.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: 'rgba(231,226,255,0.3)', fontSize: 14 }}>Nenhum broadcast enviado</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {broadcasts.map(b => (
            <div key={b.id} style={cardStyle}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e7e2ff' }}>{b.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(231,226,255,0.5)', marginTop: 4 }}>{b.body}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'rgba(231,226,255,0.3)' }}>
                <span>{new Date(b.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                <span>{b.target_count} dispositivos</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 80, left: 20, right: 20, background: '#4CAF50', color: 'white', fontSize: 14, textAlign: 'center', padding: 14, borderRadius: 14, zIndex: 100, maxWidth: 400, margin: '0 auto' }}>
          {toast}
        </div>
      )}

      {/* Composer modal */}
      {showComposer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }} onClick={() => setShowComposer(false)}>
          <div style={{ background: '#1a1540', borderRadius: 20, padding: 28, width: '100%', maxWidth: 440, border: '1px solid rgba(183,159,255,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e7e2ff', marginBottom: 20 }}>Novo Broadcast</h3>

            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da notificação" style={{ ...inputStyle, marginBottom: 12 }} />
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Corpo da mensagem" rows={3} style={{ ...inputStyle, resize: 'none', marginBottom: 16 }} />

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(231,226,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Segmento</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'premium', 'free'] as const).map(s => (
                  <button key={s} onClick={() => setSegment(s)} style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: segment === s ? 'rgba(183,159,255,0.2)' : 'rgba(255,255,255,0.04)',
                    color: segment === s ? '#b79fff' : 'rgba(231,226,255,0.5)',
                  }}>
                    {s === 'all' ? 'Todos' : s === 'premium' ? 'Yaya+' : 'Free'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowComposer(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'rgba(231,226,255,0.5)' }}>Cancelar</button>
              <button onClick={sendBroadcast} disabled={sending || !title || !body} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: '#b79fff', color: '#0d0a27', opacity: (sending || !title || !body) ? 0.5 : 1 }}>
                {sending ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
