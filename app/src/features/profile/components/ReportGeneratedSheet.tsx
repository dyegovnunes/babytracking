// Sheet de celebração da primeira geração de Super Relatório — Momento 2 da spec.
// Aparece uma única vez na vida do usuário (yaya_celebration_report_generated_${babyId}).
// Foco: pediatra. Sem mencionar outros públicos, sem travessão.

import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { contractionDe, article, type Gender } from '../../../lib/genderUtils'

interface Props {
  isOpen: boolean
  babyName: string
  babyGender?: Gender
  onShare: () => void
  onClose: () => void
}

export default function ReportGeneratedSheet({ isOpen, babyName, babyGender, onShare, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)

  if (!isOpen) return null

  const name = babyName || 'bebê'
  const de  = contractionDe(babyGender)   // do/da/de
  const art = article(babyGender)          // o/a/o

  function handleShare() {
    onShare()
    onClose()
  }

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
            <span className="text-xl">📋</span>
          </div>
          <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
            Que tal mandar pro pediatra?
          </h2>
        </div>

        {/* Corpo */}
        <div className="space-y-3 mb-6">
          <p className="font-body text-xs text-on-surface-variant leading-relaxed">
            A maioria dos pais chega na consulta tentando lembrar o que aconteceu na última semana.
          </p>
          <p className="font-body text-xs text-on-surface-variant leading-relaxed">
            Esse link muda isso.
          </p>
          <p className="font-body text-xs text-on-surface-variant leading-relaxed">
            Ele tem tudo: sono, alimentação, fraldas, vacinas e marcos {de} {name}.
            Você envia antes da consulta ou leva e abre no dia. O pediatra abre, lê, e tem uma visão geral {de} {name}.
          </p>
          <p className="font-body text-xs text-on-surface-variant leading-relaxed">
            Alimentação, sono, vacinas, marcos, saltos, tudo sobre {art} {name}. A conversa começa com dados, não com memória.
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 rounded-md bg-primary text-on-primary font-label text-sm font-semibold flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
        >
          <span className="material-symbols-outlined text-lg">share</span>
          Compartilhar agora
        </button>
      </div>
    </div>
  )
}
