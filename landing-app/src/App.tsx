import { useEffect, useState } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import TrustBar from './components/TrustBar'
import Problem from './components/Problem'
import Screenshots from './components/Screenshots'
import Features from './components/Features'
import Pricing from './components/Pricing'
import FinalCTA from './components/FinalCTA'
import Footer from './components/Footer'

function SuccessBanner({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #1e1652 0%, #2a1060 100%)',
        border: '1px solid rgba(183,159,255,0.3)',
        borderRadius: 16,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 24px rgba(183,159,255,0.15)',
        maxWidth: 420,
        width: 'calc(100vw - 48px)',
        fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>💜</span>
      <div style={{ flex: 1 }}>
        <p
          style={{
            color: '#e7e2ff',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'Manrope, system-ui, sans-serif',
            marginBottom: 2,
          }}
        >
          Yaya+ ativado!
        </p>
        <p style={{ color: 'rgba(231,226,255,0.6)', fontSize: 12 }}>
          Abra o app e faca login para comecar.
        </p>
      </div>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(231,226,255,0.4)',
          fontSize: 18,
          cursor: 'pointer',
          padding: '0 4px',
          flexShrink: 0,
        }}
        aria-label="Fechar"
      >
        ×
      </button>
    </div>
  )
}

export default function App() {
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('plano_ativado') === '1') {
      setShowSuccess(true)
      // Clean URL without reload
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <div className="min-h-screen bg-night text-cloud">
      <Nav />
      <Hero />
      <TrustBar />
      <Problem />
      <Screenshots />
      <Features />
      <Pricing />
      <FinalCTA />
      <Footer />
      {showSuccess && <SuccessBanner onClose={() => setShowSuccess(false)} />}
    </div>
  )
}
