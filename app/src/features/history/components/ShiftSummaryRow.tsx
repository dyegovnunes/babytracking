import { hapticLight } from '../../../lib/haptics'
import type { CaregiverShift } from '../../tracker/useCaregiverShift'

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

const SCORE_CHIP_STYLE: Record<1 | 2 | 3, { tone: string; text: string }> = {
  1: { tone: 'bg-error/10 text-error border-error/20', text: 'ruim' },
  2: { tone: 'bg-amber-500/10 text-amber-700 border-amber-500/25', text: 'médio' },
  3: { tone: 'bg-primary/10 text-primary border-primary/20', text: 'bom' },
}

function formatSubmittedTime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/**
 * Linha destacada no HistoryPage representando um resumo de shift de caregiver
 * no dia correspondente. Clique chama `onClick` — o parent abre o ShiftDetailModal.
 */
export default function ShiftSummaryRow({ shift, caregiverName, onClick }: Props) {
  const moodEmoji = shift.moodScore ? MOOD_EMOJIS[shift.moodScore] : ''
  const submittedTime = formatSubmittedTime(shift.submittedAt)
  const preview = shift.note
    ? shift.note.slice(0, 80) + (shift.note.length > 80 ? '…' : '')
    : 'Resumo enviado sem anotações.'
  const hasScoreInfo = shift.ateScore !== null || shift.sleptScore !== null

  const handleClick = () => {
    if (!onClick) return
    hapticLight()
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!onClick}
      className="w-full text-left bg-primary/[0.05] border border-primary/15 rounded-md px-3 py-3 my-2 flex items-start gap-3 active:bg-primary/10 transition-colors disabled:active:bg-primary/[0.05]"
    >
      <span className="material-symbols-outlined text-primary text-xl mt-0.5">assignment</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-headline text-xs font-bold text-on-surface">
            Resumo do dia
          </span>
          <span className="font-label text-xs text-on-surface-variant">
            · {caregiverName}
          </span>
          {submittedTime && (
            <span className="font-label text-[10px] text-on-surface-variant/70 ml-auto">
              {submittedTime}
            </span>
          )}
        </div>
        <p className="font-body text-sm text-on-surface mt-1">
          {moodEmoji && <span className="mr-1">{moodEmoji}</span>}
          {preview}
        </p>
        {hasScoreInfo && (
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            {shift.ateScore !== null && (
              <ScoreChip icon="restaurant" score={shift.ateScore} label="Comeu" />
            )}
            {shift.sleptScore !== null && (
              <ScoreChip icon="bedtime" score={shift.sleptScore} label="Dormiu" />
            )}
          </div>
        )}
      </div>
      {onClick && (
        <span className="material-symbols-outlined text-on-surface-variant/60 text-base mt-0.5">
          chevron_right
        </span>
      )}
    </button>
  )
}

interface ScoreChipProps {
  icon: string
  score: 1 | 2 | 3
  label: string
}

function ScoreChip({ icon, score, label }: ScoreChipProps) {
  const style = SCORE_CHIP_STYLE[score]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${style.tone}`}>
      <span className="material-symbols-outlined text-[13px]">{icon}</span>
      <span className="font-label text-[11px] font-semibold">
        {label}: {style.text}
      </span>
    </span>
  )
}
