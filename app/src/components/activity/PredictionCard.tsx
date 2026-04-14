import { useRef, useState, type TouchEvent } from 'react'
import type { Projection } from '../../types'
import { formatTime, timeSinceIfRecent } from '../../lib/formatters'

/** Formats a Date as "14h30" Brazilian style */
function formatTimeBR(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0')
  const m = date.getMinutes().toString().padStart(2, '0')
  return `${h}h${m}`
}

interface Props {
  projection: Projection
  onDismiss?: (label: string) => void
}

const SWIPE_THRESHOLD = 80

export default function PredictionCard({ projection, onDismiss }: Props) {
  const [offsetX, setOffsetX] = useState(0)
  const [isDismissing, setIsDismissing] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  const statusColor = projection.isOverdue
    ? 'text-error'
    : projection.isWarning
      ? 'text-tertiary'
      : 'text-primary'

  const statusBg = projection.isOverdue
    ? 'bg-error/10'
    : projection.isWarning
      ? 'bg-tertiary/10'
      : 'bg-primary/10'

  const statusLabel = projection.isOverdue
    ? `Atrasado desde ${formatTimeBR(projection.time)}`
    : projection.isWarning
      ? `Em breve às ${formatTimeBR(projection.time)}`
      : formatTime(projection.time)

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isHorizontal.current = null
  }

  const handleTouchMove = (e: TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    // Decide direction on first significant move
    if (isHorizontal.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontal.current = Math.abs(dx) > Math.abs(dy)
      }
      return
    }

    if (!isHorizontal.current) return

    // Only allow swipe left
    const newOffset = Math.min(0, dx)
    setOffsetX(newOffset)
  }

  const handleTouchEnd = () => {
    if (offsetX < -SWIPE_THRESHOLD && onDismiss) {
      setIsDismissing(true)
      setOffsetX(-400)
      setTimeout(() => onDismiss(projection.label), 250)
    } else {
      setOffsetX(0)
    }
    isHorizontal.current = null
  }

  const opacity = isDismissing ? 0 : 1 - Math.min(Math.abs(offsetX) / 200, 0.6)

  return (
    <div
      className={`${statusBg} rounded-md p-4 flex items-center gap-3 relative overflow-hidden`}
      style={{
        transform: `translateX(${offsetX}px)`,
        opacity,
        transition: offsetX === 0 || isDismissing ? 'transform 0.25s ease, opacity 0.25s ease' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${statusBg}`}>
        <span className={`material-symbols-outlined text-xl ${statusColor}`}>
          schedule
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-label text-xs text-on-surface-variant capitalize">
          {projection.label}
        </p>
        <p className={`font-headline text-sm font-bold ${statusColor}`}>
          {statusLabel}
        </p>
      </div>
      {projection.lastEvent && !projection.label.toLowerCase().startsWith('banho') && (
        <div className="text-right">
          <p className="font-label text-[10px] text-on-surface-variant">
            Último: {projection.lastEvent}
          </p>
          {timeSinceIfRecent(projection.lastTime.getTime()) && (
            <p className="font-label text-[10px] text-on-surface-variant">
              {timeSinceIfRecent(projection.lastTime.getTime())}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
