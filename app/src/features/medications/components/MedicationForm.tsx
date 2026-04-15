import { useEffect, useMemo, useState } from 'react'
import {
  FREQUENCY_PRESETS,
  type CreateMedicationInput,
  type Medication,
  type MedicationDurationType,
} from '../medicationData'
import { computeScheduleTimes } from '../medicationUtils'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { getLocalDateString } from '../../../lib/formatters'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  /** Controle de abertura. Se false, o componente não renderiza nada. */
  isOpen: boolean
  onClose: () => void
  /** Callback que persiste e retorna sucesso. */
  onSave: (input: CreateMedicationInput) => Promise<boolean>
  /** Se passado, o form entra em modo edição e pré-preenche os campos. */
  initialData?: Medication | null
}

/**
 * Bottom sheet de cadastro OU edição de medicamento.
 *
 * Fluxo:
 *   nome → dosagem → frequência (preset) → primeiro horário → duração → salvar
 *
 * Em modo edição (`initialData` passado), os campos vêm pré-preenchidos e
 * o título do sheet muda para "Editar medicamento". O parent decide se
 * `onSave` é insert ou update — o form só entrega o input normalizado.
 */
export default function MedicationForm({ isOpen, onClose, onSave, initialData }: Props) {
  const isEdit = !!initialData

  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [presetKey, setPresetKey] = useState<string>(FREQUENCY_PRESETS[0].key)
  const [firstTime, setFirstTime] = useState('08:00')
  const [durationType, setDurationType] =
    useState<MedicationDurationType>('continuous')
  const [durationDays, setDurationDays] = useState<number>(5)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useSheetBackClose(isOpen, onClose)

  // Travar scroll do body
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  // Pré-preenche quando abrir em modo edit; reseta quando fechar
  useEffect(() => {
    if (isOpen && initialData) {
      const firstSchedule = initialData.scheduleTimes[0] ?? '08:00'
      // Tenta casar o preset exato pela frequência; se não achar, usa 1x
      const matched =
        FREQUENCY_PRESETS.find(
          (p) => p.hours === initialData.frequencyHours,
        ) ?? FREQUENCY_PRESETS[0]
      setName(initialData.name)
      setDosage(initialData.dosage)
      setPresetKey(matched.key)
      setFirstTime(firstSchedule)
      setDurationType(initialData.durationType)
      if (
        initialData.durationType === 'fixed' &&
        initialData.endDate &&
        initialData.startDate
      ) {
        const start = parseLocalDate(initialData.startDate)
        const end = parseLocalDate(initialData.endDate)
        if (start && end) {
          const days =
            Math.round((end.getTime() - start.getTime()) / 86400000) + 1
          setDurationDays(Math.max(1, days))
        }
      } else {
        setDurationDays(5)
      }
      setNotes(initialData.notes ?? '')
      setError(null)
      setSaving(false)
      return
    }
    if (!isOpen) {
      setName('')
      setDosage('')
      setPresetKey(FREQUENCY_PRESETS[0].key)
      setFirstTime('08:00')
      setDurationType('continuous')
      setDurationDays(5)
      setNotes('')
      setError(null)
      setSaving(false)
    }
  }, [isOpen, initialData])

  const preset = useMemo(
    () => FREQUENCY_PRESETS.find((p) => p.key === presetKey) ?? FREQUENCY_PRESETS[0],
    [presetKey],
  )

  const schedule = useMemo(
    () => computeScheduleTimes(firstTime, preset.hours),
    [firstTime, preset.hours],
  )

  const today = getLocalDateString(new Date())

  const endDate = useMemo(() => {
    if (durationType !== 'fixed') return null
    const baseDate = initialData?.startDate ?? today
    const start = parseLocalDate(baseDate) ?? new Date()
    const end = new Date(start)
    end.setDate(start.getDate() + Math.max(1, durationDays) - 1)
    return getLocalDateString(end)
  }, [durationType, durationDays, today, initialData?.startDate])

  const canSave =
    name.trim().length > 0 &&
    dosage.trim().length > 0 &&
    schedule.length > 0 &&
    !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    hapticLight()
    const ok = await onSave({
      name: name.trim(),
      dosage: dosage.trim(),
      frequencyHours: preset.hours,
      scheduleTimes: schedule,
      durationType,
      startDate: effectiveStartDate,
      endDate,
      notes: notes.trim() || null,
    })
    setSaving(false)
    if (ok) {
      hapticSuccess()
      onClose()
    } else {
      setError('Não foi possível salvar. Tente novamente.')
    }
  }

  if (!isOpen) return null

  // Mantém a data de início do cadastro original quando editando, pra não
  // resetar o tratamento fixo pro dia de hoje.
  const effectiveStartDate = initialData?.startDate ?? today

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-md bg-surface-container-highest p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[92vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-on-surface-variant/30 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary">
              {isEdit ? 'EDITAR' : 'NOVO MEDICAMENTO'}
            </p>
            <h3 className="font-headline text-lg font-bold text-on-surface leading-tight mt-0.5">
              {isEdit ? 'Editar medicamento' : 'Cadastrar medicamento'}
            </h3>
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

        {/* Nome */}
        <div className="mb-4">
          <label className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
            Nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Dipirona, Vitamina D"
            className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-white/5 text-on-surface font-body text-sm focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Dosagem */}
        <div className="mb-4">
          <label className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
            Dosagem
          </label>
          <input
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder='ex: "3 gotas", "5ml", "1 comprimido"'
            className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-white/5 text-on-surface font-body text-sm focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Frequência */}
        <div className="mb-4">
          <label className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
            Frequência
          </label>
          <div className="flex gap-2 flex-wrap">
            {FREQUENCY_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  hapticLight()
                  setPresetKey(p.key)
                }}
                className={`px-3 py-2 rounded-md font-label text-xs font-semibold transition-colors ${
                  presetKey === p.key
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-on-surface-variant active:bg-surface-container-high'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Primeiro horário */}
        <div className="mb-4">
          <label className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
            Primeiro horário
          </label>
          <input
            type="time"
            value={firstTime}
            onChange={(e) => setFirstTime(e.target.value)}
            className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-white/5 text-on-surface font-body text-sm focus:outline-none focus:border-primary/40"
          />
        </div>

        {/* Preview horários */}
        <div className="mb-4 p-3 rounded-md bg-primary/5 border border-primary/15">
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">
            Horários do dia
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {schedule.map((t) => (
              <span
                key={t}
                className="font-headline text-xs font-bold text-on-surface bg-surface-container-highest px-2 py-1 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Duração */}
        <div className="mb-4">
          <label className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
            Duração
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => {
                hapticLight()
                setDurationType('continuous')
              }}
              className={`flex-1 px-3 py-2.5 rounded-md font-label text-xs font-semibold transition-colors ${
                durationType === 'continuous'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant active:bg-surface-container-high'
              }`}
            >
              Uso contínuo
            </button>
            <button
              type="button"
              onClick={() => {
                hapticLight()
                setDurationType('fixed')
              }}
              className={`flex-1 px-3 py-2.5 rounded-md font-label text-xs font-semibold transition-colors ${
                durationType === 'fixed'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant active:bg-surface-container-high'
              }`}
            >
              Por X dias
            </button>
          </div>
          {durationType === 'fixed' && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) =>
                  setDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))
                }
                className="w-20 px-3 py-2 rounded-md bg-surface-container border border-white/5 text-on-surface font-body text-sm focus:outline-none focus:border-primary/40"
              />
              <span className="font-body text-xs text-on-surface-variant">
                dias · termina em {endDate}
              </span>
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="mb-5">
          <label className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5 block">
            Observações (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='ex: "dar antes da mamada", "com suco"'
            rows={2}
            className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-white/5 text-on-surface font-body text-sm focus:outline-none focus:border-primary/40 resize-none"
          />
        </div>

        {/* Disclaimer */}
        <div className="mb-5 p-3 rounded-md bg-yellow-500/5 border border-yellow-500/20">
          <p className="font-body text-[11px] text-on-surface-variant leading-relaxed">
            O Yaya ajuda a organizar a rotina de medicamentos. Sempre siga as
            orientações do pediatra.
          </p>
        </div>

        {error && (
          <p className="font-body text-xs text-red-400 mb-3 text-center">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
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
            disabled={!canSave}
            className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label text-xs font-bold active:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function parseLocalDate(s: string): Date | null {
  const [y, m, d] = s.split('-').map((v) => parseInt(v, 10))
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}
