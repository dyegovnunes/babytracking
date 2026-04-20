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
  /** Abrir editor de um log específico (modal padrão, igual ao histórico). */
  onOpenLogEditor: (log: MedicationLog) => void
  /** Editar este medicamento (abre o form em modo edit) */
  onEdit: () => void
  /** Excluir medicamento (soft delete via is_active=false — o histórico fica preservado e pode ser reativado). */
  onDeactivate: () => Promise<boolean>
}

/**
 * Bottom sheet para registrar uma dose de medicamento.
 *
 * - Botão grande "Dar agora" (fluxo principal, 1 toque).
 * - Link "Registrar outro horário" abre um time picker.
 * - Histórico do dia com nome de quem administrou.
 * - Botão "Excluir medicamento" no fim (ação secundária, soft delete).
 */
export default function MedicationAdminSheet({
  status,
  todayLogs,
  membersById,
  onClose,
  onGiveNow,
  onGiveAt,
  onOpenLogEditor,
  onEdit,
  onDeactivate,
}: Props) {
  const m = status.medication
  const [customTime, setCustomTime] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)

  // Quando todas as doses do dia já foram dadas, bloquear o add pra evitar
  // registro duplicado ou sobreposição com a UNIQUE constraint do banco.
  const allDosesGiven = status.givenCount >= status.totalCount && status.totalCount > 0

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
        className="w-full max-w-md rounded-t-md bg-surface-container-highest p-6 pb-sheet max-h-[88vh] overflow-y-auto animate-slide-up"
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

        {/* Mensagem quando todas as doses já foram dadas */}
        {allDosesGiven && (
          <div className="mb-4 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
            <p className="font-body text-xs text-emerald-400">
              Todas as doses de hoje já foram registradas.
            </p>
          </div>
        )}

        {/* Botão principal: Dar agora */}
        <button
          type="button"
          onClick={handleGiveNow}
          disabled={saving || allDosesGiven}
          className="w-full py-4 rounded-md bg-primary text-on-primary font-headline text-base font-bold mb-2 active:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2"
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
            disabled={allDosesGiven}
            onClick={() => {
              hapticLight()
              const h = new Date().getHours()
              const mm = new Date().getMinutes()
              setCustomTime(
                `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
              )
            }}
            className="w-full py-2.5 rounded-md text-on-surface-variant font-label text-xs font-semibold active:text-on-surface mb-5 disabled:opacity-40"
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

                const handleRowClick = () => {
                  hapticLight()
                  // Abre modal padrão de edição — mesma experiência do EditModal
                  // usado pelos logs normais do histórico.
                  onOpenLogEditor(log)
                }

                return (
                  <li
                    key={log.id}
                    onClick={handleRowClick}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-surface-container cursor-pointer active:bg-surface-container-high transition-colors"
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
                    <span className="material-symbols-outlined text-on-surface-variant/50 text-base shrink-0">
                      edit
                    </span>
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

        {/* Ações secundárias */}
        <div className="pt-4 border-t border-white/5 space-y-1">
          <button
            type="button"
            onClick={() => {
              hapticLight()
              onEdit()
            }}
            className="w-full py-2.5 rounded-md bg-surface-container text-on-surface font-label text-xs font-semibold active:bg-surface-container-high flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Editar medicamento
          </button>
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
              ? 'Confirmar: excluir medicamento'
              : 'Excluir medicamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
