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

/** Returns today's date as YYYY-MM-DD in the user's LOCAL timezone (not UTC).
 *  Critical for streak/day boundary logic: `new Date().toISOString()` returns UTC,
 *  which in Brazil (UTC-3) already rolls over to the next day at 21:00 local time. */
export function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format a birth date string (YYYY-MM-DD) to pt-BR locale */
export function formatBirthDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString('pt-BR')
}

export function formatAge(birthDate: string): string {
  const birth = parseLocalDate(birthDate)
  const now = new Date()
  const diffMs = now.getTime() - birth.getTime()
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (totalDays < 0) return 'Recém-nascido'
  if (totalDays < 30) return `${totalDays} dia${totalDays !== 1 ? 's' : ''}`
  const months = Math.floor(totalDays / 30.44)
  const remainDays = Math.floor(totalDays - months * 30.44)
  const monthStr = `${months} ${months !== 1 ? 'meses' : 'mês'}`
  if (remainDays > 0) return `${monthStr} e ${remainDays} dia${remainDays !== 1 ? 's' : ''}`
  return monthStr
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
