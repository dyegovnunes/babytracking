import { motion } from 'framer-motion'
import { Check, Sparkles, X } from 'lucide-react'

const plans = [
  {
    name: 'Yaya Free',
    price: 'Grátis',
    period: '',
    subtitle: 'Para sempre',
    features: [
      { text: 'Até 5 registros por dia', included: true },
      { text: 'Histórico de 3 dias', included: true },
      { text: '1 bebê', included: true },
      { text: 'Insights com IA', included: false },
      { text: 'Compartilhar com família', included: false },
      { text: 'Relatório para pediatra', included: false },
    ],
    cta: 'Começar grátis',
    highlighted: false,
  },
  {
    name: 'Yaya+',
    price: 'R$ 16,90',
    period: '/mês',
    subtitle: 'a partir de — planos mensal, anual e vitalício',
    features: [
      { text: 'Registros ilimitados', included: true },
      { text: 'Histórico completo', included: true },
      { text: 'Múltiplos bebês', included: true },
      { text: 'Insights com IA', included: true },
      { text: 'Compartilhar com família', included: true },
      { text: 'Relatório para pediatra', included: true },
    ],
    cta: 'Assinar Yaya+',
    highlighted: true,
  },
]

export default function Pricing() {
  return (
    <section className="bg-gradient-to-b from-[#0d0a27] to-[#13103a] py-24 sm:py-32">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="text-center mb-14"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              className={`relative rounded-2xl p-6 sm:p-8 border transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-[#1e1652] to-[#13103a] border-[#9580e6]/50 shadow-xl shadow-purple-500/10'
                  : 'bg-[#13103a] border-white/5 hover:border-white/10'
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <div className="relative px-4 py-1 rounded-full bg-gradient-to-r from-[#9580e6] to-[#6b4ec9] text-xs font-bold text-white flex items-center gap-1 shadow-lg">
                    <Sparkles className="w-3 h-3" />
                    Recomendado
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && (
                    <span className="text-sm text-[#7a7890]">{plan.period}</span>
                  )}
                </div>
                {plan.subtitle && (
                  <p className="text-xs text-[#9580e6] mt-1.5 font-medium">{plan.subtitle}</p>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-[#9580e6] mt-0.5 flex-none" />
                    ) : (
                      <X className="w-4 h-4 text-[#5a5678] mt-0.5 flex-none" />
                    )}
                    <span className={`text-sm ${feature.included ? 'text-[#b0adc4]' : 'text-[#5a5678]'}`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  plan.highlighted
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
          Sem cartão de crédito para o plano grátis. Cancele a qualquer momento.
        </motion.p>
      </div>
    </section>
  )
}
