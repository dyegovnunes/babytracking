import { useEffect, useState } from 'react'
import Nav from '../components/landing/Nav'
import Hero from '../components/landing/Hero'
import TrustBar from '../components/landing/TrustBar'
import Problem from '../components/landing/Problem'
import Features from '../components/landing/Features'
import Pricing from '../components/landing/Pricing'
import CTAFooter from '../components/landing/CTAFooter'
import Footer from '../components/landing/Footer'

function SuccessBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between gap-4 px-5 py-4"
      style={{ background: 'linear-gradient(135deg, #1e1652 0%, #2a1a5e 100%)', borderBottom: '1px solid rgba(183,159,255,0.2)' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">🎉</span>
        <div>
          <p className="font-headline font-bold text-on-surface text-sm">Plano ativado com sucesso!</p>
          <p className="font-body text-xs text-on-surface-variant">Bem-vindo ao Yaya+. Baixe o app para comecar.</p>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-on-surface-variant hover:text-on-surface transition-colors text-xl leading-none flex-shrink-0"
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  )
}

export default function LandingPage() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('plano_ativado') === '1') {
      setShowBanner(true)
      // Remove o param da URL sem recarregar
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {showBanner && <SuccessBanner onDismiss={() => setShowBanner(false)} />}
      <Nav />
      <Hero />
      <TrustBar />
      <Problem />
      <Features />
      <Pricing />
      <CTAFooter />
      <Footer />
    </div>
  )
}
