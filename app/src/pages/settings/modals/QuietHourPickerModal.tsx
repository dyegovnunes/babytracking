import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import type { NotifPrefs } from '../types'
import { padH } from '../utils'

interface Props {
  /** Which edge is being edited: 'start', 'end' or null (closed). */
  which: 'start' | 'end' | null
  prefs: NotifPrefs
  onSave: (updated: NotifPrefs) => void
  onClose: () => void
}

export default function QuietHourPickerModal({ which, prefs, onSave, onClose }: Props) {
  useSheetBackClose(!!which, onClose)

  if (!which) return null

  const currentHour =
    which === 'start' ? prefs.quietHours.start : prefs.quietHours.end

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
          {which === 'start' ? 'Início do sono noturno' : 'Fim do sono noturno'}
        </h3>
        <div className="flex justify-center mb-5">
          <input
            type="time"
            value={padH(currentHour)}
            onChange={(e) => {
              const h = parseInt(e.target.value.split(':')[0], 10)
              if (!isNaN(h)) {
                onSave({
                  ...prefs,
                  quietHours: { ...prefs.quietHours, [which]: h },
                })
              }
            }}
            className="bg-surface-container-low rounded-md px-6 py-4 text-on-surface font-headline text-3xl text-center outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-md bg-primary text-on-primary font-label font-semibold text-sm"
        >
          OK
        </button>
      </div>
    </div>
  )
}
