import { useEffect, useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { useCaregiverSchedule } from '../useCaregiverSchedule'
import Toast from '../../../components/ui/Toast'

interface Props {
  babyId: string
  caregiverId: string
  caregiverName: string
  onClose: () => void
  onSaved?: () => void
}

// 0=Dom, 1=Seg ... 6=Sáb (JS getDay)
const WEEKDAY_LABELS: Array<{ value: number; label: string }> = [
  { value: 0, label: 'D' },
  { value: 1, label: 'S' },
  { value: 2, label: 'T' },
  { value: 3, label: 'Q' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'S' },
  { value: 6, label: 'S' },
]

const INSTRUCTIONS_MAX = 1000

/**
 * Bottom sheet onde o parent configura a babá (caregiver) atual:
 * - Horário de trabalho (start/end + workdays)
 * - Instruções livres (máx 1000 chars)
 *
 * Permissões granulares de visualização vêm na Fase 3.
 */
export default function CaregiverEditSheet({ babyId, caregiverId, caregiverName, onClose, onSaved }: Props) {
  useSheetBackClose(true, onClose)
  const { schedule, loading, saveSchedule } = useCaregiverSchedule(babyId, caregiverId)

  // Estado local do form
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('18:00')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [instructions, setInstructions] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Sincroniza estado local com dados carregados
  useEffect(() => {
    if (!schedule) return
    setStart(schedule.workStartTime)
    setEnd(schedule.workEndTime)
    setDays(schedule.workdays)
    setInstructions(schedule.instructions ?? '')
  }, [schedule])

  const toggleDay = (value: number) => {
    hapticLight()
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort()))
  }

  const handleSave = async () => {
    if (saving) return
    setError(null)
    // Validação mínima: pelo menos 1 dia selecionado
    if (days.length === 0) {
      setError('Selecione ao menos um dia da semana.')
      return
    }
    // Validação mínima: end > start (sem suporte a turno noturno nesta fase)
    if (end <= start) {
      setError('O horário de saída deve ser posterior à entrada.')
      return
    }
    setSaving(true)
    const ok = await saveSchedule({
      workStartTime: start,
      workEndTime: end,
      workdays: days,
      instructions: instructions || null,
    })
    setSaving(false)
    if (!ok) {
      setError('Não foi possível salvar. Tente novamente.')
      return
    }
    hapticSuccess()
    setToast('Configurações salvas!')
    onSaved?.()
    // Fecha após um toque para que o toast seja percebido
    setTimeout(() => onClose(), 700)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-container-highest rounded-t-md p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t-2 border-primary-fixed animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div className="min-w-0">
            <h2 className="font-headline text-lg font-bold text-on-surface truncate">{caregiverName}</h2>
            <p className="font-label text-xs text-on-surface-variant">Cuidador(a)</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 -m-1 rounded-md active:bg-surface-container"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center">
            <span className="material-symbols-outlined text-on-surface-variant animate-spin">progress_activity</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* ===== Horário ===== */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-lg">schedule</span>
                <h3 className="font-headline text-sm font-bold text-on-surface">Horário de trabalho</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block font-label text-xs text-on-surface-variant mb-1">Entrada</label>
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-label text-xs text-on-surface-variant mb-1">Saída</label>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <label className="block font-label text-xs text-on-surface-variant mb-2">Dias</label>
              <div className="flex gap-2">
                {WEEKDAY_LABELS.map((d) => {
                  const active = days.includes(d.value)
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      aria-pressed={active}
                      className={`flex-1 h-10 rounded-md font-label text-sm transition-colors ${
                        active
                          ? 'bg-primary text-on-primary font-bold'
                          : 'bg-surface-container text-on-surface-variant active:bg-surface-container-high'
                      }`}
                    >
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* ===== Instruções ===== */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-lg">sticky_note_2</span>
                <h3 className="font-headline text-sm font-bold text-on-surface">
                  Instruções para {caregiverName.split(' ')[0]}
                </h3>
              </div>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value.slice(0, INSTRUCTIONS_MAX))}
                placeholder="Ex: Medicação às 15h, prefere colo para dormir, alergia a leite..."
                rows={5}
                className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary resize-none"
              />
              <div className="mt-1 text-right font-label text-[10px] text-on-surface-variant/70">
                {instructions.length}/{INSTRUCTIONS_MAX}
              </div>
            </section>

            {/* Placeholder para seção 'O que pode visualizar' (Fase 3) */}

            {error && (
              <div className="p-3 rounded-md bg-error/10 border border-error/20">
                <p className="font-label text-xs text-error">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm disabled:opacity-40"
            >
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
