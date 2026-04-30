import { useEffect, useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { useCaregiverSchedule } from '../useCaregiverSchedule'
import { useAppState } from '../../../contexts/AppContext'
import { useBabyPremium } from '../../../hooks/useBabyPremium'
import { supabase } from '../../../lib/supabase'
import type { CaregiverPermissions } from '../../../types'
import Toast from '../../../components/ui/Toast'

interface Props {
  babyId: string
  caregiverId: string
  caregiverName: string
  onClose: () => void
  onSaved?: () => void
}

interface PermissionRow {
  key: keyof CaregiverPermissions
  label: string
  description: string
}

const PERMISSION_ROWS: PermissionRow[] = [
  { key: 'show_milestones', label: 'Marcos do desenvolvimento', description: 'Consulta da lista e tag de conquistas.' },
  { key: 'show_leaps', label: 'Saltos do desenvolvimento', description: 'Visualizar fases e emoções recentes.' },
  { key: 'show_vaccines', label: 'Caderneta de vacinas', description: 'Ver aplicadas e pendentes.' },
  { key: 'show_growth', label: 'Dados de crescimento', description: 'Peso, altura e percentis.' },
  { key: 'edit_routine', label: 'Editar rotina e intervalos', description: 'Alterar intervalos, banho e horário noturno.' },
]

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
  const { members } = useAppState()
  const isPremium = useBabyPremium()

  // Estado local do form
  const [start, setStart] = useState('08:00')
  const [end, setEnd] = useState('18:00')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [instructions, setInstructions] = useState('')
  const [permissions, setPermissions] = useState<CaregiverPermissions>({})
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

  // Permissões carregadas a partir do Member que já vem no AppContext
  useEffect(() => {
    const initial = members[caregiverId]?.caregiverPermissions ?? {}
    setPermissions(initial)
  }, [caregiverId, members])

  const togglePermission = (key: keyof CaregiverPermissions) => {
    if (!isPremium) return
    hapticLight()
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }))
  }

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
    if (!ok) {
      setSaving(false)
      setError('Não foi possível salvar. Tente novamente.')
      return
    }

    // Só parent que é premium pode tocar em permissões — mas, mesmo no free,
    // queremos garantir que o registro ficou consistente (se não houver mudança,
    // o UPDATE é no-op).
    if (isPremium) {
      const payload: CaregiverPermissions = {
        show_milestones: !!permissions.show_milestones,
        show_leaps: !!permissions.show_leaps,
        show_vaccines: !!permissions.show_vaccines,
        show_growth: !!permissions.show_growth,
      }
      const { data, error: updErr } = await supabase
        .from('baby_members')
        .update({ caregiver_permissions: payload })
        .eq('baby_id', babyId)
        .eq('user_id', caregiverId)
        .select('user_id')
      if (updErr || !data || data.length === 0) {
        setSaving(false)
        setError('Não foi possível salvar as permissões.')
        return
      }
    }

    setSaving(false)
    hapticSuccess()
    setToast('Configurações salvas!')
    onSaved?.()
    setTimeout(() => onClose(), 700)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-container-highest rounded-t-md p-6 pb-sheet border-t-2 border-primary-fixed animate-slide-up">
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
                    className="w-full px-3 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-label text-xs text-on-surface-variant mb-1">Saída</label>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full px-3 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary min-h-[44px]"
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

            {/* ===== O que a babá pode visualizar ===== */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-lg">visibility</span>
                <h3 className="font-headline text-sm font-bold text-on-surface">
                  O que {caregiverName.split(' ')[0]} pode ver
                </h3>
                {!isPremium && (
                  <span className="ml-auto font-label text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Yaya+
                  </span>
                )}
              </div>

              {!isPremium && (
                <p className="font-label text-xs text-on-surface-variant/80 mb-3">
                  Liberação de marcos, saltos, vacinas e crescimento para a babá é um recurso do plano Yaya+.
                </p>
              )}

              <div className="space-y-2">
                {PERMISSION_ROWS.map((row) => {
                  const checked = !!permissions[row.key]
                  return (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => togglePermission(row.key)}
                      disabled={!isPremium}
                      aria-pressed={checked}
                      className={`w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors ${
                        checked
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-surface-container border border-transparent'
                      } ${isPremium ? 'active:bg-surface-container-high' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      <span
                        className={`material-symbols-outlined text-lg mt-0.5 ${checked ? 'text-primary' : 'text-on-surface-variant/70'}`}
                        style={{ fontVariationSettings: checked ? "'FILL' 1" : undefined }}
                      >
                        {checked ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-label text-sm font-semibold ${checked ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                          {row.label}
                        </p>
                        <p className="font-label text-xs text-on-surface-variant/80 mt-0.5">
                          {row.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <p className="font-label text-[11px] text-on-surface-variant/70 mt-3 leading-relaxed">
                A babá sempre vê o histórico de atividades e medicamentos. Perfil, relatórios e membros ficam sempre bloqueados para caregivers.
              </p>
            </section>

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
