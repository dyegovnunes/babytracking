import { useEffect } from 'react'
import { hapticLight } from '../../../lib/haptics'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  /** Nome do medicamento (exibido no header). */
  medicationName: string
  /**
   * Horários ainda pendentes do dia, em ordem cronológica.
   * Esperamos sempre ≥ 2 itens — caso contrário a MedicationsPage nem
   * precisaria abrir o picker (1 item vira quick-apply direto).
   */
  pendingTimes: string[]
  onPick: (slotTime: string) => void
  onClose: () => void
}

/**
 * Mini bottom sheet que aparece quando o usuário clica no ✓ de um
 * medicamento com múltiplas doses pendentes. Lista só os horários
 * ainda não dados e registra a dose no slot escolhido.
 *
 * Não faz fetch, não tem form — só escolha pura. Toda persistência
 * acontece via `onPick` que é chamado no parent (MedicationsPage).
 */
export default function MedicationSlotPickerSheet({
  medicationName,
  pendingTimes,
  onPick,
  onClose,
}: Props) {
  useSheetBackClose(true, onClose)

  // Travar scroll do body enquanto o sheet está aberto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-md bg-surface-container-highest p-6 pb-sheet max-h-[70vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-on-surface-variant/30 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-md bg-surface-container flex items-center justify-center shrink-0">
            <span className="text-2xl leading-none">💊</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary">
              QUAL DOSE?
            </p>
            <h3 className="font-headline text-base font-bold text-on-surface leading-tight mt-0.5 truncate">
              {medicationName}
            </h3>
            <p className="font-body text-xs text-on-surface-variant mt-0.5">
              Escolha o horário que você acabou de dar.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:bg-surface-variant"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Lista de horários pendentes */}
        <div className="space-y-2 mb-4">
          {pendingTimes.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                hapticLight()
                onPick(time)
              }}
              className="w-full py-3 px-4 rounded-md bg-surface-container text-on-surface font-headline text-sm font-bold flex items-center justify-between active:bg-surface-container-high transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">
                  schedule
                </span>
                {time}
              </span>
              <span className="material-symbols-outlined text-base text-on-surface-variant">
                chevron_right
              </span>
            </button>
          ))}
        </div>

        {/* Cancelar */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-md bg-surface-variant/50 text-on-surface-variant font-label text-xs font-semibold active:bg-surface-variant"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
