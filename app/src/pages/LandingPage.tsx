/**
 * LandingPage — yayababy.app/
 *
 * Página de vendas do app Yaya.
 * Standalone: não usa AppShell nem ThemeContext.
 * CSS isolado via <style> tag — mesmo padrão de WaitlistPage.tsx.
 * Sem dependência de Tailwind ou CSS variables do tema.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── CSS injetado ─────────────────────────────────────────────────────────────
const LANDING_CSS = `
  .lp-root {
    font-family: 'Manrope', system-ui, -apple-system, sans-serif;
    color: hsl(250 100% 96%);
    background: hsl(245 56% 9%);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }
  .lp-glass {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.10);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  .lp-eyebrow {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.22em;
    color: hsl(254 100% 81% / 0.4);
    font-weight: 700;
    margin: 0 0 0.75rem;
  }
  .lp-gradient-text {
    background: linear-gradient(135deg, hsl(251 70% 61%), hsl(254 100% 81%));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  /* Aurora */
  .lp-aurora-bg {
    --lp-aurora: repeating-linear-gradient(
      100deg,
      hsl(251 70% 61%) 10%, hsl(254 100% 81%) 15%,
      hsl(245 56% 9%) 20%, hsl(254 100% 90%) 25%, hsl(251 70% 61%) 30%
    );
    --lp-dark: repeating-linear-gradient(
      100deg,
      hsl(245 56% 9%) 0%, hsl(245 56% 9%) 7%,
      transparent 10%, transparent 12%, hsl(245 56% 9%) 16%
    );
  }
  .lp-aurora-layer {
    background-image: var(--lp-dark), var(--lp-aurora);
    background-size: 300%, 200%;
    background-position: 50% 50%, 50% 50%;
    filter: blur(10px);
    mix-blend-mode: difference;
  }
  .lp-aurora-layer::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: var(--lp-dark), var(--lp-aurora);
    background-size: 200%, 100%;
    background-attachment: fixed;
    mix-blend-mode: difference;
    animation: lp-aurora 60s linear infinite;
  }
  .lp-aurora-mask {
    mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at 100% 0%, black 10%, transparent 70%);
  }
  @keyframes lp-aurora {
    0%   { background-position: 50% 50%, 50% 50%; }
    100% { background-position: 350% 50%, 350% 50%; }
  }

  /* Fade-in-up */
  @keyframes lp-fade-in-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .lp-fade    { animation: lp-fade-in-up 0.5s ease both; }
  .lp-d1 { animation-delay: 80ms; }
  .lp-d2 { animation-delay: 180ms; }
  .lp-d3 { animation-delay: 300ms; }
  .lp-d4 { animation-delay: 420ms; }

  /* Hero layout */
  .lp-hero {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    align-items: center;
    padding-top: 2.5rem;
    padding-bottom: 2.5rem;
  }
  .lp-hero-text   { order: 2; width: 100%; }
  .lp-hero-mockup {
    order: 1; width: 100%;
    display: flex; justify-content: center; align-items: center;
    position: relative;
  }
  .lp-hero-mockup img {
    max-height: 360px; width: auto; object-fit: contain;
    filter: drop-shadow(0 24px 48px rgba(0,0,0,0.5));
  }
  @media (min-width: 768px) {
    .lp-hero { flex-direction: row; align-items: center; padding-top: 5rem; padding-bottom: 3rem; }
    .lp-hero-text   { order: 2; flex: 1; }
    .lp-hero-mockup { order: 1; flex: 1; }
    .lp-hero-mockup img { max-height: 580px; }
  }

  /* Store buttons */
  .lp-btn-store {
    display: inline-flex; align-items: center; gap: 0.75rem;
    padding: 0.6875rem 1.125rem; border-radius: 0.875rem;
    background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
    color: hsl(250 100% 96%); text-decoration: none;
    transition: background 0.2s, border-color 0.2s;
  }
  .lp-btn-store:hover { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.22); }

  /* Feature card */
  .lp-feature-card {
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
    border-radius: 1rem; padding: 1.375rem;
    transition: background 0.2s, border-color 0.2s;
  }
  .lp-feature-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(183,159,255,0.2); }

  /* Primary button */
  .lp-btn-primary {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.875rem 1.75rem; border-radius: 0.875rem;
    font-size: 0.9375rem; font-weight: 700; font-family: inherit;
    color: #fff; border: none; cursor: pointer; text-decoration: none;
    transition: opacity 0.2s, transform 0.15s;
    background: linear-gradient(135deg, hsl(330 95% 62%) 0%, hsl(280 95% 65%) 50%, hsl(254 100% 75%) 100%);
    box-shadow: 0 8px 32px -4px hsl(320 95% 60% / 0.5);
  }
  .lp-btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }

  /* Outline button */
  .lp-btn-outline {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.875rem 1.75rem; border-radius: 0.875rem;
    font-size: 0.9375rem; font-weight: 700; font-family: inherit;
    color: hsl(254 100% 81%); border: 1px solid hsl(254 100% 81% / 0.3);
    background: transparent; cursor: pointer; text-decoration: none;
    transition: background 0.2s, border-color 0.2s;
  }
  .lp-btn-outline:hover { background: hsl(254 100% 81% / 0.08); border-color: hsl(254 100% 81% / 0.5); }

  /* Sticky nav */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    background: rgba(13,10,39,0.88);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    transition: transform 0.4s ease, opacity 0.4s ease;
  }
  .lp-nav-hidden  { transform: translateY(-100%); opacity: 0; pointer-events: none; }
  .lp-nav-visible { transform: translateY(0); opacity: 1; }

  /* Trust items */
  .lp-trust-item {
    display: flex; align-items: center; gap: 0.375rem;
    font-size: 0.8125rem; color: hsl(250 30% 70%); white-space: nowrap;
  }

  /* Pricing plan card */
  .lp-plan-button {
    width: 100%; padding: 0.8125rem 1.25rem; border-radius: 0.75rem;
    border: none; font-size: 0.875rem; font-weight: 700; font-family: inherit;
    cursor: pointer; transition: opacity 0.2s; box-sizing: border-box;
  }
  .lp-plan-button:disabled { cursor: default; }
