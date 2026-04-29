import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  isOpen: boolean
  onPick: (hour: number) => void
  onClose: () => void
}

export default function BathHourPickerModal({ isOpen, onPick, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-5 sm:mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-headline text-lg font-bold text-on-surface mb-4">
          Adicionar horário
        </h3>
        <div className="flex justify-center mb-5">
          <input
            type="time"
            defaultValue="12:00"
            onChange={(e) => {
              const h = parseInt(e.target.value.split(':')[0], 10)
              if (!isNaN(h)) onPick(h)
            }}
            className="bg-surface-container-low rounded-md px-6 py-4 text-on-surface font-headline text-3xl text-center outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
          />
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
