// SpotlightOverlay — overlay leve de feature spotlight.
// Aparece na primeira visita a uma tela de alto valor (Insights, Super Relatório).
// Posição: banner fixo acima da BottomNav, blur de fundo.
// Fecha ao toque em qualquer lugar da tela ou após 5 segundos.
// useSheetBackClose obrigatório (botão voltar do Android fecha o overlay).

import { useEffect } from 'react'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'
import { hapticLight } from '../../lib/haptics'

interface Props {
  isOpen: boolean
  onClose: () => void
  emoji: string
  title: string
  description: string
}

export function SpotlightOverlay({ isOpen, onClose, emoji, title, description }: Props) {
  useSheetBackClose(isOpen, onClose)

  // Auto-dismiss após 5 segundos
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => onClose(), 5000)
    return () => clearTimeout(timer)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    // Overlay transparente que captura tap em qualquer área da tela
    <div
      className="fixed inset-0 z-40"
      onClick={() => { hapticLight(); onClose() }}
      aria-label="Fechar dica"
    >
      {/* Banner acima da BottomNav */}
      <div
        className="absolute bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+8px)] left-4 right-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-md px-4 py-3 flex items-center gap-3"
          style={{
            background: 'rgba(28,18,58,0.94)',
            border: '1px solid rgba(183,159,255,0.28)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <span className="text-2xl flex-shrink-0" aria-hidden>{emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-label text-sm font-semibold text-on-surface leading-snug">
              {title}
            </p>
            <p className="font-label text-xs text-on-surface-variant mt-0.5 leading-snug">
              {description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { hapticLight(); onClose() }}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
