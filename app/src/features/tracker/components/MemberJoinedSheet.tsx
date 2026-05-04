// Sheet de celebração de entrada de membro no grupo — Momento 3 da spec.
// Dispara quando alguém aceita o convite — para o DONO do perfil, não para quem entrou.
// Pode repetir (cada entrada é um momento distinto). Controle por deduplicação in-memory.

import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { contractionDe, type Gender } from '../../../lib/genderUtils'

interface Props {
  isOpen: boolean
  memberName: string
  memberRole: string
  babyName: string
  babyGender?: Gender
  onClose: () => void
}

export default function MemberJoinedSheet({ isOpen, memberName, memberRole, babyName, babyGender, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)

  if (!isOpen) return null

  const de   = contractionDe(babyGender)
  const name = babyName || 'bebê'
  const person = memberName || 'Alguém'
  const isCaregiver = memberRole === 'caregiver'

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

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'rgba(183,159,255,0.12)' }}
          >
            <span className="text-xl">👋</span>
          </div>
          <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
            {person} está com você nessa!
          </h2>
        </div>

        {/* Corpo */}
        <div className="space-y-3 mb-6">
          <p className="font-body text-xs text-on-surface-variant leading-relaxed">
            {person} entrou no grupo {de} {name}.
          </p>
          <p className="font-body text-xs text-on-surface-variant leading-relaxed">
            A partir de agora, vocês veem e marcam as atividades juntos, em tempo real.
            Aproveitem para se ajudar nas marcações e percepções da rotina.
          </p>
          {isCaregiver && (
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              {person} entrou como cuidador. Se quiser mudar o perfil, é só ir em Cuidadores no perfil {de} {name} e clicar na seta pra cima.
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-md bg-primary text-on-primary font-label text-sm font-semibold active:opacity-80 transition-opacity"
        >
          Ótimo!
        </button>
      </div>
    </div>
  )
}
