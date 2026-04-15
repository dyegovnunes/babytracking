import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { signOut } from '../contexts/AuthContext'

/**
 * Hook pra chamar a edge function `delete-account` e deslogar.
 *
 * Fluxo:
 *   1. Pega session atual (precisamos do access_token pra Authorization)
 *   2. Invoca a edge function via `supabase.functions.invoke`
 *   3. Se ok, `signOut()` — isso dispara o listener em AuthProvider
 *      e a UI volta pro LoginPage sozinha.
 *
 * Retorna `{ ok, error }` ao invés de throw, pra o caller exibir toast.
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

      // Sucesso — desloga localmente (a conta já não existe no servidor)
      await signOut()
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
