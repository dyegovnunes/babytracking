import { useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Registra que o user abriu uma tela/feature pela 1ª vez.
 *
 * Uso: chamar 1x no topo de cada página de feature que queremos rastrear
 * pra disparar achievements de descoberta.
 *
 * ```tsx
 * export default function InsightsPage() {
 *   useFeatureSeen('insights')
 *   // resto da página
 * }
 * ```
 *
 * Comportamento:
 * - Chama `track_feature_seen` RPC (SECURITY DEFINER em 20260419 migration)
 *   que faz INSERT em `user_feature_seen` AND já destrava o
 *   `discovered_*` correspondente em `app_achievements` no mesmo call —
 *   idempotente (ON CONFLICT DO NOTHING)
 * - Dispara 1x por montagem do componente (ref evita chamar múltiplas
 *   vezes no mesmo mount se re-renderizar)
 * - A subscription realtime em `useAchievements` pega o novo unlock e
 *   atualiza o badge na Home instantaneamente
 *
 * Nota: a edge function `achievement-checker` existe pra triggers
 * temporais (cron), não é mais chamada aqui — havia problema de JWT
 * forwarding em `supabase.functions.invoke` que dava 401.
 */
export function useFeatureSeen(featureKey: string) {
  const { user } = useAuth()
  const triggered = useRef(false)

  useEffect(() => {
    if (!user) return
    if (triggered.current) return
    triggered.current = true

    ;(async () => {
      const { error } = await supabase.rpc('track_feature_seen', {
        p_feature_key: featureKey,
      })
      if (error) {
        console.error('[useFeatureSeen] track failed', error)
        return
      }
      // Dispara evento global pra useAchievements re-fetchar e mostrar
      // o novo unlock imediatamente (substitui o realtime subscription).
      window.dispatchEvent(new CustomEvent('yaya:achievements-changed'))
    })()
  }, [user, featureKey])
}
