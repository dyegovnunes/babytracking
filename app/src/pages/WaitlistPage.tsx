/**
 * WaitlistPage — /waitlist
 *
 * Página de pré-lançamento portada do design Lovable.
 * Standalone: não usa AppShell nem ThemeContext.
 * CSS próprio injetado via <style> para não conflitar com globals.css do app.
 */

import { useState, useEffect, useRef, useCallback, type ReactNode, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constantes ──────────────────────────────────────────────────────────────
const LAUNCH_DATE = new Date('2026-05-31T00:00:00-03:00').getTime()
const BLOG_URL = 'https://blog.yayababy.app'

// ─── Tipos ───────────────────────────────────────────────────────────────────
type FormState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'duplicate' }
  | { kind: 'success' }

// ─── CSS injetado ─────────────────────────────────────────────────────────────
const WAITLIST_CSS = `
  .wl-root {
    font-family: 'Manrope', system-ui, -apple-system, sans-serif;
    color: hsl(250 100% 96%);
    background: hsl(245 56% 9%);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  .wl-glass        { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.10); backdrop-filter: blur(20px); }
  .wl-glass-strong { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(20px); }
  .wl-eyebrow      { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.22em; color: hsl(254 100% 81% / 0.4); font-weight: 600; }
  .wl-gradient-text {
    background: linear-gradient(135deg, hsl(251 70% 61%), hsl(254 100% 81%));
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }

  /* Aurora */
  .wl-aurora-bg {
    --wl-aurora: repeating-linear-gradient(
      100deg,
      hsl(251 70% 61%) 10%, hsl(254 100% 81%) 15%,
      hsl(245 56% 9%) 20%, hsl(254 100% 90%) 25%, hsl(251 70% 61%) 30%
    );
    --wl-dark: repeating-linear-gradient(
      100deg,
      hsl(245 56% 9%) 0%, hsl(245 56% 9%) 7%,
      transparent 10%, transparent 12%, hsl(245 56% 9%) 16%
    );
  }
  .wl-aurora-layer {
    background-image: var(--wl-dark), var(--wl-aurora);
    background-size: 300%, 200%;
    background-position: 50% 50%, 50% 50%;
    filter: blur(10px);
    mix-blend-mode: difference;
  }
  .wl-aurora-layer::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: var(--wl-dark), var(--wl-aurora);
    background-size: 200%, 100%;
    background-attachment: fixed;
    mix-blend-mode: difference;
    animation: wl-aurora 60s linear infinite;
  }
  .wl-aurora-mask {
    mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
  }
  @keyframes wl-aurora {
    0%   { background-position: 50% 50%, 50% 50%; }
    100% { background-position: 350% 50%, 350% 50%; }
  }

  /* Fade-in-up */
  @keyframes wl-fade-in-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .wl-fade { animation: wl-fade-in-up 0.5s ease both; }
  .wl-delay-1 { animation-delay: 100ms; }
  .wl-delay-2 { animation-delay: 200ms; }
  .wl-delay-3 { animation-delay: 350ms; }
  .wl-delay-4 { animation-delay: 450ms; }

  /* Hero layout responsivo */
  .wl-hero {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: center;
    padding-top: 2.5rem;
    padding-bottom: 2.5rem;
  }
  .wl-hero-text  { order: 1; width: 100%; }
  .wl-hero-mockup { order: 2; width: 100%; display: flex; justify-content: center; align-items: center; position: relative; }
  .wl-hero-mockup img { max-height: 380px; width: auto; object-fit: contain; filter: drop-shadow(0 24px 48px rgba(0,0,0,0.5)); }

  @media (min-width: 768px) {
    .wl-hero {
      flex-direction: row;
      align-items: center;
      padding-top: 5rem;
      padding-bottom: 3rem;
    }
    .wl-hero-text   { order: 2; flex: 1; }
    .wl-hero-mockup { order: 1; flex: 1; }
    .wl-hero-mockup img { max-height: 600px; }
  }

  /* Benefit card border-left accent */
  .wl-benefit-card {
    position: relative;
    background: hsl(251 70% 61% / 0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 1rem;
    padding: 1.5rem 1.5rem 1.5rem 1.75rem;
    overflow: hidden;
    transition: background 0.2s;
  }
  .wl-benefit-card:hover { background: rgba(255,255,255,0.07); }
  .wl-benefit-card::before {
    content: "";
    position: absolute;
    left: 0; top: 1rem; bottom: 1rem;
    width: 3px;
    border-radius: 0 4px 4px 0;
    background: hsl(251 70% 61%);
  }

  /* Value card */
  .wl-value-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 1rem;
    padding: 1.5rem;
    transition: background 0.2s, transform 0.2s;
  }
  .wl-value-card:hover { background: rgba(255,255,255,0.07); transform: translateY(-2px); }

  /* CTA button */
  .wl-btn-cta {
    width: 100%;
    border-radius: 1rem;
    padding: 1rem 1.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
    border: none;
    cursor: pointer;
    transition: transform 0.15s, opacity 0.15s;
    background: linear-gradient(135deg, hsl(330 95% 62%) 0%, hsl(280 95% 65%) 50%, hsl(254 100% 75%) 100%);
    box-shadow: 0 12px 40px -8px hsl(320 95% 60% / 0.65), 0 0 0 1px hsl(320 100% 80% / 0.3) inset;
  }
  .wl-btn-cta:hover:not(:disabled) { transform: scale(1.02); }
  .wl-btn-cta:active:not(:disabled) { transform: scale(0.99); }
  .wl-btn-cta:disabled { opacity: 0.7; cursor: not-allowed; }

  /* Input */
  .wl-input-wrap {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.15);
    border-radius: 1rem;
    box-shadow: 0 0 0 0 transparent;
    transition: box-shadow 0.2s, border-color 0.2s;
  }
  .wl-input-wrap:focus-within {
    border-color: hsl(251 70% 61%);
    box-shadow: 0 0 0 3px hsl(251 70% 61% / 0.2);
  }
  .wl-input {
    width: 100%;
    background: transparent;
    border: none;
    outline: none;
    padding: 1rem 1.25rem;
    font-size: 1rem;
    font-family: inherit;
    color: hsl(250 100% 96%);
    border-radius: 1rem;
  }
  .wl-input::placeholder { color: hsl(250 30% 70%); }
  .wl-input:disabled { opacity: 0.6; }

  /* Glow badge */
  .wl-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 1rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    color: hsl(250 100% 95%);
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.12);
    backdrop-filter: blur(10px);
  }

  /* Countdown card */
  .wl-cd-card {
    display: flex; flex-direction: column; align-items: center;
    padding: 1.25rem 0.5rem;
    border-radius: 1rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    transition: transform 0.2s;
  }
  .wl-cd-card:hover { transform: scale(1.02); }
  .wl-cd-num {
    font-size: clamp(1.6rem, 5vw, 2.6rem);
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    color: hsl(250 100% 96%);
  }
  .wl-cd-label {
    margin-top: 0.4rem;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: hsl(254 100% 81% / 0.45);
    font-weight: 600;
  }

  /* Blog button */
  .wl-btn-blog {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.75rem 1.5rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #fff;
    text-decoration: none;
    background: linear-gradient(135deg, hsl(251 70% 61%), hsl(254 100% 81%));
    transition: opacity 0.2s;
  }
  .wl-btn-blog:hover { opacity: 0.85; }
`

