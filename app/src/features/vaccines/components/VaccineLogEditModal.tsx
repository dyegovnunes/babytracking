import { useState } from 'react'
import type { BabyVaccine, Vaccine } from '../vaccineData'
import { VACCINES } from '../vaccineData'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  vaccine: BabyVaccine
  /** Salva mudanças: nova data/hora + campos opcionais */
  onSave: (
    id: string,
    input: { appliedAt: Date; location: string | null; batchNumber: string | null },
  ) => Promise<boolean>
  /** Desmarcar como aplicada */
  onRemove: (id: string) => Promise<boolean>
  onClose: () => void
}

/**
 * Modal de edição de vacina aplicada — mesmo padrão visual do EditModal
 * dos logs de atividade. Edita data + hora + local + lote + remove.
 */
export default function VaccineLogEditModal({ vaccine, onSave, onRemove, onClose }: Props) {
  useSheetBackClose(true, onClose)

  const ref: Vaccine | undefined = VACCINES.find((v) => v.code === vaccine.vaccineCode)

  const d = vaccine.appliedAt ? new Date(vaccine.appliedAt) : new Date()
  const [time, setTime] = useState(
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  )
  const [date, setDate] = useState(
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  )
  const [location, setLocation] = useState(vaccine.location ?? '')
  const [batchNumber, setBatchNumber] = useState(vaccine.batchNumber ?? '')
  const [confirmDel, setConfirmDel] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const [h, m] = time.split(':').map(Number)
    const [y, mo, day] = date.split('-').map(Number)
    const newDate = new Date(y, mo - 1, day, h, m)
    setSaving(true)
    const ok = await onSave(vaccine.id, {
      appliedAt: newDate,
      location: location.trim() || null,
      batchNumber: batchNumber.trim() || null,
    })
    setSaving(false)
    if (ok) onClose()
  }

  const handleRemove = async () => {
    setSaving(true)
    const ok = await onRemove(vaccine.id)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md p-6 pb-sheet border-t-2 border-blue-500 animate-slide-up">
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-blue-400 text-2xl">vaccines</span>
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Editar — {ref?.name ?? vaccine.vaccineCode}
          </h2>
        </div>
        {ref && (
          <p className="font-label text-xs text-on-surface-variant mb-5">
            {ref.doseLabel}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="font-label text-[11px] text-blue-400 font-semibold uppercase tracking-wider block mb-1.5">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[44px]"
            />
          </div>
          <div>
            <label className="font-label text-[11px] text-blue-400 font-semibold uppercase tracking-wider block mb-1.5">
              Horário
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[44px]"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="font-label text-[11px] text-blue-400 font-semibold uppercase tracking-wider block mb-1.5">
            Local de aplicação
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: UBS Centro"
            className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[44px]"
          />
        </div>

        <div className="mb-4">
          <label className="font-label text-[11px] text-blue-400 font-semibold uppercase tracking-wider block mb-1.5">
            Lote
          </label>
          <input
            type="text"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="Opcional"
            className="w-full bg-surface-container-low rounded-md px-3 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-blue-500/40 min-h-[44px]"
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
              className="flex-[2] py-3 rounded-md bg-blue-500 text-white font-label font-semibold text-sm disabled:opacity-50"
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
