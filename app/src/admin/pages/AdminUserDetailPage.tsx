import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [babies, setBabies] = useState<any[]>([]);
  const [logCount, setLogCount] = useState(0);
  const [streak, setStreak] = useState<any>(null);
  const [showCourtesy, setShowCourtesy] = useState(false);
  const [courtesyDays, setCourtesyDays] = useState('7');
  const [courtesyReason, setCourtesyReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { if (id) loadUser(id); }, [id]);

  async function loadUser(userId: string) {
    // Get user with email from admin function
    const { data: users } = await supabase.rpc('admin_get_users');
    const found = (users as any[])?.find((u: any) => u.id === userId);
    if (found) {
      setUser(found);
      setEmail(found.email);
    }

    const { data: babiesData } = await supabase
      .from('baby_members')
      .select('baby_id, display_name, role, babies(name, birth_date, gender)')
      .eq('user_id', userId);

    const babyData = babiesData ?? [];
    setBabies(babyData);

    const babyIds = babyData.map((b: any) => b.baby_id);
    if (babyIds.length > 0) {
      const [logRes, streakRes] = await Promise.all([
        supabase.from('logs').select('*', { count: 'exact', head: true }).in('baby_id', babyIds),
        supabase.from('streaks').select('*').in('baby_id', babyIds).limit(1).maybeSingle(),
      ]);
      setLogCount(logRes.count ?? 0);
      setStreak(streakRes.data);
    }
  }

  async function togglePremium() {
    if (!id || !user) return;
    setSaving(true);
    const newValue = !user.is_premium;
    await supabase.from('profiles').update({
      is_premium: newValue,
      subscription_plan: newValue ? 'admin_granted' : null,
    }).eq('id', id);
    setUser({ ...user, is_premium: newValue });
    setToast(newValue ? 'Usuario promovido para Yaya+' : 'Usuario rebaixado para Free');
    setSaving(false);
    setTimeout(() => setToast(''), 3000);
  }

  async function grantCourtesy() {
    if (!id || !courtesyDays) return;
    setSaving(true);
    const days = parseInt(courtesyDays);
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const { data: { user: adminUser } } = await supabase.auth.getUser();

    await Promise.all([
      supabase.from('profiles').update({
        courtesy_expires_at: expiresAt,
        courtesy_granted_by: adminUser?.id,
        courtesy_reason: courtesyReason,
        is_premium: true,
      }).eq('id', id),
      supabase.from('courtesy_log').insert({
        user_id: id,
        granted_by: adminUser?.id,
        days,
        reason: courtesyReason,
        expires_at: expiresAt,
      }),
    ]);

    setSaving(false);
    setShowCourtesy(false);
    setCourtesyReason('');
    setToast(`Cortesia de ${days} dias concedida!`);
    loadUser(id);
    setTimeout(() => setToast(''), 3000);
  }

  if (!user) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div style={{ width: 24, height: 24, border: '2px solid #b79fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const isCourtesyActive = user.courtesy_expires_at && new Date(user.courtesy_expires_at) > new Date();

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(183,159,255,0.08)',
    borderRadius: 14,
    padding: '18px 20px',
    marginBottom: 12,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, color: 'rgba(231,226,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <button
        onClick={() => navigate(-1)}
        style={{ color: '#b79fff', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        {'\u2190'} Voltar
      </button>

      {/* User header */}
      <div style={{
        ...cardStyle,
        background: 'rgba(183,159,255,0.08)',
        border: '1px solid rgba(183,159,255,0.15)',
      }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#e7e2ff' }}>{email}</div>
            <div style={{ fontSize: 12, color: 'rgba(231,226,255,0.4)', marginTop: 4 }}>
              Cadastro: {new Date(user.created_at).toLocaleDateString('pt-BR')} · ID: {id?.slice(0, 8)}
            </div>
          </div>
          {isCourtesyActive ? (
            <span style={{ fontSize: 12, background: 'rgba(255,179,0,0.15)', color: '#FFB300', padding: '4px 12px', borderRadius: 20 }}>Cortesia</span>
          ) : user.is_premium ? (
            <span style={{ fontSize: 12, background: 'rgba(183,159,255,0.2)', color: '#b79fff', padding: '4px 12px', borderRadius: 20 }}>Yaya+</span>
          ) : (
            <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.08)', color: 'rgba(231,226,255,0.5)', padding: '4px 12px', borderRadius: 20 }}>Free</span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e7e2ff' }}>{babies.length}</div>
            <div style={{ fontSize: 10, color: 'rgba(231,226,255,0.4)' }}>Bebes</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e7e2ff' }}>{logCount}</div>
            <div style={{ fontSize: 10, color: 'rgba(231,226,255,0.4)' }}>Registros</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#e7e2ff' }}>{streak?.current_streak ?? 0}</div>
            <div style={{ fontSize: 10, color: 'rgba(231,226,255,0.4)' }}>Streak</div>
          </div>
        </div>
      </div>

      {/* Babies */}
      {babies.length > 0 && (
        <div style={cardStyle}>
          <div style={labelStyle}>Bebes</div>
          {babies.map((b: any) => (
            <div key={b.baby_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
              <span style={{ fontSize: 16 }}>{b.babies?.gender === 'boy' ? '\u{1F466}' : b.babies?.gender === 'girl' ? '\u{1F467}' : '\u{1F476}'}</span>
              <div>
                <span style={{ fontSize: 14, color: '#e7e2ff' }}>{b.babies?.name}</span>
                <span style={{ fontSize: 12, color: 'rgba(231,226,255,0.35)', marginLeft: 8 }}>
                  {b.babies?.birth_date ? new Date(b.babies.birth_date).toLocaleDateString('pt-BR') : ''} · {b.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Plataforma</div>
          <div style={{ fontSize: 14, color: '#e7e2ff' }}>
            {user.signup_platform === 'android' ? 'Android' : user.signup_platform === 'ios' ? 'iOS' : 'Web'}
          </div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Plano</div>
          <div style={{ fontSize: 14, color: '#e7e2ff', textTransform: 'capitalize' }}>
            {user.subscription_plan || (user.is_premium ? 'premium' : 'free')}
          </div>
        </div>
      </div>

      {isCourtesyActive && (
        <div style={{ ...cardStyle, background: 'rgba(255,179,0,0.06)', border: '1px solid rgba(255,179,0,0.15)' }}>
          <div style={labelStyle}>Cortesia ativa</div>
          <div style={{ fontSize: 14, color: '#FFB300' }}>
            Ate {new Date(user.courtesy_expires_at).toLocaleDateString('pt-BR')}
            {user.courtesy_reason && <span style={{ color: 'rgba(231,226,255,0.4)' }}> — {user.courtesy_reason}</span>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button
          onClick={togglePremium}
          disabled={saving}
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            background: user.is_premium ? 'rgba(239,83,80,0.12)' : 'rgba(183,159,255,0.15)',
            color: user.is_premium ? '#EF5350' : '#b79fff',
          }}
        >
          {user.is_premium ? 'Rebaixar para Free' : 'Promover para Yaya+'}
        </button>
        <button
          onClick={() => setShowCourtesy(true)}
          style={{
            flex: 1,
            padding: '14px 16px',
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            background: 'rgba(255,179,0,0.12)',
            color: '#FFB300',
          }}
        >
          Dar cortesia
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 80, left: 20, right: 20,
          background: '#4CAF50', color: 'white', fontSize: 14, textAlign: 'center',
          padding: '14px', borderRadius: 14, zIndex: 100, maxWidth: 400, margin: '0 auto',
        }}>
          {toast}
        </div>
      )}

      {/* Courtesy Modal */}
      {showCourtesy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20 }} onClick={() => setShowCourtesy(false)}>
          <div style={{ background: '#1a1540', borderRadius: 20, padding: 28, width: '100%', maxWidth: 400, border: '1px solid rgba(183,159,255,0.15)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e7e2ff', marginBottom: 20 }}>Conceder cortesia</h3>

            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Dias de Yaya+</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['7', '14', '30', '60', '90'].map(d => (
                  <button
                    key={d}
                    onClick={() => setCourtesyDays(d)}
                    style={{
                      flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontSize: 14, fontWeight: 600,
                      background: courtesyDays === d ? '#b79fff' : 'rgba(255,255,255,0.06)',
                      color: courtesyDays === d ? '#0d0a27' : 'rgba(231,226,255,0.5)',
                    }}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={labelStyle}>Motivo (opcional)</div>
              <input
                type="text"
                value={courtesyReason}
                onChange={e => setCourtesyReason(e.target.value)}
                placeholder="ex: Pedido via email, influencer..."
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(183,159,255,0.1)',
                  borderRadius: 12, padding: '12px 16px', color: '#e7e2ff', fontSize: 14, outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowCourtesy(false)} style={{ flex: 1, padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'rgba(231,226,255,0.5)' }}>
                Cancelar
              </button>
              <button onClick={grantCourtesy} disabled={saving} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, background: '#b79fff', color: '#0d0a27', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Salvando...' : `Conceder ${courtesyDays} dias`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
