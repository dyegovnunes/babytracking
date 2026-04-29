import { useState } from 'react'
import { supabase } from '../lib/supabase'

const plans = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 'R$ 34,90',
    period: '/mês',
    note: 'Cancele quando quiser',
    highlight: false,
    badge: null as string | null,
    includesLibrary: false,
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 'R$ 249,90',
    period: '/ano',
    note: '≈ R$ 20,83 por mês · economize 40%',
    highlight: true,
    badge: 'Mais popular',
    includesLibrary: true,
  },
  {
    id: 'lifetime',
    name: 'Vitalício',
    price: 'R$ 449,90',
    period: 'pagamento único',
    note: 'Pague uma vez, acesse para sempre',
    highlight: false,
    badge: null as string | null,
    includesLibrary: true,
  },
]

const features = [
  'Registros ilimitados',
  'Histórico completo',
  'Múltiplos bebês',
  'Insights com IA',
  'Família conectada',
  'Relatório para pediatra',
]

const s: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: 20,
    maxWidth: 740,
    margin: '0 auto',
  },
  cardWrap: {
    position: 'relative',
    borderRadius: 20,
  },
  cardInner: {
    borderRadius: 18,
    padding: '28px 22px',
    boxSizing: 'border-box' as const,
  },
  badge: {
    position: 'absolute' as const,
    top: -14,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(90deg, #9580e6 0%, #6b4ec9 100%)',
    color: '#fff',
    fontSize: 11,
    fontWeight: 700,
    padding: '4px 14px',
    borderRadius: 99,
    whiteSpace: 'nowrap' as const,
    fontFamily: 'Manrope, system-ui, sans-serif',
  },
  planLabel: {
    color: '#b0adc4',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
    fontFamily: 'Manrope, system-ui, sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  price: {
    color: '#ffffff',
    fontSize: 34,
    fontWeight: 800,
    fontFamily: 'Manrope, system-ui, sans-serif',
    lineHeight: 1,
  },
  period: {
    color: '#7a7890',
    fontSize: 12,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    marginLeft: 4,
  },
  note: {
    fontSize: 12,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    marginTop: 6,
    marginBottom: 20,
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 22px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    color: 'rgba(231,226,255,0.65)',
  },
  featureDot: {
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: '#9580e6',
    flexShrink: 0,
  },
  libraryTag: {
    display: 'inline-block',
    fontSize: 10,
    fontFamily: 'Manrope, system-ui, sans-serif',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(245,200,66,0.1)',
    color: '#f5c842',
    border: '1px solid rgba(245,200,66,0.2)',
    marginBottom: 16,
  },
  btn: {
    width: '100%',
    padding: '13px 20px',
    borderRadius: 12,
    border: 'none',
    fontSize: 14,
    fontWeight: 700,
    fontFamily: 'Manrope, system-ui, sans-serif',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    boxSizing: 'border-box' as const,
  },
  error: {
    color: '#ff7a90',
    fontSize: 13,
    textAlign: 'center' as const,
    marginTop: 16,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  },
  footer: {
    color: '#5a5678',
    fontSize: 12,
    textAlign: 'center' as const,
    marginTop: 20,
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
  },
}

export default function SubscriptionPlans() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function handleCheckout(planId: string) {
    setLoading(planId)
    setError('')
    try {
      const origin = window.location.origin
      const { data, error: fnErr } = await supabase.functions.invoke(
        'stripe-create-subscription-session',
        {
          body: {
            plan: planId,
            success_url: `${origin}/assinar/sucesso`,
            cancel_url:  `${origin}/assinar`,
          },
        }
      )
      if (fnErr || !data?.url) {
        throw new Error(fnErr?.message || 'Não foi possível iniciar o pagamento.')
      }
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message)
      setLoading(null)
    }
  }

  return (
    <div>
      <div style={s.grid}>
        {plans.map((plan) => {
          const isLoading = loading === plan.id
          const isDisabled = loading !== null

          const wrapStyle: React.CSSProperties = {
            ...s.cardWrap,
            padding: plan.highlight ? 1 : 0,
            background: plan.highlight
              ? 'linear-gradient(135deg, #9580e6 0%, #6b4ec9 100%)'
              : 'transparent',
          }

          const innerStyle: React.CSSProperties = {
            ...s.cardInner,
            background: plan.highlight ? '#1e1652' : '#13103a',
            border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.06)',
          }

          const btnStyle: React.CSSProperties = {
            ...s.btn,
            background: plan.highlight
              ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
              : 'rgba(255,255,255,0.06)',
            color: '#ffffff',
            boxShadow: plan.highlight ? '0 0 20px rgba(236,72,153,0.22)' : 'none',
            opacity: isDisabled && !isLoading ? 0.45 : 1,
            cursor: isDisabled ? 'default' : 'pointer',
          }

          return (
            <div key={plan.id} style={wrapStyle}>
              <div style={innerStyle}>
                {plan.badge && (
                  <div style={s.badge}>✦ {plan.badge}</div>
                )}

                <p style={s.planLabel}>{plan.name}</p>

                <div style={{ display: 'flex', alignItems: 'baseline' }}>
                  <span style={s.price}>{plan.price}</span>
                  <span style={s.period}>{plan.period}</span>
                </div>

                <p style={{ ...s.note, color: plan.highlight ? '#b79fff' : '#7a7890' }}>
                  {plan.note}
                </p>

                {plan.includesLibrary && (
                  <span style={s.libraryTag}>📚 + Biblioteca de Guias</span>
                )}

                <ul style={s.featureList}>
                  {features.map((f) => (
                    <li key={f} style={s.featureItem}>
                      <span style={s.featureDot} />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={isDisabled}
                  style={btnStyle}
                >
                  {isLoading ? 'Redirecionando…' : 'Assinar agora'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {error && <p style={s.error}>{error}</p>}

      <p style={s.footer}>
        Pagamento seguro via Stripe · Sem taxas escondidas · Cancele quando quiser (mensal e anual)
      </p>
    </div>
  )
}
