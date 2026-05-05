import { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../../contexts/AppContext';
import { useAuth } from '../../../contexts/AuthContext';
import { track, trackOnce, setTrailKey } from '../../../lib/analytics';
import { useBabyPremium } from '../../../hooks/useBabyPremium';
import { useSheetBackClose } from '../../../hooks/useSheetBackClose';
import { PaywallModal } from '../../../components/ui/PaywallModal';
import { SpotlightOverlay } from '../../../components/ui/SpotlightOverlay';
import Toast from '../../../components/ui/Toast';
import {
  createSharedReport,
  listSharedReports,
  deleteSharedReport,
  toggleSharedReport,
  getReportUrl,
  getExpirationDate,
  type SharedReport,
  type ReportAudience,
} from '../sharedReports';

// Público-alvo do link. Define seções e CTA renderizados em SharedReportPage.
const AUDIENCES: {
  key: ReportAudience;
  icon: string;
  title: string;
  desc: string;
}[] = [
  { key: 'pediatrician', icon: 'stethoscope', title: 'Pediatra', desc: 'Dados clínicos, curva OMS e padrões.' },
  { key: 'caregiver',    icon: 'child_care',  title: 'Cuidadora', desc: 'Rotina do dia, próximas doses, turnos.' },
  { key: 'family',       icon: 'favorite',    title: 'Família', desc: 'Marcos recentes, fotos e progresso.' },
];
import { hapticLight, hapticMedium, hapticSuccess } from '../../../lib/haptics';
import { setFlag } from '../../../lib/userFlags';
import ReportGeneratedSheet from './ReportGeneratedSheet';

export default function SharedReports() {
  const { baby } = useAppState();
  const { user } = useAuth();
  const isPremium = useBabyPremium();

  const [showPaywall, setShowPaywall] = useState(false);
  const [reports, setReports] = useState<SharedReport[]>([]);

  // Feature Spotlight: primeira visita ao componente de Super Relatório
  const spotlightKey = baby?.id ? `yaya_spotlight_reports_${baby.id}` : null;
  const [showSpotlight, setShowSpotlight] = useState(false);

  useEffect(() => {
    if (!baby || !spotlightKey) return;
    if (localStorage.getItem(spotlightKey)) return;
    // Delay mínimo para evitar flicker durante carregamento inicial
    const timer = setTimeout(() => setShowSpotlight(true), 400);
    return () => clearTimeout(timer);
  }, [baby?.id, spotlightKey]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismissSpotlight() {
    if (spotlightKey) setFlag(spotlightKey);
    setShowSpotlight(false);
  }
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [showReportCelebration, setShowReportCelebration] = useState(false);

  useSheetBackClose(showCreate, () => setShowCreate(false));
  useSheetBackClose(!!confirmDelete, () => setConfirmDelete(null));

  const genderContraction = baby?.gender === 'boy' ? 'do' : baby?.gender === 'girl' ? 'da' : 'de';

  // Create form
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [expirationPreset, setExpirationPreset] = useState('7d');
  const [customDate, setCustomDate] = useState('');
  const [audience, setAudience] = useState<ReportAudience>('pediatrician');
  const [creating, setCreating] = useState(false);
  const [createdReport, setCreatedReport] = useState<{ url: string; password: string } | null>(null);

  const loadReports = useCallback(async () => {
    if (!baby) return;
    setLoading(true);
    const data = await listSharedReports(baby.id);
    setReports(data);
    setLoading(false);
  }, [baby]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // Analytics: super_report_viewed (só quando usuário autenticado abre a tela)
  useEffect(() => {
    if (!user || !baby) return;
    const babyAgeDays = Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000);
    trackOnce('super_report_viewed', 'super_report_viewed', { baby_age_days: babyAgeDays }, baby.id);
  }, [user?.id, baby?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpenCreate = () => {
    hapticLight();
    if (!isPremium) {
      setShowPaywall(true);
      return;
    }
    setName('');
    setPassword('');
    setExpirationPreset('7d');
    setCustomDate('');
    setAudience('pediatrician');
    setCreatedReport(null);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!baby || !user || !name.trim() || !password.trim()) return;
    hapticMedium();
    setCreating(true);

    let expiresAt: string | null;
    if (expirationPreset === 'custom' && customDate) {
      expiresAt = new Date(customDate + 'T23:59:59').toISOString();
    } else {
      expiresAt = getExpirationDate(expirationPreset);
    }

    const report = await createSharedReport(baby.id, user.id, name.trim(), password, expiresAt, audience);
    setCreating(false);

    if (report) {
      hapticSuccess();
      setCreatedReport({ url: getReportUrl(report.token), password });
      await loadReports();
      // Analytics: super_report_generated + trail key
      const babyAgeDays = baby ? Math.floor((Date.now() - new Date(baby.birthDate).getTime()) / 86400000) : undefined;
      track('super_report_generated', { audience, baby_age_days: babyAgeDays });
      if (baby?.id) {
        setTrailKey('super_report_generated', baby.id);
        // Celebration: primeira geração do Super Relatório
        const celebKey = `yaya_celebration_report_generated_${baby.id}`;
        if (!localStorage.getItem(celebKey)) {
          setFlag(celebKey);
          setShowReportCelebration(true);
        }
      }
    }
  };

  const handleDelete = async (id: string) => {
    hapticMedium();
    const ok = await deleteSharedReport(id);
    if (ok) {
      setReports(prev => prev.filter(r => r.id !== id));
      setConfirmDelete(null);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    hapticLight();
    const ok = await toggleSharedReport(id, !enabled);
    if (ok) {
      setReports(prev => prev.map(r => r.id === id ? { ...r, enabled: !enabled } : r));
    }
  };

  const handleCopyLink = (token: string) => {
    hapticLight();
    navigator.clipboard.writeText(getReportUrl(token));
    setCopyToast('Link copiado!');
  };

  const handleShareWhatsApp = (report: SharedReport) => {
    hapticLight();
    // Analytics: super_report_shared
    track('super_report_shared', { audience: report.audience });
    const url = getReportUrl(report.token);
    // Nota: não incluímos senha aqui porque, depois que o link é fechado,
    // a senha não é mais acessível via UI (só conhecida pelo pai no momento
    // da criação). Quem usar "Compartilhar" depois precisa da senha à mão —
    // pra isso existe também o botão "Copiar link" e, na criação, o "Copiar
    // mensagem pronta" que inclui senha.
    const text = `Oi! Preparei o acompanhamento ${genderContraction} ${baby?.name} pra você dar uma olhada.\n\nLink: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const isExpired = (r: SharedReport) =>
    r.expires_at ? new Date(r.expires_at) < new Date() : false;

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return 'Sem limite';
    const d = new Date(expiresAt);
    if (d < new Date()) return 'Expirado';
    const diff = d.getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days <= 1) return 'Expira hoje';
    if (days <= 7) return `Expira em ${days} dias`;
    return `Expira em ${d.toLocaleDateString('pt-BR')}`;
  };

  // Linha curta mostrando quantas vezes e quando foi acessado pela última vez.
  // Fica em cinza abaixo do "Expira em …", sem detalhes sensíveis (IP, device).
  const formatAccess = (count: number | null | undefined, lastAt: string | null | undefined) => {
    if (!count || !lastAt) return 'Nunca acessado';
    const d = new Date(lastAt);
    const diffMin = Math.round((Date.now() - d.getTime()) / 60000);
    let when: string;
    if (diffMin < 60) when = `há ${diffMin}min`;
    else if (diffMin < 24 * 60) when = `há ${Math.floor(diffMin / 60)}h`;
    else when = d.toLocaleDateString('pt-BR');
    const plural = count === 1 ? 'acesso' : 'acessos';
    return `${count} ${plural} · último ${when}`;
  };

  if (!baby) return null;

  return (
    <>
      {/* Main card */}
      <div className="bg-surface-container rounded-md p-4">
        <button
          onClick={() => { hapticLight(); setExpanded(!expanded); }}
          className="w-full flex items-start gap-3 text-left"
        >
          <span className="material-symbols-outlined text-primary text-xl mt-0.5">link</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-on-surface font-headline text-sm font-bold">
              Super relatório {genderContraction} {baby?.name}
            </h3>
            <p className="font-body text-xs text-on-surface-variant mt-0.5">
              Crie links seguros para pediatras, consultoras ou babás acessarem o relatório pelo navegador.
            </p>
            {!expanded && reports.length > 0 && (
              <p className="font-label text-[11px] text-primary mt-1.5">
                {reports.length} {reports.length === 1 ? 'link ativo' : 'links ativos'}
              </p>
            )}
          </div>
          <span className={`material-symbols-outlined text-on-surface-variant text-base transition-transform mt-0.5 ${expanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>

        {expanded && (
        <div className="mt-4">
        {/* Existing reports list */}
        {loading ? (
          <div className="flex justify-center py-4">
            <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-2 mb-4">
            {reports.map((r) => {
              const expired = isExpired(r);
              const active = r.enabled && !expired;
              return (
                <div
                  key={r.id}
                  className={`rounded-md p-3 border transition-colors ${
                    active
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-surface-variant/30 border-surface-variant/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      active ? 'bg-primary/20' : 'bg-surface-variant'
                    }`}>
                      <span className={`material-symbols-outlined text-sm ${
                        active ? 'text-primary' : 'text-on-surface-variant'
                      }`}>
                        {active ? 'verified_user' : expired ? 'timer_off' : 'link_off'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-headline text-sm font-bold truncate ${
                        active ? 'text-on-surface' : 'text-on-surface-variant'
                      }`}>
                        {r.name}
                      </p>
                      <p className={`font-label text-[11px] ${
                        expired ? 'text-error' : 'text-on-surface-variant'
                      }`}>
                        {formatExpiry(r.expires_at)}
                      </p>
                      <p className="font-label text-[11px] text-on-surface-variant/70 mt-0.5">
                        {formatAccess(r.access_count, r.last_accessed_at)}
                      </p>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(r.id, r.enabled)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        r.enabled ? 'bg-primary' : 'bg-surface-variant'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        r.enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {active && (
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => handleCopyLink(r.token)}
                        className="flex-1 py-2 rounded-md bg-white/[0.06] text-on-surface-variant font-label text-[11px] font-semibold flex items-center justify-center gap-1 active:bg-white/10"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        Copiar
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(r)}
                        className="flex-1 py-2 rounded-md bg-[#25D366]/10 text-[#25D366] font-label text-[11px] font-semibold flex items-center justify-center gap-1 active:bg-[#25D366]/20"
                      >
                        <span className="material-symbols-outlined text-sm">share</span>
                        WhatsApp
                      </button>
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        className="py-2 px-3 rounded-md bg-error/10 text-error font-label text-[11px] font-semibold flex items-center justify-center active:bg-error/20"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  )}

                  {!active && (
                    <div className="flex gap-1.5 mt-2">
                      <button
                        onClick={() => setConfirmDelete(r.id)}
                        className="flex-1 py-2 rounded-md bg-error/10 text-error font-label text-[11px] font-semibold flex items-center justify-center gap-1 active:bg-error/20"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Create button */}
        <button
          onClick={handleOpenCreate}
          className="w-full py-3 rounded-md bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 text-primary font-label font-semibold text-sm flex items-center justify-center gap-2 active:from-primary/20 active:to-primary/10 transition-colors"
        >
          <span className="material-symbols-outlined text-lg">add_link</span>
          Novo link de acesso
        </button>
        </div>
        )}
      </div>

      {/* Create bottom sheet */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!createdReport) setShowCreate(false); }}
        >
          <div
            className="w-full max-w-md rounded-t-md bg-surface border border-primary/20 p-5 pb-sheet max-h-[85vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">add_link</span>
                <h3 className="text-base font-bold text-on-surface">
                  {createdReport ? 'Link criado!' : 'Novo link de acesso'}
                </h3>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-on-surface/40">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {!createdReport ? (
              <>
                {/* Audience */}
                <div className="mb-4">
                  <label className="font-label text-xs text-on-surface/60 uppercase tracking-wider mb-2 block">
                    Para quem é esse link?
                  </label>
                  <div className="space-y-1.5">
                    {AUDIENCES.map((opt) => {
                      const selected = audience === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => { hapticLight(); setAudience(opt.key); }}
                          className={`w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors ${
                            selected
                              ? 'bg-primary/20 border border-primary/60'
                              : 'bg-white/[0.04] border border-white/10'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-lg mt-0.5 shrink-0 ${
                              selected ? 'text-primary' : 'text-on-surface/60'
                            }`}
                          >
                            {opt.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-label text-sm font-semibold ${selected ? 'text-on-surface' : 'text-on-surface/80'}`}>
                              {opt.title}
                            </p>
                            <p className="font-body text-[11px] text-on-surface/50 leading-snug">
                              {opt.desc}
                            </p>
                          </div>
                          {selected && (
                            <span className="material-symbols-outlined text-base text-primary shrink-0">check_circle</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Name */}
                <div className="mb-4">
                  <label className="font-label text-xs text-on-surface/60 uppercase tracking-wider mb-1.5 block">
                    Nome do acesso
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Dr. Silva, Consultora Ana, Baba Maria"
                    className="w-full bg-white/[0.06] rounded-md px-4 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-on-surface/30"
                  />
                </div>

                {/* Password */}
                <div className="mb-4">
                  <label className="font-label text-xs text-on-surface/60 uppercase tracking-wider mb-1.5 block">
                    Senha de acesso
                  </label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Crie uma senha simples para o acesso"
                    className="w-full bg-white/[0.06] rounded-md px-4 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-on-surface/30"
                  />
                </div>

                {/* Expiration */}
                <div className="mb-5">
                  <label className="font-label text-xs text-on-surface/60 uppercase tracking-wider mb-2 block">
                    Validade
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {[
                      { key: '24h', label: '24 horas' },
                      { key: '7d', label: '7 dias' },
                      { key: '30d', label: '30 dias' },
                      { key: 'none', label: 'Sem limite' },
                    ].map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => { hapticLight(); setExpirationPreset(opt.key); }}
                        className={`py-2.5 rounded-md font-label text-sm font-semibold transition-colors ${
                          expirationPreset === opt.key
                            ? 'bg-primary text-on-primary'
                            : 'bg-white/[0.06] text-on-surface/70'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => { hapticLight(); setExpirationPreset('custom'); }}
                    className={`w-full py-2.5 rounded-md font-label text-sm font-semibold transition-colors ${
                      expirationPreset === 'custom'
                        ? 'bg-primary text-on-primary'
                        : 'bg-white/[0.06] text-on-surface/70'
                    }`}
                  >
                    Data personalizada
                  </button>
                  {expirationPreset === 'custom' && (
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      min={new Date().toLocaleDateString('sv')}
                      className="w-full mt-2 bg-white/[0.06] rounded-md px-4 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
                    />
                  )}
                </div>

                {/* Create button */}
                <button
                  onClick={handleCreate}
                  disabled={creating || !name.trim() || !password.trim() || (expirationPreset === 'custom' && !customDate)}
                  className="w-full py-3.5 rounded-md bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                      Criando link...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">add_link</span>
                      Criar link seguro
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                {/* Success state */}
                <div className="text-center mb-5">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-md bg-green-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-green-400 text-3xl">check_circle</span>
                  </div>
                  <p className="font-body text-xs text-on-surface/60 mb-4">
                    Envie o link e a senha para o profissional
                  </p>
                </div>

                <div className="bg-white/[0.04] rounded-md p-4 mb-3">
                  <p className="font-label text-[11px] text-on-surface/50 uppercase tracking-wider mb-1">Link</p>
                  <p className="font-body text-xs text-primary break-all">{createdReport.url}</p>
                </div>

                <div className="bg-white/[0.04] rounded-md p-4 mb-5">
                  <p className="font-label text-[11px] text-on-surface/50 uppercase tracking-wider mb-1">Senha</p>
                  <p className="font-headline text-lg font-bold text-on-surface tracking-wider">{createdReport.password}</p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => {
                      hapticLight();
                      const text = `Oi! Preparei o acompanhamento ${genderContraction} ${baby?.name} pra você dar uma olhada.\n\nLink: ${createdReport!.url}\nSenha: ${createdReport!.password}\n\nQualquer dúvida me chama 🙂`;
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="w-full py-3 rounded-md bg-[#25D366] text-white font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">share</span>
                    Enviar via WhatsApp
                  </button>

                  <button
                    onClick={() => {
                      hapticLight();
                      const text = `Oi! Preparei o acompanhamento ${genderContraction} ${baby?.name} pra você. Link: ${createdReport!.url} — Senha: ${createdReport!.password}`;
                      navigator.clipboard.writeText(text);
                      setCopyToast('Mensagem copiada! Só colar onde quiser.');
                    }}
                    className="w-full py-3 rounded-md bg-on-surface/10 text-on-surface font-semibold text-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                    Copiar mensagem pronta
                  </button>

                  <button
                    onClick={() => setShowCreate(false)}
                    className="w-full py-3 rounded-md text-on-surface/40 font-semibold text-sm"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-surface-container-highest rounded-md p-6 mx-6 max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-error text-2xl">delete_forever</span>
              <h3 className="font-headline text-lg font-bold text-on-surface">Excluir acesso</h3>
            </div>
            <p className="font-body text-sm text-on-surface-variant mb-5">
              Tem certeza? O profissional perdera acesso ao relatorio imediatamente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label text-sm font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-md bg-error text-on-error font-label text-sm font-semibold"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} trigger="shared_report" />

      {copyToast && (
        <Toast
          message={copyToast}
          duration={1800}
          onDismiss={() => setCopyToast(null)}
        />
      )}

      {/* Feature Spotlight — primeira visita à seção de Super Relatório */}
      <SpotlightOverlay
        isOpen={showSpotlight}
        onClose={dismissSpotlight}
        emoji="📋"
        title={`A rotina ${genderContraction} ${baby?.name ?? 'bebê'} em um link`}
        description="Gera um link com sono, alimentação, marcos e vacinas. Envia para o pediatra antes da consulta."
      />

      {/* Celebration: primeira geração do Super Relatório */}
      <ReportGeneratedSheet
        isOpen={showReportCelebration}
        babyName={baby?.name ?? ''}
        babyGender={baby?.gender}
        onShare={() => {
          if (!createdReport) return;
          hapticLight();
          const text = `Oi! Preparei o acompanhamento ${genderContraction} ${baby?.name} pra você dar uma olhada.\n\nLink: ${createdReport.url}\nSenha: ${createdReport.password}\n\nQualquer dúvida me chama 🙂`;
          window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }}
        onClose={() => setShowReportCelebration(false)}
      />
    </>
  );
}
