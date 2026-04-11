import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Download, Fingerprint, TrendingUp } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Download,
    title: 'Baixe grátis',
    description: 'App Store ou Google Play.\nCadastro em 30 segundos.',
  },
  {
    number: 2,
    icon: Fingerprint,
    title: 'Registre com 1 toque',
    description: 'Amamentação, sono, fralda.\nTimer incluso. Sem complicação.',
  },
  {
    number: 3,
    icon: TrendingUp,
    title: 'Acompanhe a evolução',
    description: 'Insights inteligentes.\nRelatório para o pediatra.',
  },
]

function NumberTicker({ value, inView }: { value: number; inView: boolean }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 800
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      start = Math.round(eased * value)
      setCount(start)
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [inView, value])

  return <span>{count}</span>
}

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section className="bg-[#faf9ff] py-24 sm:py-32" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1145] mb-4">
            Simples assim.
          </h2>
          <p className="text-[#5a5678] text-base sm:text-lg">
            3 passos para nunca mais esquecer.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-px">
            <motion.div
              className="h-full bg-gradient-to-r from-transparent via-[#9580e6]/30 to-transparent"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ transformOrigin: 'left' }}
            />
          </div>

          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <motion.div
                key={i}
                className="relative text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.2 }}
              >
                {/* Number */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6b4ec9] to-[#9580e6] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/20">
                  <span className="text-2xl font-extrabold text-white">
                    <NumberTicker value={step.number} inView={inView} />
                  </span>
                </div>

                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-[#6b4ec9]/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-[#6b4ec9]" />
                </div>

                <h3 className="text-xl font-bold text-[#1a1145] mb-2">
                  {step.title}
                </h3>
                <div className="space-y-1">
                  {step.description.split('\n').map((line, j) => (
                    <p key={j} className="text-sm text-[#5a5678]">
                      {line}
                    </p>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
