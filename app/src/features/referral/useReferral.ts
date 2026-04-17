import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

export interface ReferralStatus {
  code: string
  credits: number
  activatedCount: number
  pendingCount: number
  subscribedCount: number
  /** Próximo milestone de 10 ativações (ex: 10, 20, 30) pro progresso */
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
 * Hook principal do MGM. Carrega status + lista de indicações do user atual.
 * Exponibiliza `reload()` pra atualizar após ações (accept, compartilhar).
 *
 * RLS garante que cada user só vê os próprios dados.
 */
export function useReferral() {
  const { user } = useAuth()
  const [status, setStatus] = useState<ReferralStatus | null>(null)
  const [referrals, setReferrals] = useState<ReferralEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) {
      setStatus(null)
      setReferrals([])
      setLoading(false)
      return
    }

    setLoading(true)
    const [statusRes, listRes] = await Promise.all([
      supabase.rpc('get_my_referral_status'),
      supabase.rpc('get_my_referrals'),
    ])

    if (statusRes.data && Array.isArray(statusRes.data) && statusRes.data.length > 0) {
      const row = statusRes.data[0] as {
        code: string
        credits: number
        activated_count: number
        pending_count: number
        subscribed_count: number
        next_milestone: number
      }
      setStatus({
        code: row.code,
        credits: row.credits,
        activatedCount: Number(row.activated_count),
        pendingCount: Number(row.pending_count),
        subscribedCount: Number(row.subscribed_count),
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

  return { status, referrals, loading, reload: load }
}

/**
 * Consome 1 crédito de atividade (chamado quando user free passa do
 * daily limit mas tem saldo). Retorna saldo novo, ou null se erro/sem crédito.
 */
export async function consumeActivityCredit(): Promise<number | null> {
  const { data, error } = await supabase.rpc('consume_activity_credit')
  if (error) return null
  const balance = typeof data === 'number' ? data : -1
  return balance < 0 ? null : balance
}

/**
 * Aceita um código de indicação (chamado no signup ou pelo user
 * manualmente se errou no fluxo). Retorna true se associou.
 */
export async function acceptReferral(code: string): Promise<boolean> {
  if (!code || !code.trim()) return false
  const { data, error } = await supabase.rpc('accept_referral', {
    p_code: code.trim().toUpperCase(),
  })
  if (error) return false
  return data === true
}

/** Monta o link compartilhável pro código (web). */
export function buildReferralLink(code: string): string {
  return `https://yayababy.app/i/${code}`
}

/** Mensagem padrão pra share. */
export function buildShareMessage(code: string, babyName?: string): string {
  const suffix = babyName ? ` do ${babyName}` : ''
  return `Olha esse app que uso pra organizar a rotina${suffix} 👶\n\n${buildReferralLink(code)}`
}
