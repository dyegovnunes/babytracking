import type { DevelopmentLeap } from '../developmentLeaps'
import type { LeapNote } from '../useLeapNotes'
import type { LogEntry } from '../../../types'
import LeapDataInsight from './LeapDataInsight'
import LeapNoteForm from './LeapNoteForm'

type LeapStatus = 'past' | 'active' | 'upcoming' | 'future'

interface LeapCardProps {
  leap: DevelopmentLeap
  status: LeapStatus
  estimatedDate: Date
  birthDate: string

  logs: LogEntry[]
  note: LeapNote | undefined
  onSaveNote: (leapId: number, text: string) => Promise<{ error: string | null } | undefined>
  isPremium: boolean
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export default function LeapCard({
  leap,
  status,
  estimatedDate,
  birthDate,
  logs,
  note,
  onSaveNote,
  isPremium,
}: LeapCardProps) {
  const durationWeeks = leap.weekEnd - leap.weekStart + 1

  return (
    <div className="rounded-md bg-surface-container p-4 space-y-3">
      {/* Celebratory header for past leaps */}
      {status === 'past' && (
        <div className="rounded-md bg-green-50 p-3 text-center">
          <p className="text-sm font-semibold text-green-700">
            Salto {leap.id} superado!
          </p>
          <p className="text-xs text-green-600 mt-0.5">
            Concluido em {formatDateShort(estimatedDate)} &middot; {durationWeeks} {durationWeeks === 1 ? 'semana' : 'semanas'}
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <p className="text-sm text-on-surface leading-relaxed">
          {leap.description}
        </p>
      </div>

      {/* What to expect */}
      <div>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
          O que esperar
        </p>
        <ul className="space-y-0.5">
          {leap.whatToExpect.map((item, i) => (
            <li key={i} className="flex gap-1.5 text-xs text-on-surface-variant">
              <span className="mt-0.5 text-[8px] text-on-surface-variant/50">&#9679;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Tips */}
      <div>
        <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1">
          Dicas para os pais
        </p>
        <ul className="space-y-0.5">
          {leap.tips.map((tip, i) => (
            <li key={i} className="flex gap-1.5 text-xs text-on-surface-variant">
              <span className="mt-0.5 text-[8px] text-on-surface-variant/50">&#9679;</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Registro impact */}
      <div className="rounded-md bg-primary/5 p-3">
        <p className="text-xs font-semibold text-on-surface-variant mb-0.5">
          Impacto nos registros
        </p>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {leap.registroImpact}
        </p>
      </div>

      {/* Data insight (premium only) */}
      {isPremium && (
        <LeapDataInsight logs={logs} birthDate={birthDate} leap={leap} />
      )}

      {/* Note form (premium only) */}
      {isPremium && (
        <LeapNoteForm leapId={leap.id} note={note} onSave={onSaveNote} />
      )}

      {/* Read-only note for non-premium users who previously wrote one */}
      {!isPremium && note && (
        <div className="rounded-md bg-surface-container-high p-3">
          <p className="text-xs font-semibold text-on-surface-variant mb-1">
            Sua anotacao
          </p>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {note.note}
          </p>
        </div>
      )}
    </div>
  )
}
