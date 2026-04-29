import { useReveal } from '../hooks/useReveal'

const screens = [
  {
    title: 'Registre em 1 toque',
    desc: 'Botoes grandes, pensados para a madrugada.',
    content: (
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {['🤱 E', '🤱 D', '🤱 E+D', '🍼', '💧', '💩'].map((e, i) => (
            <div key={i} className="rounded-lg bg-surface-high py-3 text-center text-sm border border-white/5">
              {e}
            </div>
          ))}
        </div>
        <div className="rounded-lg bg-purple/10 border border-purple/20 p-3 text-center">
          <p className="text-[10px] text-muted">Ultimo registro</p>
          <p className="text-xs text-purple font-bold">🤱 Peito Dir. — 8min atras</p>
        </div>
      </div>
    ),
  },
  {
    title: 'Veja o dia inteiro',
    desc: 'Todos os registros com horarios e duracao.',
    content: (
      <div className="p-4 space-y-2">
        {[
          { time: '09:15', icon: '🤱', label: 'Peito Dir.' },
          { time: '08:30', icon: '💧', label: 'Fralda Xixi' },
          { time: '07:45', icon: '☀️', label: 'Acordou' },
          { time: '06:00', icon: '🍼', label: 'Mamadeira 90ml' },
          { time: '03:20', icon: '🤱', label: 'Peito Esq.' },
        ].map((log, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-high/50 border border-white/5">
            <span className="text-[10px] text-muted font-mono">{log.time}</span>
            <span className="text-sm">{log.icon}</span>
            <span className="text-[11px] text-cloud">{log.label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Entenda os padroes',
    desc: 'Graficos de sono e mamadas. O Yaya interpreta por voce.',
    content: (
      <div className="p-4 space-y-3">
        <div className="rounded-lg bg-surface-high/50 border border-white/5 p-3">
          <p className="text-[9px] text-muted mb-1">MAMADAS HOJE</p>
          <p className="text-lg text-purple font-bold font-headline">6</p>
          <p className="text-[9px] text-muted">Media: 2h40 entre mamadas</p>
        </div>
        <div className="rounded-lg bg-surface-high/50 border border-white/5 p-3">
          <p className="text-[9px] text-muted mb-1">SONO TOTAL</p>
          <p className="text-lg text-purple font-bold font-headline">4h20</p>
          <p className="text-[9px] text-muted">3 sonecas · Maior: 1h45</p>
        </div>
        <div className="flex gap-1 items-end h-10 px-2">
          {[40, 65, 50, 80, 55, 70, 60].map((h, i) => (
            <div key={i} className="flex-1 rounded-sm bg-purple/30" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    ),
  },
]

export default function Screenshots() {
  const ref = useReveal()

  return (
    <section ref={ref} className="reveal py-20 px-5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold mb-3">
            Simples de usar. <span className="text-purple">Poderoso para entender.</span>
          </h2>
          <p className="font-body text-muted">
            Feito para funcionar com uma mao, no escuro, sem oculos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {screens.map((screen, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="relative mb-6">
                <div
                  className="absolute inset-0 -m-4 rounded-[40px]"
                  style={{ background: 'radial-gradient(circle, rgba(171,142,254,0.1) 0%, transparent 70%)' }}
                />
                <div className="phone-frame !w-[220px] !h-[440px] md:!w-[240px] md:!h-[480px]">
                  <div className="phone-notch !w-[80px] !h-[20px]" />
                  {screen.content}
                </div>
              </div>
              <h3 className="font-headline text-lg font-bold text-cloud mb-1">{screen.title}</h3>
              <p className="font-body text-sm text-muted text-center">{screen.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
