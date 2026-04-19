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
 *   que faz INSERT com ON CONFLICT DO NOTHING — idempotente
 * - Dispara 1x por montagem do componente (ref evita chamar múltiplas
 *   vezes no mesmo mount se re-renderizar)
 * - Após track, dispara `achievement-checker` edge function via invoke pra
 *   avaliar imediatamente os achievements `discovered_*` sem esperar o
 *   cron de 5min. User espera reconhecimento AGORA, não em 5min.
 *
 * O edge function roda e, se houver novo unlock, a subscription de
 * realtime em `useAchievements` pega e atualiza o badge na Home.
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
      // Fire-and-forget: checker edge function avalia agora
      supabase.functions
        .invoke('achievement-checker', { body: { user_id: user.id } })
        .catch(() => {
          // Silencia — cron vai eventualmente pegar. UX não trava por isso.
        })
    })()
  }, [user, featureKey])
}
