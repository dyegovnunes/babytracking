// GuideCTA — ilha React para a landing pública de cada guia.
// Verifica sessão + compra + is_premium e exibe o CTA correto.
// Renderizado apenas no client (client:only="react") pois depende de auth state.

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useGuideAccess } from '../lib/useGuideAccess'

interface Props {
  guideSlug: string
  priceFormatted: string  // ex: "R$ 47"
}

export default function GuideCTA({ guideSlug, priceFormatted }: Props) {
  const access = useGuideAccess(guideSlug)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')
    try {
      const origin = window.location.origin
      const { data, error: fnErr } = await supabase.functions.invoke(
        'stripe-create-checkout-session',
        {
          body: {
            guide_slug: guideSlug,
            success_url: `${origin}/sua-biblioteca/checkout/sucesso?slug=${guideSlug}`,
            cancel_url: `${origin}/sua-biblioteca/${guideSlug}`,
          },
        }
      )
      if (fnErr || !data?.url) {
        throw new Error(fnErr?.message || 'Não foi possível iniciar o pagamento.')
      }
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message)
      setLoading(false)
    }
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (access.status === 'loading') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
        <div style={s.spinner} />
      </div>
    )
  }

  // ── Autorizado via Yaya+ Anual/Vitalício ───────────────────────────────────
  if (access.status === 'authorized' && access.accessVia === 'premium') {
    return (
      <a href={`/sua-biblioteca/${guideSlug}/ler`} style={{ ...s.btnPrimary, textDecoration: 'none', display: 'block', textAlign: 'center' as const }}>
        <span style={{ marginRight: 6 }}>💜</span> Acessar — incluso no seu plano
      </a>
    )
  }

  // ── Autorizado via compra ───────────────────────────────────────────────────
  if (access.status === 'authorized') {
    return (
      <a href={`/sua-biblioteca/${guideSlug}/ler`} style={{ ...s.btnPrimary, textDecoration: 'none', display: 'block', textAlign: 'center' as const }}>
        Continuar lendo →
      </a>
    )
  }

  // ── Sem sessão ou sem acesso ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'stretch' }}>
      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{ ...s.btnPrimary, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.65 : 1 }}
      >
        {loading ? 'Redirecionando…' : `Comprar ${priceFormatted}`}
      </button>

      {error && (
        <p style={{ color: '#ff7a90', fontSize: 13, textAlign: 'center' as const, margin: 0, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
          {error}
        </p>
      )}

      {/* Yaya+ Anual/Vitalício — alternativa via assinatura */}
      <div style={s.premiumBox}>
        <p style={{ ...s.bodySmall, margin: 0 }}>
          <strong style={{ color: '#b79fff' }}>Incluso no Yaya+ Anual e Vitalício</strong>
          {' '}— assine pelo app e acesse toda a biblioteca sem pagar por guia.{' '}
          <a href="https://yayababy.app" style={{ color: '#b79fff', textDecoration: 'underline' }}>
            Saiba mais
          </a>
        </p>
      </div>

      {/* "Já tenho acesso" — visível quando não tem sessão */}
      {access.status === 'no-session' && (
        <a
          href={`/sua-biblioteca/${guideSlug}/ler`}
          style={{ ...s.btnSecondary, textDecoration: 'none', display: 'block', textAlign: 'center' as const }}
        >
          Já tenho acesso — entrar
        </a>
      )}
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  spinner: {
    width: 20,
    height: 20,
    border: '2px solid rgba(183,159,255,0.25)',
    borderTopColor: '#b79fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  btnPrimary: {
    width: '100%',
    padding: '15px 24px',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
    fontFamily: 'Manrope, system-ui, sans-serif',
    letterSpacing: '0.01em',
    boxSizing: 'border-box' as const,
    boxShadow: '0 0 24px rgba(236,72,153,0.2)',
  },
  btnSecondary: {
    width: '100%',
    padding: '12px 20px',
    borderRadius: 12,
    border: '1px solid rgba(183,159,255,0.2)',
    background: 'transparent',
    color: 'rgba(231,226,255,0.6)',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    boxSizing: 'border-box' as const,
  },
  premiumBox: {
    padding: '11px 15px',
    background: 'rgba(183,159,255,0.07)',
    border: '1px solid rgba(183,159,255,0.14)',
    borderRadius: 10,
  },
  bodySmall: {
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    fontSize: 12,
    color: 'rgba(231,226,255,0.65)',
    lineHeight: 1.6,
  },
}
