import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LogEntry, Member } from '../../../types'
import { DEFAULT_EVENTS } from '../../../lib/constants'
import { formatTime } from '../../../lib/formatters'
import type { CaregiverShift, ShiftScore } from '../useCaregiverShift'

interface Props {
  logs: LogEntry[]
  members: Record<string, Member>
  onEdit?: (log: LogEntry) => void
  /** Shifts de resumo do dia exibidos mesclados ordenados por submittedAt. */
  shifts?: CaregiverShift[]
  /** Click em um shift row. Resolve abertura do ShiftDetailModal no parent. */
  onShiftClick?: (shift: CaregiverShift) => void
}

type FeedItem =
  | { kind: 'log'; ts: number; log: LogEntry }
  | { kind: 'shift'; ts: number; shift: CaregiverShift }

const dotColorMap: Record<string, string> = {
  tertiary: 'bg-tertiary',
  primary: 'bg-primary',
  secondary: 'bg-secondary',
}

export default function RecentLogs({ logs, members, onEdit, shifts = [], onShiftClick }: Props) {
  // Mescla logs + shifts e ordena por timestamp decrescente (mais novo primeiro)
  const merged: FeedItem[] = [
    ...logs.map<FeedItem>((l) => ({ kind: 'log', ts: l.timestamp, log: l })),
    ...shifts
      .filter((s) => !!s.submittedAt)
      .map<FeedItem>((s) => ({ kind: 'shift', ts: new Date(s.submittedAt!).getTime(), shift: s })),
  ]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 5)

  if (merged.length === 0) {
    return (
      <section className="px-5 mt-6">
        <p className="text-center text-on-surface-variant font-label text-sm py-8">
          Nenhum registro ainda. Toque nos botões acima para começar.
        </p>
      </section>
    )
  }

  return (
    <section className="px-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-headline text-base font-bold text-on-surface">
          Últimos registros
        </h2>
        <Link
          to="/history"
          className="font-label text-xs text-primary font-medium"
        >
          Ver tudo →
        </Link>
      </div>

      <div className="space-y-1">
        {merged.map((item) => {
          if (item.kind === 'shift') {
            const name = members[item.shift.caregiverId]?.displayName || 'Cuidador(a)'
            return (
              <ShiftLogRow
                key={`shift-${item.shift.id}`}
                shift={item.shift}
                caregiverName={name}
                onClick={onShiftClick ? () => onShiftClick(item.shift) : undefined}
              />
            )
          }

          const log = item.log
          const event = DEFAULT_EVENTS.find((e) => e.id === log.eventId)
          if (!event) return null
          const dotColor = dotColorMap[event.color] ?? 'bg-primary'

          const memberName = log.createdBy ? members[log.createdBy]?.displayName : undefined

          return (
            <div
              key={log.id}
              onClick={() => onEdit?.(log)}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-md bg-surface-container${onEdit ? ' cursor-pointer active:bg-surface-container-high transition-colors' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
              {event.emoji ? (
                <span className="text-base leading-none">{event.emoji}</span>
              ) : (
                <span className="material-symbols-outlined text-on-surface-variant text-base">
                  {event.icon}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <span className="font-body text-sm text-on-surface">
                  {event.label}
                  {log.ml ? ` — ${log.ml}ml` : ''}
                </span>
                {memberName && (
                  <p className="font-label text-[10px] text-on-surface-variant truncate">
                    por {memberName}
                  </p>
                )}
              </div>
              <span className="font-label text-xs text-on-surface-variant">
                {formatTime(new Date(log.timestamp))}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/**
 * Row compacta de um resumo de shift dentro do RecentLogs. Layout alinhado à
 * row de log para manter consistência visual (sem destaque em caixa separada).
 */
interface ShiftLogRowProps {
  shift: CaregiverShift
  caregiverName: string
  onClick?: () => void
}

const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
}

const SCORE_DOT_TONE: Record<1 | 2 | 3, string> = {
  1: 'text-error',
  2: 'text-amber-600',
  3: 'text-primary',
}

function scoreIcon(score: ShiftScore, icon: string): ReactNode {
  if (score === null) return null
  return (
    <span
      className={`material-symbols-outlined text-[13px] ${SCORE_DOT_TONE[score]}`}
      aria-label={`score ${score}`}
    >
      {icon}
    </span>
  )
}

function ShiftLogRow({ shift, caregiverName, onClick }: ShiftLogRowProps) {
  const ts = shift.submittedAt ? new Date(shift.submittedAt) : null
  const moodEmoji = shift.moodScore ? MOOD_EMOJIS[shift.moodScore] : ''

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 py-2.5 px-3 rounded-md bg-surface-container${onClick ? ' cursor-pointer active:bg-surface-container-high transition-colors' : ''}`}
    >
      <div className="w-2 h-2 rounded-full shrink-0 bg-primary" />
      <span className="material-symbols-outlined text-primary text-base">assignment</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-body text-sm text-on-surface truncate">Resumo do dia</span>
          {moodEmoji && <span className="text-sm leading-none">{moodEmoji}</span>}
          {scoreIcon(shift.ateScore, 'restaurant')}
          {scoreIcon(shift.sleptScore, 'bedtime')}
        </div>
        <p className="font-label text-[10px] text-on-surface-variant truncate">
          por {caregiverName}
        </p>
      </div>
      {ts && (
        <span className="font-label text-xs text-on-surface-variant">
          {formatTime(ts)}
        </span>
      )}
    </div>
  )
}
