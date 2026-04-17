import { useEffect, useState } from 'react'
import { useAppState } from '../../../contexts/AppContext'
import { useAuth } from '../../../contexts/AuthContext'
import { useMyRole } from '../../../hooks/useMyRole'
import { useCaregiverSchedule, isInWorkWindow } from '../../profile/useCaregiverSchedule'

/**
 * Banner discreto exibido para caregivers quando eles estão fora da janela
 * de trabalho configurada (dia não-work OU hora fora de start/end).
 *
 * MVP: apenas aviso visual. Registros seguem funcionando normalmente.
 * Bloqueio real fica para quando introduzirmos `caregiver_sessions`.
 */
export default function OutOfHoursBanner() {
  const { baby } = useAppState()
  const { user } = useAuth()
  const myRole = useMyRole()
  const { schedule } = useCaregiverSchedule(
    myRole === 'caregiver' ? baby?.id : undefined,
    myRole === 'caregiver' ? user?.id : undefined,
  )

  // Recomputa a cada minuto
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  if (myRole !== 'caregiver' || !schedule) return null
  // Dentro da janela estrita → não mostra (sem tolerância no banner)
  if (isInWorkWindow(schedule)) return null

  return (
    <div className="mx-5 my-3 p-3 rounded-md bg-amber-500/10 border border-amber-500/25 flex items-start gap-2">
      <span className="material-symbols-outlined text-amber-600 text-base mt-0.5">schedule</span>
      <p className="font-label text-xs text-on-surface leading-relaxed">
        Você está fora do seu horário de trabalho.
        Peça para o(a) responsável ajustar se precisar.
      </p>
    </div>
  )
}
