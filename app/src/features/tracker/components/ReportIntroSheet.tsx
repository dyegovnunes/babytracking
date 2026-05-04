// Sheet explicativa sobre o Super Relatório — disparada pelo passo 'report' da DiscoveryTrail.
// Tom v2: problema concreto (pais chegam na consulta sem saber o que aconteceu)
// → solução (link com toda a rotina, o pediatra chega informado).

import { useNavigate } from 'react-router-dom'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight } from '../../../lib/haptics'

interface Props {
  isOpen: boolean
  babyName: string
  onClose: () => void
}

const ITEMS = [
  {
    emoji: '😰',
    title: 'O problema',
    desc: 'A maioria dos pais chega na consulta sem lembrar o que aconteceu na última semana. O pediatra examina sem contexto.',
  },
  {
    emoji: '🔗',
    title: 'A solução',
    desc: 'Você gera um link com toda a rotina registrada — sono, alimentação, fraldas, vacinas e marcos. Envia antes da consulta.',
  },
  {
    emoji: '🩺',
    title: 'O pediatra chega informado',
    desc: 'Ele acessa o relatório antes ou durante a consulta. A conversa começa com dados, não com memória.',
  },
  {
    emoji: '🔒',
    title: 'Seguro e controlado',
    desc: 'O link tem senha e expira em 30 dias. Você decide quem acessa e por quanto tempo.',
  },
]

export default function ReportIntroSheet({ isOpen, babyName, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  const navigate = useNavigate()

  if (!isOpen) return null

  const name = babyName || 'do bebê'

  function handleGo() {
    hapticLight()
    onClose()
    navigate('/profile')
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
            <span className="text-2xl">📋</span>
          </div>
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface leading-tight">
              O pediatra vai chegar informado
            </h2>
            <p className="font-label text-xs text-on-surface-variant mt-0.5">
              Toda a rotina do {name} em um link
            </p>
          </div>
        </div>

        {/* Itens */}
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
          <span className="material-symbols-outlined text-lg">link</span>
          Gerar link para o pediatra
        </button>
      </div>
    </div>
  )
}
