import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface BabyData {
  id: string; name: string; birthDate: string; gender: string
  photoUrl: string | null; quietHoursStart: number; quietHoursEnd: number
}
interface LogEntry { eventId: string; timestamp: string; ml: number | null; duration: number | null; notes: string | null }
interface Measurement { type: string; value: number; unit: string; measuredAt: string }
interface Vaccine { appliedAt: string; code: string | null; name: string; fullName: string | null; doseLabel: string | null; recommendedAgeDays: number | null }
interface MilestoneItem { code: string | null; title: string; category: string; ageMinDays: number; ageMaxDays: number }
interface AchievedMilestone { code: string | null; title: string | null; achievedAt: string; note: string | null }
interface Medication { id: string; name: string; dosage: string; frequencyHours: number; startDate: string; endDate: string | null; durationType: string }
interface MedLog { medicationId: string; administeredAt: string }
interface PedDocument { id: string; doc_type: DocType; title: string; content: string; created_at: string }
interface DocShare { id: string; token: string; doc_type: DocType; title: string; shared_at: string; read_at: string | null }

type DocType = 'receita' | 'atestado' | 'encaminhamento' | 'orientacoes'
const DOC_CONFIG: Record<DocType, { emoji: string; label: string; color: string; bg: string; placeholder: string }> = {
  receita:        { emoji: '💊', label: 'Receita',         color: '#3b82f6', bg: '#eff6ff', placeholder: 'Ex: Dipirona 500mg\n1 comprimido a cada 6h por 3 dias se febre > 38°C' },
  atestado:       { emoji: '📋', label: 'Atestado',        color: '#10b981', bg: '#ecfdf5', placeholder: 'Atesto que o paciente encontra-se em boas condições de saúde...' },
  encaminhamento: { emoji: '🔗', label: 'Encaminhamento',  color: '#f59e0b', bg: '#fffbeb', placeholder: 'Encaminhar para avaliação com neurologista pediátrico...' },
  orientacoes:    { emoji: '💡', label: 'Orientações',     color: '#7056e0', bg: '#f3f0ff', placeholder: '1. Manter amamentação exclusiva até os 6 meses\n2. ...' },
}

