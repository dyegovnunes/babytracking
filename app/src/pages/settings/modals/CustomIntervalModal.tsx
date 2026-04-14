import { useState, useEffect } from 'react'
import { useAppState, useAppDispatch, updateIntervals } from '../../../contexts/AppContext'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  /** Which interval category is being edited (null = modal closed). */
  cat: string | null
  onClose: () => void
  onSaved: () => void
}

export default function CustomIntervalModal({ cat, onClose, onSaved }: Props) {
  const { baby, intervals } = useAppState()
  const dispatch = useAppDispatch()
  const [customH, setCustomH] = useState('')
  const [customM, setCustomM] = useState('')

  useSheetBackClose(!!cat, onClose)

  // Prefill inputs when the modal opens for a given category
  useEffect(() => {
    if (!cat) return
    const c = intervals[cat]
    if (c) {
      const h = Math.floor(c.minutes / 60)
      const m = c.minutes % 60
      setCustomH(h > 0 ? h.toString() : '')
      setCustomM(m > 0 ? m.toString() : '')
    }
  }, [cat, intervals])

  if (!cat) return null

  const handleSave = async () => {
    if (!baby) return
    const total = (parseInt(customH) || 0) * 60 + (parseInt(customM) || 0)
    if (total <= 0) return
    const updated = {
      ...intervals,
      [cat]: {
        ...intervals[cat],
        minutes: total,
        warn: Math.max(1, Math.floor(total * 0.8)),
      },
    }
    const ok = await updateIntervals(dispatch, baby.id, updated)
    if (ok) onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-container w-full max-w-sm rounded-t-md sm:rounded-md p-6 sm:mx-4">
        <h3 className="font-headline text-lg font-bold text-on-surface mb-4">Personalizar</h3>
        <div className="flex items-center gap-4 justify-center mb-6">
          <div className="text-center">
            <label className="font-label text-xs text-on-surface-variant mb-1 block">Horas</label>
            <input
              type="number"
              min="0"
              max="99"
              value={customH}
              onChange={(e) => setCustomH(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className="w-20 bg-surface-container-low rounded-md px-4 py-3 text-on-surface font-headline text-2xl text-center outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <span className="font-headline text-2xl text-on-surface-variant mt-5">:</span>
          <div className="text-center">
            <label className="font-label text-xs text-on-surface-variant mb-1 block">Min</label>
            <input
              type="number"
              min="0"
              max="59"
              value={customM}
              onChange={(e) => setCustomM(e.target.value.replace(/\D/g, ''))}
              placeholder="00"
              className="w-20 bg-surface-container-low rounded-md px-4 py-3 text-on-surface font-headline text-2xl text-center outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
