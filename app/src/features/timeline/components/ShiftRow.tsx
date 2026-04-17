import { formatTime } from '../../../lib/formatters'
import type { CaregiverShift, ShiftScore } from '../../tracker/useCaregiverShift'
import { hapticLight } from '../../../lib/haptics'
import TimelinePill from './TimelinePill'

interface Props {
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

const SCORE_TONE: Record<1 | 2 | 3, string> = {
  1: 'text-error',
  2: 'text-amber-600',
  3: 'text-primary',
}

function scoreIcon(score: ShiftScore, icon: string) {
  if (score === null) return null
  return (
    <span
      className={`material-symbols-outlined text-[13px] ${SCORE_TONE[score]}`}
      aria-label={`score ${score}`}
    >
      {icon}
    </span>
  )
}

/**
 * Row de resumo do dia (shift da babá/caregiver). Tap abre sheet read-only
 * com o conteúdo do turno. Layout alinhado com LogRow (ícone circular,
 * time-column à esquerda).
 */
export default function ShiftRow({ shift, caregiverName, onClick }: Props) {
  const ts = shift.submittedAt ? new Date(shift.submittedAt) : null
  const moodEmoji = shift.moodScore ? MOOD_EMOJIS[shift.moodScore] : ''

  const handleClick = () => {
    if (!onClick) return
    hapticLight()
    onClick()
  }

  return (
    <button
      onClick={handleClick}
      disabled={!onClick}
      className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-md bg-surface-container active:bg-surface-container-high transition-colors disabled:cursor-default disabled:active:bg-surface-container"
    >
      <div className="flex flex-col items-center gap-1 w-10 shrink-0">
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          {ts ? formatTime(ts) : '—'}
        </span>
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
      </div>

      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/15 text-emerald-400">
        <span className="material-symbols-outlined text-lg">assignment</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <TimelinePill variant="shift">Resumo</TimelinePill>
          {moodEmoji && <span className="text-sm leading-none">{moodEmoji}</span>}
          {scoreIcon(shift.ateScore, 'restaurant')}
          {scoreIcon(shift.sleptScore, 'bedtime')}
        </div>
        <p className="font-body text-sm font-medium text-on-surface mt-0.5">
          Resumo do dia
        </p>
        <p className="font-label text-[10px] text-on-surface-variant/60">
          por {caregiverName}
        </p>
      </div>

      {onClick && (
        <span className="material-symbols-outlined text-on-surface-variant/50 text-base">
          chevron_right
        </span>
      )}
    </button>
  )
}
