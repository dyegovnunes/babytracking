import { useEffect, useState } from 'react'
import { useAppState } from '../../../contexts/AppContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useMyRole } from '../../../hooks/useMyRole'
import { useBabyPremium } from '../../../hooks/useBabyPremium'
import { useCaregiverSchedule, isInWorkWindow } from '../../profile/useCaregiverSchedule'
import { useCaregiverShift } from '../useCaregiverShift'
import { contractionDe } from '../../../lib/genderUtils'
import { hapticLight } from '../../../lib/haptics'
import ResumoDoDiaSheet from './ResumoDoDiaSheet'

/**
 * Botão self-gated do "Resumo do dia":
 * aparece no TrackerPage apenas quando o usuário atual for caregiver
 * no bebê ativo E:
 *  - Bebê é premium (feature Yaya+)
 *  - Existe schedule configurado
 *  - Agora está na janela de exibição: -45min antes até +60min depois do work_end
 *  - Ainda não submeteu resumo hoje
 */
export default function ResumoDoDiaButton() {
  const { baby } = useAppState()
  const { user } = useAuth()
  const myRole = useMyRole()
  const isPremium = useBabyPremium()
  const { schedule } = useCaregiverSchedule(
    myRole === 'caregiver' ? baby?.id : undefined,
    myRole === 'caregiver' ? user?.id : undefined,
  )
  const { hasSubmittedToday } = useCaregiverShift(
    myRole === 'caregiver' ? baby?.id : undefined,
    myRole === 'caregiver' ? user?.id : undefined,
  )

  // Recomputa a janela a cada minuto (para não ficar "pendurado" ao longo do dia)
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  const [open, setOpen] = useState(false)

  if (myRole !== 'caregiver' || !isPremium || !schedule || hasSubmittedToday) return null

  const inWindow = isInWorkWindow(schedule, { startOffsetMin: -45, endOffsetMin: 60 })
  if (!inWindow) return null

  if (!baby || !user) return null

  return (
    <>
      <div className="px-5">
        <button
          type="button"
          onClick={() => { hapticLight(); setOpen(true) }}
          className="w-full h-12 rounded-md border border-primary/40 text-primary bg-transparent font-label text-sm active:bg-primary/5 transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base">assignment</span>
          Registrar resumo do dia com {contractionDe(baby.gender)} {baby.name}
        </button>
      </div>
      {open && (
        <ResumoDoDiaSheet
          babyId={baby.id}
          babyName={baby.name}
          caregiverId={user.id}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
