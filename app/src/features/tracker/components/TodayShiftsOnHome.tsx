import { useEffect, useState } from 'react'
import { useAppState } from '../../../contexts/AppContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useCaregiverSchedule, isInWorkWindow } from '../../profile/useCaregiverSchedule'
import { useShiftsForBaby } from '../useCaregiverShift'
import { getLocalDateString } from '../../../lib/formatters'
import ShiftSummaryRow from '../../history/components/ShiftSummaryRow'
import ResumoDoDiaSheet from './ResumoDoDiaSheet'

/**
 * Renderiza na Home todos os resumos de shift enviados hoje para o bebê ativo.
 *
 * - Parent/guardian: veem read-only (click expande os detalhes).
 * - Caregiver dono do shift, dentro da janela de edição (+60min após o work_end):
 *   click abre o ResumoDoDiaSheet em modo de edição.
 * - Fora da janela de edição, mesmo o próprio caregiver vê apenas expandir/ler.
 */
export default function TodayShiftsOnHome() {
  const { baby, members } = useAppState()
  const { user } = useAuth()
  const today = getLocalDateString()
  const { shifts } = useShiftsForBaby(baby?.id, today, today)
  // Schedule do próprio usuário (só existe quando ele é caregiver desse bebê)
  const { schedule } = useCaregiverSchedule(baby?.id, user?.id)

  // Recomputa janela a cada minuto para expirar o botão de edit sem refresh
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)

  if (!baby || shifts.length === 0) return null

  const canEditShift = (caregiverId: string): boolean => {
    if (!user || user.id !== caregiverId) return false
    if (!schedule) return false
    // Mesma regra do botão de registrar: -45min antes do início até +60min após o fim.
    // Fora disso, sem edição (usuário precisaria pedir ajuste do horário para os pais).
    return isInWorkWindow(schedule, { startOffsetMin: -45, endOffsetMin: 60 })
  }

  const editingShift = shifts.find((s) => s.id === editingShiftId)

  return (
    <>
      <section className="px-5 mt-6">
        <h2 className="font-headline text-base font-bold text-on-surface mb-3">
          Resumo do dia
        </h2>
        <div className="space-y-0">
          {shifts.map((s) => {
            const name = members[s.caregiverId]?.displayName || 'Cuidador(a)'
            const editable = canEditShift(s.caregiverId)
            return (
              <ShiftSummaryRow
                key={s.id}
                shift={s}
                caregiverName={name}
                onEdit={editable ? () => setEditingShiftId(s.id) : undefined}
              />
            )
          })}
        </div>
      </section>

      {editingShift && user && (
        <ResumoDoDiaSheet
          babyId={baby.id}
          babyName={baby.name}
          caregiverId={editingShift.caregiverId}
          onClose={() => setEditingShiftId(null)}
        />
      )}
    </>
  )
}
