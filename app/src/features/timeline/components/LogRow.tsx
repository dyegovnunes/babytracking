import type { LogEntry, Member, MealPayload, MoodPayload, SickPayload } from '../../../types'
import { EVENT_CATALOG } from '../../../lib/constants'
import { formatTime } from '../../../lib/formatters'

interface Props {
  log: LogEntry
  members: Record<string, Member>
  onEdit: (log: LogEntry) => void
  /** Quando setado, a row representa uma sessão "ambos os peitos" (par left+right). */
  pairedLog?: LogEntry
}

const dotColorMap: Record<string, string> = {
  tertiary: 'bg-tertiary',
  primary:  'bg-primary',
  secondary:'bg-secondary',
}

const iconBgMap: Record<string, string> = {
  tertiary: 'bg-tertiary/15 text-tertiary',
  primary:  'bg-primary/15 text-primary',
  secondary:'bg-secondary/15 text-secondary',
}

const ACCEPTANCE_LABEL: Record<string, string> = {
  loved:    '😋 Adorou',
  accepted: '🙂 Aceitou',
  refused:  '🙅 Recusou',
  reaction: '⚠️ Reação',
}

const METHOD_LABEL: Record<string, string> = {
  pureed:             'Papinha',
  blw:                'BLW',
  mixed:              'Misto',
  breast_plus_solid:  'Peito + sólido',
}

const MOOD_LABEL: Record<number, string> = {
  1: '😢 Baixo',
  2: '😐 Neutro',
  3: '😊 Bem',
}

const SYMPTOM_LABEL: Record<string, string> = {
  fever:       'Febre',
  cough:       'Tosse',
  runny_nose:  'Coriza',
  vomit:       'Vômito',
  diarrhea:    'Diarreia',
  crying:      'Choro excessivo',
  no_appetite: 'Recusa alimentar',
  rash:        'Erupção na pele',
  other:       'Outro',
}

/**
 * Row de log (atividade recorrente: amamentação, fralda, sono, banho, refeição, humor).
 * Tap abre modal de edição inline (via callback).
 */
export default function LogRow({ log, members, onEdit, pairedLog }: Props) {
  const event = EVENT_CATALOG.find((e) => e.id === log.eventId)
  if (!event) return null

  const isMergedBoth = !!pairedLog
  const bothEvent = isMergedBoth ? EVENT_CATALOG.find((e) => e.id === 'breast_both') : null
  const displayEvent = bothEvent ?? event

  const dotColor = dotColorMap[displayEvent.color] ?? 'bg-primary'
  const iconBg   = iconBgMap[displayEvent.color]   ?? 'bg-primary/15 text-primary'
  const memberName = log.createdBy ? members[log.createdBy]?.displayName : undefined

  const displayTime = isMergedBoth
    ? new Date(Math.min(log.timestamp, pairedLog!.timestamp))
    : new Date(log.timestamp)

  /* Payload info */
  const mealPayload = log.eventId === 'meal' && log.payload
    ? (log.payload as MealPayload)
    : null
  const moodPayload = log.eventId === 'mood' && log.payload
    ? (log.payload as MoodPayload)
    : null
  const sickPayload = log.eventId === 'sick_log' && log.payload
    ? (log.payload as SickPayload)
    : null

  return (
    <button
      onClick={() => onEdit(log)}
      className="flex items-center gap-3 w-full text-left py-3 px-4 rounded-md bg-surface-container active:bg-surface-container-high transition-colors"
    >
      <div className="flex flex-col items-center gap-1 w-10 shrink-0">
        <span className="font-label text-xs font-semibold text-on-surface-variant">
          {formatTime(displayTime)}
        </span>
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      </div>

      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
        {displayEvent.emoji ? (
          <span className="text-lg leading-none">{displayEvent.emoji}</span>
        ) : (
          <span className="material-symbols-outlined text-lg">{displayEvent.icon}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-medium text-on-surface">
          {isMergedBoth ? 'Ambos os peitos' : event.label}
        </p>

        {/* Detalhes de refeição — linha única compacta */}
        {mealPayload && (
          <p className="font-label text-xs text-on-surface-variant mt-0.5 truncate">
            {[
              mealPayload.food,
              mealPayload.acceptance ? ACCEPTANCE_LABEL[mealPayload.acceptance] : null,
              mealPayload.method ? METHOD_LABEL[mealPayload.method] : null,
              mealPayload.isNewFood ? 'Novo' : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Detalhes de humor */}
        {moodPayload && (
          <p className="font-label text-xs text-on-surface-variant mt-0.5">
            {MOOD_LABEL[moodPayload.level] ?? `Nível ${moodPayload.level}`}
            {moodPayload.note && ` · ${moodPayload.note}`}
          </p>
        )}

        {/* Detalhes de doença */}
        {sickPayload && (
          <div className="mt-0.5 space-y-0.5">
            {sickPayload.temp !== undefined && (
              <p className={`font-label text-xs ${sickPayload.temp >= 37.8 ? 'text-red-400' : 'text-on-surface-variant'}`}>
                🌡️ {sickPayload.temp}°C{sickPayload.temp >= 37.8 ? ' · Febre' : ''}
              </p>
            )}
            {sickPayload.symptoms && sickPayload.symptoms.length > 0 && (
              <p className="font-label text-xs text-on-surface-variant truncate">
                {sickPayload.symptoms.map((s) => SYMPTOM_LABEL[s] ?? s).join(' · ')}
              </p>
            )}
            {sickPayload.note && (
              <p className="font-label text-xs text-on-surface-variant/60 truncate">{sickPayload.note}</p>
            )}
          </div>
        )}

        {/* Padrão: peito, fralda, sono etc. */}
        {isMergedBoth && (
          <p className="font-label text-xs text-tertiary">Esq. + Dir.</p>
        )}
        {log.ml && (
          <p className="font-label text-xs text-primary">{log.ml} ml</p>
        )}
        {log.notes && (
          <p className="font-label text-xs text-on-surface-variant truncate">{log.notes}</p>
        )}
        {memberName && (
          <p className="font-label text-[10px] text-on-surface-variant/60">por {memberName}</p>
        )}
      </div>

      <span className="material-symbols-outlined text-on-surface-variant/50 text-base">edit</span>
    </button>
  )
}
