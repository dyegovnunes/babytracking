import type { YaIAMessage } from '../useYaIA'

/**
 * Agrupa mensagens em "turnos" pra criar ritmo visual no chat.
 *
 * - Novo grupo se role muda OU gap > 2min.
 * - Separador "day" (ex: "Hoje", "Ontem", "Terça, 22/04") quando data muda.
 * - Separador "time" (ex: "14:32") quando gap > 15min mas mesmo dia.
 * - Dentro do mesmo grupo: bubbles ficam tight (4px gap) e avatar só na 1ª.
 */

const GROUP_GAP_MS = 2 * 60 * 1000 // 2 min
const TIME_LABEL_GAP_MS = 15 * 60 * 1000 // 15 min

export type TimeLabelKind = 'day' | 'time' | null

export interface MessageGroupData {
  messages: YaIAMessage[]
  showTimeLabel: TimeLabelKind
  timeLabel: string
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function formatDayLabel(d: Date, now: Date): string {
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (isToday) return 'Hoje'
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) return 'Ontem'
  // Mais de 1 dia: "Terça, 22/04".
  const weekday = WEEKDAYS[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${weekday}, ${dd}/${mm}`
}

function formatTimeLabel(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function groupMessages(
  messages: YaIAMessage[],
  now: Date = new Date(),
): MessageGroupData[] {
  if (messages.length === 0) return []

  const groups: MessageGroupData[] = []
  let current: YaIAMessage[] = []
  let prevMsgTime: Date | null = null

  function flushCurrent() {
    if (current.length === 0) return
    const firstMsg = current[0]
    const firstTime = new Date(firstMsg.createdAt)

    let kind: TimeLabelKind = null
    let label = ''

    if (prevMsgTime === null) {
      // Primeiro grupo da lista: sempre mostra dia.
      kind = 'day'
      label = formatDayLabel(firstTime, now)
    } else if (!sameDay(prevMsgTime, firstTime)) {
      kind = 'day'
      label = formatDayLabel(firstTime, now)
    } else {
      const gap = firstTime.getTime() - prevMsgTime.getTime()
      if (gap > TIME_LABEL_GAP_MS) {
        kind = 'time'
        label = formatTimeLabel(firstTime)
      }
    }

    groups.push({ messages: current, showTimeLabel: kind, timeLabel: label })
    // prevMsgTime atualiza pra o timestamp da ÚLTIMA mensagem do grupo.
    prevMsgTime = new Date(current[current.length - 1].createdAt)
    current = []
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if (current.length === 0) {
      current.push(msg)
      continue
    }
    const last = current[current.length - 1]
    const lastTime = new Date(last.createdAt).getTime()
    const msgTime = new Date(msg.createdAt).getTime()
    const gap = msgTime - lastTime
    const sameRole = last.role === msg.role
    if (sameRole && gap <= GROUP_GAP_MS) {
      current.push(msg)
    } else {
      flushCurrent()
      current.push(msg)
    }
  }
  flushCurrent()

  return groups
}
