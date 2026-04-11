import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

const testimonials = [
  {
    text: 'Finalmente consigo responder o pediatra sem ficar tentando lembrar.',
    name: 'Ana',
    role: 'mãe do Theo (4 meses)',
    stars: 5,
    large: true,
  },
  {
    text: 'Minha babá registra tudo e eu acompanho do trabalho. Game changer.',
    name: 'Carla',
    role: 'mãe da Sofia (8 meses)',
    stars: 5,
    large: false,
  },
  {
    text: 'O insight de sono me salvou. Entendi que meu filho precisava dormir mais cedo.',
    name: 'Rafael',
    role: 'pai do Bento (6 meses)',
    stars: 5,
    large: true,
  },
  {
    text: 'Uso desde o nascimento. Tenho todo o histórico dos primeiros 100 dias.',
    name: 'Juliana',
    role: 'mãe da Helena (3 meses)',
    stars: 5,
    large: false,
  },
  {
    text: 'Simples. Bonito. Funciona. É tudo que eu precisava.',
    name: 'Marcos',
    role: 'pai do Miguel (2 meses)',
    stars: 5,
    large: true,
  },
]

export default function Testimonials() {
  return (
    <section className="bg-[#faf9ff] py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1145] mb-4">
            O que pais estão dizendo
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              className={`relative rounded-2xl bg-white border border-[#e7e2ff]/50 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${
                t.large && i === 0 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-[#f59e0b] text-[#f59e0b]" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-[#1a1145] text-base leading-relaxed mb-6 font-medium">
                "{t.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9580e6] to-[#6b4ec9] flex items-center justify-center text-white font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a1145]">{t.name}</p>
                  <p className="text-xs text-[#5a5678]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
