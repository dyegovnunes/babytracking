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
 */
export function useNotificationPrefs() {
  const { baby } = useAppState()
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)

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
          setPrefs({
            enabled: data.enabled,
            categories: {
              feed: data.cat_feed,
              diaper: data.cat_diaper,
              sleep: data.cat_sleep,
              bath: data.cat_bath,
            },
            quietHours: {
              enabled: data.quiet_enabled,
              start: data.quiet_start,
              end: data.quiet_end,
            },
          })
        }
      })
  }, [user, baby])

  const savePrefs = useCallback(
    async (updated: NotifPrefs): Promise<boolean> => {
      setPrefs(updated)
      if (!user || !baby) return true
      const { error } = await supabase
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
      if (error) return false
      dispatch({ type: 'SET_QUIET_HOURS', value: updated.quietHours })
      return true
    },
    [user, baby, dispatch],
  )

  return { prefs, savePrefs }
}
