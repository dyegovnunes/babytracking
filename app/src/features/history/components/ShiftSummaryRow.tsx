import { useState } from 'react'
import { hapticLight } from '../../../lib/haptics'
import type { CaregiverShift } from '../../tracker/useCaregiverShift'

interface Props {
  shift: CaregiverShift
  caregiverName: string
}

const MOOD_EMOJIS: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '🙂',
  5: '😊',
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
 * no dia correspondente. Clique expande para mostrar nota completa + quick notes.
 */
export default function ShiftSummaryRow({ shift, caregiverName }: Props) {
  const [expanded, setExpanded] = useState(false)
  const moodEmoji = shift.moodScore ? MOOD_EMOJIS[shift.moodScore] : ''
  const submittedTime = formatSubmittedTime(shift.submittedAt)
  const preview = shift.note
    ? shift.note.slice(0, 80) + (shift.note.length > 80 ? '…' : '')
    : 'Resumo enviado sem anotações.'
  const hasDetails = (shift.note && shift.note.length > 80) || shift.quickNotes.length > 0

  return (
    <div className="bg-primary/[0.05] border border-primary/15 rounded-md px-3 py-3 my-2">
      <button
        type="button"
        onClick={() => { if (hasDetails) { hapticLight(); setExpanded((v) => !v) } }}
        className="w-full flex items-start gap-3 text-left"
        disabled={!hasDetails}
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
        </div>
        {hasDetails && (
          <span className={`material-symbols-outlined text-on-surface-variant text-base transition-transform mt-0.5 ${expanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        )}
      </button>

      {expanded && hasDetails && (
        <div className="mt-3 pl-8 space-y-3">
          {shift.note && shift.note.length > 80 && (
            <p className="font-body text-sm text-on-surface whitespace-pre-wrap">{shift.note}</p>
          )}
          {shift.quickNotes.length > 0 && (
            <div>
              <p className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">
                Notas rápidas do dia
              </p>
              <ul className="space-y-1">
                {shift.quickNotes.map((qn, i) => (
                  <li key={i} className="font-body text-xs text-on-surface-variant pl-3 border-l border-outline-variant">
                    {qn}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
