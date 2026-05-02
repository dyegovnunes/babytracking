import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const UF_LIST = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
const SPECIALTIES = ['Pediatria Geral','Neonatologia','Alergia e Imunologia Pediátrica','Nutrologia Pediátrica','Gastroenterologia Pediátrica','Cardiologia Pediátrica','Neurologia Pediátrica','Outra']

interface RqeEntry { numero: string }

const c = {
  page: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '40px 24px',
    background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(183,159,255,0.14) 0%, transparent 70%)',
    backgroundColor: '#f8f7ff',
  } as React.CSSProperties,
  card: {
    maxWidth: 460,
    width: '100%',
    padding: '40px 36px',
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(183,159,255,0.18)',
    borderRadius: 20,
    textAlign: 'center' as const,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 32px rgba(112,86,224,0.08), 0 1px 0 rgba(183,159,255,0.12)',
  },
  heading: {
    fontFamily: 'Manrope, sans-serif',
    fontSize: 22,
    fontWeight: 800,
    color: '#1c1b2b',
    margin: '0 0 6px',
    letterSpacing: '-0.03em',
  },
  body: {
    fontFamily: 'Manrope, sans-serif',
    color: '#6f6896',
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
  },
  label: {
    display: 'block',
    textAlign: 'left' as const,
    fontSize: 11,
    fontWeight: 700,
    color: '#9e9cb0',
    fontFamily: 'Manrope, sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.09em',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1.5px solid rgba(183,159,255,0.25)',
    background: 'rgba(183,159,255,0.04)',
    color: '#1c1b2b',
    fontSize: 14,
    fontFamily: 'Manrope, sans-serif',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  btnPrimary: {
    width: '100%',
    marginTop: 12,
    padding: '13px 20px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #b79fff 0%, #7056e0 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif',
    letterSpacing: '0.01em',
    boxSizing: 'border-box' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  } as React.CSSProperties,
}

function YayaLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <img
        src="/symbol.png"
        alt="Yaya"
        width={48}
        height={48}
        style={{
          filter: 'brightness(0) saturate(100%) invert(45%) sepia(60%) saturate(1200%) hue-rotate(230deg) brightness(100%) contrast(95%)',
          display: 'block',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 26, fontWeight: 800, color: '#1c1b2b', letterSpacing: '-0.03em', lineHeight: 1 }}>
          Ya<span style={{ color: '#7056e0' }}>ya</span>
        </span>
        <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 10, fontWeight: 700, color: '#7056e0', letterSpacing: '0.1em', textTransform: 'uppercase' as const, background: 'rgba(112,86,224,0.08)', padding: '3px 8px', borderRadius: 20, border: '1px solid rgba(112,86,224,0.15)', lineHeight: 1.8 }}>
          Portal Pediatra
        </span>
      </div>
    </div>
  )
}

export default function CadastroPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rqeList, setRqeList] = useState<RqeEntry[]>([])
  const [hasSession, setHasSession] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', crm: '', crm_state: '', specialty: '' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })
  }, [])

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
      // Verifica se já tem sessão (ex: veio de OAuth)
      const { data: { session } } = await supabase.auth.getSession()
      let userId: string

      if (session?.user) {
        userId = session.user.id
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email: form.email, password: form.password })
        if (authError || !authData.user) { setError(authError?.message ?? 'Erro ao criar conta.'); return }
        userId = authData.user.id
      }

      const rqeNumbers = rqeList.filter(r => r.numero).map(r => r.numero)
      const { error: insertError } = await supabase.from('pediatricians').insert({
        user_id: userId, name: form.name, crm: form.crm, crm_state: form.crm_state,
        specialties: [form.specialty], rqe: rqeNumbers.length > 0 ? rqeNumbers : null,
      })
      if (insertError) {
        setError(insertError.code === '23505' ? 'Já existe uma conta cadastrada com esse CRM.' : 'Erro ao salvar dados. Tente novamente.')
        await supabase.auth.signOut()
        return
      }
      navigate('/aguardando')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={c.page}>
      <div style={c.card}>
        <YayaLogo />

        <h1 style={{ ...c.heading, marginTop: 24 }}>
          {hasSession ? 'Complete seu cadastro' : 'Crie sua conta'}
        </h1>
        <p style={{ ...c.body, marginBottom: 28 }}>
          {hasSession ? 'Informe seus dados profissionais para continuar.' : 'Portal gratuito para pediatras.'}
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Nome */}
          <div>
            <label style={c.label}>Nome completo</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Dra. Nome Sobrenome" autoComplete="name" style={c.input} />
          </div>

          {/* Email + Senha — apenas sem sessão OAuth */}
          {!hasSession && <>
            <div>
              <label style={c.label}>E-mail</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="seu@email.com" autoComplete="email" style={c.input} />
            </div>

            <div>
              <label style={c.label}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  style={{ ...c.input, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9cb0', padding: 0, display: 'flex' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>
          </>}

          {/* CRM + UF */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={c.label}>CRM</label>
              <input type="text" inputMode="numeric" value={form.crm} onChange={e => set('crm', e.target.value.replace(/\D/g, ''))} placeholder="000000" style={c.input} />
            </div>
            <div style={{ width: 100 }}>
              <label style={c.label}>UF</label>
              <select value={form.crm_state} onChange={e => set('crm_state', e.target.value)} style={{ ...c.input, appearance: 'none' as React.CSSProperties['appearance'] }}>
                <option value="">UF</option>
                {UF_LIST.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          {/* Especialidade */}
          <div>
            <label style={c.label}>Especialidade principal</label>
            <select value={form.specialty} onChange={e => set('specialty', e.target.value)} style={{ ...c.input, appearance: 'none' as React.CSSProperties['appearance'] }}>
              <option value="">Selecione...</option>
              {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* RQE */}
          <div>
            <label style={c.label}>RQE <span style={{ textTransform: 'none', fontWeight: 400, color: '#c4c2d0' }}>(opcional)</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rqeList.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    placeholder="Número do RQE"
                    value={r.numero}
                    onChange={e => setRqeList(l => l.map((x, j) => j === i ? { numero: e.target.value } : x))}
                    style={{ ...c.input, flex: 1 }}
                  />
                  <button type="button" onClick={() => setRqeList(l => l.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9e9cb0', padding: 4, display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 17 }}>close</span>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRqeList(l => [...l, { numero: '' }])}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7056e0', fontFamily: 'Manrope, sans-serif', fontSize: 13, fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>add</span>
                Adicionar RQE
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: '#b3001f', background: '#fff0f3', border: '1px solid rgba(179,0,31,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'Manrope, sans-serif', margin: 0, textAlign: 'left' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} style={{ ...c.btnPrimary, opacity: loading ? 0.65 : 1 }}>
            {loading
              ? <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 0.7s linear infinite' }}>progress_activity</span>
              : 'Criar conta'
            }
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, color: '#9e9cb0', fontFamily: 'Manrope, sans-serif', textAlign: 'center' }}>
          Já tem conta?{' '}
          <Link to="/login" style={{ color: '#7056e0', fontWeight: 700, textDecoration: 'none' }}>Faça login</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
