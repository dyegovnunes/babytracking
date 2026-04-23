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

      // Sucesso — conta deletada no servidor.
      //
      // Estratégia para mostrar a tela de adeus sem cair em OnboardingPage:
      //
      // 1. Setar flag em sessionStorage ANTES de limpar localStorage.
      //    sessionStorage sobrevive a window.location.reload() mas NÃO é
      //    afetado por localStorage.clear(). É a âncora que AppRoutes usa
      //    para renderizar DeletedAccountPage acima do auth check.
      //
      // 2. Limpar localStorage — isso faz o Supabase detectar sessão vazia
      //    e disparar onAuthStateChange → user=null. Sem o flag de sessão,
      //    AppRoutes cairia em OnboardingPage. Com o flag, AppRoutes renderiza
      //    DeletedAccountPage independentemente do estado de auth.
      //
      // 3. O caller (DeleteAccountModal) chama window.location.reload()
      //    imediatamente. No reload, AppRoutes vê o flag → DeletedAccountPage.
      //    Após o countdown, DeletedAccountPage remove o flag e chama reload()
      //    de novo → sem flag + sem localStorage → LoginPage ✓
      try {
        sessionStorage.setItem('yaya_account_deleted', '1')
        localStorage.clear()
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
