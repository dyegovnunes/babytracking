import { useState, useRef, useEffect, useCallback } from 'react'
import { signInWithEmail, signInWithGoogle, verifyOtp } from '../contexts/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return
    setError(null)
    const result = await signInWithEmail(email.trim())
    if (result.error) {
      setError(result.error)
    } else {
      setResendCooldown(60)
      setOtp(['', '', '', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }, [email, resendCooldown])

  async function handleGoogle() {
    setSocialLoading(true)
    setError(null)
    const result = await signInWithGoogle()
    if (result.error) {
      setError(result.error)
      setSocialLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)

    const result = await signInWithEmail(email.trim())
    setLoading(false)

    if (result.error) {
      setError(result.error)
    } else {
      setSent(true)
      setOtp(['', '', '', '', '', '', '', ''])
      setResendCooldown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 8).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 8) newOtp[index + i] = d
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 7)
      inputRefs.current[nextIndex]?.focus()

      if (newOtp.every((d) => d !== '')) {
        submitOtp(newOtp.join(''))
      }
      return
    }

    const digit = value.replace(/\D/g, '')
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }

    if (newOtp.every((d) => d !== '')) {
      submitOtp(newOtp.join(''))
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function submitOtp(code: string) {
    setVerifying(true)
    setError(null)

    const result = await verifyOtp(email, code)
    if (result.error) {
      setError('Código inválido. Tente novamente.')
      setOtp(['', '', '', '', '', '', '', ''])
      setVerifying(false)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-primary-container/20 flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(167,139,250,0.15)]">
            <span className="material-symbols-outlined text-primary text-4xl">
              child_care
            </span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Baby<span className="text-primary">Tracking</span>
          </h1>
          <p className="font-label text-sm text-on-surface-variant mt-2">
            Acompanhe as atividades do seu bebê
          </p>
        </div>

        {sent ? (
          /* OTP verification */
          <div className="text-center page-enter">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">
                pin
              </span>
            </div>
            <h2 className="font-headline text-lg font-bold text-on-surface mb-2">
              Digite o código
            </h2>
            <p className="font-label text-sm text-on-surface-variant mb-6">
              Enviamos um código para{' '}
              <strong className="text-on-surface">{email}</strong>
            </p>

            <div className="flex justify-center gap-2.5 mb-4">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={verifying}
                  className="w-9 h-12 bg-surface-container-low rounded-lg text-center text-on-surface font-headline text-xl font-bold outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                />
              ))}
            </div>

            {error && (
              <p className="font-label text-sm text-error mb-4">{error}</p>
            )}

            {verifying && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="material-symbols-outlined animate-spin text-primary text-xl">
                  progress_activity
                </span>
                <span className="font-label text-sm text-on-surface-variant">
                  Verificando...
                </span>
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="font-label text-sm text-primary font-medium disabled:text-on-surface-variant/40"
              >
                {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : 'Reenviar código'}
              </button>
              <span className="text-on-surface-variant/30">|</span>
              <button
                onClick={() => { setSent(false); setError(null) }}
                className="font-label text-sm text-on-surface-variant font-medium"
              >
                Outro email
              </button>
            </div>
          </div>
        ) : (
          /* Login form */
          <div className="page-enter">
            <button
              onClick={handleGoogle}
              disabled={socialLoading}
              className="w-full py-3.5 rounded-xl bg-surface-container-low flex items-center justify-center gap-3 font-label font-semibold text-base text-on-surface active:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              {socialLoading ? (
                <span className="material-symbols-outlined animate-spin text-xl">
                  progress_activity
                </span>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Entrar com Google
                </>
              )}
            </button>

            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-outline-variant/30" />
              <span className="font-label text-xs text-on-surface-variant">ou</span>
              <div className="flex-1 h-px bg-outline-variant/30" />
            </div>

            <form onSubmit={handleSubmit}>
              <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full bg-surface-container-low rounded-lg px-4 py-3.5 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40 mb-4"
              />

              {error && (
                <p className="font-label text-sm text-error mb-4">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base disabled:opacity-50 transition-opacity"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-xl align-middle">
                    progress_activity
                  </span>
                ) : (
                  'Enviar código de acesso'
                )}
              </button>

              <p className="text-center font-label text-xs text-on-surface-variant mt-4">
                Enviaremos um código de acesso para seu email.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