interface ReportData {
  baby: BabyData
  logs: LogEntry[]
  measurements: Measurement[]
  vaccines: Vaccine[]
  allMilestones: MilestoneItem[]
  achievedMilestones: AchievedMilestone[]
  medications: Medication[]
  medicationLogs: MedLog[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ageText(birthDate: string): string {
  const birth = new Date(birthDate)
  const today = new Date()
  const days = Math.floor((today.getTime() - birth.getTime()) / 86400000)
  if (days < 30) return `${days}d`
  const months = Math.floor(days / 30.44)
  if (months < 24) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem > 0 ? `${years}a ${rem}m` : `${years} anos`
}

function ageDays(birthDate: string): number {
  return Math.floor((Date.now() - new Date(birthDate).getTime()) / 86400000)
}

function fmt(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(ts: string): string {
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function photoUrl(url: string | null, supabaseUrl: string): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${supabaseUrl}/storage/v1/object/public/baby-photos/${url}`
}

function buildSleepSessions(logs: LogEntry[], fromMs: number, toMs: number) {
  const asc = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  const sessions: { startMs: number; endMs: number; durationMin: number }[] = []
  let sleepStart: number | null = null
  for (const l of asc) {
    const ts = new Date(l.timestamp).getTime()
    if (l.eventId === 'sleep') { sleepStart = ts }
    else if (l.eventId === 'wake' && sleepStart !== null) {
      const dur = (ts - sleepStart) / 60000
      if (dur > 5 && dur < 18 * 60) sessions.push({ startMs: sleepStart, endMs: ts, durationMin: dur })
      sleepStart = null
    }
  }
  return sessions.filter(s => s.endMs > fromMs && s.startMs < toMs)
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ── Componentes ───────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-[700] tracking-[0.08em] uppercase text-[#9e9cb0] mb-3">{children}</h2>
}


// ── Página principal ──────────────────────────────────────────────────────────
export default function PacientePage() {
  const { babyId } = useParams<{ babyId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'resumo' | 'vacinas' | 'marcos' | 'medicamentos' | 'documentos'>('resumo')
  const [measurementOpen, setMeasurementOpen] = useState(false)
  const [savingMeasurement, setSavingMeasurement] = useState(false)

  // Documents state
  const [myDocs, setMyDocs] = useState<PedDocument[]>([])
  const [docShares, setDocShares] = useState<DocShare[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [docEditorOpen, setDocEditorOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<PedDocument | null>(null)
  const [sendingDocId, setSendingDocId] = useState<string | null>(null)
  const [docToast, setDocToast] = useState<string | null>(null)

  useEffect(() => {
    if (!babyId) return
    loadReport()
  }, [babyId])

  useEffect(() => {
    if (tab === 'documentos') loadDocuments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, babyId])

  async function loadReport() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setError('Sessão expirada. Faça login novamente.'); return }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/pediatra-report-view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ baby_id: babyId }),
      })

      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Erro ao carregar dados.'); return }
      setData(json)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddMeasurement(type: string, value: number, unit: string, measuredAt: string) {
    if (!babyId) return
    setSavingMeasurement(true)
    try {
      const { error } = await supabase.rpc('add_measurement_by_pediatrician', {
        p_baby_id: babyId,
        p_type: type,
        p_value: value,
        p_unit: unit,
        p_measured_at: measuredAt,
      })
      if (!error) {
        setMeasurementOpen(false)
        await loadReport()
      }
    } finally {
      setSavingMeasurement(false)
    }
  }

  async function loadDocuments() {
    if (!babyId) return
    setLoadingDocs(true)
    try {
      const [{ data: docs }, { data: shares }] = await Promise.all([
        supabase.from('pediatrician_documents').select('id, doc_type, title, content, created_at').order('created_at', { ascending: false }),
        supabase.rpc('get_baby_documents', { p_baby_id: babyId }),
      ])
      setMyDocs((docs ?? []) as PedDocument[])
      setDocShares(((shares ?? []) as Array<{
        share_id: string; token: string; doc_type: string; title: string; shared_at: string; read_at: string | null
      }>).map(s => ({
        id: s.share_id,
        token: s.token,
        doc_type: s.doc_type as DocType,
        title: s.title,
        shared_at: s.shared_at,
        read_at: s.read_at,
      })))
    } finally {
      setLoadingDocs(false)
    }
  }

  async function handleSendDocument(docId: string) {
    if (!babyId) return
    setSendingDocId(docId)
    const { error } = await supabase.rpc('send_document_to_baby', { p_doc_id: docId, p_baby_id: babyId })
    setSendingDocId(null)
    if (!error) {
      setDocToast('Documento enviado! 💜')
      setTimeout(() => setDocToast(null), 3000)
      loadDocuments()
    }
  }

  async function handleSaveDocument(docType: DocType, title: string, content: string, sendNow: boolean) {
    let docId = editingDoc?.id
    if (editingDoc) {
      await supabase.from('pediatrician_documents').update({ doc_type: docType, title, content }).eq('id', editingDoc.id)
    } else {
      const { data } = await supabase.from('pediatrician_documents').insert({ doc_type: docType, title, content }).select('id').single()
      docId = data?.id
    }
    setDocEditorOpen(false)
    setEditingDoc(null)
    if (docId && sendNow && babyId) handleSendDocument(docId)
    else loadDocuments()
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen bg-[#fafafe]">
      <span className="material-symbols-outlined text-[#7056e0] animate-spin text-[28px]">progress_activity</span>
    </div>
  )

  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#fafafe] gap-4">
      <p className="text-[15px] font-[600] text-[#b3001f]">{error}</p>
      <button onClick={() => navigate('/dashboard')} className="text-[13px] text-[#7056e0] font-[600] cursor-pointer">
        ← Voltar
      </button>
    </div>
  )

  if (!data) return null

  const { baby, logs, measurements, vaccines, allMilestones, achievedMilestones, medications, medicationLogs } = data

  // ── AHA Summary ────────────────────────────────────────────────────────────
  const now = Date.now()
  const twoDaysAgoMs = now - 2 * 86400000
  const sevenDaysAgoMs = now - 7 * 86400000
  const fourteenDaysAgoMs = now - 14 * 86400000

  const logs48h = logs.filter(l => new Date(l.timestamp).getTime() > twoDaysAgoMs)
  const logs7d  = logs.filter(l => new Date(l.timestamp).getTime() > sevenDaysAgoMs)
  // Sono 48h
  const sleepSessions48h = buildSleepSessions(logs, twoDaysAgoMs, now)
  const totalSleepMin48h = sleepSessions48h.reduce((s, x) => s + x.durationMin, 0)

  // Alimentação 48h
  const feeds48h = logs48h.filter(l => ['breast_left','breast_right','breast_both','bottle'].includes(l.eventId))
  const feedsWithMl = feeds48h.filter(l => l.ml && l.ml > 0)
  const avgMl48h = feedsWithMl.length ? Math.round(feedsWithMl.reduce((s, l) => s + (l.ml ?? 0), 0) / feedsWithMl.length) : null

  // Fraldas 48h
  const wet48h   = logs48h.filter(l => l.eventId === 'diaper_wet').length
  const dirty48h = logs48h.filter(l => l.eventId === 'diaper_dirty').length
  const alertDiaper = dirty48h < 2 && logs48h.length > 5 // só alerta se tem registros suficientes

  // Tendências 7d
  const sessions7d = buildSleepSessions(logs, sevenDaysAgoMs, now)
  const sessionsPrev = buildSleepSessions(logs, fourteenDaysAgoMs, sevenDaysAgoMs)
  const avgSleepMin7d   = sessions7d.length   ? sessions7d.reduce((s, x) => s + x.durationMin, 0)   / sessions7d.length   : 0
  const avgSleepMinPrev = sessionsPrev.length ? sessionsPrev.reduce((s, x) => s + x.durationMin, 0) / sessionsPrev.length : 0
  const sleepTrendPct   = avgSleepMinPrev > 0 ? Math.round((avgSleepMin7d - avgSleepMinPrev) / avgSleepMinPrev * 100) : null

  const feedCount7d = logs7d.filter(l => ['breast_left','breast_right','breast_both','bottle'].includes(l.eventId)).length
  const avgFeedPerDay = Math.round(feedCount7d / 7 * 10) / 10

  // Última medição de peso
  const lastWeight = measurements.find(m => m.type === 'weight')
  const lastHeight = measurements.find(m => m.type === 'height')

  // Vacinas em atraso (recomendadas pela idade mas não aplicadas)
  const appliedCodes = new Set(vaccines.map(v => v.code))
  const babyAgeDays = ageDays(baby.birthDate)

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#fafafe]" style={{ animation: 'fade-in 0.2s ease-out' }}>

      {/* Header */}
      <header className="px-8 pt-6 pb-0 flex items-start gap-5">
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-1 text-[#9e9cb0] hover:text-[#1c1b2b] transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>

        <div className="flex items-center gap-4 flex-1">
          {/* Foto */}
          <div className="w-14 h-14 rounded-full bg-[#e8e5f2] overflow-hidden shrink-0 flex items-center justify-center">
            {photoUrl(baby.photoUrl, SUPABASE_URL) ? (
              <img src={photoUrl(baby.photoUrl, SUPABASE_URL)!} alt={baby.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[22px]">{baby.gender === 'male' ? '👦' : '👧'}</span>
            )}
          </div>

          <div>
            <h1 className="text-[22px] font-[800] text-[#1c1b2b] tracking-[-0.02em]">{baby.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[13px] text-[#6f6896] font-[500]">{ageText(baby.birthDate)}</span>
              <span className="text-[#d5d3de]">·</span>
              <span className="text-[12px] text-[#9e9cb0]">{new Date(baby.birthDate).toLocaleDateString('pt-BR')}</span>
              {lastWeight && (
                <>
                  <span className="text-[#d5d3de]">·</span>
                  <span className="text-[12px] text-[#9e9cb0]">{lastWeight.value} {lastWeight.unit}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-8 mt-5 border-b border-[#e8e5f2]">
        <div className="flex gap-0">
          {([
            { id: 'resumo',       label: 'Resumo' },
            { id: 'vacinas',      label: 'Vacinas' },
            { id: 'marcos',       label: 'Marcos' },
            { id: 'medicamentos', label: 'Medicamentos' },
            { id: 'documentos',   label: 'Documentos' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-[13px] font-[600] border-b-2 transition-colors cursor-pointer ${
                tab === t.id
                  ? 'border-[#7056e0] text-[#7056e0]'
                  : 'border-transparent text-[#9e9cb0] hover:text-[#5a5870]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das tabs */}
      <div className="px-8 py-6 flex-1">

        {/* ── RESUMO ─────────────────────────────────────────────────────── */}
        {tab === 'resumo' && (
          <div className="max-w-[700px]">

            {/* ── AHA Summary — Últimas 48h ─────────────────────────── */}
            <p className="text-[11px] font-[700] tracking-[0.1em] uppercase text-[#9e9cb0] mb-3">Últimas 48h</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {/* Sono */}
              <div className="card p-4 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[16px] leading-none">🌙</span>
                  <span className="text-[11px] font-[700] text-[#9e9cb0] uppercase tracking-[0.06em]">Sono</span>
                </div>
                <p className="text-[18px] font-[800] text-[#1c1b2b] tracking-[-0.02em] leading-none">
                  {totalSleepMin48h > 0 ? formatDuration(totalSleepMin48h) : '—'}
                </p>
                <p className="text-[11px] text-[#9e9cb0]">
                  {sleepSessions48h.length > 0 ? `${sleepSessions48h.length} sessoões` : 'sem dados'}
                </p>
              </div>

              {/* Alimentação */}
              <div className="card p-4 flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[16px] leading-none">🍼</span>
                  <span className="text-[11px] font-[700] text-[#9e9cb0] uppercase tracking-[0.06em]">Alimentação</span>
                </div>
                <p className="text-[18px] font-[800] text-[#1c1b2b] tracking-[-0.02em] leading-none">
                  {avgMl48h ? `~${avgMl48h}ml` : feeds48h.length > 0 ? `${feeds48h.length}x` : '—'}
                </p>
                <p className="text-[11px] text-[#9e9cb0]">
                  {feeds48h.length > 0 ? `${feeds48h.length} mamadas · ~${avgFeedPerDay}/dia` : 'sem dados'}
                </p>
              </div>

              {/* Fraldas */}
              <div className={`card p-4 flex flex-col gap-2 ${alertDiaper ? 'ring-1 ring-[#f59e0b]/40' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[16px] leading-none">💧</span>
                  <span className="text-[11px] font-[700] text-[#9e9cb0] uppercase tracking-[0.06em]">Fraldas</span>
                  {alertDiaper && <span className="ml-auto text-[#f59e0b] text-[12px] leading-none">⚠️</span>}
                </div>
                <p className="text-[18px] font-[800] text-[#1c1b2b] tracking-[-0.02em] leading-none">
                  {wet48h + dirty48h > 0 ? `${wet48h + dirty48h}` : '—'}
                </p>
                <p className="text-[11px] text-[#9e9cb0]">
                  {wet48h + dirty48h > 0 ? `${wet48h} molh. · ${dirty48h} suj.` : 'sem dados'}
                </p>
              </div>
            </div>

            {/* ── Tendências 7 dias ──────────────────────────────────── */}
            <div className="card p-4 mb-8">
              <p className="text-[11px] font-[700] tracking-[0.1em] uppercase text-[#9e9cb0] mb-3">Tendências — 7 dias</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {sessions7d.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#5a5870] font-[500]">Sono médio/sessão:</span>
                    <span className="text-[13px] font-[700] text-[#1c1b2b]">{formatDuration(avgSleepMin7d)}</span>
                    {sleepTrendPct !== null && (
                      <span className={`text-[11px] font-[700] px-1.5 py-0.5 rounded-full ${
                        sleepTrendPct >= 0
                          ? 'bg-[#e6f6ef] text-[#00734a]'
                          : 'bg-[#ffd9dd] text-[#b3001f]'
                      }`}>
                        {sleepTrendPct >= 0 ? '↑' : '↓'} {Math.abs(sleepTrendPct)}%
                      </span>
                    )}
                  </div>
                )}
                {sessions7d.length === 0 && (
                  <p className="text-[13px] text-[#9e9cb0]">Dados insuficientes de sono para análise.</p>
                )}
              </div>
            </div>

            {/* Medições */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <SectionTitle>Crescimento</SectionTitle>
                <button
                  onClick={() => setMeasurementOpen(true)}
                  className="flex items-center gap-1 text-[12px] font-[600] text-[#7056e0] hover:text-[#5a45c4] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  Registrar medição
                </button>
              </div>
              {(lastWeight || lastHeight) ? (
                <div className="grid grid-cols-2 gap-3">
                  {lastWeight && (
                    <div className="card p-4">
                      <p className="text-[12px] font-[600] text-[#9e9cb0] mb-1">Peso</p>
                      <p className="text-[20px] font-[800] text-[#1c1b2b]">{lastWeight.value} <span className="text-[13px] font-[500] text-[#6f6896]">{lastWeight.unit}</span></p>
                      <p className="text-[11px] text-[#9e9cb0] mt-0.5">{fmtDate(lastWeight.measuredAt)}</p>
                    </div>
                  )}
                  {lastHeight && (
                    <div className="card p-4">
                      <p className="text-[12px] font-[600] text-[#9e9cb0] mb-1">Altura</p>
                      <p className="text-[20px] font-[800] text-[#1c1b2b]">{lastHeight.value} <span className="text-[13px] font-[500] text-[#6f6896]">{lastHeight.unit}</span></p>
                      <p className="text-[11px] text-[#9e9cb0] mt-0.5">{fmtDate(lastHeight.measuredAt)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-[#9e9cb0]">Nenhuma medição registrada ainda.</p>
              )}
            </div>

            {/* Medicamentos ativos */}
            {medications.length > 0 && (
              <div className="mb-8">
                <SectionTitle>Medicamentos em uso</SectionTitle>
                <div className="card divide-y divide-[#f3f2f8]">
                  {medications.map(m => {
                    const lastDose = medicationLogs.find(l => l.medicationId === m.id)
                    return (
                      <div key={m.id} className="px-4 py-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[14px] font-[700] text-[#1c1b2b]">{m.name}</p>
                          <p className="text-[12px] text-[#6f6896]">{m.dosage}</p>
                        </div>
                        {lastDose && (
                          <p className="text-[11px] text-[#9e9cb0] shrink-0 mt-0.5">Última: {fmt(lastDose.administeredAt)}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Marcos recentes */}
            {achievedMilestones.length > 0 && (
              <div>
                <SectionTitle>Marcos recentes</SectionTitle>
                <div className="card divide-y divide-[#f3f2f8]">
                  {achievedMilestones.slice(0, 5).map((m, i) => {
                    const def = allMilestones.find(a => a.code === m.code)
                    const title = m.title ?? def?.title ?? m.code?.replace(/_/g, ' ') ?? '—'
                    return (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-[16px] text-[#7056e0]">check_circle</span>
                        <div>
                          <p className="text-[13px] font-[600] text-[#1c1b2b]">{title}</p>
                          <p className="text-[11px] text-[#9e9cb0]">{fmtDate(m.achievedAt)}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VACINAS ─────────────────────────────────────────────────────── */}
        {tab === 'vacinas' && (
          <div className="max-w-[600px]">
            <p className="text-[12px] font-[600] text-[#9e9cb0] uppercase tracking-[0.08em] mb-4">{vaccines.length} aplicadas</p>
            {vaccines.length === 0 ? (
              <p className="text-[14px] text-[#9e9cb0]">Nenhuma vacina registrada.</p>
            ) : (
              <div className="card divide-y divide-[#f3f2f8]">
                {vaccines.map((v, i) => (
                  <div key={i} className="px-4 py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[14px] font-[700] text-[#1c1b2b]">{v.name}</p>
                      {v.fullName && v.fullName !== v.name && (
                        <p className="text-[11px] text-[#9e9cb0]">{v.fullName}</p>
                      )}
                      {v.doseLabel && <p className="text-[11px] text-[#6f6896]">{v.doseLabel}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="material-symbols-outlined text-[14px] text-[#00734a]">check_circle</span>
                      <p className="text-[11px] text-[#9e9cb0]">{fmtDate(v.appliedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Próximas vacinas pela idade */}
            {(() => {
              const upcoming = allMilestones.filter(m =>
                m.category === 'vaccine' &&
                !appliedCodes.has(m.code) &&
                m.ageMinDays !== undefined &&
                babyAgeDays >= (m.ageMinDays - 30)
              )
              if (upcoming.length === 0) return null
              return (
                <div className="mt-6">
                  <SectionTitle>Atenção — pendentes ou próximas</SectionTitle>
                  <div className="card divide-y divide-[#f3f2f8]">
                    {upcoming.slice(0, 10).map((m, i) => (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-[16px] text-[#c5487a]">
                          {babyAgeDays > m.ageMaxDays ? 'warning' : 'schedule'}
                        </span>
                        <div>
                          <p className="text-[13px] font-[600] text-[#1c1b2b]">{m.title}</p>
                          <p className="text-[11px] text-[#9e9cb0]">
                            {babyAgeDays > m.ageMaxDays ? 'Atrasada' : 'Próxima'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── MARCOS ─────────────────────────────────────────────────────── */}
        {tab === 'marcos' && (
          <div className="max-w-[600px]">
            <p className="text-[12px] font-[600] text-[#9e9cb0] uppercase tracking-[0.08em] mb-4">{achievedMilestones.length} alcançados</p>
            {achievedMilestones.length === 0 ? (
              <p className="text-[14px] text-[#9e9cb0]">Nenhum marco registrado ainda.</p>
            ) : (
              <div className="card divide-y divide-[#f3f2f8]">
                {achievedMilestones.map((m, i) => {
                  const def = allMilestones.find(a => a.code === m.code)
                  const title = m.title ?? def?.title ?? m.code?.replace(/_/g, ' ') ?? '—'
                  return (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <span className="material-symbols-outlined text-[18px] text-[#7056e0] mt-0.5 shrink-0">check_circle</span>
                      <div className="flex-1">
                        <p className="text-[14px] font-[700] text-[#1c1b2b]">{title}</p>
                        {def?.category && <p className="text-[11px] text-[#9e9cb0] capitalize">{def.category}</p>}
                        {m.note && <p className="text-[12px] text-[#6f6896] mt-0.5">{m.note}</p>}
                      </div>
                      <p className="text-[11px] text-[#9e9cb0] shrink-0">{fmtDate(m.achievedAt)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MEDICAMENTOS ────────────────────────────────────────────────── */}
        {tab === 'medicamentos' && (
          <div className="max-w-[600px]">
            <p className="text-[12px] font-[600] text-[#9e9cb0] uppercase tracking-[0.08em] mb-4">{medications.length} em uso</p>
            {medications.length === 0 ? (
              <p className="text-[14px] text-[#9e9cb0]">Nenhum medicamento ativo.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {medications.map(m => {
                  const doses = medicationLogs.filter(l => l.medicationId === m.id)
                  return (
                    <div key={m.id} className="card p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[15px] font-[800] text-[#1c1b2b]">{m.name}</p>
                          <p className="text-[13px] text-[#6f6896]">{m.dosage}</p>
                        </div>
                        <span className="text-[11px] font-[700] bg-[#e8e1ff] text-[#7056e0] px-2.5 py-1 rounded-full shrink-0">
                          A cada {m.frequencyHours}h
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[12px] text-[#9e9cb0] mb-3">
                        <span>Início: {fmtDate(m.startDate)}</span>
                        {m.endDate && <span>Fim: {fmtDate(m.endDate)}</span>}
                      </div>
                      {doses.length > 0 && (
                        <div>
                          <p className="text-[11px] font-[600] text-[#9e9cb0] uppercase tracking-[0.06em] mb-2">Últimas doses (7 dias)</p>
                          <div className="flex flex-wrap gap-1.5">
                            {doses.slice(0, 10).map((d, i) => (
                              <span key={i} className="text-[11px] bg-[#f3f2f8] text-[#5a5870] px-2 py-0.5 rounded-full">
                                {fmt(d.administeredAt)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENTOS ─────────────────────────────────────────────────── */}
        {tab === 'documentos' && (
          <div className="max-w-[700px]">

            {/* Toast */}
            {docToast && (
              <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#1c1b2b] text-white text-[13px] font-[600] px-5 py-3 rounded-full shadow-xl pointer-events-none" style={{ animation: 'fade-in 0.2s ease-out' }}>
                {docToast}
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <SectionTitle>Meus modelos</SectionTitle>
              </div>
              <button
                onClick={() => { setEditingDoc(null); setDocEditorOpen(true) }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#7056e0] text-white text-[13px] font-[700] hover:bg-[#5a45c4] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                Novo modelo
              </button>
            </div>

            {loadingDocs ? (
              <div className="flex items-center justify-center py-10">
                <span className="material-symbols-outlined text-[#7056e0] animate-spin text-[24px]">progress_activity</span>
              </div>
            ) : myDocs.length === 0 ? (
              <div className="card p-8 text-center mb-8">
                <p className="text-[32px] mb-3">📄</p>
                <p className="text-[14px] font-[600] text-[#5a5870] mb-1">Nenhum modelo ainda</p>
                <p className="text-[12px] text-[#9e9cb0] mb-4">Crie modelos de receitas, atestados e orientações para enviar às famílias.</p>
                <button
                  onClick={() => { setEditingDoc(null); setDocEditorOpen(true) }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#7056e0] text-white text-[13px] font-[700] hover:bg-[#5a45c4] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  Criar primeiro modelo
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-8">
                {myDocs.map(doc => {
                  const cfg = DOC_CONFIG[doc.doc_type]
                  const isSending = sendingDocId === doc.id
                  return (
                    <div
                      key={doc.id}
                      className="card p-4 flex items-center gap-4"
                      style={{ borderLeft: `4px solid ${cfg.color}` }}
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[20px] shrink-0" style={{ background: cfg.bg }}>
                        {cfg.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-[700] uppercase tracking-[0.08em]" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                        <p className="text-[14px] font-[600] text-[#1c1b2b] truncate">{doc.title || '(sem título)'}</p>
                        <p className="text-[12px] text-[#9e9cb0] truncate">{doc.content.slice(0, 60)}{doc.content.length > 60 ? '…' : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => { setEditingDoc(doc); setDocEditorOpen(true) }}
                          className="p-2 rounded-[6px] text-[#9e9cb0] hover:bg-[#f3f2f8] hover:text-[#5a5870] transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleSendDocument(doc.id)}
                          disabled={isSending}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[6px] bg-[#e8e1ff] text-[#7056e0] text-[12px] font-[700] hover:bg-[#d8cffe] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isSending
                            ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                            : <span className="material-symbols-outlined text-[15px]">send</span>
                          }
                          Enviar para {data?.baby.name ?? 'paciente'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Histórico de envios */}
            {docShares.length > 0 && (
              <>
                <SectionTitle>Histórico de envios</SectionTitle>
                <div className="flex flex-col gap-2">
                  {docShares.map(share => {
                    const cfg = DOC_CONFIG[share.doc_type]
                    return (
                      <div key={share.id} className="flex items-center gap-3 py-2.5 px-4 rounded-[8px] bg-white border border-[#e8e5f2]">
                        <div className="w-7 h-7 rounded-md flex items-center justify-center text-[14px] shrink-0" style={{ background: cfg.bg }}>
                          {cfg.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-[600] text-[#1c1b2b] truncate">{share.title || cfg.label}</p>
                          <p className="text-[11px] text-[#9e9cb0]">{fmtDate(share.shared_at)}</p>
                        </div>
                        {share.read_at ? (
                          <span className="flex items-center gap-1 text-[11px] text-[#00734a] font-[600]">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            Lido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-[#9e9cb0]">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            Enviado
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* Modal de medição */}
      {measurementOpen && (
        <MeasurementModal
          onClose={() => setMeasurementOpen(false)}
          onSave={handleAddMeasurement}
          saving={savingMeasurement}
        />
      )}

      {/* Modal de edição de documento */}
      {docEditorOpen && (
        <DocumentEditorModal
          initial={editingDoc}
          babyName={data?.baby.name ?? 'paciente'}
          onClose={() => { setDocEditorOpen(false); setEditingDoc(null) }}
          onSave={handleSaveDocument}
        />
      )}
    </div>
  )
}

// ── DocumentEditorModal ───────────────────────────────────────────────────────
function DocumentEditorModal({
  initial, babyName, onClose, onSave,
}: {
  initial: PedDocument | null
  babyName: string
  onClose: () => void
  onSave: (type: DocType, title: string, content: string, sendNow: boolean) => void
}) {
  const [docType, setDocType] = useState<DocType>(initial?.doc_type ?? 'receita')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [saving, setSaving] = useState(false)

  const cfg = DOC_CONFIG[docType]

  async function handleSubmit(sendNow: boolean) {
    if (!content.trim()) return
    setSaving(true)
    onSave(docType, title.trim() || cfg.label, content.trim(), sendNow)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[12px] shadow-xl w-full max-w-[520px] overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-5 border-b border-[#e8e5f2] flex items-center justify-between shrink-0">
            <h2 className="text-[16px] font-[800] text-[#1c1b2b]">
              {initial ? 'Editar modelo' : 'Novo modelo'}
            </h2>
            <button onClick={onClose} className="text-[#9e9cb0] hover:text-[#5a5870] cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
            {/* Tipo */}
            <div>
              <label className="text-[11px] font-[700] text-[#9e9cb0] uppercase tracking-[0.06em] mb-2 block">Tipo de documento</label>
              <div className="grid grid-cols-2 gap-2">
                {(['receita', 'atestado', 'encaminhamento', 'orientacoes'] as const).map(t => {
                  const c = DOC_CONFIG[t]
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDocType(t)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] border-2 text-left transition-all cursor-pointer ${
                        docType === t ? 'border-current' : 'border-[#e8e5f2]'
                      }`}
                      style={docType === t ? { borderColor: c.color, background: c.bg } : {}}
                    >
                      <span className="text-[18px]">{c.emoji}</span>
                      <span className="text-[13px] font-[700]" style={{ color: docType === t ? c.color : '#5a5870' }}>{c.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Título */}
            <div>
              <label className="text-[11px] font-[700] text-[#9e9cb0] uppercase tracking-[0.06em] mb-1.5 block">Título <span className="normal-case font-[400] text-[#c4c2d0]">(opcional)</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={`Ex: ${cfg.label} para ${babyName}`}
                className="w-full bg-[#f3f2f8] rounded-[6px] px-3 py-2.5 text-base text-[#1c1b2b] outline-none focus:ring-2 focus:ring-[#7056e0]/30"
              />
            </div>

            {/* Conteúdo */}
            <div className="flex-1">
              <label className="text-[11px] font-[700] text-[#9e9cb0] uppercase tracking-[0.06em] mb-1.5 block">Conteúdo</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder={cfg.placeholder}
                rows={7}
                className="w-full bg-[#f3f2f8] rounded-[6px] px-3 py-2.5 text-base text-[#1c1b2b] outline-none focus:ring-2 focus:ring-[#7056e0]/30 resize-none"
                required
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-3 border-t border-[#e8e5f2] flex gap-3 shrink-0">
            <button
              type="button"
              onClick={() => !saving && handleSubmit(false)}
              disabled={saving || !content.trim()}
              className="flex-1 py-2.5 rounded-[6px] border border-[#d5d3de] text-[#5a5870] text-[13px] font-[700] hover:bg-[#f3f2f8] transition-colors cursor-pointer disabled:opacity-50"
            >
              Salvar modelo
            </button>
            <button
              type="button"
              onClick={() => !saving && handleSubmit(true)}
              disabled={saving || !content.trim()}
              className="flex-1 py-2.5 rounded-[6px] bg-[#7056e0] text-white text-[13px] font-[700] hover:bg-[#5a45c4] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
            >
              {saving
                ? <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[15px]">send</span>
              }
              Salvar e enviar para {babyName}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Modal de medição ──────────────────────────────────────────────────────────
function MeasurementModal({
  onClose, onSave, saving,
}: {
  onClose: () => void
  onSave: (type: string, value: number, unit: string, date: string) => void
  saving: boolean
}) {
  const [type, setType] = useState('weight')
  const [value, setValue] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)

  const typeConfig = {
    weight:  { label: 'Peso',               unit: 'kg', placeholder: 'Ex: 7.2' },
    height:  { label: 'Comprimento/Altura', unit: 'cm', placeholder: 'Ex: 65.5' },
    head:    { label: 'Perímetro cefálico', unit: 'cm', placeholder: 'Ex: 40.2' },
  }
  const cfg = typeConfig[type as keyof typeof typeConfig]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseFloat(value.replace(',', '.'))
    if (isNaN(num) || num <= 0) return
    onSave(type, num, cfg.unit, date)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[10px] shadow-xl w-full max-w-[360px] overflow-hidden">
          <div className="px-6 py-5 border-b border-[#e8e5f2] flex items-center justify-between">
            <h2 className="text-[16px] font-[800] text-[#1c1b2b]">Registrar medição</h2>
            <button onClick={onClose} className="text-[#9e9cb0] hover:text-[#5a5870] cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
            {/* Tipo */}
            <div className="grid grid-cols-3 gap-2">
              {(['weight','height','head'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2.5 rounded-[6px] text-[12px] font-[700] transition-colors cursor-pointer ${
                    type === t
                      ? 'bg-[#e8e1ff] text-[#7056e0]'
                      : 'bg-[#f3f2f8] text-[#5a5870] hover:bg-[#e8e5f2]'
                  }`}
                >
                  {typeConfig[t].label.split('/')[0]}
                </button>
              ))}
            </div>

            {/* Valor */}
            <div>
              <label className="text-[11px] font-[700] text-[#9e9cb0] uppercase tracking-[0.06em] mb-1.5 block">
                {cfg.label} ({cfg.unit})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={cfg.placeholder}
                  className="flex-1 bg-[#f3f2f8] rounded-[6px] px-3 py-2.5 text-base text-[#1c1b2b] outline-none focus:ring-2 focus:ring-[#7056e0]/30"
                  required
                />
                <span className="text-[13px] font-[600] text-[#9e9cb0]">{cfg.unit}</span>
              </div>
            </div>

            {/* Data */}
            <div>
              <label className="text-[11px] font-[700] text-[#9e9cb0] uppercase tracking-[0.06em] mb-1.5 block">Data</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                max={today}
                className="w-full bg-[#f3f2f8] rounded-[6px] px-3 py-2.5 text-base text-[#1c1b2b] outline-none focus:ring-2 focus:ring-[#7056e0]/30"
                required
              />
            </div>

            <button
              type="submit"
              disabled={saving || !value}
              className="w-full bg-[#7056e0] text-white font-[700] text-[14px] py-3 rounded-[6px] hover:bg-[#5a45c4] transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar medição'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
