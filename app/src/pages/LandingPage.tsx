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
  @keyframes lp-modal-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes lp-modal-slide-in {
    from { opacity: 0; transform: translateY(20px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  .lp-root {
    font-family: 'Manrope', system-ui, -apple-system, sans-serif;
    color: hsl(250 100% 96%);
    background: hsl(245 56% 9%);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    overflow-x: clip;
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
    gap: 1.5rem;
    align-items: center;
    padding-top: 2rem;
    padding-bottom: 2rem;
  }
  .lp-hero-text   { order: 2; width: 100%; }
  .lp-hero-mockup {
    display: none;
  }
  @media (min-width: 768px) {
    .lp-hero { flex-direction: row; align-items: center; gap: 2rem; padding-top: 5rem; padding-bottom: 3rem; }
    .lp-hero-text   { order: 2; flex: 1; }
    .lp-hero-mockup {
      display: flex; order: 1; flex: 1;
      justify-content: center; align-items: center; position: relative;
    }
    .lp-hero-mockup img {
      max-height: 580px; width: auto; object-fit: contain;
      filter: drop-shadow(0 24px 48px rgba(0,0,0,0.5));
    }
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

  /* Phone frame */
  .lp-phone-frame {
    position: relative;
    width: 240px;
    aspect-ratio: 9 / 19;
    border-radius: 22px;
    background: #06040f;
    overflow: hidden;
    border: 4px solid #1a1530;
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.08) inset,
      0 48px 120px rgba(0,0,0,0.8),
      0 24px 56px rgba(0,0,0,0.5),
      0 0 60px rgba(139,92,246,0.2);
    margin: 0 auto;
    user-select: none;
    -webkit-user-select: none;
  }
  .lp-phone-island {
    position: absolute;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    width: 88px;
    height: 28px;
    background: #06040f;
    border-radius: 14px;
    z-index: 20;
    box-shadow: 0 0 0 1px rgba(255,255,255,0.06);
  }

  /* Problem auto-rotate layout */
  .lp-problem-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    padding: 2rem 0 3rem;
  }
  .lp-problem-text-side {
    width: 100%;
    min-height: 13rem;
    position: relative;
  }
  .lp-problem-text-item {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    transition: opacity 0.5s ease;
    pointer-events: none;
  }
  .lp-problem-dots {
    display: flex;
    gap: 0.5rem;
    margin-top: 1.75rem;
  }
  .lp-problem-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    padding: 0;
    background: rgba(183,159,255,0.25);
    transition: background 0.3s ease, transform 0.3s ease;
  }
  .lp-problem-dot.active {
    background: hsl(254 100% 81%);
    transform: scale(1.4);
  }

  @media (min-width: 760px) {
    .lp-problem-wrap {
      flex-direction: row;
      align-items: center;
      gap: 4rem;
    }
    .lp-problem-phone-col {
      flex-shrink: 0;
    }
    .lp-problem-text-side {
      flex: 1;
      min-height: 14rem;
    }
  }

  /* Features grid → marquee infinito no mobile */
  .lp-features-marquee { /* passthrough no desktop */ }
  .lp-features-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.875rem;
  }
  .lp-features-dup { display: none; } /* duplicatas escondidas no desktop */

  @media (max-width: 767px) {
    .lp-features-marquee {
      overflow: hidden;
      margin: 0 -1.25rem;
      padding: 0.25rem 0 1rem;
      mask-image: linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
      -webkit-mask-image: linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
    }
    .lp-features-grid {
      display: flex;
      flex-wrap: nowrap;
      gap: 0.75rem;
      width: max-content;
      animation: lp-features-scroll 36s linear infinite;
    }
    .lp-features-grid:hover { animation-play-state: paused; }
    .lp-features-dup { display: flex; flex-direction: column; }
    .lp-features-item {
      flex-shrink: 0;
      width: 70vw;
      box-sizing: border-box;
    }
  }
  @keyframes lp-features-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }

  /* yaIA layout */
  .lp-yaia-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }
  .lp-yaia-text { width: 100%; }
  .lp-yaia-phone { display: flex; justify-content: center; }
  @media (min-width: 900px) {
    .lp-yaia-wrap {
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
    }
    .lp-yaia-text { flex: 0 1 32rem; min-width: 0; }
    .lp-yaia-phone { flex-shrink: 0; }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     MOBILE RESPONSIVENESS — overrides para telas estreitas
     ────────────────────────────────────────────────────────────────────────── */
  @media (max-width: 767px) {
    /* Reduz padding vertical de todas as sections */
    .lp-root section { padding-top: 2.5rem !important; padding-bottom: 2.5rem !important; }

    /* Cards mais compactos */
    .lp-feature-card { padding: 1.125rem; }

    /* Botões de loja ocupam linha inteira */
    .lp-btn-store { width: 100%; box-sizing: border-box; justify-content: flex-start; }

    /* Trust bar com gap menor */
    .lp-trust-item { font-size: 0.75rem; }
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

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)

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
          isAndroid ? (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-android-waitlist'))}
              className="lp-btn-primary"
              style={{ padding: '0.5rem 1.125rem', fontSize: '0.8125rem', border: 'none', cursor: 'pointer', font: 'inherit', fontWeight: 700 }}
            >
              Avise-me
            </button>
          ) : (
            <a href="https://apps.apple.com/br/app/yaya/id6761936528" className="lp-btn-primary" style={{ padding: '0.5rem 1.125rem', fontSize: '0.8125rem' }}>
              Baixar grátis
            </a>
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <a href="https://blog.yayababy.app" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8125rem', color: 'rgba(231,226,255,0.45)', textDecoration: 'none', fontWeight: 500 }}>
              Blog
            </a>
            <a href="#planos" className="lp-btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.8125rem' }}>
              Assinar Yaya+
            </a>
          </div>
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
          <span style={{ display: 'block' }}>O app que cresce</span>
          <span className="lp-gradient-text" style={{ display: 'block' }}>junto com</span>
          <span style={{ display: 'block' }}>o seu bebê.</span>
        </h1>

        {/* Subtítulo */}
        <p className="lp-fade lp-d2" style={{ fontSize: '1rem', lineHeight: 1.7, color: 'hsl(250 30% 70%)', maxWidth: 480, marginBottom: '2rem' }}>
          Do recém-nascido ao primeiro aniversário. Registre em segundos,
          entenda os padrões e mantenha toda a família sincronizada em tempo real.
        </p>

        {/* CTAs de loja */}
        <div className="lp-fade lp-d3" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <StoreButton platform="apple" isMobile={isMobile} />
          <StoreButton platform="google" isMobile={isMobile} />
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
type PainAssetType = 'image' | 'video'
const PAIN_POINTS: Array<{ icon: string; pain: string; solve: string; asset: string; type: PainAssetType }> = [
  { icon: '🌙', pain: 'Eu sei que amamentei tem um tempo, mas que horas foi? Qual lado do peito?',            solve: 'Esquece o papel! O Yaya registra com 1 toque. Até no escuro.',                                         asset: '/lp/amamentacao.png', type: 'image' },
  { icon: '👨‍👩‍👧', pain: 'A babá foi embora, a avó esqueceu de perguntar como foi. Como vou saber como foi o dia?', solve: 'Toda a família sincronizada em tempo real, sem precisar perguntar um pro outro.',              asset: '/lp/familia.png',     type: 'image' },
  { icon: '📊', pain: 'Como será que está o sono dele essa semana? Será que está dormindo bem?',              solve: 'A yaIA usa inteligência artificial para ler as informações do seu bebê em tempo real.',              asset: '/lp/yaia.mp4',        type: 'video' },
  { icon: '🩺', pain: 'A pediatra perguntou se tinha cocô todo dia. Como vou saber? Mal lembro o que jantei ontem...', solve: 'Relatório fácil, seguro e completo para compartilhar antes da consulta com seu pediatra.', asset: '/lp/relatorio.mp4',   type: 'video' },
]

function Problem() {
  return (
    <section style={{ padding: '4rem 0' }}>
      <div style={{ textAlign: 'center', maxWidth: '38rem', margin: '0 auto 2.5rem' }}>
        <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 700, lineHeight: 1.3, marginBottom: 0 }}>
          Lembrar cada alimentação, cada fralda, cada soneca...{' '}
          <span className="lp-gradient-text">é impossível fazer isso de cabeça.</span>
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
        {PAIN_POINTS.map((p) => (
          <div key={p.icon} className="lp-feature-card">
            <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: '0.875rem' }}>{p.icon}</span>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#ffffff', lineHeight: 1.55, margin: '0 0 0.875rem', fontStyle: 'italic', opacity: 0.85 }}>"{p.pain}"</p>
            <p style={{ fontSize: '1.0625rem', color: 'hsl(254 100% 81%)', fontWeight: 700, lineHeight: 1.5, margin: 0 }}>✦ {p.solve}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Features ────────────────────────────────────────────────────────────────
const FEATURES = [
  { emoji: '🤱', title: 'Amamentação', desc: 'Registre cada mamada com esquerda, direita ou ambos. Sempre saiba o último lado.' },
  { emoji: '💧', title: 'Fraldas', desc: 'Xixi, cocô ou os dois. Registre em menos de um segundo.' },
  { emoji: '🌙', title: 'Sono', desc: 'Timer automático. Veja quantas horas o bebê dormiu de verdade.' },
  { emoji: '🛁', title: 'Banho e cuidados', desc: 'Horários agendados com lembrete 15 minutos antes.' },
  { emoji: '👨‍👩‍👧', title: 'Multi-cuidador', desc: 'Compartilhe com parceiro, avós ou babá. Todo mundo sincronizado em tempo real.' },
  { emoji: '🩺', title: 'Relatório pediatra', desc: 'Link protegido por senha. O pediatra vê alimentação, sono, peso e vacinas sem precisar instalar nada.' },
  { emoji: '🏆', title: 'Marcos de desenvolvimento', desc: 'Cada sorriso, cada giro, cada palavra. Registre no momento certo sem depender da memória.' },
  { emoji: '🌊', title: 'Saltos do desenvolvimento', desc: 'Entenda por que seu bebê está mais agitado. Os 10 saltos, com data estimada de início e fim.' },
  { emoji: '💉', title: 'Caderneta de vacinas', desc: 'Caderneta digital. Saiba quais vacinas já foram dadas e quais estão chegando.' },
]

function Features() {
  return (
    <section id="features" style={{ padding: '4rem 0' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p className="lp-eyebrow">Funcionalidades</p>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, margin: 0 }}>
          Tudo que pais{' '}
          <span className="lp-gradient-text">realmente precisam.</span>
        </h2>
      </div>
      <div className="lp-features-marquee">
        <div className="lp-features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="lp-feature-card lp-features-item">
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{f.emoji}</div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'hsl(250 100% 96%)', marginBottom: '0.375rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'hsl(250 30% 70%)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
          {/* Duplicado pra loop infinito no mobile */}
          {FEATURES.map((f) => (
            <div key={`dup-${f.title}`} className="lp-feature-card lp-features-item lp-features-dup" aria-hidden>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>{f.emoji}</div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'hsl(250 100% 96%)', marginBottom: '0.375rem' }}>{f.title}</h3>
              <p style={{ fontSize: '0.875rem', color: 'hsl(250 30% 70%)', lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── yaIA ────────────────────────────────────────────────────────────────────
function YaIA() {
  return (
    <section style={{ padding: '1.5rem 0 4rem' }}>
      <div className="lp-yaia-wrap">
        {/* Caixa roxa só com o texto */}
        <div className="lp-yaia-text" style={{ borderRadius: '1.5rem', position: 'relative', padding: '2.5rem 2rem', background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(183,159,255,0.08) 100%)', border: '1px solid rgba(183,159,255,0.2)', overflow: 'hidden' }}>
          <div aria-hidden style={{ position: 'absolute', top: '-3rem', right: '-3rem', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p className="lp-eyebrow" style={{ color: 'hsl(254 100% 81% / 0.6)' }}>Inteligência artificial</p>
            <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.875rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: '1rem' }}>
              yaIA,{' '}
              <span className="lp-gradient-text">a única IA que conhece o seu bebê.</span>
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'hsl(250 30% 70%)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              Ela sabe quando o bebê dormiu, o que comeu e qual salto está chegando.
              Pergunte e receba uma resposta baseada no histórico real, não no Google.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {['"Ele dormiu bem essa semana?"', '"Esse choro é fome ou sono?"', '"Quando começa o próximo salto?"'].map((q) => (
                <span key={q} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '2rem', background: 'rgba(183,159,255,0.1)', border: '1px solid rgba(183,159,255,0.18)', color: 'hsl(254 100% 81%)' }}>
                  {q}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Celular ao lado da caixa */}
        <div className="lp-yaia-phone">
          <div style={{ position: 'relative' }}>
            <div aria-hidden style={{ position: 'absolute', inset: '-25%', background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 65%)', filter: 'blur(48px)', zIndex: 0, pointerEvents: 'none' }} />
            <div className="lp-phone-frame" style={{ position: 'relative', zIndex: 1, width: 240 }}>
              <div className="lp-phone-island" />
              <video
                src="/lp/yaia.mp4"
                autoPlay muted loop playsInline
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Depoimentos ──────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    avatar: 'mariana',
    name: 'Mariana S.',
    context: 'mãe da Helena, 2 meses',
    quote: 'Antes eu tinha que anotar tudo num papel. Horário que amamentei a Helena, qual lado do peito, que horas dormiu... Agora dá pra ver tudo pelo celular. E meu marido não fica perguntando toda hora se já pode dar tete pra ela hahahah',
  },
  {
    avatar: 'lucas',
    name: 'Lucas F.',
    context: 'pai da Sofia, 5 meses',
    quote: 'Ter visão sobre saltos, marcos de desenvolvimento e as mudanças da rotina da Sofia mudou tudo. Quando ela fica agitada, eu já tenho ideia do motivo, e quando não sei pergunto pra yaIA, que é excelente!',
  },
  {
    avatar: 'camila',
    name: 'Camila V.',
    context: 'mãe do Theo, 4 meses',
    quote: 'Cheguei na consulta de 4 meses do Theo com mais informação do que eu esperava kkkk A pediatra ficou surpresa com o nível de detalhes.',
  },
  {
    avatar: 'fernanda',
    name: 'Fernanda B.',
    context: 'mãe do Bernardo, 8 meses',
    quote: 'O sono do Bernardo não tava fácil, a yaIA ajudou a entender e deu sugestões do que fazer. Fizemos um esforço em cada e mudou muuuuitoo! Vale super a pena!',
  },
]

function Testimonials() {
  return (
    <section style={{ padding: '0 0 4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <p className="lp-eyebrow">Quem já usa</p>
        <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.75rem)', fontWeight: 700, margin: 0 }}>
          O que os pais{' '}
          <span className="lp-gradient-text">estão dizendo.</span>
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '0.875rem' }}>
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="lp-feature-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.9375rem', color: 'hsl(250 100% 94%)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
              "{t.quote}"
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginTop: 'auto' }}>
              <img
                src={`https://api.dicebear.com/7.x/lorelei/svg?seed=${t.avatar}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`}
                alt={t.name}
                style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(183,159,255,0.2)', flexShrink: 0, background: 'rgba(183,159,255,0.08)' }}
              />
              <div>
                <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: 'hsl(250 100% 96%)' }}>{t.name}</p>
                <p style={{ margin: 0, fontSize: '0.6875rem', color: 'hsl(250 30% 55%)' }}>{t.context}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Pricing ─────────────────────────────────────────────────────────────────
type PlanId = 'monthly' | 'annual' | 'lifetime'

const PAID_FEATURES = [
  'Bebês ilimitados',
  'Pais, parentes e cuidadores ilimitados',
  'Registros ilimitados',
  'Sem anúncios',
  'yaIA ilimitada',
  'Insights inteligentes sobre o bebê',
  'Relatório completo para o pediatra',
]

const COMPARE_ROWS: Array<{ label: string; free: string; paid: string }> = [
  { label: 'Bebê',                     free: '1',                paid: 'Ilimitados'  },
  { label: 'Cuidadores',               free: '1',                paid: 'Ilimitados'  },
  { label: 'Registros',                free: 'Limitados',        paid: 'Ilimitados'  },
  { label: 'Histórico',                free: 'Hoje + ontem',     paid: 'Completo'    },
  { label: 'Anúncios',                 free: 'Sim',              paid: 'Não'         },
  { label: 'Marcos, Saltos, Vacinas',  free: '✓',               paid: '✓'           },
  { label: 'yaIA',                     free: '✗',               paid: 'Ilimitada'   },
  { label: 'Insights inteligentes',    free: '✗',               paid: '✓'           },
  { label: 'Relatório pediatra',       free: '✗',               paid: '✓'           },
  { label: 'Biblioteca Yaya',          free: '✗',               paid: 'Anual e Vitalício' },
]

function Pricing() {
  const [toggle, setToggle] = useState<'monthly' | 'annual'>('annual')
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null)
  const [error, setError] = useState('')

  const isAnnual = toggle === 'annual'
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent)
  const freeUrl = isAndroid
    ? 'https://play.google.com/store/apps/details?id=app.yayababy'
    : 'https://apps.apple.com/app/yaya-baby'

  // Fix: reseta loading ao voltar do Stripe
  useEffect(() => {
    function reset() { setLoadingPlan(null) }
    window.addEventListener('pageshow', reset)
    const onVis = () => { if (document.visibilityState === 'visible') reset() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('pageshow', reset)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  async function handleCheckout(plan: PlanId) {
    setLoadingPlan(plan); setError('')
    try {
      const origin = window.location.origin
      const { data, error: fnErr } = await supabase.functions.invoke(
        'stripe-create-subscription-session',
        { body: { plan, success_url: `${origin}/?plano_ativado=1`, cancel_url: `${origin}/#planos` } }
      )
      if (fnErr || !data?.url) throw new Error(fnErr?.message || 'Não foi possível iniciar o pagamento.')
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message); setLoadingPlan(null)
    }
  }

  return (
    <section id="planos" style={{ padding: '4rem 0' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p className="lp-eyebrow">Assine Yaya+</p>
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 700, marginBottom: '0.75rem' }}>
          O melhor investimento para{' '}
          <span className="lp-gradient-text">a rotina do seu bebê.</span>
        </h2>
        <p style={{ fontSize: '0.9375rem', color: 'hsl(250 30% 60%)', margin: 0 }}>Escolha o plano do seu.</p>
      </div>

      {/* 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '1rem', maxWidth: '56rem', margin: '0 auto', alignItems: 'start' }}>

        {/* ── Col 1: Free ───────────────────────────────────────────────── */}
        <div style={{ borderRadius: 20, border: '1px solid rgba(183,159,255,0.1)', background: 'rgba(255,255,255,0.015)', padding: '1.75rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
          <p style={{ margin: '0 0 1.25rem', fontSize: 11, fontWeight: 700, color: 'rgba(183,159,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Yaya Free</p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 36, fontWeight: 800, color: 'rgba(231,226,255,0.5)', lineHeight: 1 }}>Grátis</span>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(183,159,255,0.35)', margin: '0 0 1.5rem' }}>Sem cartão, sem prazo</p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[
              '1 bebê',
              '1 cuidador',
              'Registros limitados',
              'Com anúncios',
              'Marcos de desenvolvimento',
              'Saltos do desenvolvimento',
              'Caderneta de vacinas',
              'Controle de medicações',
            ].map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'rgba(231,226,255,0.38)' }}>
                <span style={{ color: 'rgba(183,159,255,0.35)', flexShrink: 0, marginTop: 1 }}>✓</span>{f}
              </li>
            ))}
          </ul>

          <a
            href={freeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="lp-plan-button"
            style={{ background: 'transparent', border: '1px solid rgba(183,159,255,0.18)', color: 'rgba(183,159,255,0.45)', textDecoration: 'none', textAlign: 'center', display: 'block' }}
          >
            Baixar grátis
          </a>
        </div>

        {/* ── Col 2: Yaya+ com toggle Mensal / Anual ────────────────────── */}
        <div style={{ borderRadius: 20, padding: '1.5px', background: 'linear-gradient(135deg, #b79fff 0%, #ec4899 60%, #8b5cf6 100%)', boxShadow: '0 0 64px rgba(183,159,255,0.22)', transform: 'scale(1.04)', zIndex: 1 }}>
          <div style={{ borderRadius: 19, background: '#100d2e', padding: '2rem 1.625rem', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

            {/* Eyebrow */}
            <p style={{ margin: '0 0 1rem', fontSize: 11, fontWeight: 700, color: '#b79fff', textTransform: 'uppercase', letterSpacing: '0.12em' }}>✦ Yaya+</p>

            {/* Toggle Mensal / Anual */}
            <div style={{ display: 'inline-flex', alignSelf: 'flex-start', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 3, marginBottom: '1.5rem', gap: 2 }}>
              {(['monthly', 'annual'] as const).map(id => {
                const active = toggle === id
                return (
                  <button
                    key={id}
                    onClick={() => setToggle(id)}
                    style={{
                      padding: '0.4375rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontFamily: 'Manrope, system-ui, sans-serif', fontSize: 12, fontWeight: 700,
                      transition: 'all 0.2s ease',
                      background: active ? 'linear-gradient(135deg, #b79fff, #8b5cf6)' : 'transparent',
                      color: active ? '#0d0a27' : 'rgba(231,226,255,0.4)',
                      boxShadow: active ? '0 2px 10px rgba(139,92,246,0.35)' : 'none',
                      whiteSpace: 'nowrap' as const,
                    }}
                  >
                    {id === 'monthly' ? 'Mensal' : 'Anual ★'}
                  </button>
                )
              })}
            </div>

            {/* Preço dinâmico */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 40, fontWeight: 800, color: '#e7e2ff', lineHeight: 1 }}>
                {isAnnual ? 'R$ 20,83' : 'R$ 34,90'}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(231,226,255,0.4)' }}>/mês</span>
            </div>

            {isAnnual ? (
              <>
                <p style={{ fontSize: 12, color: 'rgba(183,159,255,0.6)', margin: '0 0 0.5rem' }}>cobrado como R$ 249,90 por ano</p>
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: 'rgba(245,200,66,0.15)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.3)' }}>
                    Economize 40%
                  </span>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: 'rgba(245,200,66,0.1)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.22)', marginBottom: '1.5rem', width: 'fit-content' }}>
                  📚 Biblioteca Yaya inclusa
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: 'rgba(183,159,255,0.5)', margin: '0 0 1.25rem' }}>Cancele quando quiser</p>
                <p style={{ fontSize: 11, color: 'rgba(231,226,255,0.22)', margin: '0 0 1.5rem', fontStyle: 'italic' }}>Não inclui a Biblioteca Yaya</p>
              </>
            )}

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {PAID_FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'rgba(231,226,255,0.75)' }}>
                  <span style={{ color: '#b79fff', flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout(toggle)}
              disabled={!!loadingPlan}
              className="lp-plan-button"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)', color: '#fff', opacity: loadingPlan === toggle ? 0.6 : 1, boxShadow: '0 0 28px rgba(236,72,153,0.28)', fontSize: '0.9375rem' }}
            >
              {loadingPlan === toggle ? 'Redirecionando...' : 'Assinar agora'}
            </button>
          </div>
        </div>

        {/* ── Col 3: Vitalício ───────────────────────────────────────────── */}
        <div style={{ borderRadius: 20, padding: '1.5px', background: 'linear-gradient(135deg, #f5c842 0%, #f0a020 100%)', boxShadow: '0 0 32px rgba(245,200,66,0.12)' }}>
          <div style={{ borderRadius: 19, background: '#110e28', padding: '1.75rem 1.5rem', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1.25rem' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#f5c842', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Vitalício</p>
              <span style={{ background: 'rgba(245,200,66,0.15)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.3)', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 99 }}>
                🔒 Vagas limitadas
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 36, fontWeight: 800, color: '#e7e2ff', lineHeight: 1 }}>R$ 37,49</span>
              <span style={{ fontSize: 13, color: 'rgba(231,226,255,0.4)' }}>/mês equiv.</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(245,200,66,0.6)', margin: '0 0 1.5rem' }}>cobrado uma vez: R$ 449,90</p>

            <p style={{ fontSize: 16, fontWeight: 700, color: '#e7e2ff', lineHeight: 1.4, margin: '0 0 1rem' }}>
              Tudo do Yaya+,{' '}
              <span style={{ color: '#f5c842' }}>para sempre.</span>
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, fontWeight: 700, color: '#f5c842', marginBottom: '1.25rem', padding: '10px 12px', borderRadius: 8, background: 'rgba(245,200,66,0.07)', border: '1px solid rgba(245,200,66,0.18)' }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>✦</span>
              <span>Todas as atualizações do app e da Biblioteca para sempre</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: 'rgba(245,200,66,0.1)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.22)', marginBottom: '1.5rem', width: 'fit-content' }}>
              📚 Biblioteca Yaya inclusa
            </div>

            <div style={{ flex: 1 }} />

            <button
              onClick={() => handleCheckout('lifetime')}
              disabled={!!loadingPlan}
              className="lp-plan-button"
              style={{ background: 'linear-gradient(135deg, #f5c842 0%, #f0a020 100%)', color: '#0d0a27', opacity: loadingPlan === 'lifetime' ? 0.6 : 1, boxShadow: '0 0 24px rgba(245,200,66,0.22)', fontSize: '0.9375rem', fontWeight: 800 }}
            >
              {loadingPlan === 'lifetime' ? 'Redirecionando...' : 'Adquirir agora'}
            </button>
          </div>
        </div>
      </div>

      {error && <p style={{ color: '#ff7a90', textAlign: 'center', fontSize: '0.875rem', marginTop: '1.25rem' }}>{error}</p>}

      {/* Tabela de comparação Free vs Yaya+ */}
      <div style={{ maxWidth: '44rem', margin: '3rem auto 0', borderRadius: 16, border: '1px solid rgba(183,159,255,0.08)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', background: 'rgba(183,159,255,0.05)', padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(183,159,255,0.08)' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(231,226,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}></span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(231,226,255,0.35)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Free</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#b79fff', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Yaya+</span>
        </div>
        {COMPARE_ROWS.map((row, i) => (
          <div
            key={row.label}
            style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', padding: '0.625rem 1.25rem', alignItems: 'center', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', borderBottom: i < COMPARE_ROWS.length - 1 ? '1px solid rgba(183,159,255,0.05)' : 'none' }}
          >
            <span style={{ fontSize: 13, color: 'rgba(231,226,255,0.55)' }}>{row.label}</span>
            <span style={{ fontSize: 12, color: 'rgba(231,226,255,0.28)', textAlign: 'center', fontWeight: 600 }}>{row.free}</span>
            <span style={{ fontSize: 12, color: '#b79fff', textAlign: 'center', fontWeight: 700 }}>{row.paid}</span>
          </div>
        ))}
      </div>

    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'O Yaya é grátis de verdade?',                         a: 'Sim. O Yaya é gratuito sem limite de tempo, mas com algumas limitações. Para registros ilimitados e avançados, insights com IA, múltiplos bebês, família conectada e relatório para pediatra, você precisa assinar o Yaya+.' },
  { q: 'Meu parceiro pode usar ao mesmo tempo?',               a: 'Sim. Com o Yaya+ você conecta todo mundo da família ao seu bebê. Parceiro, avós ou babá: todo mundo vê e registra em tempo real, em qualquer dispositivo, sem custo extra.' },
  { q: 'Eu e o pai/mãe precisamos assinar para ter Yaya+?',   a: 'Não. Basta um dos dois assinar. A assinatura é por bebê, não por usuário. Então se você assina como mãe ou pai, todos do grupo (parceiro, avós, babá) também enxergam o bebê com o plano Yaya+, mesmo sem ter assinatura própria.' },
  { q: 'O que acontece se eu cancelar o plano?',               a: 'Seus dados ficam salvos. Você volta para o Yaya Free e mantém todo o histórico. Nenhum dado é perdido.' },
  { q: 'Qual a diferença entre Anual e Vitalício?',            a: 'As funcionalidades são as mesmas. No Anual você paga por ano (com renovação). No Vitalício, paga uma vez e tem acesso para sempre, inclusive a todos os guias da Biblioteca atuais e futuros.' },
  { q: 'Funciona sem internet?',                               a: 'O registro funciona offline e sincroniza automaticamente quando a conexão voltar. E caso haja registros simultâneos, deixamos alertado para ser revisado. Insights e relatório precisam de conexão.' },
  { q: 'Posso usar para mais de um filho?',                    a: 'Sim. O Yaya+ suporta múltiplos bebês em uma única conta, cada um com histórico e perfil separados. No free você só pode ter um bebê registrado.' },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section style={{ padding: '2rem 0 4rem', maxWidth: '44rem', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p className="lp-eyebrow">Dúvidas</p>
        <h2 style={{ fontSize: 'clamp(1.375rem, 3vw, 1.75rem)', fontWeight: 700, margin: 0 }}>
          Perguntas <span className="lp-gradient-text">frequentes.</span>
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} style={{ borderRadius: '0.875rem', border: `1px solid ${open === i ? 'rgba(183,159,255,0.2)' : 'rgba(183,159,255,0.08)'}`, overflow: 'hidden', transition: 'border-color 0.2s' }}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1.125rem 1.375rem', background: open === i ? 'rgba(183,159,255,0.05)' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'Manrope, system-ui, sans-serif', transition: 'background 0.2s' }}
            >
              <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: open === i ? 'hsl(254 100% 88%)' : 'rgba(231,226,255,0.82)', lineHeight: 1.5 }}>{item.q}</span>
              <span style={{ color: open === i ? '#b79fff' : 'rgba(183,159,255,0.45)', flexShrink: 0, fontSize: '1.125rem', lineHeight: 1, marginTop: '0.125rem', transform: open === i ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s, color 0.2s', display: 'block' }}>+</span>
            </button>
            {open === i && (
              <div style={{ padding: '0 1.375rem 1.25rem', fontSize: '0.875rem', color: 'hsl(250 30% 68%)', lineHeight: 1.8, borderTop: '1px solid rgba(183,159,255,0.07)', paddingTop: '0.875rem' }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
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
        Você cuida. O Yaya registra.{' '}
        <span className="lp-gradient-text">Todo mundo sabe o que está acontecendo.</span>
      </h2>
      <p style={{ color: 'hsl(250 30% 70%)', maxWidth: '28rem', margin: '0 auto 2rem' }}>
        Baixe e teste grátis!
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
        <StoreButton platform="apple" isMobile={isMobile} />
        <StoreButton platform="google" isMobile={isMobile} />
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
        <a href="https://blog.yayababy.app" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Blog</a>
        <span aria-hidden>·</span>
        <a href="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacidade</a>
      </div>
    </footer>
  )
}

// ─── StoreButton (padronizado, reutilizável) ─────────────────────────────────
function StoreButton({ platform, isMobile }: { platform: 'apple' | 'google'; isMobile: boolean }) {
  const isApple = platform === 'apple'
  if (isApple) {
    const href = 'https://apps.apple.com/br/app/yaya/id6761936528'
    const externalProps = isMobile ? {} : { target: '_blank', rel: 'noopener noreferrer' }
    return (
      <a href={href} className="lp-btn-store" {...externalProps}>
        <AppleIcon />
        <div>
          <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
            Disponível na
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2 }}>
            App Store
          </div>
        </div>
      </a>
    )
  }
  // Android: abre modal de waitlist (em vez de ir pra Play Store)
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('open-android-waitlist'))}
      className="lp-btn-store"
      style={{ font: 'inherit', cursor: 'pointer', border: 'none', textAlign: 'left' }}
    >
      <PlayIcon />
      <div>
        <div style={{ fontSize: '0.5625rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
          Em breve no
        </div>
        <div style={{ fontSize: '0.875rem', fontWeight: 700, lineHeight: 1.2 }}>
          Google Play
        </div>
      </div>
    </button>
  )
}

