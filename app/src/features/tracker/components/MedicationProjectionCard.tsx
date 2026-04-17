import { useState } from 'react'
import type { MedicationProjection } from '../medicationProjections'
import { hapticSuccess, hapticLight } from '../../../lib/haptics'

interface Props {
  projection: MedicationProjection
  /** Marca a dose como administrada (chama useMedications.administerDose). */
  onConfirm: (medicationId: string, slotTime: string) => Promise<void>
}

function formatLateLabel(minutesLate: number): string {
  if (minutesLate < 60) return `Atrasado há ${minutesLate} min`
  const hours = Math.floor(minutesLate / 60)
  const mins = minutesLate % 60
  if (mins === 0) return `Atrasado há ${hours}h`
  return `Atrasado há ${hours}h${String(mins).padStart(2, '0')}`
}

/**
 * Card de dose de medicamento. Dois estados:
 * - Overdue (vermelho): "Atrasado há N min"
 * - Próxima (laranja): "Dose agora" / "em N min" / "às HH:mm"
 *
 * Botão "Dei a dose" inline marca a dose sem navegar. Doses overdue também
 * aparecem na HighlightsStrip (alert complementa, não duplica).
 */
export default function MedicationProjectionCard({ projection, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState(false)

  const { medication, slotTime, minutesUntil, isOverdue } = projection

  // Label de tempo
  const timeLabel = isOverdue
    ? formatLateLabel(Math.abs(minutesUntil))
    : minutesUntil === 0
      ? 'Dose agora'
      : minutesUntil === 1
        ? 'Dose em 1 minuto'
        : minutesUntil < 60
          ? `Dose em ${minutesUntil} min`
          : `Dose às ${slotTime}`

  // Paleta de cores por estado
  const palette = done
    ? {
        bg: 'bg-surface-container',
        iconBg: 'bg-surface-container-high',
        iconColor: 'text-on-surface-variant',
        textColor: 'text-on-surface-variant',
        btnBg: 'bg-amber-500',
      }
    : isOverdue
      ? {
          bg: 'bg-error/10',
          iconBg: 'bg-error/20',
          iconColor: 'text-error',
          textColor: 'text-error',
          btnBg: 'bg-error',
        }
      : {
          bg: 'bg-amber-500/10',
          iconBg: 'bg-amber-500/20',
          iconColor: 'text-amber-400',
          textColor: 'text-amber-400',
          btnBg: 'bg-amber-500',
        }

  const iconName = done ? 'check_circle' : isOverdue ? 'warning' : 'medication'

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
      className={`rounded-md p-4 flex items-center gap-3 transition-opacity ${palette.bg} ${done ? 'opacity-50' : ''}`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center ${palette.iconBg}`}
      >
        <span className={`material-symbols-outlined text-xl ${palette.iconColor}`}>
          {iconName}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-label text-xs text-on-surface-variant capitalize truncate">
          {done ? 'Dose registrada' : `${medication.name} — ${slotTime}`}
        </p>
        <p className={`font-headline text-sm font-bold ${palette.textColor}`}>
          {done ? medication.dosage : timeLabel}
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
          className={`shrink-0 px-3 py-2 rounded-md ${palette.btnBg} text-white font-label text-xs font-semibold active:scale-95 disabled:opacity-50 transition-transform flex items-center gap-1`}
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
