import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

const plans = [
  {
    name: 'Mensal',
    price: 'R$ 29,90',
    period: '/mês',
    subtitle: '',
    features: [
      'Registros ilimitados',
      'Insights com IA',
      'Histórico completo',
      'Múltiplos bebês',
      'Compartilhar com família',
    ],
    cta: 'Assinar',
    popular: false,
  },
  {
    name: 'Anual',
    price: 'R$ 16,90',
    period: '/mês',
    subtitle: 'R$ 202,80/ano — economia de 43%',
    features: [
      'Tudo do mensal',
      'Economia de 43%',
      'Prioridade no suporte',
      'Novidades antecipadas',
      '12 meses de acesso',
    ],
    cta: 'Melhor custo-benefício',
    popular: true,
  },
  {
    name: 'Vitalício',
    price: 'R$ 299,90',
    period: '',
    subtitle: 'Pagamento único',
    features: [
      'Tudo do anual',
      'Acesso para sempre',
      'Próximos filhos inclusos',
      'Todas as futuras atualizações',
      'Suporte vitalício',
    ],
    cta: 'Garantir acesso',
    popular: false,
  },
]

export default function Pricing() {
  return (
    <section className="bg-[#0d0a27] py-24 sm:py-32">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Escolha o plano ideal
          </h2>
          <p className="text-[#b0adc4] text-base sm:text-lg">
            Comece grátis. Evolua quando quiser.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className={`relative rounded-2xl p-6 sm:p-8 border transition-all duration-300 ${
                plan.popular
                  ? 'bg-gradient-to-b from-[#1e1652] to-[#13103a] border-[#9580e6]/50 scale-100 md:scale-105 shadow-xl shadow-purple-500/10'
                  : 'bg-[#13103a] border-white/5 hover:border-white/10'
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: plan.popular ? 0.3 : 0.1 + i * 0.1 }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="relative px-4 py-1 rounded-full bg-gradient-to-r from-[#9580e6] to-[#6b4ec9] text-xs font-bold text-white flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    Mais popular
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-4">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-[#7a7890]">{plan.period}</span>
                  )}
                </div>
                {plan.subtitle && (
                  <p className="text-xs text-[#9580e6] mt-1 font-medium">{plan.subtitle}</p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#9580e6] mt-0.5 flex-none" />
                    <span className="text-sm text-[#b0adc4]">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-[#6b4ec9] to-[#9580e6] text-white hover:opacity-90 shadow-lg shadow-purple-500/20'
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="text-center text-xs text-[#7a7890] mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          Comece grátis. Sem cartão de crédito. Upgrade quando quiser.
        </motion.p>
      </div>
    </section>
  )
}
