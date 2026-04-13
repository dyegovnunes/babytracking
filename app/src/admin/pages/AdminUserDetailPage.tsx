import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
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
    const [profileRes, babiesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('baby_members').select('baby_id, display_name, role, babies(name, birth_date, gender)').eq('user_id', userId),
    ]);

    setUser(profileRes.data);

    const babyData = babiesRes.data ?? [];
    setBabies(babyData);

    const babyIds = babyData.map((b: any) => b.baby_id);
    if (babyIds.length > 0) {
      const [logRes, streakRes] = await Promise.all([
        supabase.from('logs').select('*', { count: 'exact', head: true })
          .in('baby_id', babyIds),
        supabase.from('streaks').select('*').in('baby_id', babyIds).limit(1).maybeSingle(),
      ]);
      setLogCount(logRes.count ?? 0);
      setStreak(streakRes.data);
    }
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
    setToast(`Cortesia de ${days} dias concedida!`);
    loadUser(id);
    setTimeout(() => setToast(''), 3000);
  }

  if (!user) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isCourtesyActive = user.courtesy_expires_at && new Date(user.courtesy_expires_at) > new Date();

  return (
    <div className="space-y-4 py-2">
      <button onClick={() => navigate(-1)} className="text-gray-500 text-sm flex items-center gap-1">
        {'\u2190'} Voltar
      </button>

      {/* Header */}
      <div className="bg-gray-900 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-white text-sm font-semibold font-mono">{id?.slice(0, 16)}...</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Cadastro: {new Date(user.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          {isCourtesyActive ? (
            <span className="text-[10px] bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full">Cortesia</span>
          ) : user.is_premium ? (
            <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded-full">Yaya+</span>
          ) : (
            <span className="text-[10px] bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">Free</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-white font-bold">{babies.length}</div>
            <div className="text-gray-500 text-[10px]">Bebes</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-white font-bold">{logCount}</div>
            <div className="text-gray-500 text-[10px]">Registros</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-2 text-center">
            <div className="text-white font-bold">{streak?.current_streak ?? 0}{'\u{1F525}'}</div>
            <div className="text-gray-500 text-[10px]">Streak</div>
          </div>
        </div>
      </div>

      {/* Babies */}
      {babies.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-2">Bebes</p>
          {babies.map((b: any) => (
            <div key={b.baby_id} className="flex items-center gap-2 py-1">
              <span className="text-sm">{b.babies?.gender === 'boy' ? '\u{1F466}' : b.babies?.gender === 'girl' ? '\u{1F467}' : '\u{1F476}'}</span>
              <span className="text-white text-sm">{b.babies?.name}</span>
              <span className="text-gray-600 text-xs">
                {b.babies?.birth_date ? new Date(b.babies.birth_date).toLocaleDateString('pt-BR') : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Platform */}
      <div className="bg-gray-900 rounded-xl p-4">
        <p className="text-gray-500 text-xs mb-2">Plataforma</p>
        <p className="text-white text-sm">
          {user.signup_platform === 'android' ? '\u{1F916} Android' :
           user.signup_platform === 'ios' ? '\u{1F34E} iOS' : '\u{1F310} Web'}
        </p>
      </div>

      {/* Subscription */}
      {user.is_premium && (
        <div className="bg-gray-900 rounded-xl p-4">
          <p className="text-gray-500 text-xs mb-2">Assinatura</p>
          <p className="text-white text-sm capitalize">{user.subscription_plan ?? 'premium'}</p>
          {isCourtesyActive && (
            <p className="text-amber-400 text-xs mt-1">
              Cortesia ate {new Date(user.courtesy_expires_at).toLocaleDateString('pt-BR')}
              {user.courtesy_reason && ` — ${user.courtesy_reason}`}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <button
        onClick={() => setShowCourtesy(true)}
        className="w-full bg-amber-600/20 text-amber-400 rounded-xl py-3 text-sm font-semibold active:bg-amber-600/30"
      >
        {'\u{1F381}'} Dar cortesia temporaria
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-4 right-4 bg-green-600 text-white text-sm text-center py-3 rounded-xl z-50">
          {toast}
        </div>
      )}

      {/* Courtesy Modal */}
      {showCourtesy && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowCourtesy(false)}>
          <div className="bg-gray-900 w-full rounded-t-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">Conceder cortesia</h3>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Dias de Yaya+</label>
              <div className="flex gap-2">
                {['7', '14', '30', '60'].map(d => (
                  <button
                    key={d}
                    onClick={() => setCourtesyDays(d)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
                      courtesyDays === d ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Motivo (opcional)</label>
              <input
                type="text"
                value={courtesyReason}
                onChange={e => setCourtesyReason(e.target.value)}
                placeholder="ex: Pedido via email, influencer..."
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCourtesy(false)}
                className="flex-1 bg-gray-800 text-gray-400 rounded-xl py-3 text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={grantCourtesy}
                disabled={saving}
                className="flex-[2] bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Salvando...' : `Conceder ${courtesyDays} dias`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
