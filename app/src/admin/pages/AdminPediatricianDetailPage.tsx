import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatRelativeShort } from '../../lib/formatters';
import { useSheetBackClose } from '../../hooks/useSheetBackClose';

interface Pediatrician {
  id: string;
  user_id: string;
  email: string | null;
  name: string;
  crm: string;
  crm_state: string;
  rqe: string[] | null;
  specialties: string[] | null;
  invite_code: string;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  baby_members_count: number;
  patients_count: number;
  last_seen_at: string | null;
  last_seen_platform: string | null;
  last_activity_at: string | null;
  platforms: string[] | null;
}

interface PatientRow {
  baby_id: string;
  baby_name: string;
  baby_gender: string | null;
  baby_birth_date: string | null;
  linked_at: string;
  unlinked_at: string | null;
  unlink_reason: string | null;
  parent_email: string | null;
}

function platformLabel(p: string): string {
  if (p === 'android') return 'Android';
  if (p === 'ios') return 'iOS';
  if (p === 'web') return 'Web';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function genderEmoji(g: string | null): string {
  if (g === 'boy') return '👦';
  if (g === 'girl') return '👧';
  return '👶';
}

function ageFromBirth(birthDate: string | null): string {
  if (!birthDate) return '';
  const [y, m, d] = birthDate.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  const days = Math.floor((Date.now() - birth.getTime()) / 86400000);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months}m`;
  const years = Math.floor(months / 12);
  const rem = months - years * 12;
  return rem > 0 ? `${years}a ${rem}m` : `${years}a`;
}

export default function AdminPediatricianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ped, setPed] = useState<Pediatrician | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeConfirmText, setRemoveConfirmText] = useState('');
  const [removing, setRemoving] = useState(false);

  useSheetBackClose(showRemoveConfirm, () => {
    setShowRemoveConfirm(false);
    setRemoveConfirmText('');
  });

  useEffect(() => {
    if (id) load(id);
  }, [id]);

  async function load(pedId: string) {
    setLoading(true);
    const [pedsRes, patsRes] = await Promise.all([
      supabase.rpc('admin_get_pediatricians'),
      supabase.rpc('admin_get_pediatrician_patients', { p_pediatrician_id: pedId }),
    ]);
    const found = (pedsRes.data as Pediatrician[])?.find(p => p.id === pedId) ?? null;
    setPed(found);
    setPatients((patsRes.data as PatientRow[]) ?? []);
    setLoading(false);
  }

  async function removeRole() {
    if (!ped || removeConfirmText.toLowerCase() !== 'remover') return;
    setRemoving(true);
    // RLS: policy admin_all_pediatricians permite delete pra is_admin.
    // Cascade limpa pediatrician_patients automaticamente.
    const { error } = await supabase.from('pediatricians').delete().eq('id', ped.id);
    setRemoving(false);
    if (error) {
      setToast(`Erro: ${error.message}`);
      setTimeout(() => setToast(''), 5000);
      return;
    }
    setShowRemoveConfirm(false);
    setRemoveConfirmText('');
    setToast('Papel de pediatra removido. Conta do usuário preservada.');
    setTimeout(() => navigate('/paineladmin/pediatricians'), 1500);
  }

  async function approve() {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.rpc('admin_approve_pediatrician', { p_id: id });
    setSaving(false);
    if (error) {
      setToast(`Erro: ${error.message}`);
      setTimeout(() => setToast(''), 5000);
      return;
    }
    setToast('Pediatra aprovado(a)');
    setTimeout(() => setToast(''), 3000);
    load(id);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="material-symbols-outlined text-primary text-3xl animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (!ped) {
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-primary font-label text-sm bg-transparent border-none cursor-pointer mb-4 hover:opacity-80"
        >
          ← Voltar
        </button>
        <div className="bg-surface-container-low border border-outline-variant/30 rounded-md p-6 text-center font-label text-sm text-on-surface-variant">
          Pediatra não encontrado.
        </div>
      </div>
    );
  }

  const isPending = !ped.approved_at;
  const platformDisplay =
    ped.platforms && ped.platforms.length > 0
      ? ped.platforms.map(platformLabel).join(' | ')
      : '—';
  const activePatients = patients.filter(p => !p.unlinked_at);
  const inactivePatients = patients.filter(p => !!p.unlinked_at);

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-primary font-label text-sm bg-transparent border-none cursor-pointer mb-4 hover:opacity-80"
      >
        ← Voltar
      </button>

      {/* Header */}
      <div
        className={`rounded-md px-5 py-4 mb-3 border ${
          isPending ? 'bg-amber-500/8 border-amber-500/30' : 'bg-primary/8 border-primary/20'
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="font-headline text-lg font-semibold text-on-surface truncate">
              {ped.name}
            </div>
            <div className="font-label text-xs text-on-surface-variant/80 mt-0.5">
              CRM {ped.crm}/{ped.crm_state}
              {ped.rqe && ped.rqe.length > 0 && <> · RQE {ped.rqe.join(', ')}</>}
            </div>
            {ped.email && (
              <div className="font-label text-xs text-on-surface-variant/60 mt-1 truncate">
                {ped.email}
              </div>
            )}
            <div className="font-label text-[11px] text-on-surface-variant/60 mt-1">
              Cadastrado {formatRelativeShort(ped.created_at)}
              {ped.approved_at && <> · Aprovado {formatRelativeShort(ped.approved_at)}</>}
            </div>
          </div>
          {isPending ? (
            <button
              onClick={approve}
              disabled={saving}
              className="bg-primary text-on-primary font-label text-sm font-semibold px-4 py-2 rounded-md border-none cursor-pointer disabled:opacity-50 active:opacity-80 transition-opacity shrink-0"
            >
              {saving ? 'Aprovando...' : 'Aprovar'}
            </button>
          ) : (
            <span className="inline-block font-label text-xs px-3 py-1 rounded-full bg-primary/20 text-primary shrink-0">
              Aprovado
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <MiniStat value={ped.patients_count} label="Pacientes" />
          <MiniStat value={ped.baby_members_count} label="Como pai/cuidador" />
          <MiniStat
            value={formatRelativeShort(ped.last_activity_at)}
            label="Último acesso"
            small
          />
        </div>
      </div>

      {/* Detalhes profissionais */}
      <InfoCard>
        <CardLabel>Especialidades</CardLabel>
        {ped.specialties && ped.specialties.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {ped.specialties.map(s => (
              <span
                key={s}
                className="font-label text-xs px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface"
              >
                {s}
              </span>
            ))}
          </div>
        ) : (
          <div className="font-label text-sm text-on-surface-variant/60">Não informado</div>
        )}
      </InfoCard>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <InfoCard>
          <CardLabel>Plataforma</CardLabel>
          <div className="font-body text-sm text-on-surface">{platformDisplay}</div>
          {ped.last_seen_platform && (
            <div className="font-label text-[11px] text-on-surface-variant/60 mt-0.5">
              Mais recente: {platformLabel(ped.last_seen_platform)}
            </div>
          )}
        </InfoCard>
        <InfoCard>
          <CardLabel>Código de convite</CardLabel>
          <div className="font-mono text-sm text-on-surface">{ped.invite_code}</div>
        </InfoCard>
      </div>

      {/* Cross-link pra detalhe de usuario se for pai/cuidador tambem */}
      {ped.baby_members_count > 0 && (
        <button
          onClick={() => navigate(`/paineladmin/users/${ped.user_id}`)}
          className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-md px-4 py-3 mb-3 cursor-pointer text-left hover:bg-surface-container-low transition-colors flex items-center justify-between"
        >
          <div>
            <div className="font-body text-sm text-on-surface">
              Esta pessoa também é pai/cuidador
            </div>
            <div className="font-label text-[11px] text-on-surface-variant/60 mt-0.5">
              Membro de {ped.baby_members_count} bebê(s) — ver perfil de usuário
            </div>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant/60">arrow_forward</span>
        </button>
      )}

      {/* Acao destrutiva: remover papel de pediatra (mantém conta) */}
      <button
        onClick={() => setShowRemoveConfirm(true)}
        className="w-full py-3 px-4 rounded-md bg-error/10 hover:bg-error/15 text-error font-label text-sm font-semibold border border-error/20 cursor-pointer transition-colors flex items-center justify-center gap-2 mb-3"
      >
        <span className="material-symbols-outlined text-base">person_off</span>
        Remover papel de pediatra
      </button>

      {/* Pacientes */}
      <h3 className="font-label text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-3 mt-5">
        Pacientes ativos {activePatients.length > 0 && `(${activePatients.length})`}
      </h3>
      {activePatients.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-md px-5 py-4 text-center font-label text-sm text-on-surface-variant/60">
          Nenhum paciente ativo.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {activePatients.map(pat => (
            <PatientRow key={pat.baby_id} patient={pat} />
          ))}
        </div>
      )}

      {inactivePatients.length > 0 && (
        <>
          <h3 className="font-label text-xs font-semibold text-on-surface-variant/50 uppercase tracking-wider mb-3 mt-5">
            Desvinculados ({inactivePatients.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {inactivePatients.map(pat => (
              <PatientRow key={pat.baby_id} patient={pat} inactive />
            ))}
          </div>
        </>
      )}

      {/* Remove role confirm modal */}
      {showRemoveConfirm && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-5"
          onClick={() => {
            setShowRemoveConfirm(false);
            setRemoveConfirmText('');
          }}
        >
          <div
            className="bg-surface-container-high border border-error/30 rounded-md p-7 w-full max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-headline text-lg font-bold text-error mb-3">
              Remover papel de pediatra
            </h3>
            <p className="font-body text-sm text-on-surface-variant mb-2">
              <strong className="text-on-surface">{ped.name}</strong> deixará de ser pediatra
              no sistema. Os {ped.patients_count} pacientes ativos vão ser desvinculados.
            </p>
            <p className="font-body text-sm text-on-surface-variant mb-2">
              {ped.baby_members_count > 0 ? (
                <>A conta do usuário <strong className="text-on-surface">permanece</strong> — ele continua
                logando como pai/cuidador no app.</>
              ) : (
                <>A conta de auth do usuário <strong className="text-on-surface">permanece</strong>, mas
                ficará sem nenhum papel ativo. Você pode então excluí-la pela aba Usuários.</>
              )}
            </p>
            <p className="font-label text-[13px] text-on-surface-variant/70 mb-4 mt-3">
              Digite <strong className="text-error">remover</strong> para confirmar:
            </p>
            <input
              type="text"
              value={removeConfirmText}
              onChange={e => setRemoveConfirmText(e.target.value)}
              placeholder="Digite remover"
              className="w-full rounded-md px-4 py-3 text-sm bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-error/40 border border-error/20 mb-5"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setRemoveConfirmText('');
                }}
                className="flex-1 py-3.5 rounded-md bg-surface-container-lowest text-on-surface-variant font-label text-sm font-semibold border-none cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={removeRole}
                disabled={removing || removeConfirmText.toLowerCase() !== 'remover'}
                className="flex-[2] py-3.5 rounded-md bg-error text-white font-label text-sm font-semibold border-none cursor-pointer disabled:opacity-40 transition-opacity"
              >
                {removing ? 'Removendo...' : 'Remover papel de pediatra'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-5 right-5 mx-auto max-w-md bg-green-600 text-white font-label text-sm text-center px-4 py-3.5 rounded-md z-50">
          {toast}
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

function MiniStat({
  value,
  label,
  small,
}: {
  value: number | string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="bg-surface-container-lowest rounded-md px-3 py-2.5 text-center">
      <div className={`font-headline font-bold text-on-surface ${small ? 'text-sm' : 'text-xl'}`}>
        {value}
      </div>
      <div className="font-label text-[10px] text-on-surface-variant/70">{label}</div>
    </div>
  );
}

function PatientRow({ patient, inactive }: { patient: PatientRow; inactive?: boolean }) {
  return (
    <div
      className={`rounded-md px-4 py-3 flex items-center gap-3 border ${
        inactive
          ? 'bg-surface-container-lowest/50 border-outline-variant/20 opacity-70'
          : 'bg-surface-container-lowest border-outline-variant/30'
      }`}
    >
      <span className="text-xl shrink-0">{genderEmoji(patient.baby_gender)}</span>
      <div className="min-w-0 flex-1">
        <div className="font-body text-sm font-medium text-on-surface truncate">
          {patient.baby_name}
          <span className="font-label text-xs text-on-surface-variant/60 ml-2">
            {ageFromBirth(patient.baby_birth_date)}
          </span>
        </div>
        <div className="font-label text-[11px] text-on-surface-variant/60 truncate mt-0.5">
          {patient.parent_email && <>Pai/mãe: {patient.parent_email} · </>}
          Vinculado {formatRelativeShort(patient.linked_at)}
          {patient.unlinked_at && (
            <>
              {' · '}desvinculado {formatRelativeShort(patient.unlinked_at)}
              {patient.unlink_reason && ` (${patient.unlink_reason})`}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
