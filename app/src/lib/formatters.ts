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

/** Parse a date string (YYYY-MM-DD) without timezone shift */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Format a birth date string (YYYY-MM-DD) to pt-BR locale */
export function formatBirthDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR')
}

export function formatAge(birthDate: string): string {
  const birth = parseLocalDate(birthDate)
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

/** Same as timeSince but returns empty string if more than `thresholdMs` ago (default 4h) */
export function timeSinceIfRecent(timestamp: number, thresholdMs = 4 * 60 * 60 * 1000): string {
  const diff = Date.now() - timestamp
  if (diff > thresholdMs) return ''
  return timeSince(timestamp)
}

/** Format timestamp as "14h30" Brazilian style */
export function formatTimeBR(timestamp: number): string {
  const d = new Date(timestamp)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}h${m}`
}
