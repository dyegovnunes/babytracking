// Sheet explicativa sobre a página de Rotina e Intervalos.
// Aberta ao tocar no passo "Ajuste a rotina e intervalos" na DiscoveryTrail,
// antes de navegar para /routine.

import { useNavigate } from 'react-router-dom'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight } from '../../../lib/haptics'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const ITEMS = [
  {
    emoji: '⏱️',
    title: 'Intervalos de amamentação e fraldas',
    desc: 'Define o tempo esperado entre os registros. O app avisa quando está chegando a hora do próximo.',
  },
  {
    emoji: '😴',
    title: 'Duração da soneca e janela de sono',
    desc: 'Ajuda o app a projetar quando o bebê vai acordar e quando deve dormir de novo.',
  },
  {
    emoji: '🛁',
    title: 'Horário de banho',
    desc: 'Você define o horário e recebe um alerta 15 minutos antes.',
  },
  {
    emoji: '🌙',
    title: 'Horário de sono noturno',
    desc: 'As notificações ficam pausadas nesse período para não te acordar à toa.',
  },
  {
    emoji: '⏸️',
    title: 'Pausar alertas durante o sono',
    desc: 'Enquanto o bebê está dormindo, os alertas de amamentação e fralda ficam silenciados.',
  },
]

export default function RoutineIntroSheet({ isOpen, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  const navigate = useNavigate()

  if (!isOpen) return null

  function handleGo() {
    hapticLight()
    onClose()
    navigate('/routine')
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
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(183,159,255,0.12)' }}
          >
            <span className="text-2xl">⚙️</span>
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
              Rotina e intervalos
            </h2>
            <p className="font-label text-xs text-on-surface-variant mt-0.5">
              Configure o app para a rotina do seu bebê
            </p>
          </div>
        </div>

        {/* Explicação de cada config */}
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
          Configurar minha rotina
        </button>
      </div>
    </div>
  )
}
