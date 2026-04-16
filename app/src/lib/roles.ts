export type BabyRole = 'parent' | 'guardian' | 'caregiver' | 'pediatrician'

/**
 * Permissões centralizadas por papel.
 * Toda verificação no app usa `can.X(role)` — nunca `role === 'parent'` espalhado.
 */
export const can = {
  /** Editar nome, foto, data de nascimento do bebê */
  editBaby:         (r: BabyRole | null) => r === 'parent',
  /** Convidar, promover, rebaixar, remover membros */
  manageMembers:    (r: BabyRole | null) => r === 'parent',
  /** Ver e gerenciar assinatura Yaya+ */
  viewSubscription: (r: BabyRole | null) => r === 'parent',
  /** Gerar relatório PDF para pediatra */
  generatePDF:      (r: BabyRole | null) => r === 'parent' || r === 'guardian',
  /** Marcar vacinas como aplicadas */
  markVaccine:      (r: BabyRole | null) => r === 'parent' || r === 'guardian',
  /** Ver página completa de Insights (não só resumo do dia) */
  viewInsights:     (r: BabyRole | null) => r === 'parent' || r === 'guardian',
  /** Ver marcos do desenvolvimento */
  viewMilestones:   (r: BabyRole | null) => r === 'parent' || r === 'guardian',
  /** Ver saltos do desenvolvimento */
  viewLeaps:        (r: BabyRole | null) => r === 'parent' || r === 'guardian',
  /** Ver caderneta de vacinas */
  viewVaccines:     (r: BabyRole | null) => r === 'parent' || r === 'guardian',
}

/** Labels amigáveis por papel */
export function roleLabel(role: BabyRole | string | null): string {
  switch (role) {
    case 'parent': return 'Pai/Mãe'
    case 'guardian': return 'Responsável'
    case 'caregiver': return 'Cuidador(a)'
    case 'pediatrician': return 'Pediatra'
    default: return 'Membro'
  }
}

/** Ordem de hierarquia (maior = mais permissões) */
const ROLE_HIERARCHY: Record<string, number> = {
  pediatrician: 0,
  caregiver: 1,
  guardian: 2,
  parent: 3,
}

/** Retorna true se roleA é hierarquicamente superior a roleB */
export function isHigherRole(roleA: BabyRole, roleB: BabyRole): boolean {
  return (ROLE_HIERARCHY[roleA] ?? 0) > (ROLE_HIERARCHY[roleB] ?? 0)
}

/** Próximo papel acima na hierarquia (para promoção) */
export function nextRoleUp(role: BabyRole): BabyRole | null {
  if (role === 'caregiver') return 'guardian'
  if (role === 'guardian') return 'parent'
  return null
}

/** Próximo papel abaixo na hierarquia (para rebaixamento) */
export function nextRoleDown(role: BabyRole): BabyRole | null {
  if (role === 'parent') return 'guardian'
  if (role === 'guardian') return 'caregiver'
  return null
}
