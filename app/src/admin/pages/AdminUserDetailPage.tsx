import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSheetBackClose } from '../../hooks/useSheetBackClose';
import { formatRelativeShort } from '../../lib/formatters';

function platformLabel(p: string): string {
  if (p === 'android') return 'Android';
  if (p === 'ios') return 'iOS';
  if (p === 'web') return 'Web';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useSheetBackClose(showCourtesy, () => setShowCourtesy(false));
  useSheetBackClose(showDeleteConfirm, () => {
    setShowDeleteConfirm(false);
    setDeleteConfirmText('');
  });

  useEffect(() => {
    if (id) loadUser(id);
  }, [id]);

  async function loadUser(userId: string) {
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
    await supabase
      .from('profiles')
      .update({
        is_premium: newValue,
        subscription_plan: newValue ? 'admin_granted' : null,
      })
      .eq('id', id);
    setUser({ ...user, is_premium: newValue });
    setToast(newValue ? 'Usuário promovido para Yaya+' : 'Usuário rebaixado para Free');
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
      supabase
        .from('profiles')
        .update({
          courtesy_expires_at: expiresAt,
          courtesy_granted_by: adminUser?.id,
          courtesy_reason: courtesyReason,
          is_premium: true,
        })
        .eq('id', id),
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

  async function handleDeleteUser() {
    if (!id || deleteConfirmText.toLowerCase() !== 'confirmar') return;
    setDeleting(true);

    // O delete direto no client nao funciona por varios motivos:
    // 1. RLS em profiles so libera SELECT/UPDATE pra admin (nao DELETE)
    // 2. auth.admin.deleteUser precisa de service role, inacessivel do client
    // 3. Varias FKs sao NO ACTION (logs.created_by, baby_milestones.recorded_by
    //    etc) e bloqueiam o cascade se o usuario tiver conteudo em babies
    //    compartilhadas.
    //
    // A edge function admin-delete-user faz o fluxo completo: babies
    // orfaos deletados, atribuicoes em babies compartilhadas nulificadas,
    // refs globais nulificadas, depois auth.admin.deleteUser finaliza.
    //
    // Observacao: passamos o access_token EXPLICITAMENTE em Authorization.
    // Sem isso, o supabase-js as vezes envia so a anon key, o que quebra
    // a validacao `admin.auth.getUser(jwt)` dentro da edge function.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDeleting(false);
      setToast('Sessão expirada. Faça login de novo.');
      setTimeout(() => setToast(''), 5000);
      return;
    }

    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: id },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    setDeleting(false);

    if (error) {
      // supabase.functions.invoke() esconde o corpo JSON do erro em
      // error.context (Response). Extraimos manualmente pra mostrar o
      // motivo real (role=anon, JWT expirado, is_admin=false etc.)
      let detail = error.message;
      try {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          if (body?.error) detail = body.error + (body.hint ? ` — ${body.hint}` : '');
        }
      } catch {
        // mantem error.message
      }
      setToast(`Erro: ${detail}`);
      setTimeout(() => setToast(''), 6000);
      return;
    }
    if (data?.error) {
      setToast(`Erro: ${data.error}${data.hint ? ` — ${data.hint}` : ''}`);
      setTimeout(() => setToast(''), 6000);
      return;
    }

    navigate('/paineladmin/users');
  }

  if (!user) {
    return (
      <div className="flex justify-center py-20">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  const isCourtesyActive =
    (user.courtesy_expires_at && new Date(user.courtesy_expires_at) > new Date()) ||
    user.subscription_plan === 'courtesy_lifetime';

  const platforms: string[] = Array.isArray(user.platforms) ? user.platforms : [];
  const platformDisplay =
    platforms.length > 0
      ? platforms.map(platformLabel).join(' | ')
      : user.signup_platform
        ? platformLabel(user.signup_platform)
        : '—';

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-primary font-label text-sm bg-transparent border-none cursor-pointer mb-4 hover:opacity-80"
      >
        ← Voltar
      </button>

      {/* User header */}
      <div className="bg-primary/8 border border-primary/20 rounded-md px-5 py-4 mb-3">
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0">
            <div className="font-headline text-lg font-semibold text-on-surface truncate">{email}</div>
            <div className="font-label text-xs text-on-surface-variant/70 mt-1">
              Cadastro: {new Date(user.created_at).toLocaleDateString('pt-BR')} · ID: {id?.slice(0, 8)}
              {user.last_activity_at && (
                <> · Último acesso: {formatRelativeShort(user.last_activity_at)}</>
              )}
            </div>
          </div>
          <StatusBadge
            bucket={
              isCourtesyActive ? 'courtesy' : user.is_premium ? 'paying' : 'free'
            }
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat value={babies.length} label="Bebês" />
          <MiniStat value={logCount} label="Registros" />
          <MiniStat value={streak?.current_streak ?? 0} label="Streak" />
        </div>
      </div>

      {/* Babies */}
      {babies.length > 0 && (
        <InfoCard>
          <CardLabel>Bebês</CardLabel>
          {babies.map((b: any) => (
            <div key={b.baby_id} className="flex items-center gap-2.5 py-1.5">
              <span className="text-base">
                {b.babies?.gender === 'boy' ? '👦' : b.babies?.gender === 'girl' ? '👧' : '👶'}
              </span>
              <div>
                <span className="font-body text-sm text-on-surface">{b.babies?.name}</span>
                <span className="font-label text-xs text-on-surface-variant/60 ml-2">
                  {b.babies?.birth_date ? b.babies.birth_date.split('-').reverse().join('/') : ''} · {b.role}
                </span>
              </div>
            </div>
          ))}
        </InfoCard>
      )}

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <InfoCard>
          <CardLabel>Plataforma</CardLabel>
          <div className="font-body text-sm text-on-surface">{platformDisplay}</div>
        </InfoCard>
        <InfoCard>
          <CardLabel>Plano</CardLabel>
          <div className="font-body text-sm text-on-surface capitalize">
            {user.subscription_plan || (user.is_premium ? 'premium' : 'free')}
          </div>
        </InfoCard>
      </div>

      {isCourtesyActive && user.courtesy_expires_at && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-md px-5 py-4 mb-3">
          <CardLabel>Cortesia ativa</CardLabel>
          <div className="font-body text-sm text-amber-500">
            Até {new Date(user.courtesy_expires_at).toLocaleDateString('pt-BR')}
            {user.courtesy_reason && (
              <span className="text-on-surface-variant/70"> — {user.courtesy_reason}</span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2.5 mt-4 flex-wrap">
        <button
          onClick={togglePremium}
          disabled={saving}
          className={`flex-1 py-3.5 px-4 rounded-md border-none cursor-pointer font-label text-sm font-semibold transition-colors ${
            user.is_premium
              ? 'bg-error/12 text-error hover:bg-error/20'
              : 'bg-primary/15 text-primary hover:bg-primary/25'
          }`}
        >
          {user.is_premium ? 'Rebaixar para Free' : 'Promover para Yaya+'}
        </button>
        <button
          onClick={() => setShowCourtesy(true)}
          className="flex-1 py-3.5 px-4 rounded-md bg-amber-500/12 text-amber-500 font-label text-sm font-semibold border-none cursor-pointer hover:bg-amber-500/20 transition-colors"
        >
          Dar cortesia
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="py-3.5 px-4 rounded-md bg-error/12 text-error font-label text-sm font-semibold border-none cursor-pointer hover:bg-error/20 transition-colors"
        >
          Excluir
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-5 right-5 mx-auto max-w-md bg-green-600 text-white font-label text-sm text-center px-4 py-3.5 rounded-md z-50">
          {toast}
        </div>
      )}

      {/* Courtesy Modal */}
      {showCourtesy && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5"
          onClick={() => setShowCourtesy(false)}
        >
          <div
            className="bg-surface-container-high border border-outline-variant/30 rounded-md p-7 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-headline text-lg font-bold text-on-surface mb-5">Conceder cortesia</h3>

            <div className="mb-4">
              <CardLabel>Dias de Yaya+</CardLabel>
              <div className="flex gap-2">
                {['7', '14', '30', '60', '90'].map(d => (
                  <button
                    key={d}
                    onClick={() => setCourtesyDays(d)}
                    className={`flex-1 py-2.5 rounded-md border-none cursor-pointer font-label text-sm font-semibold transition-colors ${
                      courtesyDays === d
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-lowest text-on-surface-variant'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <CardLabel>Motivo (opcional)</CardLabel>
              <input
                type="text"
                value={courtesyReason}
                onChange={e => setCourtesyReason(e.target.value)}
                placeholder="ex: Pedido via email, influencer..."
                className="w-full rounded-md px-4 py-3 text-sm bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/30"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowCourtesy(false)}
                className="flex-1 py-3.5 rounded-md bg-surface-container-lowest text-on-surface-variant font-label text-sm font-semibold border-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={grantCourtesy}
                disabled={saving}
                className="flex-[2] py-3.5 rounded-md bg-primary text-on-primary font-label text-sm font-bold border-none cursor-pointer disabled:opacity-50 active:opacity-80 transition-opacity"
              >
                {saving ? 'Salvando...' : `Conceder ${courtesyDays} dias`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5"
          onClick={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmText('');
          }}
        >
          <div
            className="bg-surface-container-high border border-error/30 rounded-md p-7 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-headline text-lg font-bold text-error mb-3">Excluir usuário</h3>
            <p className="font-body text-sm text-on-surface-variant mb-2">
              Esta ação é irreversível. Todos os dados do usuário serão excluídos permanentemente.
            </p>
            <p className="font-label text-[13px] text-on-surface-variant/70 mb-4">
              Digite <strong className="text-error">confirmar</strong> para prosseguir:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              placeholder="Digite confirmar"
              className="w-full rounded-md px-4 py-3 text-sm bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-error/40 border border-error/20 mb-5"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 py-3.5 rounded-md bg-surface-container-lowest text-on-surface-variant font-label text-sm font-semibold border-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleting || deleteConfirmText.toLowerCase() !== 'confirmar'}
                className="flex-[2] py-3.5 rounded-md bg-error text-white font-label text-sm font-semibold border-none cursor-pointer disabled:opacity-40 transition-opacity"
              >
                {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant/30 rounded-md px-5 py-4 mb-3">
      {children}
    </div>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-label text-[11px] text-on-surface-variant/70 uppercase tracking-wider mb-1.5">
      {children}
    </div>
  );
}

function MiniStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-md px-3 py-2.5 text-center">
      <div className="font-headline text-xl font-bold text-on-surface">{value}</div>
      <div className="font-label text-[10px] text-on-surface-variant/70">{label}</div>
    </div>
  );
}

function StatusBadge({ bucket }: { bucket: 'courtesy' | 'paying' | 'free' }) {
  if (bucket === 'courtesy') {
    return (
      <span className="inline-block font-label text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-500 shrink-0">
        Cortesia
      </span>
    );
  }
  if (bucket === 'paying') {
    return (
      <span className="inline-block font-label text-xs px-3 py-1 rounded-full bg-primary/20 text-primary shrink-0">
        Yaya+
      </span>
    );
  }
  return (
    <span className="inline-block font-label text-xs px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant/70 shrink-0">
      Free
    </span>
  );
}
