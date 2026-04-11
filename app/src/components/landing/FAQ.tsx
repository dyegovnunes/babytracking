import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Plus } from 'lucide-react'

const faqs = [
  {
    q: 'O Yaya é grátis?',
    a: 'Sim! O plano gratuito permite até 5 registros por dia, histórico de 3 dias e 1 bebê. Para registros ilimitados, insights e mais, conheça o Yaya+.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Sim. Usamos criptografia de ponta a ponta e seguimos a LGPD. Seus dados nunca são compartilhados com terceiros.',
  },
  {
    q: 'Posso compartilhar com minha babá ou minha mãe?',
    a: 'Sim! No Yaya+, você pode convidar cuidadores para registrar junto. Cada um com seu perfil, todos os dados sincronizados.',
  },
  {
    q: 'Funciona offline?',
    a: 'Os registros são salvos localmente e sincronizam quando voltar a conexão.',
  },
  {
    q: 'Posso acompanhar mais de um bebê?',
    a: 'Sim, no Yaya+. Gêmeos, irmãos — cada um com seu perfil e insights.',
  },
  {
    q: 'O que é o relatório para o pediatra?',
    a: 'Um PDF profissional com 30 dias de dados: médias, gráficos de tendência e padrões de sono e alimentação. Gere com 1 toque antes da consulta.',
  },
  {
    q: 'Funciona no iPhone e no Android?',
    a: 'Sim, disponível na App Store e na Google Play.',
  },
  {
    q: 'Posso cancelar a assinatura a qualquer momento?',
    a: 'Sim, sem multa e sem complicação. Direto pela loja (App Store ou Google Play).',
  },
]

function FAQItem({ faq, index }: { faq: typeof faqs[0]; index: number }) {
  const [open, setOpen] = useState(false)

  return (
    <motion.div
      className="border-b border-[#e7e2ff]/30 last:border-0"
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-base font-semibold text-[#1a1145] group-hover:text-[#6b4ec9] transition-colors">
          {faq.q}
        </span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-none"
        >
          <Plus className="w-5 h-5 text-[#6b4ec9]" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-[#5a5678] leading-relaxed pr-10">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  return (
    <section className="bg-[#faf9ff] py-24 sm:py-32">
      <div className="max-w-2xl mx-auto px-6">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1a1145] mb-4">
            Perguntas frequentes
          </h2>
        </motion.div>

        <div className="bg-white rounded-2xl border border-[#e7e2ff]/50 shadow-sm px-6">
          {faqs.map((faq, i) => (
            <FAQItem key={i} faq={faq} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
