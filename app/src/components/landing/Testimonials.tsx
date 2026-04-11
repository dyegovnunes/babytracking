import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    text: 'Finalmente consigo responder o pediatra sem ficar tentando lembrar.',
    name: 'Ana',
    role: 'mãe do Theo, 4 meses',
  },
  {
    text: 'Minha babá registra tudo e eu acompanho do trabalho. Game changer.',
    name: 'Carla',
    role: 'mãe da Sofia, 8 meses',
  },
  {
    text: 'O insight de sono me salvou. Entendi que meu filho precisava dormir mais cedo.',
    name: 'Rafael',
    role: 'pai do Bento, 6 meses',
  },
  {
    text: 'Simples. Bonito. Funciona. É tudo que eu precisava.',
    name: 'Marcos',
    role: 'pai do Miguel, 2 meses',
  },
]

export default function Testimonials() {
  return (
    <section className="bg-[#0d0a27] py-20 sm:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            O que pais estão dizendo
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className="relative rounded-xl bg-white/[0.04] border border-white/[0.08] p-5 hover:bg-white/[0.06] transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
            >
              <Quote className="w-5 h-5 text-[#9580e6]/30 mb-3" />

              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="w-3.5 h-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                ))}
              </div>

              <p className="text-white/90 text-sm leading-relaxed mb-4">
                "{t.text}"
              </p>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#9580e6] to-[#6b4ec9] flex items-center justify-center text-white font-bold text-xs">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{t.name}</p>
                  <p className="text-[11px] text-[#7a7890]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
