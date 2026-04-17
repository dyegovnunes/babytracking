import { useState } from 'react'
import type { MedicationProjection } from '../medicationProjections'
import { hapticSuccess, hapticLight } from '../../../lib/haptics'

interface Props {
  projection: MedicationProjection
  /** Marca a dose como administrada (chama useMedications.administerDose). */
  onConfirm: (medicationId: string, slotTime: string) => Promise<void>
}

/**
 * Card de próxima dose de medicamento (visível só quando falta ≤1h pra
 * o horário agendado). Botão "Dei a dose" inline — marca sem abrir
 * modal nem navegar. Doses atrasadas ficam no alerta da HighlightsStrip.
 */
export default function MedicationProjectionCard({ projection, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  const { medication, slotTime, minutesUntil } = projection

  const timeLabel = minutesUntil === 0
    ? 'agora'
    : minutesUntil === 1
      ? 'em 1 minuto'
      : minutesUntil < 60
        ? `em ${minutesUntil} minutos`
        : `às ${slotTime}`

  const handleConfirm = async () => {
    if (confirming || done) return
    hapticLight()
    setConfirming(true)
    try {
      await onConfirm(medication.id, slotTime)
      hapticSuccess()
      setDone(true)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div
      className={`rounded-md p-4 flex items-center gap-3 transition-opacity ${
        done ? 'opacity-50 bg-surface-container' : 'bg-amber-500/10'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${
          done ? 'bg-surface-container-high' : 'bg-amber-500/20'
        }`}
      >
        <span
          className={`material-symbols-outlined text-xl ${
            done ? 'text-on-surface-variant' : 'text-amber-400'
          }`}
        >
          {done ? 'check_circle' : 'medication'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-label text-xs text-on-surface-variant capitalize">
          {done ? 'Dose registrada' : `${medication.name} — ${slotTime}`}
        </p>
        <p
          className={`font-headline text-sm font-bold ${
            done ? 'text-on-surface-variant' : 'text-amber-400'
          }`}
        >
          {done ? `${medication.dosage}` : `Dose ${timeLabel}`}
        </p>
        {!done && (
          <p className="font-label text-[11px] text-on-surface-variant truncate">
            {medication.dosage}
          </p>
        )}
      </div>
      {!done && (
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="shrink-0 px-3 py-2 rounded-md bg-amber-500 text-white font-label text-xs font-semibold active:scale-95 disabled:opacity-50 transition-transform flex items-center gap-1"
        >
          {confirming ? (
            <span className="material-symbols-outlined animate-spin text-sm">
              progress_activity
            </span>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">check</span>
              Dei a dose
            </>
          )}
        </button>
      )}
    </div>
  )
}
