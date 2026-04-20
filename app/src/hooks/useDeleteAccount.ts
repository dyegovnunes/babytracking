import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Hook pra chamar a edge function `delete-account` e deslogar.
 *
 * Fluxo:
 *   1. Pega session atual (precisamos do access_token pra Authorization)
 *   2. Invoca a edge function via `supabase.functions.invoke`
 *   3. Em sucesso: signOut LOCAL (scope='local' evita 401 do servidor
 *      já que o user foi apagado) + FULL RELOAD pra garantir que todo
 *      o AppContext volta a `initialState` e a UI aterrissa em LoginPage
 *      deslogado. Sem reload, o AppContext mantém `needsOnboarding=true`
 *      stale e App.tsx renderiza OnboardingPage por engano.
 *
 * Retorna `{ ok, error }` ao invés de throw, pra o caller exibir toast.
 * **Nota**: em sucesso, a função dispara `window.location.href = '/login'`
 * e nunca retorna de fato (navega fora), mas mantém a assinatura por
 * compat com o consumer.
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

      // Sucesso — a conta já não existe no servidor. signOut com
      // scope='local' evita o 401 do /logout endpoint (que precisaria
      // de user válido). Limpa storage manualmente antes do reload
      // pra garantir que nenhum refresh_token sobrevive.
      await supabase.auth.signOut({ scope: 'local' })
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (!key) continue
          if (key.startsWith('sb-') || key.startsWith('supabase.') || key.startsWith('yaya_')) {
            localStorage.removeItem(key)
          }
        }
        sessionStorage.clear()
      } catch { /* ignore */ }
      // Pequeno delay pro caller exibir toast de sucesso antes do reload.
      setTimeout(() => {
        window.location.replace('/login')
      }, 1200)
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
