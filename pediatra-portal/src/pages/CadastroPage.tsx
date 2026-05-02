import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const UF_LIST = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const SPECIALTIES = [
  'Pediatria Geral',
  'Neonatologia',
  'Alergia e Imunologia Pediátrica',
  'Nutrologia Pediátrica',
  'Gastroenterologia Pediátrica',
  'Cardiologia Pediátrica',
  'Neurologia Pediátrica',
  'Outra',
]

interface RqeEntry { numero: string }

const fieldStyle = {
  background: 'rgba(183,159,255,0.07)',
  border: '1px solid rgba(183,159,255,0.2)',
  color: '#e7e2ff',
} as const

export default function CadastroPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rqeList, setRqeList] = useState<RqeEntry[]>([])

  const [form, setForm] = useState({
    name: '', email: '', password: '', crm: '', crm_state: '', specialty: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.name || !form.email || !form.password || !form.crm || !form.crm_state || !form.specialty) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }
    if (form.password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      if (authError || !authData.user) {
        setError(authError?.message ?? 'Erro ao criar conta.')
        return
      }

      const rqeNumbers = rqeList.filter(r => r.numero).map(r => r.numero)

      const { error: insertError } = await supabase.from('pediatricians').insert({
        user_id:     authData.user.id,
        name:        form.name,
        crm:         form.crm,
        crm_state:   form.crm_state,
        specialties: [form.specialty],
        rqe:         rqeNumbers.length > 0 ? rqeNumbers : null,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Já existe uma conta cadastrada com esse CRM.')
        } else {
          setError('Erro ao salvar dados. Tente novamente.')
        }
        await supabase.auth.signOut()
        return
      }

      navigate('/aguardando')
    } finally {
      setLoading(false)
    }
  }

  const labelClass = 'text-[12px] font-[600] block mb-1.5'
  const labelStyle = { color: 'rgba(231,226,255,0.6)' }
  const inputClass = 'w-full rounded-md px-3 py-2.5 text-sm outline-none transition-all placeholder:opacity-40'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#0d0a27' }}>
      <div className="w-full max-w-[440px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <span
            className="text-[30px] font-[800] tracking-[-0.03em] lowercase"
            style={{ fontFamily: 'Manrope, sans-serif', color: '#e7e2ff' }}
          >
            ya<span style={{ color: '#b79fff' }}>ya</span>
          </span>
          <p className="text-[11px] font-[600] tracking-[0.14em] uppercase mt-1" style={{ color: 'rgba(231,226,255,0.4)' }}>
            portal pediatra
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl border p-8"
          style={{
            background: 'rgba(183,159,255,0.04)',
            borderColor: 'rgba(183,159,255,0.15)',
          }}
        >
          <h1 className="text-[20px] font-[800] tracking-[-0.02em] mb-1" style={{ color: '#e7e2ff' }}>
            Crie sua conta
          </h1>
          <p className="text-[13px] mb-7" style={{ color: 'rgba(231,226,255,0.45)' }}>
            Portal gratuito para pediatras.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nome */}
            <div>
              <label className={labelClass} style={labelStyle}>Nome completo</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="Dra. Nome Sobrenome"
                autoComplete="name"
                className={inputClass}
                style={fieldStyle}
              />
            </div>

            {/* Email */}
            <div>
              <label className={labelClass} style={labelStyle}>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className={inputClass}
                style={fieldStyle}
              />
            </div>

            {/* Senha */}
            <div>
              <label className={labelClass} style={labelStyle}>Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  className={`${inputClass} pr-10`}
                  style={fieldStyle}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'rgba(231,226,255,0.35)' }}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* CRM + UF */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelClass} style={labelStyle}>CRM</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.crm}
                  onChange={e => set('crm', e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className={inputClass}
                  style={fieldStyle}
                />
              </div>
              <div className="w-[100px]">
                <label className={labelClass} style={labelStyle}>UF</label>
                <select
                  value={form.crm_state}
                  onChange={e => set('crm_state', e.target.value)}
                  className={inputClass}
                  style={{ ...fieldStyle, appearance: 'none' }}
                >
                  <option value="">UF</option>
                  {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>

            {/* Especialidade */}
            <div>
              <label className={labelClass} style={labelStyle}>Especialidade principal</label>
              <select
                value={form.specialty}
                onChange={e => set('specialty', e.target.value)}
                className={inputClass}
                style={{ ...fieldStyle, appearance: 'none' }}
              >
                <option value="">Selecione...</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* RQE */}
            <div>
              <label className={labelClass} style={labelStyle}>
                RQE <span style={{ color: 'rgba(231,226,255,0.3)' }}>(opcional)</span>
              </label>
              <div className="flex flex-col gap-2">
                {rqeList.map((r, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className={`${inputClass} flex-1`}
                      placeholder="Número do RQE"
                      value={r.numero}
                      onChange={e => setRqeList(l => l.map((x, j) => j === i ? { numero: e.target.value } : x))}
                      style={fieldStyle}
                    />
                    <button
                      type="button"
                      onClick={() => setRqeList(l => l.filter((_, j) => j !== i))}
                      className="cursor-pointer"
                      style={{ color: 'rgba(231,226,255,0.35)' }}
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setRqeList(l => [...l, { numero: '' }])}
                  className="inline-flex items-center gap-1.5 text-[12px] font-[600] w-fit cursor-pointer"
                  style={{ color: '#b79fff' }}
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  Adicionar RQE
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[13px] text-center" style={{ color: '#ff96b9' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-md text-sm font-[700] transition-opacity disabled:opacity-60 cursor-pointer mt-1 flex items-center justify-center gap-2"
              style={{ background: '#b79fff', color: '#0d0a27' }}
            >
              {loading
                ? <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                : 'Criar conta'
              }
            </button>
          </form>
        </div>

        <p className="text-center text-[13px] mt-5" style={{ color: 'rgba(231,226,255,0.4)' }}>
          Já tem conta?{' '}
          <Link to="/login" className="font-[600]" style={{ color: '#b79fff' }}>
            Faça login
          </Link>
        </p>

      </div>
    </div>
  )
}
