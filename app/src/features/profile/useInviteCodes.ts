import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { useBabyPremium } from '../../hooks/useBabyPremium'

const INVITE_EXPIRY_DAYS = 30
const FREE_GROUP_SIZE_LIMIT = 2 // parent + 1 cuidador = 2 membros no grupo

/**
 * Manages the active invite code for the current baby.
 *
 * Contract:
 * - `code`: current active invite code (null when none).
 * - `canInviteMore`: false quando o grupo já atingiu o limite do plano.
 *   Caller deve mostrar paywall quando for false.
 * - `generate()`: deactivates existing active codes and creates a new one.
 *   Retorna false se o grupo já está cheio (plano free).
 * - `deactivate()`: deactivates all active codes for this baby. Returns
 *   false if RLS silently blocks the UPDATE — caller should show an error.
 */
export function useInviteCodes() {
  const { baby, members } = useAppState()
  const { user } = useAuth()
  const isPremium = useBabyPremium()
  const [code, setCode] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // Plano free: só 1 cuidador além do parent (2 membros totais no grupo)
  const canInviteMore = useMemo(() => {
    if (isPremium) return true
    return Object.keys(members).length < FREE_GROUP_SIZE_LIMIT
  }, [isPremium, members])

  // Load the most recent active code on mount / baby change
  useEffect(() => {
    if (!baby) return
    let cancelled = false
    supabase
      .from('invite_codes')
      .select('id, code')
      .eq('baby_id', baby.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return
        if (data && data.length > 0) {
          setCode(data[0].code)
        }
      })
    return () => {
      cancelled = true
    }
  }, [baby])

  const generate = useCallback(async (): Promise<boolean> => {
    if (!user || !baby) return false
    // Free: bloqueia se grupo já tem parent + 1 cuidador
    if (!isPremium && Object.keys(members).length >= FREE_GROUP_SIZE_LIMIT) {
      return false
    }
    setGenerating(true)

    // Deactivate any existing active codes for this baby
    await supabase
      .from('invite_codes')
      .update({ active: false })
      .eq('baby_id', baby.id)
      .eq('active', true)

    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString()

    const { error } = await supabase
      .from('invite_codes')
      .insert({
        code: newCode,
        baby_id: baby.id,
        created_by: user.id,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    setGenerating(false)
    if (error) return false
    setCode(newCode)
    return true
  }, [user, baby, isPremium, members])

  /**
   * Deactivate all active codes for this baby. Uses `.select()` to confirm
   * at least one row was updated — so we surface an error when RLS silently
   * blocks the UPDATE.
   */
  const deactivate = useCallback(async (): Promise<boolean> => {
    if (!baby) return false
    const { data, error } = await supabase
      .from('invite_codes')
      .update({ active: false })
      .eq('baby_id', baby.id)
      .eq('active', true)
      .select('id')

    if (error || !data || data.length === 0) return false
    setCode(null)
    return true
  }, [baby])

  return { code, generating, canInviteMore, generate, deactivate }
}
