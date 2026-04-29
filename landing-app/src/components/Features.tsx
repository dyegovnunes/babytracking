import { useReveal } from '../hooks/useReveal'

const features = [
  {
    emoji: '🤱',
    title: 'Amamentacao',
    desc: 'Cronometre mama esquerda e direita. Nunca mais esqueca qual lado foi.',
  },
  {
    emoji: '💧',
    title: 'Fraldas',
    desc: 'Xixi, coco ou os dois. Registre em um segundo.',
  },
  {
    emoji: '🌙',
    title: 'Sono',
    desc: 'Timer automatico. Veja quantas horas ele dormiu de verdade.',
  },
  {
    emoji: '🛁',
    title: 'Banho e cuidados',
    desc: 'Horarios agendados com lembrete 15 min antes.',
  },
  {
    emoji: '👨\u200D👩\u200D👧',
    title: 'Multi-cuidador',
    desc: 'Compartilhe com o parceiro, avos ou baba. Todo mundo sincronizado.',
  },
  {
    emoji: '🩺',
    title: 'PDF para pediatra',
    desc: 'Relatorio completo para levar na consulta. Seu pediatra vai agradecer.',
  },
]

export default function Features() {
  const ref = useReveal()

  return (
    <section ref={ref} className="reveal py-20 px-5" id="features">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-headline text-xs font-bold text-purple/70 uppercase tracking-widest mb-3">
            Funcionalidades
          </p>
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold">
            Tudo que pais de recem-nascido <span className="text-purple">realmente precisam.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-6 hover:border-purple/25 transition-colors"
            >
              <span className="text-3xl mb-4 block">{f.emoji}</span>
              <h3 className="font-headline text-base font-bold text-cloud mb-2">{f.title}</h3>
              <p className="font-body text-sm text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
