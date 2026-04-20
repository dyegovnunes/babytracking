import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight } from '../../../lib/haptics'
import type { CaregiverShift, ShiftScore } from '../useCaregiverShift'

interface Props {
  shift: CaregiverShift
  caregiverName: string
  onClose: () => void
  /** Quando presente, mostra botão "Editar" no rodapé. */
  onEdit?: () => void
}

const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
}
const MOOD_LABELS: Record<number, string> = {
  1: 'Difícil',
  2: 'Complicado',
  3: 'Ok',
  4: 'Bom',
  5: 'Ótimo',
}

const SCORE_CHIP_STYLE: Record<1 | 2 | 3, { tone: string; text: string }> = {
  1: { tone: 'bg-error/10 text-error border-error/20', text: 'ruim' },
  2: { tone: 'bg-amber-500/10 text-amber-700 border-amber-500/25', text: 'médio' },
  3: { tone: 'bg-primary/10 text-primary border-primary/20', text: 'bom' },
}

function formatSubmittedTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatShiftDate(dateStr: string): string {
  // YYYY-MM-DD → DD/MM/YYYY
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Modal unificado que mostra os detalhes de um shift de caregiver.
 * Usado tanto na Home (RecentLogs) quanto no Histórico (ShiftSummaryRow).
 *
 * Quando `onEdit` é fornecido, exibe o botão "Editar" no rodapé. A decisão de
 * se o usuário pode editar (babá dona + dentro da janela de trabalho) é feita
 * pelo componente pai.
 */
export default function ShiftDetailModal({ shift, caregiverName, onClose, onEdit }: Props) {
  useSheetBackClose(true, onClose)

  const moodEmoji = shift.moodScore ? MOOD_EMOJIS[shift.moodScore] : ''
  const moodLabel = shift.moodScore ? MOOD_LABELS[shift.moodScore] : ''
  const submittedTime = formatSubmittedTime(shift.submittedAt)
  const dateLabel = formatShiftDate(shift.shiftDate)

  const handleEditClick = () => {
    if (!onEdit) return
    hapticLight()
    onEdit()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-container-highest rounded-t-md p-6 pb-sheet border-t-2 border-primary-fixed animate-slide-up">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <span className="material-symbols-outlined text-primary text-xl mt-0.5">assignment</span>
            <div className="min-w-0">
              <h2 className="font-headline text-lg font-bold text-on-surface">Resumo do dia</h2>
              <p className="font-label text-xs text-on-surface-variant">
                {caregiverName} · {dateLabel}{submittedTime ? ` · ${submittedTime}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 -m-1 rounded-md active:bg-surface-container shrink-0"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Humor */}
        {shift.moodScore && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-md bg-surface-container">
            <span className="text-3xl">{moodEmoji}</span>
            <div>
              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant">
                Como foi o dia
              </p>
              <p className="font-label text-sm font-semibold text-on-surface">{moodLabel}</p>
            </div>
          </div>
        )}

        {/* Scores comeu/dormiu */}
        {(shift.ateScore !== null || shift.sleptScore !== null) && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            {shift.ateScore !== null && (
              <ScoreChip icon="restaurant" score={shift.ateScore} label="Comeu" />
            )}
            {shift.sleptScore !== null && (
              <ScoreChip icon="bedtime" score={shift.sleptScore} label="Dormiu" />
            )}
          </div>
        )}

        {/* Nota */}
        {shift.note && (
          <div className="mb-4">
            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
              Nota
            </p>
            <p className="font-body text-sm text-on-surface whitespace-pre-wrap leading-relaxed">
              {shift.note}
            </p>
          </div>
        )}

        {/* Quick notes */}
        {shift.quickNotes.length > 0 && (
          <div className="mb-4">
            <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
              Notas rápidas do dia
            </p>
            <ul className="space-y-1">
              {shift.quickNotes.map((qn, i) => (
                <li
                  key={i}
                  className="font-body text-xs text-on-surface-variant pl-3 border-l border-outline-variant"
                >
                  {qn}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {!shift.moodScore && shift.ateScore === null && shift.sleptScore === null && !shift.note && shift.quickNotes.length === 0 && (
          <p className="font-body text-sm text-on-surface-variant text-center py-4">
            Resumo enviado sem detalhes adicionais.
          </p>
        )}

        {/* Rodapé */}
        {onEdit ? (
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-md bg-surface-container text-on-surface font-label text-sm"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleEditClick}
              className="flex-1 py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Editar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-md bg-surface-container text-on-surface font-label text-sm"
          >
            Fechar
          </button>
        )}
      </div>
    </div>
  )
}

interface ScoreChipProps {
  icon: string
  score: ShiftScore
  label: string
}

function ScoreChip({ icon, score, label }: ScoreChipProps) {
  if (score === null) return null
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
