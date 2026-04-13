import { useState, useEffect, useCallback } from 'react'
import type { LogEntry } from '../../types'
import { DEFAULT_EVENTS } from '../../lib/constants'

interface Props {
  log: LogEntry
  onSave: (log: LogEntry) => void
  onDelete: (id: string) => void
  onClose: () => void
  onAddBottle?: () => void
}

const BREAST_SIDES = [
  { id: 'breast_left', label: 'Esquerdo' },
  { id: 'breast_right', label: 'Direito' },
  { id: 'breast_both', label: 'Ambos' },
]

export default function EditModal({ log, onSave, onDelete, onClose, onAddBottle }: Props) {
  // Android back button: close modal instead of navigating
  const stableOnClose = useCallback(onClose, [])
  useEffect(() => {
    window.history.pushState({ modal: 'edit' }, '')
    const handlePopState = () => { stableOnClose() }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      if (window.history.state?.modal === 'edit') {
        window.history.back()
      }
    }
  }, [stableOnClose])

  const isBreast = log.eventId.startsWith('breast_')
  const [selectedSide, setSelectedSide] = useState(log.eventId)
  const displayEvent = isBreast
    ? DEFAULT_EVENTS.find((e) => e.id === selectedSide)
    : DEFAULT_EVENTS.find((e) => e.id === log.eventId)
  const d = new Date(log.timestamp)

  const [time, setTime] = useState(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  )
  const [date, setDate] = useState(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  )
  const [ml, setMl] = useState(log.ml ? String(log.ml) : '')
  const [confirmDel, setConfirmDel] = useState(false)

  function handleSave() {
    const [h, m] = time.split(':').map(Number)
    const [y, mo, day] = date.split('-').map(Number)
    const timestamp = new Date(y, mo - 1, day, h, m).getTime()
    onSave({
      ...log,
      eventId: isBreast ? selectedSide : log.eventId,
      timestamp,
      ml: ml ? parseInt(ml) : undefined,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-3xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t-2 border-primary-fixed animate-slide-up">
        <div className="flex items-center gap-3 mb-5">
          {displayEvent && (
            displayEvent.emoji ? (
              <span className="text-2xl">{displayEvent.emoji}</span>
            ) : (
              <span className="material-symbols-outlined text-primary text-2xl">
                {displayEvent.icon}
              </span>
            )
          )}
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Editar — {displayEvent?.label}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
            />
          </div>
          <div>
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Horário
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-surface-container-low rounded-lg px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
            />
          </div>
        </div>

        {isBreast && (
          <div className="mb-4">
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Lado
            </label>
            <div className="flex gap-2">
              {BREAST_SIDES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedSide(opt.id)}
                  className={`flex-1 py-2.5 rounded-lg font-label text-sm font-semibold transition-colors ${
                    selectedSide === opt.id
                      ? 'bg-tertiary text-on-tertiary'
                      : 'bg-surface-variant text-on-surface-variant'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isBreast && onAddBottle && (
          <button
            type="button"
            onClick={() => { onClose(); onAddBottle(); }}
            className="w-full mb-4 py-2.5 rounded-xl bg-primary/15 text-primary font-label text-sm font-semibold flex items-center justify-center gap-2 active:bg-primary/25"
          >
            🍼 Complementar com mamadeira
          </button>
        )}

        {displayEvent?.hasAmount && (
          <div className="mb-4">
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Volume (ml)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={ml}
              onChange={(e) => setMl(e.target.value.replace(/\D/g, ''))}
              placeholder="ex: 60"
              className="w-full bg-surface-container-low rounded-lg px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
            />
          </div>
        )}

        {!confirmDel ? (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setConfirmDel(true)}
              className="flex-1 py-3 rounded-xl bg-error/15 text-error font-label font-semibold text-sm"
            >
              Excluir
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-semibold text-sm"
            >
              Salvar
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setConfirmDel(false)}
              className="flex-1 py-3 rounded-xl bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={() => onDelete(log.id)}
              className="flex-[2] py-3 rounded-xl bg-gradient-to-br from-error-dim to-error text-on-error font-label font-semibold text-sm"
            >
              Confirmar exclusão
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
