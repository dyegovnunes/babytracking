import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

function AnimatedCounter({ value, suffix = '', decimals = 0, inView }: { value: number; suffix?: string; decimals?: number; inView: boolean }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    const duration = 1500
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(eased * value)
      if (progress < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [inView, value])

  const display = decimals > 0 ? count.toFixed(decimals) : Math.round(count).toLocaleString('pt-BR')

  return (
    <span>
      {display}{suffix}
    </span>
  )
}

const counters = [
  { value: 500, suffix: '+', label: 'famílias', decimals: 0 },
  { value: 10000, suffix: '+', label: 'registros', decimals: 0 },
  { value: 4.8, suffix: ' ★', label: 'avaliação', decimals: 1 },
  { value: 30, suffix: '+', label: 'dias de insights', decimals: 0 },
]

const badges = [
  'App Store', 'Google Play', 'Feito no Brasil', 'LGPD Compliant', 'Dados criptografados',
  'App Store', 'Google Play', 'Feito no Brasil', 'LGPD Compliant', 'Dados criptografados',
]

export default function SocialProof() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <section className="bg-[#0d0a27] py-24 sm:py-32 overflow-hidden" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Pais que já confiam no Yaya
          </h2>
        </motion.div>

        {/* Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {counters.map((counter, i) => (
            <motion.div
              key={i}
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#9580e6] to-[#c4b8f0] mb-2">
                <AnimatedCounter value={counter.value} suffix={counter.suffix} decimals={counter.decimals} inView={inView} />
              </p>
              <p className="text-sm text-[#7a7890]">{counter.label}</p>
            </motion.div>
          ))}
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
