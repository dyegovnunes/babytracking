import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import { Download, Fingerprint, TrendingUp } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Download,
    title: 'Baixe grátis',
    description: 'App Store ou Google Play. Cadastro em 30 segundos.',
  },
  {
    number: 2,
    icon: Fingerprint,
    title: 'Registre com 1 toque',
    description: 'Amamentação, sono, fralda. Timer incluso.',
  },
  {
    number: 3,
    icon: TrendingUp,
    title: 'Acompanhe a evolução',
    description: 'Insights inteligentes. Relatório para o pediatra.',
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
    <section className="bg-[#0d0a27] py-20 sm:py-24" ref={ref}>
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Simples assim.
          </h2>
          <p className="text-[#b0adc4] text-base sm:text-lg">
            3 passos para nunca mais esquecer.
          </p>
        </motion.div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-px">
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
                transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6b4ec9] to-[#9580e6] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                  <span className="text-lg font-extrabold text-white">
                    <NumberTicker value={step.number} inView={inView} />
                  </span>
                </div>

                <div className="w-10 h-10 rounded-lg bg-[#6b4ec9]/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-[#9580e6]" />
                </div>

                <h3 className="text-lg font-bold text-white mb-1.5">
                  {step.title}
                </h3>
                <p className="text-sm text-[#b0adc4]">
                  {step.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