// ─── Componente: GlowCard ────────────────────────────────────────────────────
interface GlowCardProps {
  children: ReactNode
  className?: string
  pill?: boolean
  groupSelector?: string
  style?: React.CSSProperties
}

function GlowCard({ children, className = '', pill = false, groupSelector, style }: GlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const tracker = groupSelector ? (el.closest(groupSelector) as HTMLElement | null) : el
    const source = tracker ?? el

    const sync = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      el.style.setProperty('--x', String((e.clientX - rect.left).toFixed(2)))
      el.style.setProperty('--y', String((e.clientY - rect.top).toFixed(2)))
      el.style.setProperty('--xp', String(rect.width ? ((e.clientX - rect.left) / rect.width).toFixed(2) : '0.5'))
      el.style.setProperty('--yp', String(rect.height ? ((e.clientY - rect.top) / rect.height).toFixed(2) : '0.5'))
    }
    const reset = () => {
      el.style.setProperty('--x', '-9999'); el.style.setProperty('--y', '-9999')
      el.style.setProperty('--xp', '0.5'); el.style.setProperty('--yp', '0.5')
    }

    reset()
    source.addEventListener('pointermove', sync)
    source.addEventListener('pointerleave', reset)
    return () => { source.removeEventListener('pointermove', sync); source.removeEventListener('pointerleave', reset) }
  }, [groupSelector])

  const glowStyle: React.CSSProperties & Record<string, string | number> = {
    '--base': 268, '--spread': 0, '--radius': pill ? 999 : 16,
    '--border': 1.5, '--backdrop': 'hsl(0 0% 60% / 0.08)',
    '--backup-border': 'var(--backdrop)', '--size': 200, '--outer': 1,
    '--border-size': 'calc(var(--border, 2) * 1px)',
    '--spotlight-size': 'calc(var(--size, 150) * 1px)',
    '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
    backgroundImage: `radial-gradient(var(--spotlight-size) var(--spotlight-size) at calc(var(--x,0)*1px) calc(var(--y,0)*1px), hsl(var(--hue,268) 100% 70% / 0.1), transparent)`,
    backgroundColor: 'var(--backdrop, transparent)',
    backgroundSize: 'calc(100% + 2*var(--border-size)) calc(100% + 2*var(--border-size))',
    backgroundPosition: '50% 50%',
    border: 'var(--border-size) solid var(--backup-border)',
    position: 'relative', touchAction: 'none',
    borderRadius: pill ? '9999px' : '1rem',
    backdropFilter: 'blur(10px)',
    ...style,
  }

  const pseudo = `
    [data-wl-glow]::before,[data-wl-glow]::after{pointer-events:none;content:"";position:absolute;inset:calc(var(--border-size)*-1);border:var(--border-size) solid transparent;border-radius:calc(var(--radius)*1px);background-size:calc(100% + 2*var(--border-size)) calc(100% + 2*var(--border-size));background-repeat:no-repeat;background-position:50% 50%;mask:linear-gradient(transparent,transparent),linear-gradient(white,white);mask-clip:padding-box,border-box;mask-composite:intersect}
    [data-wl-glow]::before{background-image:radial-gradient(calc(var(--spotlight-size)*0.75) calc(var(--spotlight-size)*0.75) at calc(var(--x,0)*1px) calc(var(--y,0)*1px),hsl(var(--hue,268) 100% 50%/1),transparent);filter:brightness(2)}
    [data-wl-glow]::after{background-image:radial-gradient(calc(var(--spotlight-size)*0.5) calc(var(--spotlight-size)*0.5) at calc(var(--x,0)*1px) calc(var(--y,0)*1px),hsl(0 100% 100%/1),transparent)}
    [data-wl-glow]>[data-wl-glow]{position:absolute;inset:0;opacity:var(--outer,1);border-radius:calc(var(--radius)*1px);border-width:calc(var(--border-size)*20);filter:blur(calc(var(--border-size)*10));background:none;pointer-events:none;border:none}
    [data-wl-glow]>[data-wl-glow]::before{inset:-10px;border-width:10px}
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pseudo }} />
      <div ref={cardRef} data-wl-glow style={glowStyle} className={className}>
        <div data-wl-glow />
        {children}
      </div>
    </>
  )
}

// ─── Componente: AuroraBackground ────────────────────────────────────────────
function AuroraBackground() {
  return (
    <div className="wl-aurora-bg" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="wl-aurora-layer wl-aurora-mask"
        style={{ position: 'absolute', inset: '-10px', opacity: 0.5, willChange: 'transform' }}
      />
    </div>
  )
}

// ─── Componente: Countdown ───────────────────────────────────────────────────
function Countdown() {
  const getParts = useCallback(() => {
    const diff = Math.max(0, LAUNCH_DATE - Date.now())
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    }
  }, [])

  const [t, setT] = useState(getParts)

  useEffect(() => {
    const id = setInterval(() => setT(getParts()), 1000)
    return () => clearInterval(id)
  }, [getParts])

  const pad = (n: number) => n.toString().padStart(2, '0')
  const items = [
    { label: 'Dias', value: pad(t.days) },
    { label: 'Horas', value: pad(t.hours) },
    { label: 'Min', value: pad(t.minutes) },
    { label: 'Seg', value: pad(t.seconds) },
  ]

  return (
    <div>
      <p className="wl-eyebrow" style={{ textAlign: 'center', marginBottom: '1.25rem' }}>Lançamento em</p>
      <div data-glow-group style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
        {items.map((item) => (
          <GlowCard key={item.label} groupSelector="[data-glow-group]"
            style={{ padding: '1.25rem 0.5rem', textAlign: 'center', cursor: 'default' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="wl-cd-num">{item.value}</div>
              <div className="wl-cd-label">{item.label}</div>
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  )
}

// ─── Componente: WaitlistForm ────────────────────────────────────────────────
function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>({ kind: 'idle' })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim().toLowerCase()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setState({ kind: 'error', message: 'Digite um email válido.' })
      return
    }
    setState({ kind: 'loading' })

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: trimmed, source: 'waitlist_page' })

    if (!error) { setState({ kind: 'success' }); return }
    if ((error as { code?: string }).code === '23505') { setState({ kind: 'duplicate' }); return }
    setState({ kind: 'error', message: 'Algo deu errado. Tente novamente em instantes.' })
  }

  if (state.kind === 'success') {
    return (
      <div className="wl-glass-strong wl-fade" style={{ borderRadius: '1.5rem', padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'hsl(250 100% 96%)' }}>
          Você está na lista!
        </h3>
        <p style={{ color: 'hsl(250 30% 70%)', marginBottom: '1.5rem', maxWidth: 360, margin: '0 auto 1.5rem' }}>
          A gente avisa você assim que o Yaya chegar nas lojas. Enquanto isso,
          confira nossas dicas para novos pais.
        </p>
        <a href={BLOG_URL} target="_blank" rel="noopener noreferrer" className="wl-btn-blog">
          Ler o blog →
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <GlowCard style={{ padding: 0, border: 'none' }}>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (state.kind !== 'idle') setState({ kind: 'idle' }) }}
            disabled={state.kind === 'loading'}
            className="wl-input"
            style={{ position: 'relative', zIndex: 1 }}
          />
        </GlowCard>
        <button type="submit" disabled={state.kind === 'loading'} className="wl-btn-cta">
          {state.kind === 'loading' ? 'Garantindo...' : 'Garantir meu lugar agora →'}
        </button>
      </div>

      <div style={{ marginTop: '0.75rem', minHeight: '1.25rem', textAlign: 'center', fontSize: '0.75rem' }}>
        {(state.kind === 'idle' || state.kind === 'loading') && (
          <p style={{ color: 'hsl(250 30% 70%)' }}>Sem spam. Cancelar quando quiser.</p>
        )}
        {state.kind === 'duplicate' && (
          <p style={{ color: 'hsl(254 100% 81%)' }}>
            Este email já está na lista! A gente avisa você em breve. 😊
          </p>
        )}
        {state.kind === 'error' && (
          <p style={{ color: 'hsl(0 75% 60%)' }}>{state.message}</p>
        )}
      </div>
    </form>
  )
}

// ─── Dados ───────────────────────────────────────────────────────────────────
const BENEFITS = [
  { icon: '🎯', title: 'Acesso antecipado', desc: 'Seja o primeiro a baixar antes de todo mundo.' },
  { icon: '🎁', title: '30 dias grátis de Yaya+', desc: 'Experimente todos os recursos premium sem pagar nada (R$34,90/mês).' },
  { icon: '♾️', title: '30% de desconto vitalício', desc: 'Exclusivo para quem entrar agora.' },
]

const VALUES = [
  { icon: '🌙', title: 'Noites mais tranquilas', desc: 'Quando você entende o padrão de sono do bebê.' },
  { icon: '💆', title: 'Menos ansiedade', desc: 'Decisões com dados reais, não no chute.' },
  { icon: '👨‍👩‍👧', title: 'Toda a equipe sincronizada', desc: 'Pai, mãe, avós e babá na mesma página.' },
  { icon: '📖', title: 'Memórias organizadas', desc: 'Os primeiros meses registrados para sempre.' },
]

// ─── Página principal ────────────────────────────────────────────────────────
export default function WaitlistPage() {
  // Injetar CSS isolado uma única vez
  useEffect(() => {
    const id = 'wl-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = WAITLIST_CSS
    document.head.appendChild(el)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  return (
    <div className="wl-root" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Aurora de fundo */}
      <AuroraBackground />

      {/* Glow extra no quadrante inferior direito */}
      <div aria-hidden style={{
        position: 'absolute', top: '120vh', right: '-10rem',
        width: 500, height: 500, borderRadius: '50%',
        opacity: 0.2, filter: 'blur(80px)',
        background: 'hsl(251 70% 61% / 0.3)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '72rem', margin: '0 auto', padding: '0 1.25rem' }}>

        {/* ── NAV TOPO ── */}
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo-symbol-pink.png" style={{ width: 28, height: 28 }} alt="" aria-hidden />
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'hsl(250 100% 96%)' }}>
              Ya<span style={{ color: 'hsl(254 100% 81%)' }}>ya</span>
            </span>
          </div>
          <a href="https://blog.yayababy.app" target="_blank" rel="noopener noreferrer"
            style={{
              fontSize: '0.875rem', fontWeight: 600, color: 'hsl(250 100% 95% / 0.7)',
              textDecoration: 'none', padding: '0.5rem 1rem',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: '2rem',
              backdropFilter: 'blur(10px)', background: 'rgba(255,255,255,0.04)',
            }}
          >Blog →</a>
        </nav>

        {/* ── HERO ── */}
        <section className="wl-hero">
          {/* Mockup */}
          <div className="wl-hero-mockup wl-fade wl-delay-3">
            <div aria-hidden style={{
              position: 'absolute', inset: 0, zIndex: -1, borderRadius: '50%',
              background: 'radial-gradient(circle, hsl(268 85% 60% / 0.55) 0%, hsl(268 80% 55% / 0.22) 45%, transparent 75%)',
              filter: 'blur(40px)', opacity: 0.6,
            }} />
            <img
              src="/yaya-mockup.png"
              alt="App Yaya mostrando rotina do bebê"
              loading="eager"
            />
          </div>

          {/* Texto */}
          <div className="wl-hero-text" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            {/* Logo + nome */}
            <div className="wl-fade" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <img src="/logo-symbol-pink.png" alt="Yaya"
                style={{ width: 56, height: 56, borderRadius: '0.875rem', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'hsl(250 100% 96%)' }}>
                Ya<span style={{ color: 'hsl(254 100% 81%)' }}>ya</span>
              </span>
            </div>

            <div className="wl-fade wl-delay-1" style={{ marginBottom: '1.25rem' }}>
              <GlowCard pill style={{ padding: '0.375rem 1rem', cursor: 'default' }}>
                <span style={{ position: 'relative', zIndex: 1, fontSize: '0.75rem', color: 'hsl(250 100% 95%)' }}>
                  🚀 Em breve nas lojas
                </span>
              </GlowCard>
            </div>

            <h1 className="wl-fade wl-delay-2" style={{
              fontSize: 'clamp(2rem, 5vw, 3.4rem)',
              fontWeight: 700, lineHeight: 1.05,
              letterSpacing: '-0.02em', marginBottom: '1.25rem',
            }}>
              <span style={{ display: 'block' }}>A rotina do seu bebê,</span>
              <span className="wl-gradient-text" style={{ display: 'block' }}>com 1 toque,</span>
              <span style={{ display: 'block' }}>na palma da sua mão.</span>
            </h1>

            <p className="wl-fade wl-delay-3" style={{
              fontSize: '1rem', lineHeight: 1.7,
              color: 'hsl(250 30% 70%)', maxWidth: 480, marginBottom: '2rem',
            }}>
              Seja um dos primeiros pais a descobrir como dormir melhor, tomar
              decisões com mais confiança e aproveitar cada momento com o seu bebê.
            </p>

            <div className="wl-fade wl-delay-4" style={{ width: '100%' }}>
              <Countdown />
            </div>
          </div>
        </section>

        {/* ── FORM ── */}
        <section style={{ paddingTop: '1rem', paddingBottom: '3rem', maxWidth: '48rem', margin: '0 auto' }}>
          <p className="wl-eyebrow" style={{ textAlign: 'center', marginBottom: '1rem' }}>Lista de espera</p>
          <h2 style={{
            fontSize: 'clamp(1.4rem, 3vw, 1.875rem)', fontWeight: 700,
            textAlign: 'center', marginBottom: '1.5rem', lineHeight: 1.3,
          }}>
            Garanta seu lugar e seus benefícios.
          </h2>
          <WaitlistForm />
        </section>

        {/* ── BENEFITS ── */}
        <section style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: '48rem', margin: '0 auto' }}>
          <p className="wl-eyebrow" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Ao garantir seu lugar hoje</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '1rem' }}>
            {BENEFITS.map((b) => (
              <div key={b.title} className="wl-benefit-card">
                <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{b.icon}</div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.375rem', color: 'hsl(250 100% 96%)' }}>{b.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'hsl(250 30% 70%)', lineHeight: 1.6 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── VALUES ── */}
        <section style={{ paddingTop: '2rem', paddingBottom: '3rem', maxWidth: '48rem', margin: '0 auto' }}>
          <p className="wl-eyebrow" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>O que você vai sentir</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
            {VALUES.map((v) => (
              <div key={v.title} className="wl-value-card">
                <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{v.icon}</div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.375rem', color: 'hsl(250 100% 96%)' }}>{v.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'hsl(250 30% 70%)', lineHeight: 1.6 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          paddingTop: '1.5rem', paddingBottom: '2rem',
          textAlign: 'center', fontSize: '0.75rem',
          color: 'hsl(250 30% 50%)',
        }}>
          © {new Date().getFullYear()} Yaya ·{' '}
          <a href="/privacy" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            Privacidade
          </a>
        </footer>
      </div>
    </div>
  )
}
