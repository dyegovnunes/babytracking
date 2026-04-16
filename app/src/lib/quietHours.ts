export interface QuietHours {
  enabled: boolean
  /** Hora de início (0-23), ex: 22 para 22:00 */
  start: number
  /** Hora de fim (0-23), ex: 7 para 07:00 */
  end: number
}

/**
 * Retorna true se o horário atual está dentro da janela noturna configurada.
 * Lida com wraparound (ex: 22→7 cobre 22h, 23h, 0h, 1h ... 6h).
 *
 * Se `hours.enabled` é false, sempre retorna false.
 * Se start === end, retorna false (janela zero).
 */
export function isInQuietHours(hours: QuietHours, now: Date = new Date()): boolean {
  if (!hours.enabled) return false
  const { start, end } = hours
  if (start === end) return false

  const currentHour = now.getHours()

  // Mesmo dia: start < end (ex: 13→17)
  if (start < end) {
    return currentHour >= start && currentHour < end
  }

  // Atravessa meia-noite: start > end (ex: 22→7)
  return currentHour >= start || currentHour < end
}
