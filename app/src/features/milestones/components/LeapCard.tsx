import type { DevelopmentLeap } from '../developmentLeaps'
import type { LogEntry } from '../../../types'
import { contractionDe, adjEnding } from '../../../lib/genderUtils'
import LeapDataInsight from './LeapDataInsight'
import LeapMoodTracker from './LeapMoodTracker'

type LeapStatus = 'past' | 'active' | 'upcoming' | 'future'

interface LeapCardProps {
  leap: DevelopmentLeap
  status: LeapStatus
  estimatedDate: Date
  birthDate: string
  babyName: string
  babyGender?: 'boy' | 'girl'
  babyId: string

  logs: LogEntry[]
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
  babyName,
  babyGender,
  babyId,
  logs,
  isPremium,
}: LeapCardProps) {
  const durationWeeks = leap.weekEnd - leap.weekStart + 1
  const de = contractionDe(babyGender)
  const adjAgitado = `agitad${adjEnding(babyGender)}`

  return (
    <div className="rounded-md bg-surface-container p-4 space-y-3">
      {/* Celebratory header for past leaps */}
      {status === 'past' && (
        <div className="rounded-md bg-green-500/10 p-3 text-center">
          <p className="text-sm font-semibold text-green-600 dark:text-green-400">
            Salto {leap.id} superado!
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Concluido em {formatDateShort(estimatedDate)} · {durationWeeks} {durationWeeks === 1 ? 'semana' : 'semanas'}
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <p className="text-sm text-on-surface leading-relaxed">
          {status === 'active' && (
            <span className="font-semibold">{babyName} pode estar mais {adjAgitado}. </span>
          )}
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
              <span className="mt-0.5 text-sm leading-none">💡</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Registro impact */}
      <div className="p-3 rounded-md bg-primary/5 border border-primary/15">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
          Impacto na rotina {de} {babyName}
        </p>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          {leap.registroImpact}
        </p>
      </div>

      {/* Data insight (premium only) */}
      {isPremium && (
        <LeapDataInsight logs={logs} birthDate={birthDate} leap={leap} />
      )}

      {/* Mood tracker (premium only) */}
      {isPremium && (
        <LeapMoodTracker leapId={leap.id} babyId={babyId} status={status} isPremium={isPremium} />
      )}
    </div>
  )
}
