import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Mantém `profiles.last_seen_at` (e `last_seen_platform`) atualizados
 * sempre que o usuário abre/foca no app.
 *
 * Sem isso, o "último acesso" no painel admin reflete apenas a última vez
 * que o usuário REGISTROU algo (logs/marcos/vacinas/etc) — mas não captura
 * usuários que só abrem e olham. Isso fazia o painel mostrar acessos
 * antigos pra usuários que de fato usam o app diariamente.
 *
 * Anti-spam: o UPDATE é gated por `last_seen_at < now() - 5 min` no
 * próprio WHERE, então abrir 10 abas ou alternar entre tela rapidamente
 * gera no máximo 1 write a cada 5 min.
 *
 * Eventos rastreados:
 *  - mount com user definido (login + cold start)
 *  - document.visibilitychange → visible (tab volta a foco)
 *  - Capacitor App `resume` (mobile: app sai de background)
 */
export function usePresenceTracker() {
  const { user } = useAuth()
  const userIdRef = useRef<string | null>(null)
  userIdRef.current = user?.id ?? null

  useEffect(() => {
    if (!user) return

    const platform = Capacitor.getPlatform() // 'web' | 'ios' | 'android'

    async function ping() {
      const uid = userIdRef.current
      if (!uid) return
      try {
        // O WHERE garante anti-spam server-side — 1 write a cada 5 min no max
        const { error } = await supabase.rpc('touch_last_seen', {
          p_platform: platform,
        })
        if (error) {
          // Fallback pro update direto se a RPC ainda não existir.
          // (Caso a migration não tenha sido aplicada ainda.)
          await supabase
            .from('profiles')
            .update({
              last_seen_at: new Date().toISOString(),
              last_seen_platform: platform,
            })
            .eq('id', uid)
        }
      } catch {
        // Silencia — presença é best-effort, nunca deve quebrar UX
      }
    }

    // Ping inicial assim que o user está carregado
    ping()

    // Foco da aba (web)
    function onVisibility() {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Resume nativo (Capacitor)
    let capListener: { remove: () => void } | undefined
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('appStateChange', (state) => {
        if (state.isActive) ping()
      }).then((l) => {
        capListener = l
      })
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      capListener?.remove()
    }
  }, [user])
}
