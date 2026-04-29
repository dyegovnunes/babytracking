import { useState } from 'react'
import { useReveal } from '../../hooks/useReveal'
import { supabase } from '../../lib/supabase'

const plans = [
  {
    id: 'monthly',
    name: 'Mensal',
    price: 'R$ 34,90',
    period: '/mes',
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
    note: '≈ R$ 20,83/mes · economize 40%',
    highlight: true,
    badge: 'Mais popular',
    includesLibrary: true,
  },
  {
    id: 'lifetime',
    name: 'Vitalicio',
    price: 'R$ 449,90',
    period: 'unico',
    note: 'Pague uma vez, acesse para sempre',
    highlight: false,
    badge: null as string | null,
    includesLibrary: true,
  },
]

const features = [
  'Registros ilimitados',
  'Historico completo',
  'Multiplos bebes',
  'Insights com IA',
  'Familia conectada',
  'Relatorio para pediatra',
]

export default function Pricing() {
  const ref = useReveal()
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
            success_url: `${origin}/?plano_ativado=1`,
            cancel_url: `${origin}/#planos`,
          },
        }
      )
      if (fnErr || !data?.url) {
        throw new Error(fnErr?.message || 'Nao foi possivel iniciar o pagamento.')
      }
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message)
      setLoading(null)
    }
  }

  return (
    <section ref={ref} className="reveal py-20 px-5" id="planos">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="font-headline text-xs font-bold uppercase tracking-[0.18em] text-primary/70 mb-3">
            Planos Yaya+
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold mb-3">
            Comece gratis.{' '}
            <span className="text-primary">Evolua quando quiser.</span>
          </h2>
          <p className="font-body text-on-surface-variant">
            Todos os planos desbloqueiam o Yaya+ completo. Anual e Vitalicio incluem a Biblioteca de Guias.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {plans.map((plan) => {
            const isLoading = loading === plan.id
            const isDisabled = loading !== null

            return (
              <div
                key={plan.id}
                className="relative"
                style={{
                  borderRadius: 20,
                  padding: plan.highlight ? 1 : 0,
                  background: plan.highlight
                    ? 'linear-gradient(135deg, #b79fff 0%, #8b5cf6 100%)'
                    : 'transparent',
                }}
              >
                <div
                  style={{
                    borderRadius: plan.highlight ? 19 : 20,
                    padding: '28px 22px',
                    height: '100%',
                    boxSizing: 'border-box',
                    background: plan.highlight ? '#1e1652' : 'rgba(255,255,255,0.04)',
                    border: plan.highlight ? 'none' : '1px solid rgba(183,159,255,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(90deg, #b79fff 0%, #8b5cf6 100%)',
                        color: '#0d0a27',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '4px 14px',
                        borderRadius: 99,
                        whiteSpace: 'nowrap',
                        fontFamily: 'Manrope, system-ui, sans-serif',
                      }}
                    >
                      ✦ {plan.badge}
                    </div>
                  )}

                  <p style={{ color: 'rgba(231,226,255,0.55)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'Manrope, system-ui, sans-serif', marginBottom: 8 }}>
                    {plan.name}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ color: '#e7e2ff', fontSize: 32, fontWeight: 800, fontFamily: 'Manrope, system-ui, sans-serif', lineHeight: 1 }}>
                      {plan.price}
                    </span>
                    <span style={{ color: 'rgba(231,226,255,0.4)', fontSize: 12, fontFamily: 'Manrope, system-ui, sans-serif' }}>
                      {plan.period}
                    </span>
                  </div>

                  <p style={{ fontSize: 12, fontFamily: 'Manrope, system-ui, sans-serif', color: plan.highlight ? '#b79fff' : 'rgba(231,226,255,0.4)', marginBottom: plan.includesLibrary ? 12 : 20 }}>
                    {plan.note}
                  </p>

                  {plan.includesLibrary && (
                    <span style={{ display: 'inline-block', fontSize: 11, fontFamily: 'Manrope, system-ui, sans-serif', fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: 'rgba(245,200,66,0.1)', color: '#f5c842', border: '1px solid rgba(245,200,66,0.2)', marginBottom: 16, width: 'fit-content' }}>
                      📚 + Biblioteca de Guias
                    </span>
                  )}

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    {features.map((f) => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontFamily: 'Manrope, system-ui, sans-serif', color: 'rgba(231,226,255,0.65)' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#b79fff', flexShrink: 0 }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleCheckout(plan.id)}
                    disabled={isDisabled}
                    style={{
                      width: '100%',
                      padding: '13px 20px',
                      borderRadius: 12,
                      border: 'none',
                      background: plan.highlight
                        ? 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)'
                        : 'rgba(183,159,255,0.1)',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: 'Manrope, system-ui, sans-serif',
                      cursor: isDisabled ? 'default' : 'pointer',
                      opacity: isDisabled && !isLoading ? 0.45 : 1,
                      boxShadow: plan.highlight ? '0 0 24px rgba(236,72,153,0.22)' : 'none',
                      transition: 'opacity 0.2s',
                      boxSizing: 'border-box',
                    }}
                  >
                    {isLoading ? 'Redirecionando...' : 'Assinar agora'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <p className="font-body text-sm text-center mb-4" style={{ color: '#ff7a90' }}>
            {error}
          </p>
        )}

        <p className="font-body text-xs text-on-surface-variant/50 text-center">
          Pagamento seguro via Stripe · Cancele quando quiser (mensal e anual) · Sem taxas escondidas
        </p>

        <div className="flex items-center gap-4 my-10">
          <div className="flex-1 h-px bg-primary/10" />
          <span className="font-body text-xs text-on-surface-variant/40">ou comece pelo app</span>
          <div className="flex-1 h-px bg-primary/10" />
        </div>

        <div className="glass rounded-2xl p-6 text-center max-w-md mx-auto">
          <h3 className="font-headline font-bold text-on-surface mb-2">Yaya Free</h3>
          <p className="font-body text-sm text-on-surface-variant mb-4">
            Baixe gratis e comece a usar agora. Upgrade para Yaya+ quando quiser.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href="https://apps.apple.com/app/yaya-baby"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl border border-primary/25 text-primary font-headline font-bold text-sm hover:bg-primary/10 transition-colors"
            >
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=app.yayababy"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl border border-primary/25 text-primary font-headline font-bold text-sm hover:bg-primary/10 transition-colors"
            >
              Google Play
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
