/**
 * Formata duração de sono em texto legível.
 * Ex: 45 → "dormiu 45min", 90 → "dormiu 1h30min", 60 → "dormiu 1h"
 */
export function formatSleepDuration(minutes: number): string {
  if (minutes < 60) return `dormiu ${minutes}min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `dormiu ${h}h` : `dormiu ${h}h${m}min`
}

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

  // Pré-natal: data futura → mostra countdown em dias/semanas
  if (totalDays < 0) {
    const absDays = Math.abs(totalDays)
    if (absDays <= 7) return `Nasce em ${absDays} dia${absDays !== 1 ? 's' : ''}`
    const weeks = Math.ceil(absDays / 7)
    return `Nasce em ${weeks} semana${weeks !== 1 ? 's' : ''}`
  }
  if (totalDays < 30) return `${totalDays} dia${totalDays !== 1 ? 's' : ''}`

  const months = Math.floor(totalDays / 30.44)

  // ≥12 meses: "X anos Y meses" em vez de "N meses Z dias"
  if (months >= 12) {
    const years = Math.floor(months / 12)
    const remainMonths = months - years * 12
    const yearStr = `${years} ano${years !== 1 ? 's' : ''}`
    if (remainMonths > 0) {
      return `${yearStr} e ${remainMonths} ${remainMonths !== 1 ? 'meses' : 'mês'}`
    }
    return yearStr
  }

  const remainDays = Math.floor(totalDays - months * 30.44)
  const monthStr = `${months} ${months !== 1 ? 'meses' : 'mês'}`
  if (remainDays > 0) return `${monthStr} e ${remainDays} dia${remainDays !== 1 ? 's' : ''}`
  return monthStr
}

/** True quando birthDate é no futuro (pré-natal). */
export function isPrenatal(birthDate: string): boolean {
  const birth = parseLocalDate(birthDate)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return birth.getTime() > now.getTime()
}

/**
 * Valida a data de nascimento pro cadastro.
 *
 * Regras:
 * - Pode ser no futuro até 40 semanas (9 meses) → pré-natal com countdown
 * - Pode ser até 3 anos atrás (foco do Yaya é 0-3 anos)
 * - Fora disso, retorna mensagem de erro
 */
export function validateBabyBirthDate(birthDate: string): string | null {
  if (!birthDate) return 'Informe a data de nascimento'
  const birth = parseLocalDate(birthDate)
  if (isNaN(birth.getTime())) return 'Data inválida'

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const maxFuture = new Date(now)
  maxFuture.setDate(maxFuture.getDate() + 40 * 7) // 40 semanas no futuro

  const minPast = new Date(now)
  minPast.setFullYear(minPast.getFullYear() - 3) // 3 anos atrás

  if (birth.getTime() > maxFuture.getTime()) {
    return 'Data muito no futuro. O Yaya aceita até 40 semanas antes do nascimento.'
  }
  if (birth.getTime() < minPast.getTime()) {
    return 'O Yaya atende bebês até 3 anos. Para crianças mais velhas, os recursos não se aplicam.'
  }
  return null
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

/**
 * Tempo relativo curto em pt-BR, aceita ISO string ou null.
 * null → "—"
 * < 1 min → "agora"
 * < 60 min → "há Nmin"
 * < 24h → "há Nh"
 * < 30 dias → "há N dias"
 * < 365 dias → "há N meses"
 * caso contrário → "há N anos"
 *
 * Usado no painel admin. Para tempo futuro ou pequenos intervalos, usar
 * `formatRelative(ms)` ou `timeSince(timestamp)`.
 */
export function formatRelativeShort(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  if (diff < 60_000) return 'agora'
  const min = Math.floor(diff / 60_000)
  if (min < 60) return `há ${min}min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days} dia${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `há ${months} ${months !== 1 ? 'meses' : 'mês'}`
  const years = Math.floor(months / 12)
  return `há ${years} ano${years !== 1 ? 's' : ''}`
}
