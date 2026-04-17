import { useState } from 'react'
import type { MedicationLog, Medication } from '../medicationData'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  log: MedicationLog
  medication: Medication
  onSave: (logId: string, newAdministeredAt: Date, newNotes: string | null) => Promise<boolean>
  onDelete: (logId: string) => Promise<boolean>
  onClose: () => void
}

/**
 * Modal de edição de dose administrada, alinhado visualmente com o
 * EditModal dos logs normais. Substitui o edit inline anterior do
 * MedicationAdminSheet pra padronizar UX.
 */
export default function MedicationLogEditModal({
  log,
  medication,
  onSave,
  onDelete,
  onClose,
}: Props) {
  useSheetBackClose(true, onClose)

  const d = new Date(log.administeredAt)
  const [time, setTime] = useState(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  )
  const [date, setDate] = useState(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  )
  const [notes, setNotes] = useState(log.notes ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const [h, m] = time.split(':').map(Number)
    const [y, mo, day] = date.split('-').map(Number)
    const newDate = new Date(y, mo - 1, day, h, m)
    setSaving(true)
    const ok = await onSave(log.id, newDate, notes.trim() || null)
    setSaving(false)
    if (ok) onClose()
  }

  const handleDelete = async () => {
    setSaving(true)
    const ok = await onDelete(log.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t-2 border-amber-500 animate-slide-up">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">💊</span>
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Editar — {medication.name}
          </h2>
        </div>
        <p className="font-label text-xs text-on-surface-variant mb-5">
          {medication.dosage}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="font-label text-[11px] text-amber-400 font-semibold uppercase tracking-wider block mb-1.5">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-amber-500/40 min-h-[44px]"
            />
          </div>
          <div>
            <label className="font-label text-[11px] text-amber-400 font-semibold uppercase tracking-wider block mb-1.5">
              Horário
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-amber-500/40 min-h-[44px]"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="font-label text-[11px] text-amber-400 font-semibold uppercase tracking-wider block mb-1.5">
            Observações
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: deu com suco"
            className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-amber-500/40 min-h-[44px]"
          />
        </div>

        {!confirmDel ? (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setConfirmDel(true)}
              disabled={saving}
              className="flex-1 py-3 rounded-md bg-error/15 text-error font-label font-semibold text-sm disabled:opacity-50"
            >
              Excluir
            </button>
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-[2] py-3 rounded-md bg-amber-500 text-white font-label font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setConfirmDel(false)}
              disabled={saving}
              className="flex-1 py-3 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex-[2] py-3 rounded-md bg-gradient-to-br from-error to-error text-on-error font-label font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Excluindo...' : 'Confirmar exclusão'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
