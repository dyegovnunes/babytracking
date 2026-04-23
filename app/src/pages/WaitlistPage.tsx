import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Data alvo do lançamento ────────────────────────────────────────────────
const LAUNCH_DATE = new Date('2026-05-31T00:00:00-03:00')
const BLOG_URL = 'https://blog.yayababy.app'

// ─── Tipos ──────────────────────────────────────────────────────────────────
type FormStatus = 'idle' | 'loading' | 'success' | 'duplicate' | 'error'

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function getTimeLeft(): TimeLeft {
  const diff = Math.max(0, LAUNCH_DATE.getTime() - Date.now())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

// ─── Componente ─────────────────────────────────────────────────────────────
export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft)

  // Countdown
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(t)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'loading') return
    setStatus('loading')

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim().toLowerCase(), source: 'waitlist_page' })

    if (!error) {
      setStatus('success')
    } else if (error.code === '23505') {
      setStatus('duplicate')
    } else {
      setStatus('error')
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0d0a27', color: '#e7e2ff', fontFamily: 'Manrope, sans-serif' }}
    >
      {/* ── Header ── */}
      <header className="flex justify-center pt-8 pb-2 px-6">
        <img src="/icon.png" alt="Yaya" className="w-10 h-10 rounded-xl opacity-90" />
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center px-6 pb-16 max-w-lg mx-auto w-full">

        {/* Badge */}
        <div className="mt-8 mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold tracking-wide uppercase"
          style={{ borderColor: '#7056e0', color: '#b79fff', background: 'rgba(112,86,224,0.12)' }}>
          <span>🚀</span> Em breve nas lojas
        </div>

        {/* Headline */}
        <h1 className="text-center font-bold leading-tight mb-4"
          style={{ fontSize: 'clamp(1.6rem, 5vw, 2.4rem)', color: '#e8e1ff' }}>
          A rotina do seu bebê,<br />
          <span style={{ color: '#b79fff' }}>com 1 toque,</span><br />
          na palma da sua mão.
        </h1>

        {/* Sub-headline */}
        <p className="text-center text-sm leading-relaxed mb-10"
          style={{ color: 'rgba(231,226,255,0.55)', maxWidth: 360 }}>
          Seja um dos primeiros pais a descobrir como dormir melhor, tomar decisões com mais
          confiança e aproveitar cada momento com o seu bebê.
        </p>

        {/* ── Countdown ── */}
        <div className="w-full mb-10">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(183,159,255,0.5)' }}>
            Lançamento em
          </p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: pad(timeLeft.days),    label: 'dias' },
              { value: pad(timeLeft.hours),   label: 'horas' },
              { value: pad(timeLeft.minutes), label: 'min' },
              { value: pad(timeLeft.seconds), label: 'seg' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col items-center py-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="font-bold tabular-nums"
                  style={{ fontSize: 'clamp(1.4rem, 5vw, 2rem)', color: '#e8e1ff', lineHeight: 1 }}>
                  {value}
                </span>
                <span className="text-[10px] mt-1.5 font-medium uppercase tracking-wider"
                  style={{ color: 'rgba(183,159,255,0.45)' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── O que você ganha ── */}
        <div className="w-full mb-10">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(183,159,255,0.5)' }}>
            Ao garantir seu lugar hoje
          </p>
          <div className="flex flex-col gap-3">
            {[
              { icon: '🎯', title: 'Acesso antecipado', desc: 'Seja o primeiro a baixar antes de todo mundo' },
              { icon: '🎁', title: '30 dias grátis de Yaya+', desc: 'Experimente todos os recursos premium sem pagar nada (R$34,90/mês)' },
              { icon: '♾️', title: '30% de desconto vitalício', desc: 'Desconto exclusivo na assinatura para sempre — só para quem entrar agora' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4 p-4 rounded-xl"
                style={{ background: 'rgba(112,86,224,0.1)', border: '1px solid rgba(112,86,224,0.2)' }}>
                <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
                <div>
                  <p className="font-bold text-sm mb-0.5" style={{ color: '#e8e1ff' }}>{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(231,226,255,0.5)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Formulário ── */}
        <div className="w-full mb-12">
          {status === 'success' ? (
            <div className="text-center animate-fade-in">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="font-bold text-xl mb-2" style={{ color: '#e8e1ff' }}>
                Você está na lista!
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'rgba(231,226,255,0.55)' }}>
                Avisaremos você no lançamento com as instruções para resgatar seus benefícios.
                Enquanto isso, confira nosso blog com dicas para os primeiros meses.
              </p>
              <a
                href={BLOG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e8e1ff' }}
              >
                Visitar o blog →
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status !== 'idle') setStatus('idle') }}
                placeholder="seu@email.com"
                required
                disabled={status === 'loading'}
                className="w-full px-4 py-3.5 rounded-xl text-base outline-none transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#e8e1ff',
                  backdropFilter: 'blur(8px)',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#7056e0'; e.target.style.boxShadow = '0 0 0 3px rgba(112,86,224,0.2)' }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.boxShadow = 'none' }}
              />

              <button
                type="submit"
                disabled={status === 'loading' || !email.trim()}
                className="w-full py-3.5 rounded-xl font-bold text-base transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #7056e0, #b79fff)',
                  color: '#fff',
                  boxShadow: '0 4px 20px rgba(112,86,224,0.35)',
                }}
              >
                {status === 'loading' ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                    Guardando seu lugar…
                  </span>
                ) : (
                  'Garantir meu lugar agora →'
                )}
              </button>

              {status === 'duplicate' && (
                <p className="text-center text-sm animate-fade-in" style={{ color: '#b79fff' }}>
                  Este email já está na lista! A gente avisa você em breve. 😊
                </p>
              )}
              {status === 'error' && (
                <p className="text-center text-sm animate-fade-in" style={{ color: '#ff6e84' }}>
                  Algo deu errado. Tente novamente em instantes.
                </p>
              )}

              <p className="text-center text-xs" style={{ color: 'rgba(231,226,255,0.3)' }}>
                Sem spam. Cancelar quando quiser.
              </p>
            </form>
          )}
        </div>

        {/* ── Valores entregues ── */}
        <div className="w-full mb-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'rgba(183,159,255,0.5)' }}>
            O que você vai sentir
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🌙', title: 'Noites mais tranquilas', desc: 'Quando você entende o padrão de sono do bebê' },
              { icon: '💆', title: 'Menos ansiedade', desc: 'Decisões com dados reais, não no chute' },
              { icon: '👨‍👩‍👧', title: 'Toda a equipe sincronizada', desc: 'Pai, mãe, avós e babá na mesma página' },
              { icon: '📖', title: 'Memórias organizadas', desc: 'Os primeiros meses registrados para sempre' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="p-4 rounded-xl flex flex-col gap-1.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="text-2xl">{icon}</span>
                <p className="font-bold text-sm" style={{ color: '#e8e1ff' }}>{title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(231,226,255,0.45)' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-6 px-6 text-xs"
        style={{ color: 'rgba(231,226,255,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        © {new Date().getFullYear()} Yaya · {' '}
        <a href="/privacy" className="hover:opacity-70 transition-opacity underline underline-offset-2">
          Privacidade
        </a>
      </footer>
    </div>
  )
}
