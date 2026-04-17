import type { ReactNode } from 'react'
import { hapticLight } from '../../../lib/haptics'
import { formatTime } from '../../../lib/formatters'
import type { CaregiverShift, ShiftScore } from '../../tracker/useCaregiverShift'

interface Props {
  shift: CaregiverShift
  caregiverName: string
  /** Callback de clique. Abre o ShiftDetailModal no parent. */
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

/**
 * Row compacta do resumo de shift no Histórico — visual alinhado com o
 * ShiftLogRow de `Últimos registros` na Home (ícone, nome da babá, micro-ícones
 * coloridos de comeu/dormiu, horário). Clique delega pro parent abrir o
 * ShiftDetailModal.
 */
export default function ShiftSummaryRow({ shift, caregiverName, onClick }: Props) {
  const ts = shift.submittedAt ? new Date(shift.submittedAt) : null
  const moodEmoji = shift.moodScore ? MOOD_EMOJIS[shift.moodScore] : ''

  const handleClick = () => {
    if (!onClick) return
    hapticLight()
    onClick()
  }

  return (
    <div
      onClick={handleClick}
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
