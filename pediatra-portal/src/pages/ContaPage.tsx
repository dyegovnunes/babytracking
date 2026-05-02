import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Pediatrician } from '../types'

export default function ContaPage() {
  const [ped, setPed] = useState<Pediatrician | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    supabase.from('pediatricians').select('*').single().then(({ data }) => {
      if (data) { setPed(data); setName(data.name) }
      setLoading(false)
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError(''); setSuccess(false)
    const { error: err } = await supabase
      .from('pediatricians')
      .update({ name: name.trim() })
      .eq('id', ped!.id)
    setSaving(false)
    if (err) { setError('Erro ao salvar. Tente novamente.'); return }
    setPed(p => p ? { ...p, name: name.trim() } : p)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-[#fafafe]">
        <span className="text-[#7056e0] text-[13px] font-[600]">Carregando…</span>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#fafafe]" style={{ animation: 'fade-in 0.2s ease-out' }}>

      <header className="px-8 pt-8 pb-6">
        <p className="text-[13px] font-[600] tracking-[0.06em] uppercase text-[#9e9cb0] mb-1">Configurações</p>
        <h1 className="text-[26px] font-[800] text-[#1c1b2b] tracking-[-0.02em]">Minha conta</h1>
      </header>

      <div className="px-8 pb-10 max-w-[520px]">

        {/* Dados profissionais */}
        <section className="card p-6 shadow-primary-sm mb-5">
          <h2 className="text-[15px] font-[800] text-[#1c1b2b] tracking-[-0.01em] mb-5">Dados profissionais</h2>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-[700] text-[#9e9cb0] uppercase tracking-[0.08em]">Nome</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="rounded-[6px] border border-[#d5d3de] px-3 py-2.5 text-[14px] text-[#1c1b2b] bg-white outline-none focus:border-[#7056e0] focus:ring-2 focus:ring-[#e8e1ff] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-[700] text-[#9e9cb0] uppercase tracking-[0.08em]">CRM</label>
              <p className="text-[14px] text-[#1c1b2b] px-3 py-2.5 rounded-[6px] bg-[#f3f2f8] border border-[#d5d3de]">
                {ped?.crm} — {ped?.crm_state}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-[700] text-[#9e9cb0] uppercase tracking-[0.08em]">Especialidade</label>
              <p className="text-[14px] text-[#1c1b2b] px-3 py-2.5 rounded-[6px] bg-[#f3f2f8] border border-[#d5d3de]">
                {ped?.specialties?.[0] ?? '—'}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-[700] text-[#9e9cb0] uppercase tracking-[0.08em]">Status</label>
              <p className={`text-[13px] font-[600] inline-flex items-center gap-1.5 ${ped?.approved_at ? 'text-[#00734a]' : 'text-[#9e9cb0]'}`}>
                <span className="material-symbols-outlined text-[16px]">{ped?.approved_at ? 'verified' : 'schedule'}</span>
                {ped?.approved_at ? 'Aprovada' : 'Aguardando aprovação'}
              </p>
            </div>

            {error && <p className="text-[13px] text-[#b3001f] bg-[#ffd9dd] rounded-[6px] px-3 py-2">{error}</p>}
            {success && <p className="text-[13px] text-[#00734a] bg-[#e6f6ef] rounded-[6px] px-3 py-2">Salvo com sucesso.</p>}

            <button
              type="submit"
              disabled={saving || name === ped?.name}
              className="inline-flex items-center justify-center gap-2 rounded-[6px] px-5 py-2.5 text-[13px] font-[700] bg-[#7056e0] text-white shadow-primary hover:bg-[#5a45c4] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer w-fit"
            >
              {saving
                ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[16px]">check</span>
              }
              Salvar alterações
            </button>
          </form>
        </section>

        {/* Acesso */}
        <section className="card p-6 shadow-primary-sm">
          <h2 className="text-[15px] font-[800] text-[#1c1b2b] tracking-[-0.01em] mb-4">Acesso</h2>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-[700] text-[#9e9cb0] uppercase tracking-[0.08em]">E-mail</label>
            <EmailDisplay />
          </div>
        </section>

      </div>
    </div>
  )
}

function EmailDisplay() {
  const [email, setEmail] = useState('')
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [])
  return (
    <p className="text-[14px] text-[#1c1b2b] px-3 py-2.5 rounded-[6px] bg-[#f3f2f8] border border-[#d5d3de]">
      {email || '—'}
    </p>
  )
}
