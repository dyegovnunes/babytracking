import type { EventType, LogEntry } from '../../types'
import { timeSinceIfRecent, formatTimeBR } from '../../lib/formatters'

interface Props {
  event: EventType
  lastLog?: LogEntry
  onPress: () => void
  /** Whether this button's lastLog is the most recent across ALL events */
  isMostRecent?: boolean
  /** For breast_left/breast_right: the last log of the opposite breast */
  bothBreastsLog?: LogEntry
}

const colorMap: Record<string, string> = {
  tertiary: 'bg-tertiary/20 shadow-[0_0_20px_rgba(255,150,185,0.15)]',
  primary: 'bg-primary-container/20 shadow-[0_0_20px_rgba(167,139,250,0.15)]',
  secondary: 'bg-secondary-container/20 shadow-[0_0_20px_rgba(208,197,251,0.15)]',
}

const badgeColorMap: Record<string, string> = {
  tertiary: 'bg-tertiary text-surface',
  primary: 'bg-primary text-surface',
  secondary: 'bg-secondary text-surface',
}

export default function ActivityButton({ event, lastLog, onPress, isMostRecent, bothBreastsLog }: Props) {
  const iconClasses = colorMap[event.color] ?? colorMap.primary
  const badgeClasses = badgeColorMap[event.color] ?? badgeColorMap.primary

  // Build the subtitle text
  let subtitle = ''
  if (lastLog) {
    if (isMostRecent) {
      // Most recent event gets a highlighted badge
      subtitle = `Último · ${formatTimeBR(lastLog.timestamp)}`
    } else {
      // Only show relative time if less than 4 hours ago
      subtitle = timeSinceIfRecent(lastLog.timestamp)
    }
  }

  // For breast_both: if there's a recent log, show "Ambos · HHhMM"
  // For breast_left/breast_right: if both breasts were used recently (within 30min), show indicator
  let bothLabel = ''
  if (bothBreastsLog && lastLog) {
    const diff = Math.abs(lastLog.timestamp - bothBreastsLog.timestamp)
    if (diff < 30 * 60 * 1000) {
      bothLabel = `Ambos · ${formatTimeBR(Math.max(lastLog.timestamp, bothBreastsLog.timestamp))}`
    }
  }

  return (
    <button
      onClick={onPress}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg bg-surface-container-high active:scale-95 active:bg-primary-dim/20 transition-all h-[108px] justify-center ${isMostRecent ? 'ring-2 ring-primary/40' : ''}`}
    >
      <div className="relative">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${iconClasses}`}>
          {event.emoji ? (
            <span className="text-2xl leading-none">{event.emoji}</span>
          ) : (
            <span className="material-symbols-outlined text-2xl">
              {event.icon}
            </span>
          )}
        </div>
        {event.badge && (
          <span className={`absolute -bottom-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center font-label text-[9px] font-bold px-1 ${badgeClasses}`}>
            {event.badge}
          </span>
        )}
      </div>
      <span className="font-label text-[11px] font-medium text-on-surface leading-tight">
        {event.label}
      </span>
      {bothLabel ? (
        <span className="font-label text-[9px] text-tertiary font-medium h-3">
          {bothLabel}
        </span>
      ) : isMostRecent && subtitle ? (
        <span className="font-label text-[9px] text-primary font-bold h-3">
          {subtitle}
        </span>
      ) : (
        <span className="font-label text-[9px] text-on-surface-variant h-3">
          {subtitle}
        </span>
      )}
    </button>
  )
}
