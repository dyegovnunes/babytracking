import { motion } from 'framer-motion'
import { Shield, Smartphone, Lock, Heart } from 'lucide-react'

const trustItems = [
  {
    icon: Smartphone,
    title: 'App Store & Google Play',
    description: 'Disponível nas duas plataformas',
  },
  {
    icon: Lock,
    title: 'Dados criptografados',
    description: 'Seus dados nunca são compartilhados',
  },
  {
    icon: Shield,
    title: 'LGPD Compliant',
    description: 'Privacidade levada a sério',
  },
  {
    icon: Heart,
    title: 'Feito no Brasil',
    description: 'Por pais, para pais',
  },
]

const badges = [
  'App Store', 'Google Play', 'Feito no Brasil', 'LGPD Compliant', 'Dados criptografados', 'Suporte rápido',
  'App Store', 'Google Play', 'Feito no Brasil', 'LGPD Compliant', 'Dados criptografados', 'Suporte rápido',
]

export default function SocialProof() {
  return (
    <section className="bg-gradient-to-b from-[#13103a] to-[#0d0a27] py-20 sm:py-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Confiança e segurança
          </h2>
          <p className="text-[#b0adc4] text-base sm:text-lg max-w-lg mx-auto">
            Seus dados são seus. Privacidade e segurança são prioridade.
          </p>
        </motion.div>

        {/* Trust grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {trustItems.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={i}
                className="text-center p-4 rounded-xl border border-white/5 bg-white/[0.03]"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-10 h-10 rounded-lg bg-[#9580e6]/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-[#9580e6]" />
                </div>
                <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                <p className="text-xs text-[#7a7890]">{item.description}</p>
              </motion.div>
            )
          })}
        </div>

        {/* Marquee */}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#0d0a27] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0d0a27] to-transparent z-10" />
          <div className="flex animate-marquee">
            {badges.map((badge, i) => (
              <div
                key={i}
                className="flex-none mx-3 px-5 py-2.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-[#b0adc4] whitespace-nowrap"
              >
                {badge}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
