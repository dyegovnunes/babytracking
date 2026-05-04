// Sheet de celebração do primeiro registro — Momento 1 da spec de celebration moments.
// Aparece uma única vez na vida do usuário (controlado por yaya_celebration_first_record_${babyId}).
// Tom: companheiro que viu a ação, não app se congratulando. Sem parabéns, sem estrelinhas.

import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { contractionDe, article, type Gender } from '../../../lib/genderUtils'

interface Props {
  isOpen: boolean
  babyName: string
  babyGender?: Gender
  onClose: () => void
}

export default function FirstRecordSheet({ isOpen, babyName, babyGender, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)

  if (!isOpen) return null

  const de  = contractionDe(babyGender)
  const art = article(babyGender)
  const name = babyName || 'bebê'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="rounded-t-2xl bg-surface-container-highest px-5 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        {/* Header — ícone pequeno do tipo de registro, sem emoji gigante */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'rgba(183,159,255,0.12)' }}
          >
            <span className="material-symbols-outlined text-primary text-xl">add_circle</span>
          </div>
          <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
            O Yaya começou a acompanhar {art} {name}.
          </h2>
        </div>

        {/* Corpo */}
        <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-2">
          Fácil assim, com 1 clique.
        </p>
        <p className="font-body text-xs text-on-surface-variant leading-relaxed mb-3">
          Continue marcando as atividades {de} {name}. Com o tempo, o Yaya vai te mostrar:
        </p>

        <div className="space-y-2 mb-5">
          <div className="flex items-start gap-2">
            <span className="text-primary/60 font-bold text-xs mt-0.5">•</span>
            <p className="font-body text-xs text-on-surface-variant leading-snug">
              os primeiros padrões {de} {name}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-primary/60 font-bold text-xs mt-0.5">•</span>
            <p className="font-body text-xs text-on-surface-variant leading-snug">
              projeções de quando vai dormir, acordar, fome
            </p>
          </div>
        </div>

        <div
          className="rounded-md px-3 py-2.5 mb-5"
          style={{ background: 'rgba(183,159,255,0.07)', border: '1px solid rgba(183,159,255,0.15)' }}
        >
          <p className="font-body text-xs text-on-surface-variant leading-snug text-center">
            Em 3 dias você tem a rotina completa {de} {name}, na palma da sua mão.
          </p>
        </div>

        {/* CTA único */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-md bg-primary text-on-primary font-label text-sm font-semibold active:opacity-80 transition-opacity"
        >
          Vamos lá
        </button>
      </div>
    </div>
  )
}
