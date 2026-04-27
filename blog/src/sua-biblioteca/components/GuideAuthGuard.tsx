// GuideAuthGuard — renderiza a UI correta pra cada estado de acesso.
//   no-session  → tela de login (Google, Apple, email + OTP de 6 dígitos)
//   no-access   → CTA pra landing do guia
//   error       → mensagem amigável
//   loading     → texto sutil

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import type { AccessState } from '../lib/useGuideAccess'

interface Props {
  access: AccessState
  guideSlug: string
}

export default function GuideAuthGuard({ access, guideSlug }: Props) {
  if (access.status === 'loading') {
    return (
      <div style={s.page}>
        <div style={{ textAlign: 'center', color: 'var(--r-text-muted)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
          Carregando…
        </div>
      </div>
    )
  }

  if (access.status === 'error') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <YayaLogo />
          <span className="material-symbols-outlined" style={{ fontSize: 36, color: '#ff7a90', marginTop: 24 }}>error</span>
          <h1 style={{ ...s.heading, marginTop: 12 }}>Algo deu errado</h1>
          <p style={{ ...s.body, marginBottom: 0 }}>
            {access.errorMsg || 'Não conseguimos carregar o guia. Tenta atualizar a página.'}
          </p>
        </div>
      </div>
    )
  }

  if (access.status === 'no-session') {
    return <LoginPrompt guideSlug={guideSlug} />
  }

  if (access.status === 'no-access') {
    return <NoAccessCTA guideSlug={guideSlug} guideTitle={access.guide?.title ?? 'esse guia'} email={access.email} />
  }

  return null
}

// ── Yaya Logo ─────────────────────────────────────────────────────────────────
function YayaLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <ellipse cx="20" cy="13" rx="7" ry="11" fill="url(#g1)" opacity="0.95" transform="rotate(-20 20 13)" />
        <ellipse cx="20" cy="13" rx="7" ry="11" fill="url(#g2)" opacity="0.8" transform="rotate(20 20 13)" />
        <circle cx="20" cy="22" r="5" fill="url(#g3)" />
        <defs>
          <linearGradient id="g1" x1="20" y1="2" x2="20" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d4c1ff" /><stop offset="1" stopColor="#b79fff" />
          </linearGradient>
          <linearGradient id="g2" x1="20" y1="2" x2="20" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffb3cc" /><stop offset="1" stopColor="#ff96b9" />
          </linearGradient>
          <linearGradient id="g3" x1="15" y1="17" x2="25" y2="27" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c9a8ff" /><stop offset="1" stopColor="#8b6df0" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{ fontFamily: 'Fraunces, Georgia, serif', fontSize: 22, fontWeight: 700, color: 'var(--r-text-strong)', letterSpacing: '-0.02em', lineHeight: 1 }}>
        Yaya
      </span>
      <span style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--r-accent)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, background: 'rgba(183,159,255,0.12)', padding: '2px 7px', borderRadius: 20, border: '1px solid rgba(183,159,255,0.2)', lineHeight: 1.8 }}>
        biblioteca
      </span>
    </div>
  )
}

