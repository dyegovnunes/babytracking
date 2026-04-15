import { useEffect, useState } from 'react'
import type { Vaccine } from '../vaccineData'
import { hapticMedium, hapticSuccess } from '../../../lib/haptics'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { getLocalDateString } from '../../../lib/formatters'
import type { ApplyVaccineInput, ApplyVaccineResult } from '../useVaccines'

interface Props {
  vaccine: Vaccine
  birthDate: string
  onClose: () => void
  onSave: (input: ApplyVaccineInput) => Promise<ApplyVaccineResult>
}

/**
 * Sheet para registrar aplicação de uma vacina (Yaya+ only).
 * Campos:
 *  - Data de aplicação (default hoje, min = data de nascimento, max = hoje)
 *  - Local (opcional, texto livre — ex: "UBS Centro")
 *  - Lote (opcional, texto livre)
 */
export default function VaccineApplySheet({
  vaccine,
  birthDate,
  onClose,
  onSave,
}: Props) {
  const today = getLocalDateString(new Date())
  const [date, setDate] = useState<string>(today)
  const [location, setLocation] = useState('')
  const [batch, setBatch] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useSheetBackClose(true, onClose)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleSave = async () => {
    if (saving) return
    setError(null)
    setSaving(true)
    hapticMedium()

    const result = await onSave({
      date,
      location: location.trim() || undefined,
      batchNumber: batch.trim() || undefined,
    })

    setSaving(false)

    if (!result.ok) {
      setError(
        result.error === 'not_premium'
          ? 'Marcar vacinas é uma funcionalidade Yaya+.'
          : 'Não foi possível salvar. Tente novamente.',
      )
      return
    }

    hapticSuccess()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-md bg-surface-container-highest p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-on-surface-variant/30 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-12 h-12 rounded-md bg-surface-container flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              vaccines
            </span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary">
              Marcar como aplicada
            </p>
            <h3 className="font-headline text-base font-bold text-on-surface leading-tight mt-0.5">
              {vaccine.name}
            </h3>
            <p className="font-label text-xs text-on-surface-variant mt-0.5">
              {vaccine.doseLabel}
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

        {/* Campos */}
        <Field label="Data de aplicação">
          <input
            type="date"
            value={date}
            min={birthDate}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-surface-container rounded-md px-3 py-2.5 text-sm font-body text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
          />
        </Field>

        <Field label="Local (opcional)">
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: UBS Centro"
            maxLength={80}
            className="w-full bg-surface-container rounded-md px-3 py-2.5 text-sm font-body text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/40"
          />
        </Field>

        <Field label="Lote (opcional)">
          <input
            type="text"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="Ex: ABC123"
            maxLength={40}
            className="w-full bg-surface-container rounded-md px-3 py-2.5 text-sm font-body text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-2 focus:ring-primary/40"
          />
        </Field>

        {error && (
          <p className="font-label text-xs text-red-400 mt-1 mb-2">{error}</p>
        )}

        {/* Ações */}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-md bg-surface-variant/50 text-on-surface-variant font-label text-xs font-semibold active:bg-surface-variant"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label text-xs font-bold active:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <label className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
        {label}
      </label>
      {children}
    </div>
  )
}
