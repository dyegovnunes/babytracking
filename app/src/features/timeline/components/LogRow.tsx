import type { LogEntry, Member } from '../../../types'
import { EVENT_CATALOG } from '../../../lib/constants'
import { formatTime } from '../../../lib/formatters'

interface Props {
  log: LogEntry
  members: Record<string, Member>
  onEdit: (log: LogEntry) => void
  /** Quando setado, a row representa uma sessão "ambos os peitos" (par left+right). */
  pairedLog?: LogEntry
}

const dotColorMap: Record<string, string> = {
  tertiary: 'bg-tertiary',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
}

const iconBgMap: Record<string, string> = {
  tertiary: 'bg-tertiary/15 text-tertiary',
  primary: 'bg-primary/15 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
}

/**
 * Row de log (atividade recorrente: amamentação, fralda, sono, banho).
 * Tap abre modal de edição inline (via callback).
 * Extraído do antigo `history/components/TimelineEntry.tsx`.
 */
export default function LogRow({ log, members, onEdit, pairedLog }: Props) {
  const event = EVENT_CATALOG.find((e) => e.id === log.eventId)
  if (!event) return null

  const isMergedBoth = !!pairedLog
  const bothEvent = isMergedBoth ? EVENT_CATALOG.find((e) => e.id === 'breast_both') : null
  const displayEvent = bothEvent ?? event

  const dotColor = dotColorMap[displayEvent.color] ?? 'bg-primary'
  const iconBg = iconBgMap[displayEvent.color] ?? 'bg-primary/15 text-primary'
  const memberName = log.createdBy ? members[log.createdBy]?.displayName : undefined

  const displayTime = isMergedBoth
    ? new Date(Math.min(log.timestamp, pairedLog!.timestamp))
    : new Date(log.timestamp)

  return (
    <button
      onClick={() => onEdit(log)}
      className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-md bg-surface-container active:bg-surface-container-high transition-colors"
    >
      <div className="flex flex-col items-center gap-1 w-10 shrink-0">
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          {formatTime(displayTime)}
        </span>
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      </div>

      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {displayEvent.emoji ? (
          <span className="text-lg leading-none">{displayEvent.emoji}</span>
        ) : (
          <span className="material-symbols-outlined text-lg">
            {displayEvent.icon}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-on-surface">
          {isMergedBoth ? 'Ambos os peitos' : event.label}
        </p>
        {isMergedBoth && (
          <p className="font-label text-xs text-tertiary">Esq. + Dir.</p>
        )}
        {log.ml && (
          <p className="font-label text-xs text-primary">{log.ml} ml</p>
        )}
        {log.notes && (
          <p className="font-label text-xs text-on-surface-variant truncate">{log.notes}</p>
        )}
        {memberName && (
          <p className="font-label text-[10px] text-on-surface-variant/60">
            por {memberName}
          </p>
        )}
      </div>

      <span className="material-symbols-outlined text-on-surface-variant/50 text-base">
        edit
      </span>
    </button>
  )
}
