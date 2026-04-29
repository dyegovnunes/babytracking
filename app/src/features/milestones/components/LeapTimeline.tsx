import type { DevelopmentLeap } from '../developmentLeaps'
import type { LogEntry } from '../../../types'
import LeapCard from './LeapCard'

type LeapStatus = 'past' | 'active' | 'upcoming' | 'future'

interface LeapTimelineProps {
  leaps: { leap: DevelopmentLeap; status: LeapStatus; estimatedDate: Date }[]
  expandedId: number | null
  onToggle: (id: number) => void
  birthDate: string
  babyName: string
  babyGender?: 'boy' | 'girl'
  babyId: string

  logs: LogEntry[]
  isPremium: boolean
  /** Caregiver com permission: vê, mas não registra mood/notas. */
  readOnly?: boolean
}

function StatusDot({ status }: { status: LeapStatus }) {
  if (status === 'past') {
    // Roxo (primary) — identidade visual do app
    return (
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
        <span
          className="material-symbols-outlined text-primary/70 text-lg"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >check_circle</span>
      </div>
    )
  }
  if (status === 'active') {
    // Roxo pulsante — em andamento
    return (
      <div className="w-7 h-7 rounded-full border-2 border-primary bg-primary/15 animate-pulse flex items-center justify-center flex-shrink-0">
        <div className="w-2.5 h-2.5 rounded-full bg-primary" />
      </div>
    )
  }
  // upcoming + future — cadeado (ainda não começou)
  return (
    <div className="w-7 h-7 rounded-full border-2 border-outline-variant/30 bg-surface flex items-center justify-center flex-shrink-0">
      <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">lock</span>
    </div>
  )
}

const MS_PER_WEEK = 7 * 86400000
const MS_PER_DAY = 86400000

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function formatDateRange(birthDate: string, leap: DevelopmentLeap): string {
  const birthMs = new Date(birthDate).getTime()
  const start = new Date(birthMs + leap.weekStart * MS_PER_WEEK)
  const end = new Date(birthMs + (leap.weekEnd + 1) * MS_PER_WEEK)
  const days = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY)
  return `aprox. entre ${formatDateShort(start)} e ${formatDateShort(end)} (${days} dias)`
}

/** Progress bar for the active leap */
function ActiveLeapProgress({ birthDate, leap }: { birthDate: string; leap: DevelopmentLeap }) {
  const birthMs = new Date(birthDate).getTime()
  const startMs = birthMs + leap.weekStart * MS_PER_WEEK
  const endMs = birthMs + (leap.weekEnd + 1) * MS_PER_WEEK
  const now = Date.now()
  const progress = Math.min(1, Math.max(0, (now - startMs) / (endMs - startMs)))
  const weeksIn = Math.max(1, Math.ceil((now - startMs) / MS_PER_WEEK))
  const totalWeeks = leap.weekEnd - leap.weekStart + 1

  return (
    <div className="mt-2 mb-1">
      <div className="flex justify-between text-xs text-on-surface-variant font-label mb-1">
        <span>Semana {Math.min(weeksIn, totalWeeks)} de {totalWeeks}</span>
        <span>{Math.round(progress * 100)}%</span>
      </div>
      <div className="h-2 bg-primary/15 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

/** Interval row between leaps */
function IntervalItem({
  prevLeap,
  nextLeap,
  birthDate,
  isFirst,
}: {
  prevLeap: DevelopmentLeap | null
  nextLeap: DevelopmentLeap
  birthDate: string
  isFirst: boolean
}) {
  const birthMs = new Date(birthDate).getTime()
  const now = Date.now()

  let intervalStartWeek: number
  let intervalEndWeek: number

  if (isFirst) {
    intervalStartWeek = 0
    intervalEndWeek = nextLeap.weekStart - 1
  } else {
    intervalStartWeek = prevLeap!.weekEnd + 1
    intervalEndWeek = nextLeap.weekStart - 1
  }

  const gapWeeks = intervalEndWeek - intervalStartWeek + 1
  if (gapWeeks < 1) return null

  const intervalStartMs = birthMs + intervalStartWeek * MS_PER_WEEK
  const intervalEndMs = birthMs + (intervalEndWeek + 1) * MS_PER_WEEK
  const isCurrentlyHere = now >= intervalStartMs && now < intervalEndMs

  const daysUntilNext = Math.max(0, Math.ceil((birthMs + nextLeap.weekStart * MS_PER_WEEK - now) / MS_PER_DAY))

  return (
    <div className="relative flex gap-3">
      {/* Vertical line continues */}
      <div className="absolute left-[13px] top-0 bottom-0 border-l-2 border-outline-variant/40" />

      {/* Dot — pulsing if currently here */}
      {isCurrentlyHere ? (
        <div className="w-7 h-7 rounded-full border-2 border-green-400 bg-green-400/15 animate-pulse flex items-center justify-center flex-shrink-0 z-[1]">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
      ) : (
        <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 z-[1]">
          <span className="text-on-surface-variant/40 text-[10px]">&#9670;</span>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 pb-4 pt-0.5">
        <p className="font-label text-xs text-on-surface-variant/70 font-medium">
          {isFirst ? 'Primeiras semanas' : 'Intervalo: hora de praticar!'}
        </p>
        {isCurrentlyHere ? (
          <p className="text-xs text-green-400 font-semibold mt-0.5">
            Vocês estão aqui!
            {daysUntilNext > 0 && (
              <span className="text-on-surface-variant/70 font-normal">
                {' '}· Próximo salto em {daysUntilNext} {daysUntilNext === 1 ? 'dia' : 'dias'}
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-on-surface-variant/50 mt-0.5">
            ~{gapWeeks} {gapWeeks === 1 ? 'semana' : 'semanas'} de intervalo
          </p>
        )}
      </div>
    </div>
  )
}

export default function LeapTimeline({
  leaps,
  expandedId,
  onToggle,
  birthDate,
  babyName,
  babyGender,
  babyId,
  logs,
  isPremium,
  readOnly = false,
}: LeapTimelineProps) {
  return (
    <div className="relative pl-4">
      {leaps.map(({ leap, status, estimatedDate }, index) => {
        const isLast = index === leaps.length - 1
        const isExpanded = expandedId === leap.id
        const dimmed = status === 'past' || status === 'future'
        const prevLeap = index > 0 ? leaps[index - 1].leap : null

        return (
          <div key={leap.id}>
            {/* Interval before this leap */}
            <IntervalItem
              prevLeap={prevLeap}
              nextLeap={leap}
              birthDate={birthDate}
              isFirst={index === 0}
            />

            {/* Leap item */}
            <div className="relative flex gap-3">
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
                  {/* Show date range for ALL statuses */}
                  <p className="text-xs text-on-surface-variant/70 mt-0.5">
                    {formatDateRange(birthDate, leap)}
                  </p>
                  {status === 'active' && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      Em andamento
                    </span>
                  )}
                </button>

                {/* Progress bar for active leap */}
                {status === 'active' && (
                  <ActiveLeapProgress birthDate={birthDate} leap={leap} />
                )}

                {isExpanded && (
                  <div
                    className="mt-3 overflow-hidden"
                    style={{ animation: 'fadeSlideIn 0.25s ease-out' }}
                  >
                    <LeapCard
                      leap={leap}
                      status={status}
                      estimatedDate={estimatedDate}
                      birthDate={birthDate}
                      babyName={babyName}
                      babyGender={babyGender}
                      babyId={babyId}
                      logs={logs}
                      isPremium={isPremium}
                      readOnly={readOnly}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Keyframes for expand animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
