import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook pra chamar a edge function `delete-account`.
 *
 * Fluxo:
 *   1. Invoca a edge function via `supabase.functions.invoke`
 *   2. Em sucesso: limpa localStorage/sessionStorage (sem signOut!)
 *      e retorna `{ ok: true }`.
 *   3. O caller (DeleteAccountModal) exibe a tela de adeus via React
 *      state e depois dispara `window.location.reload()`.
 *      O reload força leitura do storage vazio → user=null → LoginPage. ✓
 *
 * Por que NÃO fazemos signOut aqui:
 *   signOut dispara onAuthStateChange → user=null → AppContext SET_NO_BABY
 *   → needsOnboarding=true → AuthenticatedRoutes desmonta o modal antes
 *   da tela de adeus aparecer. Usuário cai em OnboardingPage. Bug.
 *   Solução: manter o React tree intacto durante a tela de adeus;
 *   o reload que segue já garante sessão limpa.
 */
export function useDeleteAccount() {
  const [loading, setLoading] = useState(false)

  const deleteAccount = useCallback(async (): Promise<{
    ok: boolean
    error?: string
  }> => {
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      if (!session) {
        return { ok: false, error: 'Sessão expirada. Faça login de novo.' }
      }

      const { data, error } = await supabase.functions.invoke<{
        ok?: boolean
        error?: string
      }>('delete-account', {
        body: {},
      })

      if (error) {
        return { ok: false, error: error.message }
      }
      if (data?.error) {
        return { ok: false, error: data.error }
      }

      // Sucesso — a conta já não existe no servidor.
      //
      // NÃO chamamos supabase.auth.signOut() aqui. Motivo: signOut dispara
      // onAuthStateChange → user=null → AppContext dispatch SET_NO_BABY →
      // needsOnboarding=true → AuthenticatedRoutes desmonta o SettingsPage
      // → DeleteAccountModal some antes de renderizar a tela de adeus.
      // Resultado: usuário cai em OnboardingPage, não em LoginPage.
      //
      // Solução: limpar o storage agora (sem signOut) e deixar o caller
      // (DeleteAccountModal) mostrar a tela de adeus via React state.
      // Quando o countdown chegar a 0, window.location.reload() força
      // reload verdadeiro: Supabase lê localStorage vazio → user=null →
      // LoginPage renderiza corretamente. Sem stale AppContext.
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch { /* ignore */ }

      return { ok: true }
    } catch (e) {
      return {
        ok: false,
        error: (e as Error).message ?? 'Erro desconhecido',
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { deleteAccount, loading }
}
