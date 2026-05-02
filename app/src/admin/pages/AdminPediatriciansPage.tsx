import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { formatRelativeShort } from '../../lib/formatters';

interface PediatricianRow {
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

function platformLabel(p: string): string {
  if (p === 'android') return 'Android';
  if (p === 'ios') return 'iOS';
  if (p === 'web') return 'Web';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function renderPlatforms(p: PediatricianRow): string {
  if (p.platforms && p.platforms.length > 0) {
    return p.platforms.map(platformLabel).join(' | ');
  }
  return '—';
}

export default function AdminPediatriciansPage() {
  const [rows, setRows] = useState<PediatricianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc('admin_get_pediatricians');
    if (error) {
      setToast(`Erro ao carregar: ${error.message}`);
      setTimeout(() => setToast(''), 5000);
    } else {
      setRows((data as PediatricianRow[]) ?? []);
    }
    setLoading(false);
  }

  async function approve(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setSavingId(id);
    const { error } = await supabase.rpc('admin_approve_pediatrician', { p_id: id });
    setSavingId(null);
    if (error) {
      setToast(`Erro ao aprovar: ${error.message}`);
      setTimeout(() => setToast(''), 5000);
      return;
    }

    // Disparar email de boas-vindas (fire-and-forget — não bloqueia a UX)
    supabase.functions.invoke('pediatra-approved-email', {
      body: { pediatrician_id: id },
    }).then(({ error: emailErr }) => {
      if (emailErr) console.warn('[approve] email error', emailErr.message);
    });

    setToast('Pediatra aprovado(a) — email enviado');
    setTimeout(() => setToast(''), 4000);
    load();
  }

  const { pending, approved } = useMemo(() => {
    const filtered = rows.filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.crm.toLowerCase().includes(q)
      );
    });
    return {
      pending: filtered.filter(r => !r.approved_at),
      approved: filtered.filter(r => !!r.approved_at),
    };
  }, [rows, search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-headline text-xl font-bold text-on-surface">Pediatras</h2>
        <span className="font-label text-xs text-on-surface-variant">
          {rows.length} {rows.length === 1 ? 'cadastrado' : 'cadastrados'}
        </span>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar por nome, email ou CRM..."
        className="w-full rounded-md px-4 py-3 text-sm bg-surface-container-low text-on-surface outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/30 mb-5"
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary text-3xl animate-spin">
            progress_activity
          </span>
        </div>
      ) : (
        <>
          <SectionLabel>
            Pendentes
            {pending.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500/20 text-amber-500 text-[10px] font-bold">
                {pending.length}
              </span>
            )}
          </SectionLabel>

          {pending.length === 0 ? (
            <EmptyHint>Nenhuma aprovação pendente.</EmptyHint>
          ) : (
            <div className="flex flex-col gap-2 mb-7">
              {pending.map(p => (
                <PendingCard
                  key={p.id}
                  pediatrician={p}
                  saving={savingId === p.id}
                  onApprove={(e) => approve(e, p.id)}
                  onClick={() => navigate(`/paineladmin/pediatricians/${p.id}`)}
                />
              ))}
            </div>
          )}

          <SectionLabel>Aprovados</SectionLabel>
          {approved.length === 0 ? (
            <EmptyHint>Nenhum pediatra aprovado ainda.</EmptyHint>
          ) : (
            <div className="flex flex-col gap-1.5">
              {approved.map(p => (
                <ApprovedRow
                  key={p.id}
                  pediatrician={p}
                  onClick={() => navigate(`/paineladmin/pediatricians/${p.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 left-5 right-5 mx-auto max-w-md bg-green-600 text-white font-label text-sm text-center px-4 py-3.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-label text-xs font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-3 flex items-center">
      {children}
    </h3>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-md px-5 py-4 text-center font-label text-sm text-on-surface-variant/60 mb-7">
      {children}
    </div>
  );
}

function PendingCard({
  pediatrician: p,
  saving,
  onApprove,
  onClick,
}: {
  pediatrician: PediatricianRow;
  saving: boolean;
  onApprove: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-amber-500/8 border border-amber-500/25 rounded-md px-5 py-4 text-left cursor-pointer hover:bg-amber-500/12 transition-colors w-full"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="font-headline text-base font-semibold text-on-surface truncate">
            {p.name}
          </div>
          <div className="font-label text-xs text-on-surface-variant/80 mt-0.5">
            CRM {p.crm}/{p.crm_state}
            {p.rqe && p.rqe.length > 0 && <> · RQE {p.rqe.join(', ')}</>}
          </div>
          {p.email && (
            <div className="font-label text-xs text-on-surface-variant/60 mt-0.5 truncate">
              {p.email}
            </div>
          )}
        </div>
        <button
          onClick={onApprove}
          disabled={saving}
          className="bg-primary text-on-primary font-label text-sm font-semibold px-4 py-2 rounded-md border-none cursor-pointer disabled:opacity-50 active:opacity-80 transition-opacity shrink-0"
        >
          {saving ? 'Aprovando...' : 'Aprovar'}
        </button>
      </div>

      {p.specialties && p.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {p.specialties.map(s => (
            <span
              key={s}
              className="font-label text-[11px] px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="font-label text-[11px] text-on-surface-variant/60 flex flex-wrap gap-x-3 gap-y-0.5">
        <span>Cadastrado {formatRelativeShort(p.created_at)}</span>
        <span>Plataforma: {renderPlatforms(p)}</span>
        {p.baby_members_count > 0 && (
          <span>Também é pai/cuidador de {p.baby_members_count} bebê(s)</span>
        )}
      </div>
    </button>
  );
}

function ApprovedRow({
  pediatrician: p,
  onClick,
}: {
  pediatrician: PediatricianRow;
  onClick: () => void;
}) {
  const lastAccess = formatRelativeShort(p.last_activity_at);
  return (
    <button
      onClick={onClick}
      className="bg-surface-container-lowest border border-outline-variant/30 rounded-md px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-surface-container-low transition-colors w-full"
    >
      <div className="min-w-0 flex-1">
        <div className="font-body text-sm font-medium text-on-surface truncate">
          {p.name}
          <span className="font-label text-xs text-on-surface-variant/70 ml-2">
            CRM {p.crm}/{p.crm_state}
          </span>
        </div>
        <div className="font-label text-[11px] text-on-surface-variant/60 truncate mt-0.5 flex flex-wrap gap-x-2.5">
          {p.email && <span>{p.email}</span>}
          <span>{p.patients_count} {p.patients_count === 1 ? 'paciente' : 'pacientes'}</span>
          <span>· {renderPlatforms(p)}</span>
          {p.baby_members_count > 0 && <span>· também pai/cuidador</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="font-label text-[11px] text-on-surface-variant/60">Último acesso</div>
        <div
          className={`font-label text-xs ${
            p.last_activity_at ? 'text-primary' : 'text-on-surface-variant/50'
          }`}
        >
          {lastAccess}
        </div>
      </div>
    </button>
  );
}
