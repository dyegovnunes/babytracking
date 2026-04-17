import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { signInWithEmail, signInWithGoogle, signInWithApple, verifyOtp } from '../contexts/AuthContext'
import { Capacitor } from '@capacitor/core'

// Imports estáticos — Vite inclui no bundle com hash. 10 fotos WebP ~735KB total.
import bg1 from '../assets/Login/login-bg-1.webp'
import bg2 from '../assets/Login/login-bg-2.webp'
import bg3 from '../assets/Login/login-bg-3.webp'
import bg4 from '../assets/Login/login-bg-4.webp'
import bg5 from '../assets/Login/login-bg-5.webp'
import bg6 from '../assets/Login/login-bg-6.webp'
import bg7 from '../assets/Login/login-bg-7.webp'
import bg8 from '../assets/Login/login-bg-8.webp'
import bg9 from '../assets/Login/login-bg-9.webp'
import bg10 from '../assets/Login/login-bg-10.webp'

const LOGIN_IMAGES = [bg1, bg2, bg3, bg4, bg5, bg6, bg7, bg8, bg9, bg10]
const LAST_BG_KEY = 'yaya_last_login_bg'

const isAndroid = Capacitor.getPlatform() === 'android'
const showAppleAuth = !isAndroid

/**
 * Seleciona uma foto aleatória, evitando repetir a última sessão.
 * Guarda o índice em localStorage. Se localStorage não estiver disponível
 * (SSR, modo privado quebrado), cai no sorteio simples.
 */
