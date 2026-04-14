import { useEffect } from 'react'

interface Props {
  logId: string
  originalEventId: 'breast_left' | 'breast_right'
  onChangeToBoth: (logId: string) => void
  onAddBottle: () => void
  onDismiss: () => void
}

export default function FollowUpBar({ logId, originalEventId, onChangeToBoth, onAddBottle, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const otherSide = originalEventId === 'breast_left' ? 'Dir.' : 'Esq.'

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-lg animate-fade-in">
      <div className="bg-surface-container-highest border border-outline-variant/20 rounded-md p-3 shadow-lg">
        <p className="font-label text-xs text-on-surface-variant mb-2 text-center">
          Complementou?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onChangeToBoth(logId)}
            className="flex-1 py-2.5 rounded-xl bg-tertiary/15 text-tertiary font-label text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-tertiary/25"
          >
            🤱 Peito {otherSide}
          </button>
          <button
            onClick={onAddBottle}
            className="flex-1 py-2.5 rounded-xl bg-primary/15 text-primary font-label text-sm font-semibold flex items-center justify-center gap-1.5 active:bg-primary/25"
          >
            🍼 Mamadeira
          </button>
          <button
            onClick={onDismiss}
            className="px-2 py-2.5 rounded-xl text-on-surface-variant active:bg-surface-variant"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
