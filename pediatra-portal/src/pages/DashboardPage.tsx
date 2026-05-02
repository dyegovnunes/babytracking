import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { supabase } from '../lib/supabase'
import { formatAge, formatLastSeen, formatDate } from '../lib/formatters'
import Button from '../components/ui/Button'
import type { Pediatrician, PatientRow, EndedPatientRow } from '../types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string

export default function DashboardPage() {
  const navigate = useNavigate()
  const [ped, setPed] = useState<Pediatrician | null>(null)
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [ended, setEnded] = useState<EndedPatientRow[]>([])
  const [endedOpen, setEndedOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)

  const inviteUrl = ped ? `${window.location.origin.replace('pediatra.', '')}/conectar/${ped.invite_code}` : ''

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (ped && qrCanvasRef.current) {
      QRCode.toCanvas(qrCanvasRef.current, inviteUrl, {
        width: 140,
        margin: 1,
        color: { dark: '#1c1b2b', light: '#ffffff' },
      })
    }
  }, [ped, inviteUrl])

  async function loadData() {
    setLoading(true)
    try {
      const [pedRes, patientsRes, endedRes] = await Promise.all([
        supabase.from('pediatricians').select('*').single(),
        supabase.rpc('get_pediatrician_patients'),
        supabase.rpc('get_pediatrician_ended_patients'),
      ])

      if (pedRes.data) setPed(pedRes.data)
      if (patientsRes.data) setPatients(patientsRes.data)
      if (endedRes.data) setEnded(endedRes.data)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemovePatient(babyId: string) {
    if (!confirm('Remover acesso a este paciente?')) return
    setRemovingId(babyId)
    await supabase.rpc('unlink_patient_by_pediatrician', { p_baby_id: babyId })
    await loadData()
    setRemovingId(null)
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareWhatsApp() {
    const text = `Olá! Sou sua pediatra e uso o app Yaya para acompanhar meus pacientes. Conecte-se ao meu consultório em 1 toque: ${inviteUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const firstName = ped?.name?.split(' ')[0] ?? ''

  if (loading) return <DashboardSkeleton />

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#fafafe]" style={{ animation: 'fade-in 0.2s ease-out' }}>

      {/* Header */}
      <header className="px-8 pt-8 pb-6">
        <p className="text-[13px] font-[600] tracking-[0.06em] uppercase text-[#9e9cb0] mb-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="text-[26px] font-[800] text-[#1c1b2b] tracking-[-0.02em]">
          Olá, {firstName} 👋
        </h1>
      </header>

      <div className="px-8 pb-10 flex gap-6 flex-wrap lg:flex-nowrap">

        {/* Coluna principal — pacientes */}
        <div className="flex-1 min-w-0">

          {/* Label */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-[700] tracking-[0.1em] uppercase text-[#9e9cb0]">
              Seus pacientes · {patients.length}
            </p>
          </div>

          {/* Grid de pacientes */}
          {patients.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-[40px] mb-3 leading-none">👶</p>
              <p className="text-[15px] font-[700] text-[#1c1b2b] mb-1">Nenhum paciente ainda.</p>
              <p className="text-[13px] text-[#6f6896]">Compartilhe seu link de convite para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {patients.map(p => (
                <PatientCard
                  key={p.baby_id}
                  patient={p}
                  supabaseUrl={SUPABASE_URL}
                  onView={() => navigate(`/paciente/${p.baby_id}`)}
                  onRemove={() => handleRemovePatient(p.baby_id)}
                  removing={removingId === p.baby_id}
                />
              ))}
            </div>
          )}

          {/* Acessos encerrados */}
          {ended.length > 0 && (
            <div className="mt-6 card overflow-hidden">
              <button
                onClick={() => setEndedOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-[#f3f2f8] transition-colors duration-100"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#9e9cb0]">history</span>
                  <span className="text-[13px] font-[600] text-[#5a5870]">
                    Acessos encerrados · {ended.length}
                  </span>
                </div>
                <span className={`material-symbols-outlined text-[18px] text-[#9e9cb0] transition-transform duration-150 ${endedOpen ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>
              {endedOpen && (
                <div className="border-t border-[#d5d3de] divide-y divide-[#f3f2f8]">
                  {ended.map(e => (
                    <div key={e.link_id} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="w-8 h-8 rounded-full bg-[#e8e5f2] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[14px] text-[#9e9cb0]">person</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-[600] text-[#5a5870] truncate">{e.baby_name}</p>
                        <p className="text-[11px] text-[#9e9cb0]">
                          {e.unlink_reason === 'parent' ? 'Responsável removeu acesso' : 'Removido por você'} · {formatDate(e.unlinked_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coluna lateral — convite */}
        <div className="w-full lg:w-[260px] shrink-0">
          <p className="text-[11px] font-[700] tracking-[0.1em] uppercase text-[#9e9cb0] mb-4">Seu link de convite</p>
          <div className="card p-5 flex flex-col gap-4">
            <p className="text-[13px] text-[#5a5870] leading-[1.5]">
              Compartilhe com as famílias dos seus pacientes para conectar o histórico do bebê ao seu portal.
            </p>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white border border-[#d5d3de] rounded-[6px] p-3">
                <canvas ref={qrCanvasRef} />
              </div>
            </div>

            {/* URL copiável */}
            <div className="flex items-center gap-2 bg-[#f3f2f8] rounded-[6px] px-3 py-2.5">
              <p className="text-[12px] text-[#5a5870] flex-1 truncate font-[500]">
                yayababy.app/conectar/{ped?.invite_code}
              </p>
              <button
                onClick={copyInviteLink}
                className="text-[#7056e0] hover:text-[#5a45c4] cursor-pointer shrink-0"
                title="Copiar link"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>

            <Button onClick={shareWhatsApp} className="w-full text-[13px]">
              <span className="material-symbols-outlined text-[16px]">share</span>
              Compartilhar via WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PatientCard({
  patient, supabaseUrl, onView, onRemove, removing,
}: {
  patient: PatientRow
  supabaseUrl: string
  onView: () => void
  onRemove: () => void
  removing: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  const photoUrl = patient.photo_url
    ? patient.photo_url.startsWith('http')
      ? patient.photo_url
      : `${supabaseUrl}/storage/v1/object/public/baby-photos/${patient.photo_url}`
    : null

  const lastSeenLabel = formatLastSeen(patient.last_active_at)
  const isRecent = patient.last_active_at
    ? Date.now() - new Date(patient.last_active_at).getTime() < 86400000 * 2
    : false

  return (
    <div className="card p-4 flex gap-3 hover:shadow-primary-sm transition-shadow duration-150 relative">

      {/* Foto */}
      <div className="w-12 h-12 rounded-full bg-[#e8e5f2] shrink-0 overflow-hidden flex items-center justify-center">
        {photoUrl ? (
          <img src={photoUrl} alt={patient.baby_name} className="w-full h-full object-cover" />
        ) : (
          <span className="material-symbols-outlined text-[22px] text-[#9e9cb0]">child_care</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-[700] text-[#1c1b2b] truncate">{patient.baby_name}</p>
        <p className="text-[12px] text-[#6f6896]">{formatAge(patient.birth_date)}</p>
        <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-[600] ${
          isRecent
            ? 'bg-[#e8e1ff] text-[#7056e0]'
            : 'bg-[#f3f2f8] text-[#9e9cb0]'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isRecent ? 'bg-[#7056e0]' : 'bg-[#9e9cb0]'}`} />
          {lastSeenLabel}
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="text-[#9e9cb0] hover:text-[#5a5870] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">more_vert</span>
        </button>
        <button
          onClick={onView}
          className="text-[12px] font-[600] text-[#7056e0] hover:text-[#5a45c4] cursor-pointer mt-auto"
        >
          Ver histórico
        </button>
      </div>

      {/* Mini menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-8 right-4 z-20 bg-white border border-[#d5d3de] rounded-[6px] shadow-primary-sm overflow-hidden min-w-[160px]">
            <button
              onClick={() => { setMenuOpen(false); onView() }}
              className="flex items-center gap-2 px-4 py-3 text-[13px] text-[#1c1b2b] hover:bg-[#f3f2f8] w-full text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              Ver histórico
            </button>
            <button
              onClick={() => { setMenuOpen(false); onRemove() }}
              disabled={removing}
              className="flex items-center gap-2 px-4 py-3 text-[13px] text-[#b3001f] hover:bg-[#ffd9dd] w-full text-left cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">person_remove</span>
              Remover acesso
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex-1 p-8 flex flex-col gap-6 animate-pulse">
      <div className="skeleton h-7 w-48 rounded-[6px]" />
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="skeleton h-24 rounded-[6px]" />)}
      </div>
    </div>
  )
}