function pickRandomImage(): string {
  try {
    const last = localStorage.getItem(LAST_BG_KEY)
    const pool = LOGIN_IMAGES.filter((img) => img !== last)
    const picked = pool[Math.floor(Math.random() * pool.length)]
    localStorage.setItem(LAST_BG_KEY, picked)
    return picked
  } catch {
    return LOGIN_IMAGES[Math.floor(Math.random() * LOGIN_IMAGES.length)]
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [bgReady, setBgReady] = useState(false)
  const [bgFailed, setBgFailed] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Escolhe uma foto no mount. useMemo garante que não muda em re-renders
  // (mudaria a foto a cada setState, ruim). Se falhar o preload, cai no
  // fundo escuro sólido (fallback graceful).
  const bgImage = useMemo(pickRandomImage, [])

  // Preload da imagem antes de mostrar, pra evitar flash preto. Timeout de
  // 400ms garante que, se a imagem for grande ou a conexão lenta, a tela
  // aparece mesmo assim (com fundo preto enquanto carrega).
  useEffect(() => {
    let done = false
    const img = new Image()
    img.onload = () => {
      if (!done) { done = true; setBgReady(true) }
    }
    img.onerror = () => {
      if (!done) { done = true; setBgFailed(true); setBgReady(true) }
    }
    img.src = bgImage
    const timer = setTimeout(() => {
      if (!done) { done = true; setBgReady(true) }
    }, 400)
    return () => { clearTimeout(timer); done = true }
  }, [bgImage])

  // On native, listen for in-app browser close to reset socialLoading
  // (user cancelled auth without completing)
  useEffect(() => {
    if (!socialLoading || !Capacitor.isNativePlatform()) return
    let listener: { remove: () => void } | undefined
    import('@capacitor/browser').then(({ Browser }) => {
      Browser.addListener('browserFinished', () => {
        setSocialLoading(false)
      }).then((l) => { listener = l })
    }).catch(() => { setSocialLoading(false) })
    return () => { listener?.remove() }
  }, [socialLoading])

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
      setOtp(['', '', '', '', '', ''])
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

  async function handleApple() {
    setSocialLoading(true)
    setError(null)
    const result = await signInWithApple()
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
      setOtp(['', '', '', '', '', ''])
      setResendCooldown(60)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newOtp = [...otp]
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d
      })
      setOtp(newOtp)
      const nextIndex = Math.min(index + digits.length, 5)
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

    if (digit && index < 5) {
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
      setOtp(['', '', '', '', '', ''])
      setVerifying(false)
      setTimeout(() => inputRefs.current[0]?.focus(), 100)
    }
  }

  // Full-screen loading overlay during social auth
  if (socialLoading) {
    return (
      <div className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4">
        <img
          src="./logo-symbol.png"
          alt="Yaya"
          className="w-20 h-20 animate-pulse-soft"
        />
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">
          progress_activity
        </span>
        <p className="font-label text-sm text-on-surface-variant">
          Conectando...
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Background: foto + gradiente. Foto só aparece depois de carregar
          (bgReady=true). Se falhou, mantém fundo preto. */}
      {bgReady && !bgFailed && (
        <img
          src={bgImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover select-none pointer-events-none animate-fade-in"
          draggable={false}
        />
      )}
      {/* Tint roxo sobre a foto — ancora a identidade de cor do Yaya. Blend
          mode multiply escurece e reforça o tom sem apagar a imagem. */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-multiply"
        style={{ background: 'rgba(91, 61, 181, 0.45)' }}
      />
      {/* Gradiente preto em cima do tint: topo transparente pra foto respirar,
          base escura pra botões legíveis. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(13,10,39,0.92) 0%, rgba(13,10,39,0.78) 45%, rgba(13,10,39,0.35) 75%, rgba(13,10,39,0.10) 100%)',
        }}
      />

      {/* Conteúdo */}
      <div
        className="relative z-10 flex flex-col min-h-screen px-6"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 1rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        }}
      >
        {/* Spacer superior — deixa a foto respirar nos ~40% superiores */}
        <div className="flex-1 min-h-[25vh]" />

        <div className="w-full max-w-sm mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mx-auto mb-4">
              <img
                src="./logo-symbol.png"
                alt="Yaya"
                className="w-20 h-20 drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                style={{ filter: 'brightness(0) saturate(100%) invert(72%) sepia(40%) saturate(1500%) hue-rotate(220deg) brightness(105%) contrast(95%)' }}
              />
            </div>
            <h1
              className="font-headline text-3xl font-extrabold text-white tracking-tight"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
            >
              Ya<span className="text-primary">ya</span>
            </h1>
            <p
              className="font-label text-sm text-white/80 mt-2"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.55)' }}
            >
              Cada momento conta.
            </p>
          </div>

          {sent ? (
            /* OTP verification */
            <div className="text-center page-enter">
              <div className="w-14 h-14 rounded-full bg-white/12 backdrop-blur-sm border border-white/15 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-white text-2xl">
                  pin
                </span>
              </div>
              <h2
                className="font-headline text-lg font-bold text-white mb-2"
                style={{ textShadow: '0 1px 8px rgba(0,0,0,0.55)' }}
              >
                Digite o código
              </h2>
              <p className="font-label text-sm text-white/75 mb-6">
                Enviamos um código para{' '}
                <strong className="text-white">{email}</strong>
              </p>

              <div className="flex justify-center gap-2.5 mb-4">
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={verifying}
                    className="w-9 h-12 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-center text-white font-headline text-xl font-bold outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 disabled:opacity-50"
                  />
                ))}
              </div>

              {error && (
                <p className="font-label text-sm text-error-container mb-4" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{error}</p>
              )}

              {verifying && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="material-symbols-outlined animate-spin text-white text-xl">
                    progress_activity
                  </span>
                  <span className="font-label text-sm text-white/80">
                    Verificando...
                  </span>
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0}
                  className="font-label text-sm text-white font-medium disabled:text-white/40"
                >
                  {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : 'Reenviar código'}
                </button>
                <span className="text-white/30">|</span>
                <button
                  onClick={() => { setSent(false); setError(null) }}
                  className="font-label text-sm text-white/80 font-medium"
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
                className="w-full py-3.5 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 flex items-center justify-center gap-3 font-label font-semibold text-base text-white active:bg-white/20 transition-colors disabled:opacity-50"
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

              {showAppleAuth && <button
                onClick={handleApple}
                disabled={socialLoading}
                className="w-full py-3.5 rounded-xl bg-white/12 backdrop-blur-md border border-white/20 flex items-center justify-center gap-3 font-label font-semibold text-base text-white active:bg-white/20 transition-colors disabled:opacity-50 mt-3"
              >
                {socialLoading ? (
                  <span className="material-symbols-outlined animate-spin text-xl">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Entrar com Apple
                  </>
                )}
              </button>}

              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-white/20" />
                <span className="font-label text-xs text-white/70">ou</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              <form onSubmit={handleSubmit}>
                <label className="font-label text-[11px] text-white/80 font-semibold uppercase tracking-wider block mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-4 py-3.5 text-white placeholder-white/40 font-body text-base outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/60 mb-4"
                />

                {error && (
                  <p className="font-label text-sm text-error-container mb-4" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-bold text-base disabled:opacity-50 transition-opacity shadow-[0_8px_24px_rgba(91,61,181,0.4)]"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-xl align-middle">
                      progress_activity
                    </span>
                  ) : (
                    'Enviar código de acesso'
                  )}
                </button>

                <p className="text-center font-label text-xs text-white/65 mt-4">
                  Enviaremos um código de acesso para seu email.
                </p>
              </form>
            </div>
          )}

        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 400ms ease-out; }
      `}</style>
    </div>
  )
}
