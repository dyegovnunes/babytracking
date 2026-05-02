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
interface AchievedMilestone { code: string | null; achievedAt: string; note: string | null }
interface Medication { id: string; name: string; dosage: string; frequencyHours: number; startDate: string; endDate: string | null; durationType: string }
interface MedLog { medicationId: string; administeredAt: string }

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

// ── Constantes ────────────────────────────────────────────────────────────────
const EVENT_LABELS: Record<string, { label: string; emoji: string; cat: string }> = {
  breast_left:  { label: 'Peito Esq.',   emoji: '🤱', cat: 'feed' },
  breast_right: { label: 'Peito Dir.',   emoji: '🤱', cat: 'feed' },
  breast_both:  { label: 'Ambos',        emoji: '🤱', cat: 'feed' },
  bottle:       { label: 'Mamadeira',    emoji: '🍼', cat: 'feed' },
  diaper_wet:   { label: 'Xixi',         emoji: '💧', cat: 'diaper' },
  diaper_dirty: { label: 'Cocô',         emoji: '💩', cat: 'diaper' },
  sleep:        { label: 'Dormiu',       emoji: '🌙', cat: 'sleep' },
  wake:         { label: 'Acordou',      emoji: '☀️', cat: 'sleep' },
  bath:         { label: 'Banho',        emoji: '🛁', cat: 'care' },
  meal:         { label: 'Refeição',     emoji: '🥣', cat: 'care' },
  mood:         { label: 'Humor',        emoji: '😊', cat: 'care' },
  sick_log:     { label: 'Doente',       emoji: '🤒', cat: 'care' },
  potty_pee:    { label: 'Penico Xixi',  emoji: '🚽', cat: 'care' },
  potty_poop:   { label: 'Penico Cocô',  emoji: '💩', cat: 'care' },
}

const CAT_COLORS: Record<string, string> = {
  feed:   'bg-[#fde8f5] text-[#c5487a]',
  diaper: 'bg-[#e8f4ff] text-[#2563eb]',
  sleep:  'bg-[#eae6ff] text-[#7056e0]',
  care:   'bg-[#e6f6ef] text-[#00734a]',
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

// ── Componentes ───────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-[700] tracking-[0.08em] uppercase text-[#9e9cb0] mb-3">{children}</h2>
}

function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <p className="text-[22px] leading-none">{emoji}</p>
      <p className="text-[22px] font-[800] text-[#1c1b2b] tracking-[-0.02em] leading-none mt-2">{value}</p>
      <p className="text-[12px] font-[600] text-[#6f6896]">{label}</p>
      {sub && <p className="text-[11px] text-[#9e9cb0]">{sub}</p>}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PacientePage() {
  const { babyId } = useParams<{ babyId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'resumo' | 'registros' | 'vacinas' | 'marcos' | 'medicamentos'>('resumo')

  useEffect(() => {
    if (!babyId) return
    loadReport()
  }, [babyId])

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

  // Calcular stats dos últimos 7 dias
  const sevenDaysAgo = Date.now() - 7 * 86400000
  const recentLogs = logs.filter(l => new Date(l.timestamp).getTime() > sevenDaysAgo)
  const feedCount = recentLogs.filter(l => ['breast_left','breast_right','breast_both','bottle'].includes(l.eventId)).length
  const diaperCount = recentLogs.filter(l => l.eventId.startsWith('diaper')).length
  const sleepSessions = recentLogs.filter(l => l.eventId === 'sleep').length
  const avgFeedPerDay = Math.round(feedCount / 7 * 10) / 10

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
            { id: 'registros',    label: 'Registros' },
            { id: 'vacinas',      label: 'Vacinas' },
            { id: 'marcos',       label: 'Marcos' },
            { id: 'medicamentos', label: 'Medicamentos' },
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
            <p className="text-[12px] font-[600] text-[#9e9cb0] uppercase tracking-[0.08em] mb-4">Últimos 7 dias</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              <StatCard emoji="🤱" label="Alimentações" value={feedCount} sub={`~${avgFeedPerDay}/dia`} />
              <StatCard emoji="💧" label="Fraldas" value={diaperCount} sub={`~${Math.round(diaperCount/7*10)/10}/dia`} />
              <StatCard emoji="🌙" label="Sonos" value={sleepSessions} />
              <StatCard emoji="📝" label="Total registros" value={recentLogs.length} />
            </div>

            {/* Medições */}
            {(lastWeight || lastHeight) && (
              <div className="mb-8">
                <SectionTitle>Crescimento</SectionTitle>
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
              </div>
            )}

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
                    return (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <span className="material-symbols-outlined text-[16px] text-[#7056e0]">check_circle</span>
                        <div>
                          <p className="text-[13px] font-[600] text-[#1c1b2b]">{def?.title ?? m.code}</p>
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

        {/* ── REGISTROS ──────────────────────────────────────────────────── */}
        {tab === 'registros' && (
          <div className="max-w-[600px]">
            <p className="text-[12px] font-[600] text-[#9e9cb0] uppercase tracking-[0.08em] mb-4">Últimos 30 dias · {logs.length} registros</p>
            {logs.length === 0 ? (
              <p className="text-[14px] text-[#9e9cb0]">Nenhum registro encontrado.</p>
            ) : (
              <div className="card divide-y divide-[#f3f2f8]">
                {logs.slice(0, 100).map((l, i) => {
                  const ev = EVENT_LABELS[l.eventId]
                  const catColor = CAT_COLORS[ev?.cat ?? 'care']
                  return (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <span className={`text-[11px] font-[700] px-2 py-0.5 rounded-full shrink-0 ${catColor}`}>
                        {ev?.emoji ?? '📋'} {ev?.label ?? l.eventId}
                      </span>
                      <div className="flex-1 min-w-0">
                        {l.ml && <span className="text-[12px] text-[#6f6896]">{l.ml} ml · </span>}
                        {l.duration && <span className="text-[12px] text-[#6f6896]">{l.duration} min · </span>}
                        {l.notes && <span className="text-[12px] text-[#6f6896] truncate">{l.notes}</span>}
                      </div>
                      <p className="text-[11px] text-[#9e9cb0] shrink-0">{fmt(l.timestamp)}</p>
                    </div>
                  )
                })}
                {logs.length > 100 && (
                  <div className="px-4 py-3 text-center">
                    <p className="text-[12px] text-[#9e9cb0]">Exibindo os 100 mais recentes de {logs.length}</p>
                  </div>
                )}
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
                  return (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <span className="material-symbols-outlined text-[18px] text-[#7056e0] mt-0.5 shrink-0">check_circle</span>
                      <div className="flex-1">
                        <p className="text-[14px] font-[700] text-[#1c1b2b]">{def?.title ?? m.code}</p>
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

      </div>
    </div>
  )
}
