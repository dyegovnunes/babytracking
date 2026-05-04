// Sheet comemorativa exibida uma única vez quando o usuário conclui
// todos os passos da Trilha de Descoberta — v2.
// Tom: não comemora o checklist, comemora o entendimento.
// "Você descobriu tudo que o Yaya pode fazer pelo [nome]. A partir daqui, ele vai ficando mais inteligente."

import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticSuccess } from '../../../lib/haptics'

interface Props {
  isOpen: boolean
  babyName: string
  onClose: () => void
}

const HIGHLIGHTS = [
  { emoji: '📈', text: 'Os insights ficam mais precisos conforme você registra' },
  { emoji: '🤖', text: 'A yaIA aprende com a rotina ao longo do tempo' },
  { emoji: '👨‍👩‍👦', text: 'Quem está no grupo vê tudo em tempo real, sem precisar perguntar' },
  { emoji: '📋', text: 'O relatório para o pediatra está sempre a um link de distância' },
  { emoji: '🌱', text: 'Cada marco registrado fica para sempre na história do bebê' },
]

export default function TrailCompletionSheet({ isOpen, babyName, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  if (!isOpen) return null

  function handleClose() {
    hapticSuccess()
    onClose()
  }

  const name = babyName || 'do bebê'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-t-2xl bg-surface-container-highest px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Celebração */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="font-headline text-xl font-bold text-on-surface mb-2">
            {babyName
              ? `Você descobriu tudo que o Yaya tem para o ${name}.`
              : 'Você descobriu tudo que o Yaya tem a oferecer.'}
          </h2>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed">
            A partir daqui, ele vai ficando mais inteligente a cada registro.
          </p>
        </div>

        {/* O que acontece a seguir */}
        <div
          className="rounded-md p-4 mb-5 space-y-3"
          style={{ background: 'rgba(183,159,255,0.05)', border: '1px solid rgba(183,159,255,0.12)' }}
        >
          <p className="font-label text-[11px] uppercase tracking-wider text-primary/60 font-bold">
            O que muda a partir de agora
          </p>
          {HIGHLIGHTS.map((h, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-base shrink-0 mt-0.5">{h.emoji}</span>
              <p className="font-body text-sm text-on-surface-variant leading-snug">{h.text}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 rounded-md bg-primary text-white font-label text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">check</span>
          Ótimo, vamos lá!
        </button>
      </div>
    </div>
  )
}
