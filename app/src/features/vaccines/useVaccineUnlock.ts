import { useCallback, useState } from 'react'
import { showRewardedAd } from '../../lib/admob'

const UNLOCK_DURATION_MS = 10 * 60 * 1000 // 10 minutos
const STORAGE_PREFIX = 'yaya_vaccines_unlock_'

/**
 * Mecânica de unlock temporário para vacinas (free).
 *
 * Free precisa ver 1 rewarded ad para desbloquear marcar/desmarcar. Após
 * o ad, fica desbloqueado por 10 minutos (sem contador visível pro user).
 * Premium já é sempre desbloqueado (check feito fora do hook).
 *
 * Usa localStorage para persistir entre navegações.
 */
export function useVaccineUnlock(babyId: string | undefined) {
  const storageKey = babyId ? `${STORAGE_PREFIX}${babyId}` : ''
  const [, setTick] = useState(0) // para forçar re-render após unlock

  const isUnlocked = useCallback((): boolean => {
    if (!storageKey) return false
    const until = Number(localStorage.getItem(storageKey) ?? 0)
    return Date.now() < until
  }, [storageKey])

  /**
   * Garante que a ação pode prosseguir. Se já estiver unlocked → true.
   * Caso contrário mostra rewarded ad — se o user ver, desbloqueia 10 min
   * e retorna true. Se cancelar, retorna false.
   */
  const ensureUnlocked = useCallback(async (): Promise<boolean> => {
    if (!storageKey) return false
    if (isUnlocked()) return true

    const watched = await showRewardedAd()
    if (!watched) return false

    const until = Date.now() + UNLOCK_DURATION_MS
    localStorage.setItem(storageKey, String(until))
    setTick((t) => t + 1) // dispara re-render para componentes que usam isUnlocked
    return true
  }, [storageKey, isUnlocked])

  return { isUnlocked, ensureUnlocked }
}
