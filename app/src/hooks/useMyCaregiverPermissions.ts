import { useMemo } from 'react'
import { useAppState } from '../contexts/AppContext'
import { useAuth } from '../contexts/AuthContext'
import { useMyRole } from './useMyRole'
import type { CaregiverPermissions } from '../types'

/**
 * Permissões granulares "pode visualizar" aplicadas ao usuário atual quando
 * ele é caregiver no bebê ativo.
 *
 * Para roles não-caregiver (parent, guardian, pediatrician), retorna tudo `true`
 * (nenhuma restrição a aplicar). Isso permite consumidores escreverem apenas
 * `if (permissions.show_milestones) { ... }` sem condicionar por role primeiro.
 *
 * Defaults: quando caregiver + sem permissão explícita, retorna tudo `false`
 * (tudo bloqueado até o parent liberar).
 */
export interface ResolvedCaregiverPermissions {
  show_milestones: boolean
  show_leaps: boolean
  show_vaccines: boolean
  show_growth: boolean
  edit_routine: boolean
}

const ALL_ALLOWED: ResolvedCaregiverPermissions = {
  show_milestones: true,
  show_leaps: true,
  show_vaccines: true,
  show_growth: true,
  edit_routine: true,
}

const ALL_BLOCKED: ResolvedCaregiverPermissions = {
  show_milestones: false,
  show_leaps: false,
  show_vaccines: false,
  show_growth: false,
  edit_routine: false,
}

function resolve(perms: CaregiverPermissions | undefined): ResolvedCaregiverPermissions {
  if (!perms) return ALL_BLOCKED
  return {
    show_milestones: !!perms.show_milestones,
    show_leaps: !!perms.show_leaps,
    show_vaccines: !!perms.show_vaccines,
    show_growth: !!perms.show_growth,
    edit_routine: !!perms.edit_routine,
  }
}

export function useMyCaregiverPermissions(): ResolvedCaregiverPermissions {
  const { members } = useAppState()
  const { user } = useAuth()
  const myRole = useMyRole()

  return useMemo(() => {
    if (myRole !== 'caregiver') return ALL_ALLOWED
    const myMembership = user ? members[user.id] : undefined
    return resolve(myMembership?.caregiverPermissions)
  }, [members, user, myRole])
}
