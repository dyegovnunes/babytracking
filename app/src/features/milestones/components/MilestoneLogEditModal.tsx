import { useState } from 'react'
import type { BabyMilestone, Milestone } from '../milestoneData'
import { MILESTONES } from '../milestoneData'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  milestone: BabyMilestone
  /** Salva mudanças: nova data/hora + nota */
  onSave: (
    id: string,
    input: { achievedAt: Date; note: string | null },
  ) => Promise<boolean>
  /** Desmarcar o marco */
  onRemove: (id: string) => Promise<boolean>
  onClose: () => void
}

/**
 * Modal de edição de marco atingido — mesmo padrão visual do EditModal
 * dos logs de atividade. Edita data + hora + nota + remove.
 */
export default function MilestoneLogEditModal({ milestone, onSave, onRemove, onClose }: Props) {
  useSheetBackClose(true, onClose)

  const ref: Milestone | undefined = MILESTONES.find((m) => m.code === milestone.milestoneCode)

  const d = milestone.achievedAt ? new Date(milestone.achievedAt) : new Date()
  const [time, setTime] = useState(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  )
  const [date, setDate] = useState(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  )
  const [note, setNote] = useState(milestone.note ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const [h, m] = time.split(':').map(Number)
    const [y, mo, day] = date.split('-').map(Number)
    const newDate = new Date(y, mo - 1, day, h, m)
    setSaving(true)
    const ok = await onSave(milestone.id, {
      achievedAt: newDate,
      note: note.trim() || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const handleRemove = async () => {
    setSaving(true)
    const ok = await onRemove(milestone.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md p-6 pb-sheet border-t-2 border-primary animate-slide-up">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">{ref?.emoji ?? '🎉'}</span>
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Editar — {ref?.name ?? milestone.milestoneCode}
          </h2>
        </div>
        {ref && (
          <p className="font-label text-xs text-on-surface-variant mb-5">
            {ref.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
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
              className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="font-label text-[11px] text-primary font-semibold uppercase tracking-wider block mb-1.5">
            Nota
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: foi no parque"
            className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
          />
        </div>

        {!confirmDel ? (
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setConfirmDel(true)}
              disabled={saving}
              className="flex-1 py-3 rounded-md bg-error/15 text-error font-label font-semibold text-sm disabled:opacity-50"
            >
              Desmarcar
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
              className="flex-[2] py-3 rounded-md bg-gradient-to-br from-primary to-primary-container text-on-primary font-label font-semibold text-sm disabled:opacity-50"
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
              onClick={handleRemove}
              disabled={saving}
              className="flex-[2] py-3 rounded-md bg-gradient-to-br from-error to-error text-on-error font-label font-semibold text-sm disabled:opacity-50"
            >
              {saving ? 'Removendo...' : 'Confirmar desmarcar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
