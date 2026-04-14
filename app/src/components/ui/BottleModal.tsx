import { useState } from 'react'

interface Props {
  onConfirm: (ml: number) => void
  onClose: () => void
}

const quickAmounts = [30, 60, 90, 120]

export default function BottleModal({ onConfirm, onClose }: Props) {
  const [amount, setAmount] = useState('60')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t-2 border-primary-fixed animate-slide-up">
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-primary text-2xl">
            baby_changing_station
          </span>
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Quanto mamou?
          </h2>
        </div>
        <p className="font-label text-sm text-on-surface-variant mb-5">
          Volume em ml
        </p>

        <div className="flex gap-2 mb-4">
          {quickAmounts.map((val) => (
            <button
              key={val}
              onClick={() => setAmount(String(val))}
              className={`flex-1 py-2.5 rounded-full font-label text-sm font-semibold transition-colors ${
                amount === String(val)
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-variant text-on-surface-variant'
              }`}
            >
              {val}ml
            </button>
          ))}
        </div>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          className="w-full bg-surface-container-low rounded-md px-4 py-3 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40 mb-5"
          placeholder="Quantidade em ml"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const ml = parseInt(amount)
              if (ml > 0) onConfirm(ml)
            }}
            className="flex-1 py-3 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-semibold text-sm"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
