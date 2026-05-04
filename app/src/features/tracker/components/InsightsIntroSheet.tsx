// Sheet explicativa disparada pelos passos de "descoberta de padrões" da DiscoveryTrail.
// Três variantes por step.id:
//   'insights'   — 0-3m: padrões identificados pelo motor de análise
//   'milestones' — 3-12m: marcos de desenvolvimento
//   'leaps'      — 12m+: saltos de desenvolvimento
//
// O "durante" (a ação em si) acontece ao clicar no CTA — navega para a rota correta.

import { useNavigate } from 'react-router-dom'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight } from '../../../lib/haptics'
import { contractionDe, article, type Gender } from '../../../lib/genderUtils'

type StepId = 'insights' | 'milestones' | 'leaps'

interface Props {
  isOpen: boolean
  stepId: StepId
  babyName: string
  babyGender?: Gender
  onClose: () => void
}

interface StepContent {
  emoji: string
  title: (name: string, de: string, art: string) => string
  body: (name: string, de: string, art: string) => string
  items: { emoji: string; title: string; desc: string }[]
  ctaLabel: string
  destination: string
}

const CONTENT: Record<StepId, StepContent> = {
  insights: {
    emoji: '✨',
    title: (n, de) => `Os padrões ${de} ${n}`,
    body: (n, _de, art) =>
      `O Yaya analisa tudo que você registra e encontra padrões que passam batido no dia a dia. Quanto tempo ${art} ${n} fica acordado antes de ficar irritado. Em que hora do dia ele come mais. Quando o sono começa a mudar.`,
    items: [
      {
        emoji: '📈',
        title: 'Padrões de sono',
        desc: 'Horários, duração e fragmentação. O Yaya identifica o que é normal para o seu bebê.',
      },
      {
        emoji: '🍼',
        title: 'Ritmo de alimentação',
        desc: 'Frequência e volume ao longo do dia. Ajuda a antecipar fome e agitação.',
      },
      {
        emoji: '⚠️',
        title: 'Desvios do padrão',
        desc: 'Quando algo muda em relação ao histórico, o app destaca antes que você perceba.',
      },
    ],
    ctaLabel: 'Ver o que o Yaya descobriu',
    destination: '/insights',
  },
  milestones: {
    emoji: '🌱',
    title: (n, de) => `O desenvolvimento ${de} ${n}`,
    body: (n, _de, art) =>
      `Cada coisa nova que ${art} ${n} faz é um marco. Registrar aqui cria uma linha do tempo que você vai querer olhar para sempre. E que o pediatra usa para acompanhar o desenvolvimento.`,
    items: [
      {
        emoji: '📅',
        title: 'Linha do tempo do bebê',
        desc: 'Cada marco fica registrado com a data. Uma memória e uma ferramenta clínica ao mesmo tempo.',
      },
      {
        emoji: '🩺',
        title: 'Dados para o pediatra',
        desc: 'Os marcos aparecem no Super Relatório. O pediatra vê a evolução sem precisar perguntar.',
      },
      {
        emoji: '🎯',
        title: 'Referências por faixa etária',
        desc: 'O app mostra o que esperar de cada fase, com base nas diretrizes de desenvolvimento.',
      },
    ],
    ctaLabel: 'Explorar os marcos',
    destination: '/milestones',
  },
  leaps: {
    emoji: '🚀',
    title: (n, de) => `Os saltos ${de} ${n}`,
    body: (_n, _de, _art) =>
      `Entre 1 e 2 anos, o bebê passa por mudanças intensas no cérebro. São os saltos de desenvolvimento. Cada salto explica semanas de choro, agitação e mudança de sono que, sem contexto, parecem do nada.`,
    items: [
      {
        emoji: '🧠',
        title: 'O que muda em cada salto',
        // [art] e [nome] são substituídos em runtime pelo render
        desc: 'O que [art] [nome] está aprendendo agora. E por que isso explica o comportamento das últimas semanas.',
      },
      {
        emoji: '😮‍💨',
        title: 'Semanas difíceis com contexto',
        desc: 'Quando você entende o salto, a agitação vira informação, não motivo de preocupação.',
      },
      {
        emoji: '⏳',
        title: 'Quando passa',
        desc: 'Cada salto tem duração estimada. O app mostra em que ponto vocês estão.',
      },
    ],
    ctaLabel: `Ver em que fase o [nome] está`,
    destination: '/saltos',
  },
}

export default function InsightsIntroSheet({ isOpen, stepId, babyName, babyGender, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  const navigate = useNavigate()

  if (!isOpen) return null

  const c = CONTENT[stepId]
  const name = babyName || 'bebê'
  const de  = contractionDe(babyGender)
  const art = article(babyGender)
  const ctaLabel = c.ctaLabel.replace('[nome]', name)

  function handleGo() {
    hapticLight()
    onClose()
    navigate(c.destination)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--md-sys-color-surface-container-high, #1e1631)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(183,159,255,0.12)' }}
          >
            <span className="text-2xl">{c.emoji}</span>
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
              {c.title(name, de, art)}
            </h2>
          </div>
        </div>

        {/* Corpo */}
        <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-4">
          {c.body(name, de, art)}
        </p>

        {/* Itens */}
        <div className="space-y-3.5 mb-6">
          {c.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base shrink-0 mt-0.5">{item.emoji}</span>
              <div>
                <p className="font-label text-sm font-semibold text-on-surface leading-tight mb-0.5">
                  {item.title}
                </p>
                <p className="font-body text-xs text-on-surface-variant leading-snug">
                  {item.desc.replace('[art]', art).replace('[nome]', name).replace('[de]', de)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleGo}
          className="w-full py-3 rounded-md bg-primary text-white font-label text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
