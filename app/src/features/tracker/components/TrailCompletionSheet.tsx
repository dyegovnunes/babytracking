// Sheet comemorativa exibida uma única vez quando o usuário conclui
// todos os passos da Trilha de Descoberta.
// Celebra a conquista e apresenta o que o Yaya oferece no dia a dia.

import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticSuccess } from '../../../lib/haptics'

interface Props {
  isOpen: boolean
  babyName: string
  onClose: () => void
}

const HIGHLIGHTS = [
  { emoji: '📝', text: 'Registre as atividades do bebê com a família em tempo real' },
  { emoji: '💡', text: 'Veja os insights e padrões da rotina a qualquer hora' },
  { emoji: '🌱', text: 'Acompanhe vacinas, marcos e saltos de desenvolvimento' },
  { emoji: '🤖', text: 'Pergunte qualquer coisa para a yaIA — ela conhece a rotina toda' },
  { emoji: '📋', text: 'Tenha sempre em mãos o relatório pronto para o pediatra' },
]

export default function TrailCompletionSheet({ isOpen, babyName, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  if (!isOpen) return null

  function handleClose() {
    hapticSuccess()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="rounded-t-2xl px-5 pt-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
        style={{ background: 'var(--md-sys-color-surface-container-high, #1e1631)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Celebração */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎉</div>
          <h2 className="font-headline text-xl font-bold text-on-surface mb-1">
            Exploração completa!
          </h2>
          <p className="font-body text-sm text-on-surface-variant leading-relaxed">
            {babyName ? `Você conheceu tudo que o Yaya tem para ${babyName}.` : 'Você conheceu tudo que o Yaya tem a oferecer.'}{' '}
            Agora é só usar no dia a dia.
          </p>
        </div>

        {/* O que usar agora */}
        <div
          className="rounded-md p-4 mb-5 space-y-3"
          style={{ background: 'rgba(183,159,255,0.05)', border: '1px solid rgba(183,159,255,0.12)' }}
        >
          <p className="font-label text-[11px] uppercase tracking-wider text-primary/60 font-bold">
            No dia a dia com o Yaya
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
