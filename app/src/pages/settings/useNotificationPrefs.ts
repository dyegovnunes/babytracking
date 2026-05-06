import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAppState, useAppDispatch } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { DEFAULT_PREFS, type NotifPrefs } from './types'

/**
 * Loads and persists notification preferences for the current user + baby.
 * Keeps `quietHours` in sync with AppContext so the rest of the app
 * (insights, push scheduler) reads from a single source of truth.
 *
 * `savePrefs` returns a boolean so the caller can show a toast on failure.
 *
 * FONTE DE VERDADE para quietHours:
 * - `notification_prefs` é per-user — só guarda enabled/categories de notificação
 * - `babies.quiet_hours_*` é per-baby (compartilhado) — fonte canônica para horário noturno
 * - `AppContext.quietHours` é carregado de `babies` → é o valor correto para exibir
 * Por isso `prefs.quietHours` é sempre derivado de AppContext, nunca de notification_prefs.
 */
export function useNotificationPrefs() {
  const { baby, quietHours } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()

  // Inicializa com quietHours do AppContext (já carregado de babies na inicialização)
  const [prefs, setPrefs] = useState<NotifPrefs>({ ...DEFAULT_PREFS, quietHours })

  // Carrega apenas campos per-user (enabled, categories) do notification_prefs.
  // quietHours NÃO vem daqui — vem do AppContext para garantir sincronização entre usuários.
  useEffect(() => {
    if (!user || !baby) return
    supabase
      .from('notification_prefs')
      .select('*')
      .eq('user_id', user.id)
      .eq('baby_id', baby.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPrefs(prev => ({
            enabled: data.enabled,
            categories: {
              feed: data.cat_feed,
              diaper: data.cat_diaper,
              sleep: data.cat_sleep,
              bath: data.cat_bath,
            },
            // Mantém o quietHours atual do AppContext, não o do notification_prefs
            quietHours: prev.quietHours,
          }))
        }
      })
  }, [user?.id, baby?.id])

  // Sincroniza quietHours sempre que AppContext.quietHours mudar.
  // Isso garante que a UI reflita mudanças feitas por outro cuidador.
  useEffect(() => {
    setPrefs(prev => ({ ...prev, quietHours }))
  }, [quietHours])

  const savePrefs = useCallback(
    async (updated: NotifPrefs): Promise<boolean> => {
      setPrefs(updated)
      if (!user || !baby) return true

      // Persiste prefs deste user para este bebê (pushs, notificações).
      const prefsPromise = supabase
        .from('notification_prefs')
        .upsert(
          {
            user_id: user.id,
            baby_id: baby.id,
            enabled: updated.enabled,
            cat_feed: updated.categories.feed,
            cat_diaper: updated.categories.diaper,
            cat_sleep: updated.categories.sleep,
            cat_bath: updated.categories.bath,
            quiet_enabled: updated.quietHours.enabled,
            quiet_start: updated.quietHours.start,
            quiet_end: updated.quietHours.end,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,baby_id' },
        )

      // Espelha o horário noturno na tabela babies — fonte única
      // consumida pelo Super Relatório, push-scheduler e AppContext.
      const babyPromise = supabase
        .from('babies')
        .update({
          quiet_hours_enabled: updated.quietHours.enabled,
          quiet_hours_start: updated.quietHours.start,
          quiet_hours_end: updated.quietHours.end,
        })
        .eq('id', baby.id)

      const [{ error: prefsError }, { error: babyError }] = await Promise.all([
        prefsPromise,
        babyPromise,
      ])
      if (prefsError || babyError) return false
      dispatch({ type: 'SET_QUIET_HOURS', value: updated.quietHours })
      return true
    },
    [user, baby, dispatch],
  )

  return { prefs, savePrefs }
}