`

// ─── AuroraBackground ────────────────────────────────────────────────────────
function AuroraBackground() {
  return (
    <div className="lp-aurora-bg" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div className="lp-aurora-layer lp-aurora-mask"
        style={{ position: 'absolute', inset: '-10px', opacity: 0.5, willChange: 'transform' }}
      />
    </div>
  )
}

// ─── StickyNav ───────────────────────────────────────────────────────────────
function StickyNav({ isMobile }: { isMobile: boolean }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.45)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`lp-nav ${visible ? 'lp-nav-visible' : 'lp-nav-hidden'}`}>
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1.25rem', height: '3.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo-symbol-pink.png" style={{ width: 26, height: 26 }} alt="" aria-hidden />
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'hsl(250 100% 96%)' }}>
            Ya<span style={{ color: 'hsl(254 100% 81%)' }}>ya</span>
          </span>
        </div>
        {isMobile ? (
          <a href="https://apps.apple.com/app/yaya-baby" className="lp-btn-primary" style={{ padding: '0.5rem 1.125rem', fontSize: '0.8125rem' }}>
            Baixar grátis
          </a>
        ) : (
          <a href="#planos" className="lp-btn-outline" style={{ padding: '0.5rem 1.125rem', fontSize: '0.8125rem' }}>
            Ver planos
          </a>
        )}
      </div>
    </nav>
  )
}

// ─── SuccessBanner ───────────────────────────────────────────────────────────
function SuccessBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', background: 'linear-gradient(135deg, #1e1652 0%, #2a1a5e 100%)', borderBottom: '1px solid rgba(183,159,255,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>🎉</span>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.875rem', margin: 0, color: 'hsl(250 100% 96%)' }}>Plano ativado com sucesso!</p>
          <p style={{ color: 'hsl(250 30% 70%)', fontSize: '0.75rem', margin: 0 }}>Bem-vindo ao Yaya+. Baixe o app para começar.</p>
        </div>
      </div>
      <button onClick={onDismiss} style={{ color: 'hsl(250 30% 70%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1, padding: '0.25rem' }} aria-label="Fechar">✕</button>
    </div>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────────────
function Hero({ isMobile }: { isMobile: boolean }) {
  return (
    <section className="lp-hero">
      {/* Mockup */}
      <div className="lp-hero-mockup lp-fade lp-d3">
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: -1, borderRadius: '50%', background: 'radial-gradient(circle, hsl(268 85% 60% / 0.55) 0%, hsl(268 80% 55% / 0.22) 45%, transparent 75%)', filter: 'blur(40px)', opacity: 0.6 }} />
        <img src="/yaya-mockup.png" alt="App Yaya mostrando rotina do bebê" loading="eager" />
      </div>

      {/* Copy */}
      <div className="lp-hero-text">
        {/* Logo + nome */}
        <div className="lp-fade" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <img src="/logo-symbol-pink.png" alt="Yaya" style={{ width: 52, height: 52, borderRadius: '0.875rem', objectFit: 'contain' }} />
          <span style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'hsl(250 100% 96%)' }}>
            Ya<span style={{ color: 'hsl(254 100% 81%)' }}>ya</span>
          </span>
        </div>

        {/* H1 */}
        <h1 className="lp-fade lp-d1" style={{ fontSize: 'clamp(1.875rem, 5vw, 3.25rem)', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: '1.25rem' }}>
          <span style={{ display: 'block' }}>A rotina do seu bebê,</span>
          <span className="lp-gradient-text" style={{ display: 'block' }}>com 1 toque,</span>
          <span style={{ display: 'block' }}>na palma da sua mão.</span>
        </h1>

        {/* Subtítulo */}
        <p className="lp-fade lp-d2" style={{ fontSize: '1rem', lineHeight: 1.7, color: 'hsl(250 30% 70%)', maxWidth: 480, marginBottom: '2rem' }}>
          Registre alimentações, fraldas, sono e mais em segundos.
          Insights inteligentes e família sempre sincronizada.
        </p>

        {/* CTAs de loja */}
        <div className="lp-fade lp-d3" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <a href="https://apps.apple.com/app/yaya-baby" className="lp-btn-store" {...(isMobile ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
            <AppleIcon />
            <div>
              <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Disponível na</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2 }}>App Store</div>
            </div>
          </a>
          <a href="https://play.google.com/store/apps/details?id=app.yayababy" className="lp-btn-store" {...(isMobile ? {} : { target: '_blank', rel: 'noopener noreferrer' })}>
            <PlayIcon />
            <div>
              <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Disponível no</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2 }}>Google Play</div>
            </div>
          </a>
          {!isMobile && (
            <a href="#planos" style={{ fontSize: '0.875rem', color: 'hsl(254 100% 81% / 0.6)', textDecoration: 'underline', textUnderlineOffset: '4px', transition: 'color 0.2s' }}>
              Ver planos Yaya+ →
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── TrustBar ────────────────────────────────────────────────────────────────
const TRUST_ITEMS = ['Grátis para começar', 'iOS e Android', 'Família sincronizada', 'Insights inteligentes']

function TrustBar() {
  return (
    <div style={{ margin: '0 -1.25rem', padding: '0.875rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '1rem 2.5rem' }}>
        {TRUST_ITEMS.map((item) => (
          <div key={item} className="lp-trust-item">
            <span style={{ color: 'hsl(254 100% 81%)', fontWeight: 700, fontSize: '0.75rem' }}>✓</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Problem ─────────────────────────────────────────────────────────────────
function Problem() {
  return (
    <section style={{ padding: '4rem 0', maxWidth: '38rem', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 700, lineHeight: 1.3, marginBottom: '2rem' }}>
        Lembrar cada alimentação, cada fralda, cada soneca...{' '}
        <span className="lp-gradient-text">é impossível fazer isso de cabeça.</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem', fontSize: '1rem', lineHeight: 1.75, color: 'hsl(250 30% 70%)' }}>
        <p style={{ margin: 0 }}>São 4 da manhã. Seu bebê está chorando. Você sabe que alimentou, mas faz quanto tempo? O cansaço embaralhou tudo.</p>
        <p style={{ margin: 0 }}>Você tentou papel, planilha, notas no celular. Nada funcionou por mais de dois dias.</p>
        <p style={{ margin: 0, color: 'hsl(250 100% 96%)', fontWeight: 600, fontSize: '1.0625rem' }}>O Yaya foi criado exatamente para esse momento.</p>
      </div>
    </section>
  )
}

// ─── Features ────────────────────────────────────────────────────────────────
const FEATURES = [
  { emoji: '🤱', title: 'Amamentação', desc: 'Cronometre cada sessão, esquerda e direita. Sempre saiba o último lado usado.' },
  { emoji: '💧', title: 'Fraldas', desc: 'Xixi, cocô ou os dois. Registre em menos de um segundo.' },
  { emoji: '🌙', title: 'Sono', desc: 'Timer automático. Veja quantas horas o bebê dormiu de verdade.' },
  { emoji: '🛁', title: 'Banho e cuidados', desc: 'Horários agendados com lembrete 15 minutos antes.' },
  { emoji: '👨‍👩‍👧', title: 'Multi-cuidador', desc: 'Compartilhe com parceiro, avós ou babá. Todo mundo sincronizado em tempo real.' },
  { emoji: '🩺', title: 'Relatório pediatra', desc: 'Relatório completo para levar na consulta. Seu pediatra vai agradecer.' },
]

function Features() {
  return (
    <section id="features" style={{ padding: '4rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p className="lp-eyebrow">Funcionalidades</p>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, margin: 0 }}>
          Tudo que pais de recém-nascido{' '}
          <span className="lp-gradient-text">realmente precisam.</span>
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.875rem' }}>
        {FEATURES.map((f) => (
          <div key={f.title} className="lp-feature-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{f.emoji}</div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'hsl(250 100% 96%)', marginBottom: '0.375rem' }}>{f.title}</h3>
            <p style={{ fontSize: '0.875rem', color: 'hsl(250 30% 70%)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
const PLANS = [
  { id: 'monthly',  name: 'Mensal',   price: 'R$ 34,90',  period: '/mês',   note: 'Cancele quando quiser',              highlight: false, badge: null,           includesLibrary: false },
  { id: 'annual',   name: 'Anual',    price: 'R$ 249,90', period: '/ano',   note: '≈ R$ 20,83/mês · economize 40%',    highlight: true,  badge: 'Mais popular',  includesLibrary: true  },
  { id: 'lifetime', name: 'Vitalício', price: 'R$ 449,90', period: 'único', note: 'Pague uma vez, acesse para sempre',  highlight: false, badge: null,           includesLibrary: true  },
]
const PLAN_FEATURES = ['Registros ilimitados', 'Histórico completo', 'Múltiplos bebês', 'Insights com IA', 'Família conectada', 'Relatório para pediatra']

function Pricing() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleCheckout(planId: string) {
    setLoading(planId)
    setError('')
    try {
      const origin = window.location.origin
      const { data, error: fnErr } = await supabase.functions.invoke(
        'stripe-create-subscription-session',
        { body: { plan: planId, success_url: `${origin}/?plano_ativado=1`, cancel_url: `${origin}/#planos` } }
      )
      if (fnErr || !data?.url) throw new Error(fnErr?.message || 'Não foi possível iniciar o pagamento.')
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message)
      setLoading(null)
    }
  }

  return (
    <section id="planos" style={{ padding: '4rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p className="lp-eyebrow">Planos Yaya+</p>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: '0.75rem' }}>
          Comece grátis.{' '}
          <span className="lp-gradient-text">Evolua quando quiser.</span>
        </h2>
        <p style={{ color: 'hsl(250 30% 70%)', fontSize: '0.9375rem', maxWidth: '36rem', margin: '0 auto' }}>
          Todos os planos desbloqueiam o Yaya+ completo. Anual e Vitalício incluem a Biblioteca de Guias.
        </p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {PLANS.map((plan) => {
          const isLoading = loading === plan.id
          const isDisabled = loading !== null
          return (
            <div key={plan.id} style={{ position: 'relative', borderRadius: 20, padding: plan.highlight ? 1 : 0, background: plan.highlight ? 'linear-gradient(135deg, #b79fff 0%, #8b5cf6 100%)' : 'transparent' }}>
              <div style={{ borderRadius: plan.highlight ? 19 : 20, padding: '1.75rem 1.375rem', height: '100%', boxSizing: 'border-box', background: plan.highlight ? '#1e1652' : 'rgba(255,255,255,0.04)', border: plan.highlight ? 'none' : '1px solid rgba(183,159,255,0.12)', display: 'flex', flexDirection: 'column' }}>
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #b79fff 0%, #8b5cf6 100%)', color: '#0d0a27', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99, whiteSpace: 'nowrap', fontFamily: 'Manrope, system-ui, sans-serif' }}>
                    ✦ {plan.badge}
                  </div>
                )}
                <p style={{ color: 'rgba(231,226,255,0.55)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ color: '#e7e2ff', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ color: 'rgba(231,226,255,0.4)', fontSize: 12 }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 12, color: plan.highlight ? '#b79fff' : 'rgba(231,226,255,0.4)', margin: `0 0 ${plan.includesLibrary ? 12 : 20}px` }}>{plan.note}</p>
                {plan.includesLibrary && (
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(245,200,66,0.1)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.2)', marginBottom: 16, width: 'fit-content' }}>
                    📚 + Biblioteca de Guias
                  </span>
                )}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {PLAN_FEATURES.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(231,226,255,0.65)' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#b79fff', flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isDisabled}
                  className="lp-plan-button"
                  style={{ background: plan.highlight ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)' : 'rgba(183,159,255,0.1)', color: '#fff', opacity: isDisabled && !isLoading ? 0.45 : 1, boxShadow: plan.highlight ? '0 0 24px rgba(236,72,153,0.22)' : 'none' }}
                >
                  {isLoading ? 'Redirecionando...' : 'Assinar agora'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p style={{ color: '#ff7a90', textAlign: 'center', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

      <p style={{ color: 'hsl(250 30% 50%)', fontSize: '0.75rem', textAlign: 'center', marginBottom: '2.5rem' }}>
        Pagamento seguro via Stripe · Cancele quando quiser (mensal e anual) · Sem taxas escondidas
      </p>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(183,159,255,0.1)' }} />
        <span style={{ fontSize: '0.75rem', color: 'hsl(250 30% 45%)' }}>ou comece pelo app</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(183,159,255,0.1)' }} />
      </div>

      {/* Free tier */}
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(183,159,255,0.12)', borderRadius: '1.25rem', padding: '1.5rem', textAlign: 'center', maxWidth: '28rem', margin: '0 auto' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'hsl(250 100% 96%)' }}>Yaya Free</h3>
        <p style={{ fontSize: '0.875rem', color: 'hsl(250 30% 70%)', margin: '0 0 1.25rem' }}>
          Baixe grátis e comece a usar agora. Upgrade para Yaya+ quando quiser.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <a href="https://apps.apple.com/app/yaya-baby" target="_blank" rel="noopener noreferrer" className="lp-btn-outline" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}>App Store</a>
          <a href="https://play.google.com/store/apps/details?id=app.yayababy" target="_blank" rel="noopener noreferrer" className="lp-btn-outline" style={{ padding: '0.625rem 1.25rem', fontSize: '0.875rem' }}>Google Play</a>
        </div>
      </div>
    </section>
  )
}

// ─── FinalCTA ────────────────────────────────────────────────────────────────
function FinalCTA({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{ padding: '4rem 0', textAlign: 'center', position: 'relative' }}>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(183,159,255,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 700, lineHeight: 1.3, marginBottom: '1rem' }}>
        Seu bebê merece o melhor{' '}
        <span className="lp-gradient-text">acompanhamento.</span>
      </h2>
      <p style={{ color: 'hsl(250 30% 70%)', marginBottom: '2rem', maxWidth: '28rem', margin: '0 auto 2rem' }}>
        Comece grátis agora. Sem cartão, sem compromisso.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
        {isMobile ? (
          <>
            <a href="https://apps.apple.com/app/yaya-baby" className="lp-btn-primary">Baixar grátis</a>
            <a href="#planos" className="lp-btn-outline">Ver planos Yaya+</a>
          </>
        ) : (
          <>
            <a href="https://apps.apple.com/app/yaya-baby" target="_blank" rel="noopener noreferrer" className="lp-btn-outline">App Store</a>
            <a href="https://play.google.com/store/apps/details?id=app.yayababy" target="_blank" rel="noopener noreferrer" className="lp-btn-outline">Google Play</a>
            <a href="#planos" className="lp-btn-primary">Ver planos Yaya+</a>
          </>
        )}
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', paddingBottom: '2.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'hsl(250 30% 50%)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.5rem 1rem' }}>
        <span>© {new Date().getFullYear()} Yaya</span>
        <span aria-hidden>·</span>
        <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>Funcionalidades</a>
        <span aria-hidden>·</span>
        <a href="#planos" style={{ color: 'hsl(254 100% 81% / 0.7)', textDecoration: 'none' }}>Planos Yaya+</a>
        <span aria-hidden>·</span>
        <a href="https://blog.yayababy.app" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Blog</a>
        <span aria-hidden>·</span>
        <a href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidade</a>
      </div>
    </footer>
  )
}

// ─── Ícones de loja ───────────────────────────────────────────────────────────
function AppleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  )
}
function PlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92z" fill="#4285F4"/>
      <path d="M17.556 8.235l-3.764 3.764 3.764 3.765 4.247-2.39a1 1 0 000-1.748l-4.247-2.39z" fill="#FBBC04"/>
      <path d="M3.609 1.814L13.792 12l3.764-3.765-9.72-5.473a1.003 1.003 0 00-4.227-.948z" fill="#34A853"/>
      <path d="M13.792 12L3.61 22.186a1.003 1.003 0 004.227-.948l9.72-5.473L13.791 12z" fill="#EA4335"/>
    </svg>
  )
}

