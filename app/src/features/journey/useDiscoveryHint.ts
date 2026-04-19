import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useAppState } from '../../contexts/AppContext'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import {
  selectActiveHint,
  renderHintCopy,
  type DiscoveryHint,
  type HintContext,
} from './hints'
import { getActiveLeap } from '../milestones/developmentLeaps'

/**
 * Seleciona o DiscoveryHint de maior prioridade que ainda bate com o
 * contexto atual do usuário, e entrega renderizado (copy substituído).
 *
 * Retorna `null` quando nenhum hint se aplica ou quando user já dismissou
 * todos os elegíveis.
 *
 * `dismiss(hintKey)` inscreve na tabela `dismissed_hints` (dismiss forever).
 *
 * Fonte de dados do contexto:
 *   - `babyAgeDays`, `babyName`, `totalLogs` — AppState (já em memória)
 *   - `featuresSeen` — fetch single em user_feature_seen
 *   - `hasVaccineRecord`, `hasCaregiver`, `hasSharedReport` — queries leves
 *   - `isInLeap` — computed de baby.birthDate via developmentLeaps
 *   - `isPremium` — useBabyPremium
 *   - `dismissedKeys` — fetch em dismissed_hints
 */
export function useDiscoveryHint() {
  const { user } = useAuth()
  const { baby, logs } = useAppState()
  const isPremium = useBabyPremium()

  const [featuresSeen, setFeaturesSeen] = useState<Set<string>>(new Set())
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set())
  const [hasVaccineRecord, setHasVaccineRecord] = useState(false)
  const [hasCaregiver, setHasCaregiver] = useState(false)
  const [hasSharedReport, setHasSharedReport] = useState(false)
  const [loading, setLoading] = useState(true)

  const babyId = baby?.id

  // Fetch de todos os sinais de contexto em paralelo
  const fetchContext = useCallback(async () => {
    if (!user || !babyId) {
      setLoading(false)
      return
    }
    const [seenRes, dismissedRes, vaccinesRes, caregiverRes, reportRes] =
      await Promise.all([
        supabase
          .from('user_feature_seen')
          .select('feature_key')
          .eq('user_id', user.id),
        supabase
          .from('dismissed_hints')
          .select('hint_key')
          .eq('user_id', user.id),
        supabase
          .from('baby_vaccines')
          .select('id', { count: 'exact', head: true })
          .eq('baby_id', babyId)
          .eq('status', 'applied')
          .limit(1),
        supabase
          .from('baby_members')
          .select('id', { count: 'exact', head: true })
          .eq('baby_id', babyId)
          .eq('role', 'caregiver')
          .limit(1),
        supabase
          .from('shared_reports')
          .select('id', { count: 'exact', head: true })
          .eq('baby_id', babyId)
          .limit(1),
      ])

    setFeaturesSeen(
      new Set((seenRes.data ?? []).map((r) => r.feature_key as string)),
    )
    setDismissedKeys(
      new Set((dismissedRes.data ?? []).map((r) => r.hint_key as string)),
    )
    setHasVaccineRecord((vaccinesRes.count ?? 0) > 0)
    setHasCaregiver((caregiverRes.count ?? 0) > 0)
    setHasSharedReport((reportRes.count ?? 0) > 0)
    setLoading(false)
  }, [user, babyId])

  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  // Re-fetch em visibilitychange (como o useAchievements)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') fetchContext()
    }
    const achievementHandler = () => fetchContext()
    document.addEventListener('visibilitychange', handler)
    window.addEventListener('yaya:achievements-changed', achievementHandler)
    return () => {
      document.removeEventListener('visibilitychange', handler)
      window.removeEventListener(
        'yaya:achievements-changed',
        achievementHandler,
      )
    }
  }, [fetchContext])

  const babyAgeDays = useMemo(() => {
    if (!baby?.birthDate) return 0
    return Math.floor(
      (Date.now() - new Date(baby.birthDate).getTime()) / 86400000,
    )
  }, [baby?.birthDate])

  const isInLeap = useMemo(() => {
    if (!baby?.birthDate) return false
    return getActiveLeap(baby.birthDate) !== null
  }, [baby?.birthDate])

  const totalLogs = logs.length

  const activeHint: {
    hint: DiscoveryHint
    copy: string
  } | null = useMemo(() => {
    if (loading || !baby) return null
    const ctx: HintContext = {
      babyName: baby.name,
      babyAgeDays,
      totalLogs,
      featuresSeen,
      hasVaccineRecord,
      hasCaregiver,
      hasSharedReport,
      isInLeap,
      isPremium,
    }
    const hint = selectActiveHint(ctx, dismissedKeys)
    if (!hint) return null
    return {
      hint,
      copy: renderHintCopy(hint, { babyName: baby.name, totalLogs }),
    }
  }, [
    loading,
    baby,
    babyAgeDays,
    totalLogs,
    featuresSeen,
    hasVaccineRecord,
    hasCaregiver,
    hasSharedReport,
    isInLeap,
    isPremium,
    dismissedKeys,
  ])

  const dismiss = useCallback(
    async (hintKey: string) => {
      if (!user) return
      // Otimista
      setDismissedKeys((prev) => new Set(prev).add(hintKey))
      const { error } = await supabase.from('dismissed_hints').insert({
        user_id: user.id,
        hint_key: hintKey,
      })
      if (error && error.code !== '23505') {
        // Reverte em erro inesperado (23505 = unique violation OK)
        console.error('[useDiscoveryHint] dismiss failed', error)
      }
    },
    [user],
  )

  return { activeHint, dismiss, loading }
}
