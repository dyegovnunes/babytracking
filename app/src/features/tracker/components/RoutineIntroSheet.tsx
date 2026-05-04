// Sheet explicativa sobre a página de Rotina e Intervalos — v2
// Aberta ao tocar no passo "Ajuste para a rotina do [nome]" na DiscoveryTrail,
// antes de navegar para /routine.
// Tom v2: explica o problema que resolve, não a feature em si.

import { useNavigate } from 'react-router-dom'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight } from '../../../lib/haptics'
import { contractionDe, type Gender } from '../../../lib/genderUtils'

interface Props {
  isOpen: boolean
  babyName: string
  babyGender?: Gender
  onClose: () => void
}

const ITEMS = [
  {
    emoji: '⏱️',
    title: 'Alertas no momento certo',
    desc: 'O Yaya usa o intervalo que você definiu para avisar quando está chegando a hora — sem alarme fixo, sem interrupção desnecessária.',
  },
  {
    emoji: '📊',
    title: 'Insights mais precisos',
    desc: 'Com os intervalos configurados, o Yaya identifica quando algo está fora do padrão do bebê, não de um padrão genérico.',
  },
  {
    emoji: '😴',
    title: 'Projeção de sono e acordar',
    desc: 'A duração esperada da soneca ajuda o app a estimar quando o bebê vai acordar e quando deve dormir de novo.',
  },
  {
    emoji: '🛁',
    title: 'Lembrete de banho',
    desc: 'Você define o horário e recebe um alerta 15 minutos antes. Sem precisar lembrar.',
  },
  {
    emoji: '🌙',
    title: 'Silêncio noturno',
    desc: 'As notificações ficam pausadas durante o horário de sono — para você não ser acordado à toa.',
  },
]

export default function RoutineIntroSheet({ isOpen, babyName, babyGender, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  const navigate = useNavigate()

  if (!isOpen) return null

  function handleGo() {
    hapticLight()
    onClose()
    navigate('/routine')
  }

  const de   = contractionDe(babyGender)
  const name = babyName || 'bebê'

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
            <span className="text-2xl">⚙️</span>
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
              A rotina {de} {name}
            </h2>
            <p className="font-label text-xs text-on-surface-variant mt-0.5">
              Configure uma vez, o Yaya trabalha sempre
            </p>
          </div>
        </div>

        {/* Contextualização */}
        <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-4">
          Cada bebê tem um ritmo. Quando você conta esse ritmo para o Yaya, ele passa a entender o que é normal — e o que mudou.
        </p>

        {/* O que cada config faz */}
        <div className="space-y-3.5 mb-6">
          {ITEMS.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base shrink-0 mt-0.5">{item.emoji}</span>
              <div>
                <p className="font-label text-sm font-semibold text-on-surface leading-tight mb-0.5">
                  {item.title}
                </p>
                <p className="font-body text-xs text-on-surface-variant leading-snug">
                  {item.desc}
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
          <span className="material-symbols-outlined text-lg">tune</span>
          Personalizar a rotina {de} {name}
        </button>
      </div>
    </div>
  )
}
