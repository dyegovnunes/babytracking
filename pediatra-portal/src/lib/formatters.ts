export function formatAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())

  if (months < 1) return 'recém-nascido'
  if (months < 24) return `${months} ${months === 1 ? 'mês' : 'meses'}`
  const years = Math.floor(months / 12)
  return `${years} ${years === 1 ? 'ano' : 'anos'}`
}

export function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return 'Nunca usou o app'
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`
  return `${Math.floor(days / 365)} anos atrás`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
