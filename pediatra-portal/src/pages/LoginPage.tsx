import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const c = {
  page: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', padding: 24,
    background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(183,159,255,0.14) 0%, transparent 70%)',
    backgroundColor: '#f8f7ff',
  } as React.CSSProperties,
  card: {
    maxWidth: 420, width: '100%', padding: '40px 36px',
    background: 'rgba(255,255,255,0.85)',
    border: '1px solid rgba(183,159,255,0.18)',
    borderRadius: 20, textAlign: 'center' as const,
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 32px rgba(112,86,224,0.08), 0 1px 0 rgba(183,159,255,0.12)',
  },
  label: {
    display: 'block', textAlign: 'left' as const, fontSize: 11, fontWeight: 700,
    color: '#9e9cb0', fontFamily: 'Manrope, sans-serif',
    textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: 6,
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: '1.5px solid rgba(183,159,255,0.25)',
    background: 'rgba(183,159,255,0.04)', color: '#1c1b2b',
    fontSize: 14, fontFamily: 'Manrope, sans-serif',
    outline: 'none', boxSizing: 'border-box' as const,
  },
  btnOAuth: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: '12px 20px', borderRadius: 10,
    fontSize: 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box' as const,
    background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(183,159,255,0.22)',
    color: '#1c1b2b', transition: 'background 0.15s',
  } as React.CSSProperties,
  btnPrimary: {
    width: '100%', marginTop: 12, padding: '13px 20px', borderRadius: 10,
    border: 'none', background: 'linear-gradient(135deg, #b79fff 0%, #7056e0 100%)',
    color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    fontFamily: 'Manrope, sans-serif', letterSpacing: '0.01em',
    boxSizing: 'border-box' as const, display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  } as React.CSSProperties,
}

function YayaLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      <img src="/symbol.png" alt="Yaya" width={48} height={48} style={{
        filter: 'brightness(0) saturate(100%) invert(45%) sepia(60%) saturate(1200%) hue-rotate(230deg) brightness(100%) contrast(95%)',
        display: 'block',
      }} />
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

export default function LoginPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingApple, setLoadingApple] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const redirectTo = typeof window !== 'undefined' ? window.location.origin : ''

  async function handleGoogle() {
    setLoadingGoogle(true); setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    })
    if (err) { setError('Não foi possível iniciar o login com Google.'); setLoadingGoogle(false) }
  }

  async function handleApple() {
    setLoadingApple(true); setError('')
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo },
    })
    if (err) { setError('Não foi possível iniciar o login com Apple.'); setLoadingApple(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) { setError('E-mail ou senha incorretos.'); return }

      const { data: ped } = await supabase.from('pediatricians').select('approved_at').single()
      if (!ped) {
        setError('Conta não encontrada. Verifique seus dados.')
        await supabase.auth.signOut()
        return
      }
      navigate(ped.approved_at ? '/dashboard' : '/aguardando')
    } finally {
      setLoading(false)
    }
  }

  const anyLoading = loading || loadingGoogle || loadingApple

  return (
    <div style={c.page}>
      <div style={c.card}>
        <YayaLogo />

        <h1 style={{ fontFamily: 'Manrope, sans-serif', fontSize: 22, fontWeight: 800, color: '#1c1b2b', margin: '24px 0 6px', letterSpacing: '-0.03em' }}>
          Bem-vinda de volta
        </h1>
        <p style={{ fontFamily: 'Manrope, sans-serif', color: '#6f6896', fontSize: 14, lineHeight: 1.6, margin: '0 0 24px' }}>
          Entre com seu e-mail e senha.
        </p>

        {/* Google */}
        <button onClick={handleGoogle} disabled={anyLoading} style={{ ...c.btnOAuth, marginBottom: 10, opacity: anyLoading ? 0.6 : 1 }}>
          {loadingGoogle
            ? <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 0.7s linear infinite' }}>progress_activity</span>
            : <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          }
          {loadingGoogle ? 'Redirecionando…' : 'Entrar com Google'}
        </button>

        {/* Apple */}
        <button onClick={handleApple} disabled={anyLoading} style={{ ...c.btnOAuth, marginBottom: 20, opacity: anyLoading ? 0.6 : 1 }}>
          {loadingApple
            ? <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 0.7s linear infinite' }}>progress_activity</span>
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="#1c1b2b"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          }
          {loadingApple ? 'Redirecionando…' : 'Entrar com Apple'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(183,159,255,0.18)' }} />
          <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 12, color: '#c4c2d0' }}>ou</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(183,159,255,0.18)' }} />
        </div>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={c.label}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" required style={c.input} />
          </div>

          <div>
            <label style={c.label}>Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" autoComplete="current-password" required
                style={{ ...c.input, paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} tabIndex={-1}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9e9cb0', padding: 0, display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: '#b3001f', background: '#fff0f3', border: '1px solid rgba(179,0,31,0.15)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'Manrope, sans-serif', marginTop: 12, marginBottom: 0, textAlign: 'left' }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={anyLoading} style={{ ...c.btnPrimary, opacity: anyLoading ? 0.65 : 1 }}>
            {loading
              ? <span className="material-symbols-outlined" style={{ fontSize: 18, animation: 'spin 0.7s linear infinite' }}>progress_activity</span>
              : 'Entrar'
            }
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, color: '#9e9cb0', fontFamily: 'Manrope, sans-serif', textAlign: 'center' }}>
          Ainda não tem conta?{' '}
          <Link to="/cadastro" style={{ color: '#7056e0', fontWeight: 700, textDecoration: 'none' }}>Cadastre-se</Link>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