// ─── AndroidWaitlistModal ────────────────────────────────────────────────────
function AndroidWaitlistModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [alreadySubscribed, setAlreadySubscribed] = useState(false)

  // Fechar com botão back
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')

    try {
      const SUPABASE_URL = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = (import.meta as { env: Record<string, string> }).env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${SUPABASE_URL}/functions/v1/android-waitlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() || undefined }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        setErrorMsg('Algo deu errado. Tenta de novo em alguns segundos.')
        setState('error')
        return
      }

      setAlreadySubscribed(Boolean(data.alreadySubscribed))
      setState('success')
    } catch (err) {
      console.error(err)
      setErrorMsg('Sem conexão com o servidor. Verifica sua internet.')
      setState('error')
    }
  }

  function handleClose() {
    onClose()
    // Reset depois do fade
    setTimeout(() => {
      setEmail(''); setPhone(''); setState('idle'); setErrorMsg(''); setAlreadySubscribed(false)
    }, 300)
  }

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(8, 6, 25, 0.78)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', animation: 'lp-modal-fade-in 0.25s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '28rem', position: 'relative',
          background: 'linear-gradient(180deg, hsl(252 35% 12%) 0%, hsl(252 30% 8%) 100%)',
          border: '1px solid rgba(183,159,255,0.25)',
          borderRadius: '1.25rem', padding: '2rem 1.75rem',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
          animation: 'lp-modal-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <button
          onClick={handleClose}
          aria-label="Fechar"
          style={{
            position: 'absolute', top: '0.75rem', right: '0.75rem',
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)',
            fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {state !== 'success' ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🎉</div>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1.25, margin: '0 0 0.75rem' }}>
                Yaya para Android <span className="lp-gradient-text">em breve!</span>
              </h2>
              <p style={{ fontSize: '0.9375rem', color: 'hsl(250 25% 75%)', lineHeight: 1.6, margin: 0 }}>
                Estamos aguardando a aprovação do Google, que deve liberar o app nos próximos dias.
                Deixa seu email que te avisamos quando lançar, e já te damos <strong style={{ color: 'hsl(254 100% 81%)' }}>10 dias de Yaya+</strong> para testar pelo navegador do celular!
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input
                type="email"
                required
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === 'loading'}
                style={{
                  padding: '0.875rem 1rem', borderRadius: '0.625rem', fontSize: '0.9375rem',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(183,159,255,0.18)',
                  color: 'white', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <input
                type="tel"
                placeholder="WhatsApp (opcional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={state === 'loading'}
                style={{
                  padding: '0.875rem 1rem', borderRadius: '0.625rem', fontSize: '0.9375rem',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(183,159,255,0.18)',
                  color: 'white', fontFamily: 'inherit', outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={state === 'loading' || !email.trim()}
                className="lp-btn-primary"
                style={{ marginTop: '0.5rem', padding: '0.875rem 1.25rem', fontSize: '0.9375rem', opacity: state === 'loading' ? 0.6 : 1 }}
              >
                {state === 'loading' ? 'Enviando...' : 'Quero testar! Me avisa quando lançar'}
              </button>
              {state === 'error' && (
                <p style={{ fontSize: '0.8125rem', color: '#ff7a7a', textAlign: 'center', margin: '0.25rem 0 0' }}>
                  {errorMsg}
                </p>
              )}
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
              {alreadySubscribed ? 'Você já está na lista!' : 'Pronto! Seus 10 dias começaram.'}
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'hsl(250 25% 75%)', lineHeight: 1.6, margin: '0 0 1.25rem' }}>
              Enviamos um link pro seu email. Clique nele <strong>pelo celular</strong> para entrar no Yaya com Yaya+ ativo por 10 dias.
            </p>
            <div style={{ padding: '1rem', borderRadius: '0.625rem', background: 'rgba(183,159,255,0.08)', border: '1px solid rgba(183,159,255,0.18)', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'hsl(250 30% 70%)', margin: '0 0 0.5rem' }}>Ou acesse direto pelo celular:</p>
              <code style={{ fontSize: '0.875rem', color: 'hsl(254 100% 81%)', fontFamily: 'inherit', fontWeight: 600 }}>
                yayababy.app/mobile
              </code>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'hsl(250 20% 55%)', margin: 0 }}>
              Te avisamos quando o app Android lançar! 💜
            </p>
            <button
              onClick={handleClose}
              style={{
                marginTop: '1.25rem', padding: '0.625rem 1.5rem', borderRadius: '0.5rem',
                background: 'transparent', border: '1px solid rgba(183,159,255,0.3)',
                color: 'hsl(254 100% 81%)', fontFamily: 'inherit', fontSize: '0.875rem',
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
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
  const [androidModalOpen, setAndroidModalOpen] = useState(false)

  useEffect(() => {
    setIsMobile(/iPad|iPhone|iPod|Android/i.test(navigator.userAgent))

    const params = new URLSearchParams(window.location.search)
    if (params.get('plano_ativado') === '1') {
      setShowBanner(true)
      window.history.replaceState({}, '', window.location.pathname)
    }

    const id = 'lp-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.textContent = LANDING_CSS
      document.head.appendChild(el)
    }

    function openAndroidModal() { setAndroidModalOpen(true) }
    window.addEventListener('open-android-waitlist', openAndroidModal)
    return () => {
      document.getElementById(id)?.remove()
      window.removeEventListener('open-android-waitlist', openAndroidModal)
    }
  }, [])

  return (
    <div className="lp-root" style={{ position: 'relative' }}>
      <AuroraBackground />

      {/* Glow secundário no centro-direita */}
      <div aria-hidden style={{ position: 'absolute', top: '70vh', right: 0, width: 350, height: 350, borderRadius: '50%', opacity: 0.15, filter: 'blur(80px)', background: 'hsl(251 70% 61% / 0.35)', pointerEvents: 'none' }} />

      {showBanner && <SuccessBanner onDismiss={() => setShowBanner(false)} />}
      <StickyNav isMobile={isMobile} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '72rem', margin: '0 auto', padding: '0 1.25rem' }}>
        <Hero isMobile={isMobile} />
        <TrustBar />
        <Problem />
        <Features />
        <YaIA />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA isMobile={isMobile} />
        <Footer />
      </div>

      <AndroidWaitlistModal isOpen={androidModalOpen} onClose={() => setAndroidModalOpen(false)} />
    </div>
  )
}
