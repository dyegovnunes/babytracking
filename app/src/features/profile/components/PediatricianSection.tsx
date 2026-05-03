import { useState, useEffect } from 'react'
import { Share } from '@capacitor/share'
import { Browser } from '@capacitor/browser'
import type { Baby, BabyDocument } from '../../../types'
import type { BabyRole } from '../../../lib/roles'
import { usePediatricianLink } from '../usePediatricianLink'
import LinkPediatricianSheet from './LinkPediatricianSheet'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { useAuth } from '../../../contexts/AuthContext'
import {
  createSharedReport,
  listSharedReports,
  getReportUrl,
  getExpirationDate,
  type SharedReport,
} from '../sharedReports'

// ─── Document type visual config ─────────────────────────────────────────────

const DOC_CONFIG: Record<BabyDocument['docType'], { emoji: string; label: string; color: string; bg: string }> = {
  receita:         { emoji: '💊', label: 'Receita',         color: '#3b82f6', bg: '#eff6ff' },
  atestado:        { emoji: '📋', label: 'Atestado',        color: '#10b981', bg: '#ecfdf5' },
  encaminhamento:  { emoji: '🔗', label: 'Encaminhamento',  color: '#f59e0b', bg: '#fffbeb' },
  orientacoes:     { emoji: '💡', label: 'Orientações',     color: '#7056e0', bg: '#f3f0ff' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDocDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatLinkedDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function appointmentCountdown(iso: string): { label: string; urgent: boolean } {
  const diffMs = new Date(iso).getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / 86_400_000)
  if (diffDays < 0)  return { label: 'Consulta passou', urgent: false }
  if (diffDays === 0) return { label: 'Hoje!', urgent: true }
  if (diffDays === 1) return { label: 'Amanhã', urgent: true }
  if (diffDays <= 7)  return { label: `Em ${diffDays} dias`, urgent: true }
  return { label: `Em ${diffDays} dias`, urgent: false }
}

function isReportActive(r: SharedReport): boolean {
  return r.enabled && (!r.expires_at || new Date(r.expires_at) > new Date())
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const arr = new Uint8Array(8)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

// ISO → datetime-local string (YYYY-MM-DDTHH:MM)
function isoToLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── DocumentViewer ───────────────────────────────────────────────────────────

interface ViewerProps {
  doc: BabyDocument
  babyName: string
  onClose: () => void
  onMarkRead: (token: string) => void
}

function DocumentViewer({ doc, babyName, onClose, onMarkRead }: ViewerProps) {
  useSheetBackClose(true, onClose)
  const cfg = DOC_CONFIG[doc.docType]

  useEffect(() => {
    if (!doc.readAt) onMarkRead(doc.token)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.token])

  const handleShare = async () => {
    hapticLight()
    const text = [
      `${cfg.emoji} ${cfg.label} — ${babyName}`,
      `Emitida por ${doc.pedName} — CRM ${doc.pedCrm}/${doc.pedCrmState}`,
      `${formatDocDate(doc.sharedAt)}`,
      '',
      doc.title ? `${doc.title}\n` : '',
      doc.content,
      '',
      '— Enviado via Portal Yaya Pediatra',
    ].join('\n')

    try {
      await Share.share({ text, title: `${cfg.label} — ${babyName}` })
    } catch {
      try { await navigator.clipboard.writeText(text) } catch { /* silent */ }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl max-h-[92dvh] flex flex-col overflow-hidden">

        {/* Letterhead */}
        <div
          className="shrink-0 px-5 pt-4 pb-3 bg-[#fafafe]"
          style={{ borderTop: `4px solid ${cfg.color}` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl leading-none">{cfg.emoji}</span>
                <span
                  className="text-[10px] font-[800] uppercase tracking-[0.1em]"
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
              <p className="text-[15px] font-[700] text-on-surface leading-tight">{doc.pedName}</p>
              <p className="text-[12px] text-on-surface-variant mt-0.5">
                CRM {doc.pedCrm}/{doc.pedCrmState}
                {doc.pedPhone && (
                  <> · <a href={`tel:${doc.pedPhone}`} className="underline-offset-2 underline">{doc.pedPhone}</a></>
                )}
              </p>
              <p className="text-[11px] text-on-surface-variant/70 mt-1">
                Para: <strong className="text-on-surface-variant">{babyName}</strong>
                {' '}· Emitido em {formatDocDate(doc.sharedAt)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center shrink-0 active:bg-surface-variant"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-lg">close</span>
            </button>
          </div>
          <div className="mt-3 h-px bg-outline-variant/30" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {doc.title && (
            <p className="text-[16px] font-[700] text-on-surface mb-3 leading-snug">{doc.title}</p>
          )}
          <p className="text-[15px] leading-[1.75] text-on-surface whitespace-pre-wrap">{doc.content}</p>
          <p className="mt-8 text-[11px] text-on-surface-variant/40 text-center">
            Enviado via Portal Yaya Pediatra
          </p>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pt-3 pb-safe border-t border-outline-variant/20 flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-on-primary font-label text-sm font-[600] active:opacity-80"
          >
            <span className="material-symbols-outlined text-[18px]">share</span>
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AppointmentSheet ─────────────────────────────────────────────────────────

interface ApptSheetProps {
  isOpen: boolean
  onClose: () => void
  linkId: string
  pedName: string
  currentDate: string | null | undefined
  onSave: (linkId: string, dateTime: string) => Promise<boolean>
}

function AppointmentSheet({ isOpen, onClose, linkId, pedName, currentDate, onSave }: ApptSheetProps) {
  useSheetBackClose(isOpen, onClose)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setValue(currentDate ? isoToLocal(currentDate) : '')
  }, [isOpen, currentDate])

  const handleSave = async () => {
    if (!value) return
    setSaving(true)
    hapticLight()
    const ok = await onSave(linkId, new Date(value).toISOString())
    setSaving(false)
    if (ok) { hapticSuccess(); onClose() }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-surface rounded-t-2xl pb-safe">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-on-surface/20" />
        </div>
        <div className="px-5 pb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">calendar_month</span>
            </div>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">Próxima consulta</h2>
              <p className="font-label text-xs text-on-surface-variant truncate">{pedName}</p>
            </div>
          </div>

          <label className="block font-label text-xs text-on-surface-variant mb-1.5">
            Data e horário
          </label>
          <input
            type="datetime-local"
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full px-4 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface text-base focus:outline-none focus:border-primary mb-5"
          />

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-md border border-outline-variant text-on-surface-variant font-label text-sm active:bg-surface-variant"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!value || saving}
              className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label text-sm font-[600] active:opacity-80 disabled:opacity-40"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  baby: Baby
  myRole: BabyRole
}

export default function PediatricianSection({ baby, myRole }: Props) {
  const { user } = useAuth()
  const {
    linked, loading,
    documents, loadingDocs,
    link: _link,
    unlink, reload, markDocumentRead, scheduleAppointment,
  } = usePediatricianLink(baby.id)

  const canManage = myRole === 'parent' || myRole === 'guardian'

  // Sheet/modal states
  const [linkSheetOpen, setLinkSheetOpen]         = useState(false)
  const [confirmUnlink, setConfirmUnlink]          = useState<string | null>(null)
  const [unlinking, setUnlinking]                  = useState(false)
  const [viewerDoc, setViewerDoc]                  = useState<BabyDocument | null>(null)
  const [apptLinkId, setApptLinkId]               = useState<string | null>(null)

  // Report bridge
  const [bridgeReport, setBridgeReport]            = useState<SharedReport | null | undefined>(undefined)
  const [bridgePassword, setBridgePassword]        = useState<string | null>(null)
  const [bridgeCreating, setBridgeCreating]        = useState(false)

  // Load pediatrician report when linked
  useEffect(() => {
    if (!linked.length || !baby.id) { setBridgeReport(undefined); return }
    listSharedReports(baby.id).then(reports => {
      const active = reports.find(r => r.audience === 'pediatrician' && isReportActive(r))
      setBridgeReport(active ?? null)
    })
  }, [baby.id, linked.length])

  const unreadCount = documents.filter(d => !d.readAt).length

  const handleUnlink = async () => {
    if (!confirmUnlink) return
    setUnlinking(true)
    hapticLight()
    await unlink(confirmUnlink)
    setUnlinking(false)
    setConfirmUnlink(null)
  }

  const pedToUnlink = linked.find(p => p.pediatricianId === confirmUnlink)

  // F2 — create report directly for pediatrician, no audience picker
  const handleCreateBridgeReport = async () => {
    if (!user || !linked.length) return
    setBridgeCreating(true)
    hapticLight()
    const pw = generatePassword()
    const primaryPed = linked[0]
    const report = await createSharedReport(
      baby.id,
      user.id,
      `Relatório para ${primaryPed.name}`,
      pw,
      getExpirationDate('30d'),
      'pediatrician',
    )
    setBridgeCreating(false)
    if (report) {
      hapticSuccess()
      setBridgeReport(report)
      setBridgePassword(pw)
    }
  }

  const openWhatsApp = (report: SharedReport, password: string | null) => {
    hapticLight()
    const primaryPed = linked[0]
    const url = getReportUrl(report.token)
    const lines = [
      `Olá, ${primaryPed?.name ?? 'Dra'}! Aqui estão os dados de ${baby.name} no Yaya:`,
      '',
      url,
      password ? `Senha: ${password}` : 'Caso precise da senha, me avise.',
    ]
    const waUrl = `https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`
    Browser.open({ url: waUrl }).catch(() => window.open(waUrl, '_blank'))
  }

  // Appointment sheet context
  const apptPed = linked.find(p => p.linkId === apptLinkId)

  return (
    <>
      <div className="bg-surface-container rounded-md overflow-hidden">

        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-lg">stethoscope</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-sm font-bold text-on-surface">
                Pediatra de {baby.name}
              </h3>
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-error flex items-center justify-center px-1">
                  <span className="text-[10px] font-[700] text-white leading-none">{unreadCount}</span>
                </span>
              )}
            </div>
            {loading ? (
              <p className="font-label text-xs text-on-surface-variant">Carregando...</p>
            ) : linked.length === 0 ? (
              <p className="font-label text-xs text-on-surface-variant">Nenhuma profissional vinculada</p>
            ) : (
              <p className="font-label text-xs text-primary">
                {linked.length === 1 ? '1 profissional com acesso' : `${linked.length} profissionais com acesso`}
                {unreadCount > 0 && ` · ${unreadCount} doc${unreadCount > 1 ? 's' : ''} novo${unreadCount > 1 ? 's' : ''}`}
              </p>
            )}
          </div>
        </div>

        {/* ── Lista de profissionais ── */}
        {linked.length > 0 && (
          <div className="border-t border-outline-variant/20">
            {linked.map(ped => {
              const appt = ped.nextAppointmentAt ? appointmentCountdown(ped.nextAppointmentAt) : null
              return (
                <div key={ped.linkId} className="px-4 py-3 border-b border-outline-variant/10 last:border-b-0">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm font-[600] text-on-surface">{ped.name}</p>
                      <p className="font-label text-xs text-on-surface-variant mt-0.5">
                        CRM {ped.crm}/{ped.crmState}
                        {' '}· vinculada em {formatLinkedDate(ped.linkedAt)}
                      </p>
                      {ped.phone && (
                        <a
                          href={`tel:${ped.phone}`}
                          className="inline-flex items-center gap-1 font-label text-xs text-primary mt-1 active:opacity-70"
                        >
                          <span className="material-symbols-outlined text-[13px]">call</span>
                          {ped.phone}
                        </a>
                      )}
                    </div>

                    {/* Appointment badge + schedule button */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {appt && (
                        <span className={`text-[10px] font-[700] px-2 py-0.5 rounded-full ${
                          appt.urgent
                            ? 'bg-primary/15 text-primary'
                            : 'bg-surface-variant text-on-surface-variant'
                        }`}>
                          {appt.label}
                        </span>
                      )}
                      {canManage && (
                        <button
                          onClick={() => { hapticLight(); setApptLinkId(ped.linkId) }}
                          className="flex items-center gap-1 text-[11px] font-[600] text-on-surface-variant/70 active:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-[13px]">calendar_month</span>
                          {ped.nextAppointmentAt ? 'Alterar' : 'Agendar'}
                        </button>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <button
                      onClick={() => setConfirmUnlink(ped.pediatricianId)}
                      className="mt-2 font-label text-[11px] text-on-surface-variant/50 active:text-error transition-colors"
                    >
                      Remover acesso
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── Documentos clínicos ── */}
        {!loadingDocs && documents.length > 0 && (
          <div className="border-t border-outline-variant/20">
            <p className="px-4 pt-3 pb-2 font-label text-[11px] font-[700] text-on-surface-variant/60 uppercase tracking-[0.08em]">
              Documentos clínicos
            </p>
            {documents.map(doc => {
              const cfg = DOC_CONFIG[doc.docType]
              const isNew = !doc.readAt
              return (
                <button
                  key={doc.shareId}
                  onClick={() => { hapticLight(); setViewerDoc(doc) }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 border-t border-outline-variant/10 text-left active:bg-surface-variant/50 transition-colors"
                >
                  {/* Type color bar */}
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{ backgroundColor: cfg.color, minHeight: 36 }}
                  />
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ backgroundColor: cfg.bg }}>
                    <span className="text-[16px] leading-none">{cfg.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-[500] text-on-surface truncate">{doc.title || cfg.label}</p>
                    <p className="font-label text-xs text-on-surface-variant">
                      {doc.pedName} · {formatDocDate(doc.sharedAt)}
                    </p>
                  </div>
                  {isNew ? (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-[700]">
                      Novo
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant/40 text-[16px] shrink-0">
                      chevron_right
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Super Relatório bridge ── */}
        {canManage && linked.length > 0 && bridgeReport !== undefined && (
          <div className="border-t border-outline-variant/20 px-4 py-3">
            {bridgeReport ? (
              /* Active report exists → WhatsApp button */
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60">link</span>
                  <p className="font-label text-[11px] text-on-surface-variant/60">
                    Link ativo
                    {bridgeReport.expires_at && (
                      <> · expira em {formatDocDate(bridgeReport.expires_at)}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => openWhatsApp(bridgeReport, bridgePassword)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md font-label text-sm font-[600] text-white active:opacity-80 transition-opacity"
                  style={{ background: '#25D366' }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white shrink-0">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Compartilhar no WhatsApp
                </button>
                {bridgePassword && (
                  <p className="mt-1.5 font-label text-[11px] text-on-surface-variant/60 text-center">
                    Senha: <strong className="text-on-surface-variant font-mono">{bridgePassword}</strong>
                  </p>
                )}
              </div>
            ) : (
              /* No report → create button */
              <button
                onClick={handleCreateBridgeReport}
                disabled={bridgeCreating}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-md border border-primary/30 text-primary font-label text-sm font-[600] active:bg-primary/5 disabled:opacity-50 transition-colors"
              >
                {bridgeCreating ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px]">add_link</span>
                )}
                {bridgeCreating
                  ? 'Criando...'
                  : `Criar link para ${linked[0]?.name?.split(' ')[0] ?? 'a pediatra'}`
                }
              </button>
            )}
          </div>
        )}

        {/* ── Botão adicionar ── */}
        {canManage && (
          <div className={linked.length > 0 || documents.length > 0 ? 'border-t border-outline-variant/20' : ''}>
            <button
              onClick={() => setLinkSheetOpen(true)}
              className="flex items-center gap-2 w-full px-4 py-3 text-primary active:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              <span className="font-label text-sm font-semibold">
                {linked.length === 0 ? 'Adicionar pediatra' : 'Adicionar outra pediatra'}
              </span>
            </button>
          </div>
        )}

        {/* Somente-leitura para caregiver sem vínculo */}
        {!canManage && linked.length === 0 && (
          <p className="px-4 pb-4 font-label text-xs text-on-surface-variant/70">
            Somente pais e responsáveis podem vincular uma pediatra.
          </p>
        )}
      </div>

      {/* ── Sheets & modals ── */}

      <LinkPediatricianSheet
        isOpen={linkSheetOpen}
        onClose={() => setLinkSheetOpen(false)}
        babyId={baby.id}
        babyName={baby.name}
        onLinked={() => { reload() }}
      />

      <AppointmentSheet
        isOpen={!!apptLinkId}
        onClose={() => setApptLinkId(null)}
        linkId={apptLinkId ?? ''}
        pedName={apptPed?.name ?? ''}
        currentDate={apptPed?.nextAppointmentAt}
        onSave={scheduleAppointment}
      />

      {viewerDoc && (
        <DocumentViewer
          doc={viewerDoc}
          babyName={baby.name}
          onClose={() => setViewerDoc(null)}
          onMarkRead={markDocumentRead}
        />
      )}

      {/* ── Confirm unlink ── */}
      {confirmUnlink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmUnlink(null)} />
          <div className="relative bg-surface rounded-xl p-6 w-full max-w-sm">
            <h3 className="font-headline text-base font-bold text-on-surface mb-2">Remover acesso?</h3>
            <p className="font-body text-sm text-on-surface-variant mb-5">
              {pedToUnlink?.name ?? 'Esta profissional'} não poderá mais visualizar os dados de{' '}
              <strong>{baby.name}</strong> pelo portal.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmUnlink(null)}
                className="flex-1 py-2.5 rounded-md border border-outline-variant text-on-surface-variant font-label text-sm active:bg-surface-variant"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex-1 py-2.5 rounded-md bg-error/15 border border-error/30 text-error font-label text-sm font-semibold active:bg-error/25 disabled:opacity-50"
              >
                {unlinking ? 'Removendo...' : 'Remover acesso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
