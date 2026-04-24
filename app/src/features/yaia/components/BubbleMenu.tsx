import { useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'

interface BubbleMenuProps {
  isOpen: boolean
  onClose: () => void
  onCopy: () => void
  onRate?: (rating: 1 | -1, reasonTag?: string) => void
}

const NEGATIVE_REASONS = [
  { tag: 'wrong', label: 'Informação errada' },
  { tag: 'generic', label: 'Muito genérica' },
  { tag: 'too_long', label: 'Resposta muito longa' },
  { tag: 'cold', label: 'Tom frio' },
  { tag: 'invented', label: 'Inventou dados do bebê' },
  { tag: 'other', label: 'Outro motivo' },
] as const

export default function BubbleMenu({ isOpen, onClose, onCopy, onRate }: BubbleMenuProps) {
  const [showNegativePicker, setShowNegativePicker] = useState(false)
  const [positiveDone, setPositiveDone] = useState(false)
  useSheetBackClose(isOpen, onClose)

  if (!isOpen) return null

  function handleCopy() {
    hapticLight()
    onCopy()
    onClose()
  }

  function handleThumbsUp() {
    if (!onRate) return
    hapticSuccess()
    onRate(1)
    setPositiveDone(true)
    window.setTimeout(() => {
      onClose()
      setPositiveDone(false)
    }, 900)
  }

  function handleThumbsDownClick() {
    hapticLight()
    setShowNegativePicker(true)
  }

  function handleNegativeReason(tag: string) {
    if (!onRate) return
    hapticSuccess()
    onRate(-1, tag)
    onClose()
    setShowNegativePicker(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface rounded-t-2xl p-4 flex flex-col gap-1"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {!showNegativePicker && !positiveDone && (
          <>
            <MenuItem icon="content_copy" label="Copiar" onClick={handleCopy} />
            {onRate && (
              <>
                <MenuItem icon="thumb_up" label="Gostei dessa resposta" onClick={handleThumbsUp} />
                <MenuItem icon="thumb_down" label="Não curti essa resposta" onClick={handleThumbsDownClick} />
              </>
            )}
          </>
        )}

        {positiveDone && (
          <div className="flex flex-col items-center py-4 gap-2">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <p className="text-sm text-on-surface">Valeu pelo retorno!</p>
          </div>
        )}

        {showNegativePicker && (
          <>
            <p className="text-xs text-on-surface-variant px-2 py-2">O que não ficou bom?</p>
            {NEGATIVE_REASONS.map((r) => (
              <MenuItem
                key={r.tag}
                icon="chevron_right"
                label={r.label}
                onClick={() => handleNegativeReason(r.tag)}
                trailing
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function MenuItem({
  icon,
  label,
  onClick,
  trailing,
}: {
  icon: string
  label: string
  onClick: () => void
  trailing?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-surface-container active:bg-surface-container-high transition-colors text-left"
    >
      {!trailing && (
        <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
      )}
      <span className="flex-1 text-sm text-on-surface">{label}</span>
      {trailing && (
        <span className="material-symbols-outlined text-on-surface-variant/60 text-[20px]">{icon}</span>
      )}
    </button>
  )
}
