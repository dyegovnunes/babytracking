import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Row da tabela `app_achievements` (schema em 20260419_journey_v1.sql).
 * Não confundir com `AchievementDef` do registry client (a definição
 * estática — label, emoji, seal, celebration, howTo).
 */
export interface AchievementRow {
  id: string
  userId: string
  babyId: string | null
  achievementKey: string
  unlockedAt: string
  seenAt: string | null
}

interface DbRow {
  id: string
  user_id: string
  baby_id: string | null
  achievement_key: string
  unlocked_at: string
  seen_at: string | null
}

function mapRow(r: DbRow): AchievementRow {
  return {
    id: r.id,
    userId: r.user_id,
    babyId: r.baby_id,
    achievementKey: r.achievement_key,
    unlockedAt: r.unlocked_at,
    seenAt: r.seen_at,
  }
}

/**
 * Hook de acesso aos achievements desbloqueados pelo user atual.
 *
 * Retorna:
 *   - `rows`: todas as linhas
 *   - `unseen`: filtrado por seen_at=null (pra JourneyBadge pulsar)
 *   - `unlockedKeys`: Set<key> pra lookups O(1) (pra marcar cards no sheet)
 *   - `markSeen(key, babyId?)`: chama mark_achievement_seen RPC
 *   - `refetch`: força re-fetch
 *
 * Realtime subscription pega inserts/updates da tabela pra atualizar UI
 * sem refresh (ex: edge function acabou de inserir um achievement novo).
 */
export function useAchievements() {
  const { user } = useAuth()
  const [rows, setRows] = useState<AchievementRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRows = useCallback(async () => {
    if (!user) {
      setRows([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('app_achievements')
      .select('id, user_id, baby_id, achievement_key, unlocked_at, seen_at')
      .eq('user_id', user.id)
      .order('unlocked_at', { ascending: false })

    if (error) {
      console.error('[useAchievements] fetch failed', error)
      setRows([])
    } else {
      setRows((data ?? []).map(mapRow))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  // Re-fetch ao voltar pra aba (visibilitychange) + em evento custom
  // disparado por useFeatureSeen quando destrava algo.
  // Realtime subscription via postgres_changes foi desabilitada — as
  // novas tabelas não têm publication enabled por padrão e o subscribe
  // estava crashando o app.
  useEffect(() => {
    if (!user) return
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchRows()
      }
    }
    const handleChanged = () => fetchRows()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('yaya:achievements-changed', handleChanged)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('yaya:achievements-changed', handleChanged)
    }
  }, [user, fetchRows])

  const markSeen = useCallback(
    async (achievementKey: string, babyId: string | null = null) => {
      const { error } = await supabase.rpc('mark_achievement_seen', {
        p_key: achievementKey,
        p_baby_id: babyId,
      })
      if (error) {
        console.error('[useAchievements] markSeen failed', error)
        return false
      }
      // Otimista: atualiza state local já (realtime vai re-confirmar)
      setRows((prev) =>
        prev.map((r) =>
          r.achievementKey === achievementKey &&
          (r.babyId === babyId || (r.babyId === null && babyId === null))
            ? { ...r, seenAt: new Date().toISOString() }
            : r,
        ),
      )
      return true
    },
    [],
  )

  const unseen = rows.filter((r) => r.seenAt === null)
  const unlockedKeys = new Set(rows.map((r) => r.achievementKey))

  return { rows, unseen, unlockedKeys, loading, markSeen, refetch: fetchRows }
}
