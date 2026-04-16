import type { DevelopmentLeap } from '../developmentLeaps'
import type { LeapNote } from '../useLeapNotes'
import type { LogEntry } from '../../../types'
import LeapCard from './LeapCard'

type LeapStatus = 'past' | 'active' | 'upcoming' | 'future'

interface LeapTimelineProps {
  leaps: { leap: DevelopmentLeap; status: LeapStatus; estimatedDate: Date }[]
  expandedId: number | null
  onToggle: (id: number) => void
  birthDate: string


  logs: LogEntry[]
  notes: Map<number, LeapNote>
  onSaveNote: (leapId: number, text: string) => Promise<{ error: string | null } | undefined>
  isPremium: boolean
}

function StatusDot({ status }: { status: LeapStatus }) {
  if (status === 'past') {
    return (
      <div className="w-7 h-7 rounded-full bg-tertiary/15 flex items-center justify-center flex-shrink-0">
        <span
          className="material-symbols-outlined text-tertiary text-lg"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >check_circle</span>
      </div>
    )
  }
  if (status === 'active') {
    return (
      <div className="w-7 h-7 rounded-full border-2 border-primary bg-primary/10 animate-pulse flex-shrink-0" />
    )
  }
  if (status === 'upcoming') {
    return (
      <div className="w-7 h-7 rounded-full border-2 border-amber-400 bg-amber-50 flex-shrink-0" />
    )
  }
  return (
    <div className="w-7 h-7 rounded-full border-2 border-outline-variant bg-surface flex-shrink-0 opacity-50" />
  )
}

const MS_PER_WEEK = 7 * 86400000

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatDateRange(birthDate: string, leap: DevelopmentLeap): string {
  const birthMs = new Date(birthDate).getTime()
  const start = new Date(birthMs + leap.weekStart * MS_PER_WEEK)
  const end = new Date(birthMs + (leap.weekEnd + 1) * MS_PER_WEEK)
  return `aprox. entre ${formatDateShort(start)} e ${formatDateShort(end)}`
}

export default function LeapTimeline({
  leaps,
  expandedId,
  onToggle,
  birthDate,
  logs,
  notes,
  onSaveNote,
  isPremium,
}: LeapTimelineProps) {
  return (
    <div className="relative pl-4">
      {leaps.map(({ leap, status, estimatedDate }, index) => {
        const isLast = index === leaps.length - 1
        const isExpanded = expandedId === leap.id
        const dimmed = status === 'past' || status === 'future'

        return (
          <div key={leap.id} className="relative flex gap-3">
            {/* Vertical line */}
            {!isLast && (
              <div
                className="absolute left-[13px] top-7 bottom-0 border-l-2 border-outline-variant/40"
              />
            )}

            {/* Dot */}
            <StatusDot status={status} />

            {/* Content */}
            <div className={`flex-1 pb-5 ${dimmed ? 'opacity-60' : ''}`}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onToggle(leap.id)}
              >
                <p className="font-label font-semibold text-sm text-on-surface">
                  Salto {leap.id}: {leap.name}
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {leap.subtitle}
                </p>
                {(status === 'active' || status === 'upcoming' || status === 'future') && (
                  <p className="text-xs text-on-surface-variant/70 mt-0.5">
                    {formatDateRange(birthDate, leap)}
                  </p>
                )}
                {status === 'active' && (
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    Em andamento
                  </span>
                )}
              </button>

              {isExpanded && (
                <div className="mt-3">
                  <LeapCard
                    leap={leap}
                    status={status}
                    estimatedDate={estimatedDate}
                    birthDate={birthDate}
                    logs={logs}
                    note={notes.get(leap.id)}
                    onSaveNote={onSaveNote}
                    isPremium={isPremium}
                  />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
