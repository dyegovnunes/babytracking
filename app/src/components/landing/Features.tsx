import { motion } from 'framer-motion'
import { Baby, Moon, Droplets, BarChart3, Users, FileText } from 'lucide-react'

const features = [
  {
    icon: Baby,
    title: 'Registro em 1 toque',
    description: 'Timer, lado, duração. Sem formulários.',
    label: 'Amamentação',
    gradient: 'from-purple-500/10 to-purple-600/5',
  },
  {
    icon: Moon,
    title: 'Sono monitorado',
    description: 'Início, fim, tempo total. Previsão inteligente.',
    label: 'Sono',
    gradient: 'from-indigo-500/10 to-indigo-600/5',
  },
  {
    icon: Droplets,
    title: 'Fraldas rastreadas',
    description: 'Xixi, cocô, contagem diária.',
    label: 'Fraldas',
    gradient: 'from-sky-500/10 to-sky-600/5',
  },
  {
    icon: BarChart3,
    title: 'Insights por fase',
    description: 'Dados que evoluem com seu bebê, de 0 a 24 meses.',
    label: 'Insights',
    gradient: 'from-emerald-500/10 to-emerald-600/5',
  },
  {
    icon: Users,
    title: 'Família conectada',
    description: 'Babá, avó, pai — todos registram juntos.',
    label: 'Compartilhar',
    gradient: 'from-pink-500/10 to-pink-600/5',
  },
  {
    icon: FileText,
    title: 'Relatório pro pediatra',
    description: 'PDF profissional com 30 dias de dados. 1 clique.',
    label: 'Pediatra',
    gradient: 'from-amber-500/10 to-amber-600/5',
  },
]

export default function Features() {
  return (
    <section className="bg-[#13103a] py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Tudo que você precisa,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9580e6] to-[#c4b8f0]">
              nada que você não precisa.
            </span>
          </h2>
          <p className="text-[#b0adc4] text-base sm:text-lg max-w-md mx-auto">
            Simples de usar, mesmo com uma mão só e o bebê no colo.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={i}
                className={`group relative rounded-2xl border border-white/5 bg-gradient-to-br ${feature.gradient} backdrop-blur-sm p-5 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/5 hover:border-white/10`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className="w-9 h-9 rounded-lg bg-[#9580e6]/10 flex items-center justify-center mb-3 group-hover:bg-[#9580e6]/20 transition-colors">
                  <Icon className="w-4.5 h-4.5 text-[#9580e6]" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#b0adc4] leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
