import { useEffect, useState } from 'react'
import type { MedicationDayStatus, MedicationLog } from '../medicationData'
import { hapticLight, hapticMedium, hapticSuccess } from '../../../lib/haptics'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  status: MedicationDayStatus
  /** Logs brutos do dia — usados pra mostrar o histórico completo (inclui extras fora dos slots) */
  todayLogs: MedicationLog[]
  membersById: Record<string, string>
  onClose: () => void
  /** Dar agora: registra com timestamp atual */
  onGiveNow: () => Promise<boolean>
  /** Dar em outro horário: recebe uma Date custom */
  onGiveAt: (when: Date) => Promise<boolean>
  /** Apagar um log (corrigir engano) */
  onDeleteLog: (logId: string) => Promise<boolean>
  /** Desativar medicamento (encerrar cadastro) */
  onDeactivate: () => Promise<boolean>
}

/**
 * Bottom sheet para registrar uma dose de medicamento.
 *
 * - Botão grande "Dar agora" (fluxo principal, 1 toque).
 * - Link "Registrar outro horário" abre um time picker.
 * - Histórico do dia com nome de quem administrou.
 * - Botão "Encerrar medicamento" no fim (ação secundária).
 */
export default function MedicationAdminSheet({
  status,
  todayLogs,
  membersById,
  onClose,
  onGiveNow,
  onGiveAt,
  onDeleteLog,
  onDeactivate,
}: Props) {
  const m = status.medication
  const [customTime, setCustomTime] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  useSheetBackClose(true, onClose)

  // Travar scroll do body
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Logs desse medicamento do dia, ordenados por horário
  const thisMedTodayLogs = todayLogs
    .filter((l) => l.medicationId === m.id)
    .sort(
      (a, b) =>
        new Date(a.administeredAt).getTime() -
        new Date(b.administeredAt).getTime(),
    )

  const handleGiveNow = async () => {
    setSaving(true)
    hapticLight()
    const ok = await onGiveNow()
    setSaving(false)
    if (ok) {
      hapticSuccess()
      onClose()
    }
  }

  const handleGiveAtCustom = async () => {
    if (!customTime) return
    const [h, mm] = customTime.split(':').map((v) => parseInt(v, 10))
    const when = new Date()
    when.setHours(h, mm, 0, 0)
    setSaving(true)
    hapticLight()
    const ok = await onGiveAt(when)
    setSaving(false)
    if (ok) {
      hapticSuccess()
      onClose()
    }
  }

  const handleDelete = async (logId: string) => {
    hapticMedium()
    await onDeleteLog(logId)
  }

  const handleDeactivate = async () => {
    if (!confirmDeactivate) {
      hapticMedium()
      setConfirmDeactivate(true)
      return
    }
    const ok = await onDeactivate()
    if (ok) {
      hapticSuccess()
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-md bg-surface-container-highest p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[88vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-on-surface-variant/30 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-14 h-14 rounded-md bg-surface-container flex items-center justify-center shrink-0">
            <span className="text-3xl leading-none">💊</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary">
              MEDICAMENTO
            </p>
            <h3 className="font-headline text-lg font-bold text-on-surface leading-tight mt-0.5">
              {m.name}
            </h3>
            <p className="font-body text-xs text-on-surface-variant mt-0.5">
              {m.dosage}
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

        {/* Observações */}
        {m.notes && (
          <div className="mb-4 p-3 rounded-md bg-primary/5 border border-primary/15">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
              Observação
            </p>
            <p className="font-body text-xs text-on-surface leading-relaxed">
              {m.notes}
            </p>
          </div>
        )}

        {/* Botão principal: Dar agora */}
        <button
          type="button"
          onClick={handleGiveNow}
          disabled={saving}
          className="w-full py-4 rounded-md bg-primary text-on-primary font-headline text-base font-bold mb-2 active:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          Dar agora
        </button>

        {/* Link: outro horário */}
        {customTime === null ? (
          <button
            type="button"
            onClick={() => {
              hapticLight()
              const h = new Date().getHours()
              const mm = new Date().getMinutes()
              setCustomTime(
                `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
              )
            }}
            className="w-full py-2.5 rounded-md text-on-surface-variant font-label text-xs font-semibold active:text-on-surface mb-5"
          >
            Registrar em outro horário
          </button>
        ) : (
          <div className="mb-5 p-3 rounded-md bg-surface-container">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Horário administrado
            </p>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="flex-1 px-3 py-2 rounded-md bg-surface-container-highest border border-white/5 text-on-surface font-body text-sm focus:outline-none focus:border-primary/40"
              />
              <button
                type="button"
                onClick={handleGiveAtCustom}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-primary text-on-primary font-label text-xs font-bold active:opacity-90 disabled:opacity-50"
              >
                Registrar
              </button>
              <button
                type="button"
                onClick={() => setCustomTime(null)}
                className="px-3 py-2 rounded-md bg-surface-variant/50 text-on-surface-variant font-label text-xs font-semibold active:bg-surface-variant"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Histórico do dia */}
        <div className="mb-5">
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Hoje ({status.givenCount}/{status.totalCount})
          </p>
          {thisMedTodayLogs.length === 0 ? (
            <p className="font-body text-xs text-on-surface-variant">
              Nenhuma dose registrada hoje.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {thisMedTodayLogs.map((log) => {
                const d = new Date(log.administeredAt)
                const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                const by = log.administeredBy
                  ? membersById[log.administeredBy] ?? 'cuidador'
                  : 'anônimo'
                return (
                  <li
                    key={log.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-surface-container"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="material-symbols-outlined text-green-400 text-base"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        check_circle
                      </span>
                      <div className="min-w-0">
                        <p className="font-headline text-xs font-bold text-on-surface">
                          {time}
                        </p>
                        <p className="font-label text-[10px] text-on-surface-variant truncate">
                          por {by}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(log.id)}
                      className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center active:bg-surface-variant shrink-0"
                      aria-label="Remover registro"
                    >
                      <span className="material-symbols-outlined text-sm">
                        delete
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Horários planejados */}
        <div className="mb-5">
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Horários planejados
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {m.scheduleTimes.map((t) => (
              <span
                key={t}
                className="font-headline text-xs font-bold text-on-surface bg-surface-container px-2 py-1 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Encerrar */}
        <div className="pt-4 border-t border-white/5">
          <button
            type="button"
            onClick={handleDeactivate}
            className={`w-full py-2.5 rounded-md font-label text-xs font-semibold transition-colors ${
              confirmDeactivate
                ? 'bg-red-500/15 text-red-400 active:bg-red-500/25'
                : 'text-on-surface-variant active:text-on-surface'
            }`}
          >
            {confirmDeactivate
              ? 'Confirmar: encerrar medicamento'
              : 'Encerrar medicamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
