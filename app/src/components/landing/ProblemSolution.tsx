import { motion } from 'framer-motion'

const steps = [
  {
    lines: [
      '"Quantas vezes amamentou hoje?"',
      '"Quando foi a última fralda?"',
      '"A que horas dormiu ontem?"',
    ],
    text: 'Toda mãe e todo pai já se perguntou isso.\nNo meio da exaustão, lembrar é impossível.',
  },
  {
    lines: [],
    text: 'Anotações em papel se perdem.\nApps genéricos são complicados demais.\nE o pediatra sempre pergunta o que você não lembra.',
  },
  {
    lines: [],
    text: 'O Yaya nasceu pra resolver isso.\n1 toque. Pronto. Registrado.\nSem formulários. Sem complicação.',
    highlight: true,
  },
]

export default function ProblemSolution() {
  return (
    <section className="bg-[#faf9ff] py-24 sm:py-32">
      <div className="max-w-3xl mx-auto px-6 space-y-32">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            className="text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {step.lines.length > 0 && (
              <div className="mb-8 space-y-2">
                {step.lines.map((line, j) => (
                  <motion.p
                    key={j}
                    className="text-xl sm:text-2xl lg:text-3xl font-bold text-[#1a1145] italic"
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 + j * 0.15 }}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>
            )}
            <div className="space-y-1">
              {step.text.split('\n').map((line, j) => (
                <p
                  key={j}
                  className={`text-lg sm:text-xl lg:text-2xl leading-relaxed ${
                    step.highlight
                      ? 'font-bold text-[#6b4ec9]'
                      : 'text-[#5a5678]'
                  }`}
                >
                  {line}
                </p>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
