import { useState } from 'react'
import { useAppState, useAppDispatch, clearAllLogs } from '../../../contexts/AppContext'

interface Props {
  onToast: (msg: string) => void
}

export default function ClearHistorySection({ onToast }: Props) {
  const { baby } = useAppState()
  const dispatch = useAppDispatch()
  const [confirmClear, setConfirmClear] = useState(false)

  if (!confirmClear) {
    return (
      <button
        onClick={() => setConfirmClear(true)}
        className="w-full bg-surface-container rounded-md p-4 flex items-center gap-3 active:bg-surface-container-high transition-colors"
      >
        <span className="material-symbols-outlined text-error text-xl">delete_sweep</span>
        <div className="flex-1 text-left">
          <p className="text-on-surface font-body text-sm font-medium">Limpar histórico</p>
          <p className="text-on-surface-variant font-label text-xs">
            Remove todos os registros
          </p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant text-xl">
          chevron_right
        </span>
      </button>
    )
  }

  return (
    <div className="bg-error/10 rounded-md p-4">
      <p className="text-error font-body text-sm font-medium mb-3">
        Tem certeza? Isso apagará todos os registros.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setConfirmClear(false)}
          className="flex-1 py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
        >
          Cancelar
        </button>
        <button
          onClick={async () => {
            if (baby) {
              const ok = await clearAllLogs(dispatch, baby.id)
              if (ok) onToast('Histórico limpo!')
            }
            setConfirmClear(false)
          }}
          className="flex-1 py-2.5 rounded-md bg-gradient-to-br from-error-dim to-error text-on-error font-label font-semibold text-sm"
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
