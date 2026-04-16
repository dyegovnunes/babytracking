import { useAppState } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import type { BabyRole } from '../lib/roles'

/**
 * Retorna o papel do usuário logado no bebê atualmente selecionado.
 * Null se não há bebê selecionado ou o usuário não é membro.
 */
export function useMyRole(): BabyRole | null {
  const { members } = useAppState()
  const { user } = useAuth()
  return (members[user?.id ?? '']?.role as BabyRole) ?? null
}