// ── Login prompt ──────────────────────────────────────────────────────────────
function LoginPrompt({ guideSlug }: { guideSlug: string }) {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingApple, setLoadingApple] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [error, setError] = useState('')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/sua-biblioteca/${guideSlug}/ler`
    : ''

  // Countdown do reenvio
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

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

  async function sendOtp() {
    if (!email.trim()) return
    setSending(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    setSending(false)
    if (err) {
      setError('Não conseguimos enviar o código. Confere o email e tenta de novo.')
    } else {
      setStep('otp')
      setOtp(['', '', '', '', '', ''])
      setResendCooldown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  async function resendOtp() {
    if (resendCooldown > 0) return
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    })
    if (!err) {
      setResendCooldown(60)
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  function handleOtpChange(index: number, value: string) {
    // Suporte a colar o código completo
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => { if (index + i < 6) newOtp[index + i] = d })
      setOtp(newOtp)
      const nextIdx = Math.min(index + digits.length, 5)
      inputRefs.current[nextIdx]?.focus()
      if (newOtp.every(d => d !== '')) submitOtp(newOtp.join(''))
      return
    }
    const digit = value.replace(/\D/g, '')
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
    if (newOtp.every(d => d !== '')) submitOtp(newOtp.join(''))
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function submitOtp(code: string) {
    setVerifying(true); setError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    })
    if (err) {
      setError('Código inválido ou expirado. Tente novamente.')
      setOtp(['', '', '', '', '', ''])
      setVerifying(false)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
    // Se OK: a sessão é criada e useGuideAccess re-renderiza automaticamente
  }

  // ── Tela OTP ──────────────────────────────────────────────────────────────
  if (step === 'otp') {
    return (
      <div style={s.page}>
        <div style={s.card}>
          <YayaLogo />

          <div style={{ marginTop: 28, marginBottom: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--r-accent)', opacity: 0.8 }}>pin</span>
          </div>
          <h1 style={s.heading}>Digite o código</h1>
          <p style={{ ...s.body, marginBottom: 24 }}>
            Enviamos um código de 6 dígitos para <strong style={{ color: 'var(--r-text-strong)' }}>{email}</strong>
          </p>

          {/* 6 caixas OTP */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                disabled={verifying}
                style={{
                  width: 44,
                  height: 52,
                  background: 'rgba(183,159,255,0.08)',
                  border: `1.5px solid ${digit ? 'var(--r-accent)' : 'rgba(183,159,255,0.2)'}`,
                  borderRadius: 10,
                  textAlign: 'center' as const,
                  color: 'var(--r-text-strong)',
                  fontFamily: 'Fraunces, Georgia, serif',
                  fontSize: 22,
                  fontWeight: 700,
                  outline: 'none',
                  opacity: verifying ? 0.5 : 1,
                  transition: 'border-color 0.15s',
                }}
              />
            ))}
          </div>

          {verifying && (
            <p style={{ color: 'var(--r-text-muted)', fontSize: 13, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', marginBottom: 8 }}>
              Verificando…
            </p>
          )}
          {error && (
            <p style={{ color: '#ff7a90', fontSize: 13, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', marginBottom: 8 }}>{error}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
            <button
              onClick={resendOtp}
              disabled={resendCooldown > 0}
              style={{ ...s.linkBtn, opacity: resendCooldown > 0 ? 0.4 : 1 }}
            >
              {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : 'Reenviar código'}
            </button>
            <span style={{ color: 'rgba(183,159,255,0.2)' }}>|</span>
            <button onClick={() => { setStep('form'); setError('') }} style={s.linkBtn}>
              Outro email
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Tela form (OAuth + email) ─────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>
        <YayaLogo />
        <h1 style={{ ...s.heading, marginTop: 28 }}>Acesse sua biblioteca</h1>
        <p style={{ ...s.body, marginBottom: 28 }}>Entre com a conta que usou na compra.</p>

        {/* Google */}
        <button onClick={handleGoogle} disabled={loadingGoogle || loadingApple} style={{ ...s.btnOAuth, ...s.btnGoogle }}>
          {loadingGoogle
            ? <span style={s.spinner} />
            : <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
          }
          {loadingGoogle ? 'Redirecionando…' : 'Entrar com Google'}
        </button>

        {/* Apple */}
        <button onClick={handleApple} disabled={loadingGoogle || loadingApple} style={{ ...s.btnOAuth, ...s.btnApple }}>
          {loadingApple
            ? <span style={{ ...s.spinner, borderColor: 'rgba(255,255,255,0.25)', borderTopColor: '#fff' }} />
            : <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
          }
          {loadingApple ? 'Redirecionando…' : 'Entrar com Apple'}
        </button>

        {/* Divider */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>ou</span>
          <div style={s.dividerLine} />
        </div>

        {/* Email */}
        <label style={{ display: 'block', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--r-text-muted)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 8 }}>
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendOtp()}
          placeholder="seu@email.com"
          autoFocus
          disabled={sending}
          style={s.input}
        />
        {error && <p style={{ color: '#ff7a90', fontSize: 13, marginTop: 8, textAlign: 'left', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>{error}</p>}

        <button
          onClick={sendOtp}
          disabled={sending || !email.trim()}
          style={{ ...s.btnPrimary, opacity: (sending || !email.trim()) ? 0.45 : 1 }}
        >
          {sending ? 'Enviando…' : 'Enviar código de acesso'}
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--r-text-subtle)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', lineHeight: 1.6 }}>
          Enviamos um código de 6 dígitos para o seu email.
        </p>

        <p style={{ marginTop: 8, fontSize: 12, color: 'var(--r-text-subtle)', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
          Problema pra entrar?{' '}
          <a href="mailto:oi@yayababy.app" style={{ color: 'var(--r-accent)', textDecoration: 'underline' }}>fale com a gente</a>
        </p>
      </div>
    </div>
  )
}

// ── Sem acesso ────────────────────────────────────────────────────────────────
function NoAccessCTA({ guideSlug, guideTitle, email }: { guideSlug: string; guideTitle: string; email: string | null }) {
  async function signOut() {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <YayaLogo />
        <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--r-accent)', marginTop: 28, opacity: 0.6 }}>lock</span>
        <h1 style={{ ...s.heading, marginTop: 12 }}>Você ainda não tem esse guia</h1>
        <p style={{ ...s.body, marginBottom: 24 }}>
          {email ? <><strong style={{ color: 'var(--r-text-strong)' }}>{email}</strong> não tem acesso ao <em>{guideTitle}</em>. </> : null}
          Adquira na biblioteca para liberar o conteúdo completo.
        </p>
        <a href={`/sua-biblioteca/${guideSlug}`} style={{ ...s.btnPrimary, display: 'block', textDecoration: 'none', textAlign: 'center' as const }}>
          Ver detalhes e adquirir
        </a>
        {email && (
          <button onClick={signOut} style={s.btnSecondary}>Entrar com outro email</button>
        )}
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
    background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(183,159,255,0.12) 0%, transparent 70%)',
  },
  card: {
    maxWidth: 420,
    width: '100%',
    padding: '40px 36px',
    background: 'rgba(183,159,255,0.04)',
    border: '1px solid rgba(183,159,255,0.14)',
    borderRadius: 20,
    textAlign: 'center',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(183,159,255,0.08)',
  },
  heading: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 26,
    fontWeight: 700,
    color: 'var(--r-text-strong)',
    margin: '0 0 8px',
    letterSpacing: '-0.02em',
    lineHeight: 1.25,
  },
  body: {
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    color: 'var(--r-text-muted)',
    fontSize: 14,
    lineHeight: 1.65,
    margin: 0,
  },
  btnOAuth: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '12px 20px',
    borderRadius: 10,
    border: 'none',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    marginBottom: 10,
    boxSizing: 'border-box',
  },
  btnGoogle: {
    background: '#fff',
    color: '#1f1f1f',
    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
  },
  btnApple: {
    background: '#1a1a1a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(183,159,255,0.12)',
  },
  dividerText: {
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    fontSize: 12,
    color: 'var(--r-text-subtle)',
    whiteSpace: 'nowrap' as const,
  },
  input: {
    width: '100%',
    padding: '13px 16px',
    borderRadius: 10,
    border: '1px solid rgba(183,159,255,0.18)',
    background: 'rgba(183,159,255,0.06)',
    color: 'var(--r-text)',
    fontSize: 15,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    width: '100%',
    marginTop: 12,
    padding: '13px 20px',
    borderRadius: 10,
    border: 'none',
    background: 'linear-gradient(135deg, #b79fff 0%, #8b6df0 100%)',
    color: '#0d0a27',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    letterSpacing: '0.01em',
    boxSizing: 'border-box',
  },
  btnSecondary: {
    width: '100%',
    marginTop: 10,
    padding: '12px 20px',
    borderRadius: 10,
    border: '1px solid rgba(183,159,255,0.16)',
    background: 'transparent',
    color: 'var(--r-text-muted)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    boxSizing: 'border-box',
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--r-text-muted)',
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(13,10,39,0.2)',
    borderTop: '2px solid #0d0a27',
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
    animation: 'spin 0.7s linear infinite',
  },
}
