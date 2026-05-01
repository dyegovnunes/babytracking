import type { LogEntry, Member, MealPayload, MoodPayload, SickPayload } from '../../../types'
import { EVENT_CATALOG } from '../../../lib/constants'
import { formatTime, formatSleepDuration } from '../../../lib/formatters'

interface Props {
  log: LogEntry
  members: Record<string, Member>
  onEdit: (log: LogEntry) => void
  /** Quando setado, a row representa uma sessão "ambos os peitos" (par left+right). */
  pairedLog?: LogEntry
  /** Log de "Dormiu" pareado — usado para calcular duração da soneca no "Acordou". */
  sleepLog?: LogEntry
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
export default function LogRow({ log, members, onEdit, pairedLog, sleepLog }: Props) {
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

  /* Duração da soneca — calculada a partir dos timestamps reais (wake - sleep).
     Sempre reflete edições em qualquer um dos dois logs. */
  const sleepDurationMinutes = sleepLog && log.eventId === 'wake'
    ? Math.round((log.timestamp - sleepLog.timestamp) / 60_000)
    : null
  const showSleepDuration = sleepDurationMinutes !== null && sleepDurationMinutes > 0 && sleepDurationMinutes < 24 * 60

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

        {/* Detalhes de humor — linha única compacta */}
        {moodPayload && (
          <p className="font-label text-xs text-on-surface-variant mt-0.5 truncate">
            {[
              MOOD_LABEL[moodPayload.level] ?? `Nível ${moodPayload.level}`,
              moodPayload.note,
            ].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* Detalhes de doença — linha única compacta */}
        {sickPayload && (
          <p className="font-label text-xs text-on-surface-variant mt-0.5 truncate">
            {sickPayload.temp !== undefined && (
              <span className={sickPayload.temp >= 37.8 ? 'text-error' : ''}>
                🌡️ {sickPayload.temp}°C{sickPayload.temp >= 37.8 ? ' · Febre' : ''}
              </span>
            )}
            {sickPayload.temp !== undefined &&
              (sickPayload.symptoms?.length || sickPayload.note) && ' · '}
            {[
              ...(sickPayload.symptoms?.map((s) => SYMPTOM_LABEL[s] ?? s) ?? []),
              sickPayload.note,
            ].filter(Boolean).join(' · ')}
          </p>
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
        {/* Duração + autor numa única linha para manter a altura padrão da row */}
        {(showSleepDuration || memberName) && (
          <p className="font-label text-[10px] text-on-surface-variant/60">
            {[
              showSleepDuration ? formatSleepDuration(sleepDurationMinutes!) : null,
              memberName ? `por ${memberName}` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>

      {/* Indicador de entrada offline — revisão recomendada */}
      {(log.payload as Record<string, unknown> | null | undefined)?.source === 'offline' && (
        <span
          className="material-symbols-outlined text-[14px] text-on-surface-variant/40 shrink-0 mr-1"
          title="Registrado offline"
        >
          cloud_off
        </span>
      )}

      <span className="material-symbols-outlined text-on-surface-variant/50 text-base">edit</span>
    </button>
  )
}
