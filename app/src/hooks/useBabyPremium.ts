import { useAppState } from '../contexts/AppContext'

/**
 * Retorna true se o bebê atualmente selecionado é premium.
 *
 * A assinatura é do bebê (via parent), não do usuário.
 * Usar este hook para features que dependem do bebê (Insights, Marcos, PDF, etc.).
 * Para a tela de assinatura do RevenueCat, continuar usando usePremium().
 */
export function useBabyPremium(): boolean {
  const { baby } = useAppState()
  return baby?.isPremium ?? false
}
