import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { contractionDe } from '../../lib/genderUtils'

export interface ReferralRewards {
  /** Contadores */
  activatedCount: number
  pendingCount: number
  subscribedCount: number
  /** Bônus de registros/dia (30 × ativações). Reseta diariamente. */
  dailyBonusRecords: number
  /** Total acumulado de dias de Yaya+ ganhos (cortesias +7d/10at + 30d/assinatura) */
  cumulativeYayaDays: number
  /** Próximo milestone de 10 ativações pro progresso (10, 20, 30…) */
  nextMilestone: number
}

export interface ReferralEntry {
  id: string
  status: 'pending' | 'activated' | 'subscribed_paid'
  subscriptionPlan: string | null
  createdAt: string
  activatedAt: string | null
  subscribedAt: string | null
}

/**
 * Hook do MGM. Carrega código do user + recompensas acumuladas + lista.
 * RLS + RPC SECURITY DEFINER garantem escopo.
 */
export function useReferral() {
  const { user } = useAuth()
  const [code, setCode] = useState<string | null>(null)
  const [rewards, setRewards] = useState<ReferralRewards | null>(null)
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setCode(null)
      setRewards(null)
      setReferrals([])
      setLoading(false)
      return
    }

    setLoading(true)
    const [codeRes, rewardsRes, listRes] = await Promise.all([
      supabase.from('profiles').select('referral_code').eq('id', user.id).single(),
      supabase.rpc('get_my_referral_rewards'),
      supabase.rpc('get_my_referrals'),
    ])

    if (codeRes.data?.referral_code) setCode(codeRes.data.referral_code)

    if (rewardsRes.data && Array.isArray(rewardsRes.data) && rewardsRes.data.length > 0) {
      const row = rewardsRes.data[0] as {
        activated_count: number
        pending_count: number
        subscribed_count: number
        daily_bonus_records: number
        cumulative_yaya_days: number
        next_milestone: number
      }
      setRewards({
        activatedCount: Number(row.activated_count),
        pendingCount: Number(row.pending_count),
        subscribedCount: Number(row.subscribed_count),
        dailyBonusRecords: row.daily_bonus_records,
        cumulativeYayaDays: row.cumulative_yaya_days,
        nextMilestone: row.next_milestone,
      })
    }

    if (listRes.data && Array.isArray(listRes.data)) {
      setReferrals(
        (listRes.data as {
          id: string
          status: 'pending' | 'activated' | 'subscribed_paid'
          subscription_plan: string | null
          created_at: string
          activated_at: string | null
          subscribed_at: string | null
        }[]).map((r) => ({
          id: r.id,
          status: r.status,
          subscriptionPlan: r.subscription_plan,
          createdAt: r.created_at,
          activatedAt: r.activated_at,
          subscribedAt: r.subscribed_at,
        })),
      )
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  return { code, rewards, referrals, loading, reload: load }
}

/**
 * Busca rápida do bônus diário (usado pelo useDailyLimit).
 * Retorna 30 × ativações, ou 0 se não há referrals.
 */
export async function fetchDailyBonusRecords(): Promise<number> {
  const { data, error } = await supabase.rpc('get_my_referral_rewards')
  if (error || !Array.isArray(data) || data.length === 0) return 0
  const row = data[0] as { daily_bonus_records: number }
  return row.daily_bonus_records ?? 0
}

export async function acceptReferral(code: string): Promise<boolean> {
  if (!code || !code.trim()) return false
  const { data, error } = await supabase.rpc('accept_referral', {
    p_code: code.trim().toUpperCase(),
  })
  if (error) return false
  return data === true
}

export function buildReferralLink(code: string): string {
  return `https://yayababy.app/i/${code}`
}

/**
 * Mensagem padrão pra share. Respeita gênero do bebê ("da Sofia" vs "do Guto").
 */
export function buildShareMessage(
  code: string,
  baby?: { name?: string; gender?: 'boy' | 'girl' },
): string {
  let suffix = ''
  if (baby?.name) {
    const prep = contractionDe(baby.gender ?? 'boy') // "do" ou "da"
    suffix = ` ${prep} ${baby.name}`
  }
  return `Olha esse app que uso pra organizar a rotina${suffix} 👶\n\n${buildReferralLink(code)}`
}
