import type { LogEntry } from '../../../types'

/** Threshold em ms pra considerar dois logs de peito como uma sessão única. */
const BOTH_BREASTS_THRESHOLD = 30 * 60 * 1000

/**
 * Detecta pares `breast_left` + `breast_right` dentro de 30 min. Retorna:
 * - `pairs`: mapa de id do log primário → log secundário
 * - `hidden`: set de ids que devem ser ocultados (o secundário é absorvido
 *   pelo primário e não aparece separado)
 *
 * Extraído da HistoryPage pra ser reusado pela timeline unificada.
 */
export function detectBreastPairs(
  logs: LogEntry[],
): { pairs: Map<string, LogEntry>; hidden: Set<string> } {
  const pairs = new Map<string, LogEntry>()
  const hidden = new Set<string>()
  const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp)

  const leftLogs = sorted.filter((l) => l.eventId === 'breast_left')
  const rightLogs = sorted.filter((l) => l.eventId === 'breast_right')

  const usedRight = new Set<string>()

  for (const left of leftLogs) {
    for (const right of rightLogs) {
      if (usedRight.has(right.id)) continue
      const diff = Math.abs(left.timestamp - right.timestamp)
      if (diff <= BOTH_BREASTS_THRESHOLD) {
        // O mais antigo vira primário; o mais novo é escondido/absorvido.
        const primary = left.timestamp <= right.timestamp ? left : right
        const secondary = primary === left ? right : left
        pairs.set(primary.id, secondary)
        hidden.add(secondary.id)
        usedRight.add(right.id)
        break
      }
    }
  }

  return { pairs, hidden }
}
