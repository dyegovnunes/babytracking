export function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatRelative(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 0) return `há ${Math.abs(minutes)}min`
  if (minutes === 0) return 'agora'
  if (minutes < 60) return `em ${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `em ${h}h${m}min` : `em ${h}h`
}

export function formatAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  const diffMs = now.getTime() - birth.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days < 7) return `${days} dia${days !== 1 ? 's' : ''}`
  if (days < 30) {
    const weeks = Math.floor(days / 7)
    return `${weeks} semana${weeks !== 1 ? 's' : ''}`
  }
  const months = Math.floor(days / 30)
  return `${months} ${months !== 1 ? 'meses' : 'mês'}`
}

export function timeSince(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (m === 0) return `há ${h}h`
  return `há ${h}h${m}min`
}