// ─── LandingPage ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    setIsMobile(/iPad|iPhone|iPod|Android/i.test(navigator.userAgent))

    const params = new URLSearchParams(window.location.search)
    if (params.get('plano_ativado') === '1') {
      setShowBanner(true)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const id = 'lp-styles'
    if (document.getElementById(id)) return
    const el = document.createElement('style')
    el.id = id
    el.textContent = LANDING_CSS
    document.head.appendChild(el)
    return () => { document.getElementById(id)?.remove() }
  }, [])

  return (
    <div className="lp-root" style={{ position: 'relative', overflow: 'hidden' }}>
      <AuroraBackground />

      {/* Glow secundário no centro-direita */}
      <div aria-hidden style={{ position: 'absolute', top: '70vh', right: '-8rem', width: 450, height: 450, borderRadius: '50%', opacity: 0.18, filter: 'blur(80px)', background: 'hsl(251 70% 61% / 0.35)', pointerEvents: 'none' }} />

      {showBanner && <SuccessBanner onDismiss={() => setShowBanner(false)} />}
      <StickyNav isMobile={isMobile} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '72rem', margin: '0 auto', padding: '0 1.25rem' }}>
        <Hero isMobile={isMobile} />
        <TrustBar />
        <Problem />
        <Features />
        <Pricing />
        <FinalCTA isMobile={isMobile} />
        <Footer />
      </div>
    </div>
  )
}
