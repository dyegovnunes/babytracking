import { useAppState, useAppDispatch } from '../../contexts/AppContext'
import { switchBaby } from '../../contexts/AppContext'
import { formatAge } from '../../lib/formatters'
import { hapticLight } from '../../lib/haptics'
import type { Baby } from '../../types'

interface Props {
  onClose: () => void
}

export default function BabySwitcher({ onClose }: Props) {
  const { babies, baby } = useAppState()
  const dispatch = useAppDispatch()

  function handleSelect(selected: Baby) {
    if (selected.id === baby?.id) {
      onClose()
      return
    }
    hapticLight()
    switchBaby(dispatch, selected.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t-2 border-primary-fixed animate-slide-up">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-4">
          Trocar bebê
        </h2>

        <div className="space-y-2">
          {babies.map((b) => {
            const isActive = b.id === baby?.id
            return (
              <button
                key={b.id}
                onClick={() => handleSelect(b)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-primary/10 ring-2 ring-primary'
                    : 'bg-surface-container active:bg-surface-container-high'
                }`}
              >
                {b.photoUrl ? (
                  <img
                    src={b.photoUrl}
                    alt={b.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-container/30 flex items-center justify-center">
                    <span className="text-xl leading-none">
                      {b.gender === 'girl' ? '👧' : '👦'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-body text-sm text-on-surface font-semibold truncate">
                    {b.name}
                  </p>
                  <p className="font-label text-xs text-on-surface-variant">
                    {formatAge(b.birthDate)}
                  </p>
                </div>
                {isActive && (
                  <span className="material-symbols-outlined text-primary text-xl">
                    check_circle
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
