import type { MedicationDayStatus } from '../medicationData'
import { formatDueSoon, formatOverdue } from '../medicationUtils'

interface Props {
  status: MedicationDayStatus
  /** Tap no card → abre o AdminSheet */
  onTap: () => void
  /** Quick-apply: registra a dose pendente mais próxima com `now` sem abrir sheet */
  onQuickApply: () => void
}

/**
 * Card de medicamento na MedicationsPage.
 *
 * Mostra:
 *   - nome + dosagem + frequência
 *   - progresso (dia X de N) ou "uso contínuo"
 *   - lista de doses do dia (horário + ✓ + quem deu)
 *   - próxima dose pendente em destaque
 *   - botão ✓ circular pra marcar a dose mais próxima sem abrir sheet
 *
 * O corpo é clicável (abre AdminSheet). O botão ✓ é um `stopPropagation`.
 */
export default function MedicationCard({ status, onTap, onQuickApply }: Props) {
  const { medication: m, doses, givenCount, totalCount, nextPendingTime, alert, treatmentProgress } = status

  const alertBorder =
    alert?.kind === 'overdue'
      ? 'border-yellow-500/40'
      : alert?.kind === 'due_soon'
        ? 'border-primary/40'
        : 'border-white/5'

  const alertBadge = (() => {
    if (!alert) return null
    if (alert.kind === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-label text-[10px] font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-[11px]">warning</span>
          atrasado · {formatOverdue(alert.minutesLate)}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary font-label text-[10px] font-bold uppercase tracking-wider">
        <span className="material-symbols-outlined text-[11px]">schedule</span>
        {formatDueSoon(alert.minutesUntil)}
      </span>
    )
  })()

  const showQuickApply = !!nextPendingTime

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onTap()
        }
      }}
      className={`w-full rounded-md bg-surface-container border ${alertBorder} p-4 text-left active:bg-surface-container-high transition-colors cursor-pointer`}
    >
      {/* Header: nome + dosagem + quick-apply */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="text-xl">💊</span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-headline text-sm font-bold text-on-surface truncate">
            {m.name}
          </h3>
          <p className="font-body text-xs text-on-surface-variant truncate">
            {m.dosage} · {formatFrequency(m.frequencyHours)}
          </p>
          {alertBadge && <div className="mt-1.5">{alertBadge}</div>}
        </div>
        {showQuickApply && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onQuickApply()
            }}
            aria-label={`Registrar dose de ${m.name} agora`}
            className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 active:bg-primary/25 transition-colors"
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check
            </span>
          </button>
        )}
      </div>

      {/* Doses do dia */}
      {doses.length > 0 && (
        <div className="mb-3">
          <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
            Hoje ({givenCount}/{totalCount})
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {doses.map((d) => {
              const done = d.log !== null
              return (
                <div
                  key={d.time}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-label text-[11px] font-semibold ${
                    done
                      ? 'bg-green-500/15 text-green-400'
                      : d.time === nextPendingTime
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-surface-container-highest text-on-surface-variant'
                  }`}
                >
                  {done && (
                    <span
                      className="material-symbols-outlined text-[11px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  )}
                  <span>{d.time}</span>
                  {done && d.administeredByName && (
                    <span className="opacity-70">· {d.administeredByName}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Progresso (fixed) */}
      {treatmentProgress && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-label text-[10px] text-on-surface-variant">
              Dia {treatmentProgress.dayIndex} de {treatmentProgress.totalDays}
            </span>
            <span className="font-label text-[10px] text-on-surface-variant">
              {Math.round(treatmentProgress.fraction * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-tertiary transition-all"
              style={{ width: `${treatmentProgress.fraction * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Próximo horário (continuous sem alerta) */}
      {!treatmentProgress && !alert && nextPendingTime && (
        <p className="font-label text-[11px] text-on-surface-variant">
          Próximo: {nextPendingTime}
        </p>
      )}
      {!treatmentProgress && !nextPendingTime && (
        <p className="font-label text-[11px] text-green-400">
          ✓ Todas as doses de hoje foram dadas
        </p>
      )}
    </div>
  )
}

function formatFrequency(hours: number): string {
  if (hours >= 24) return '1x por dia'
  if (hours === 12) return '2x por dia'
  if (hours === 8) return '3x por dia'
  if (hours === 6) return '4x por dia'
  if (hours === 4) return '6x por dia'
  return `a cada ${hours}h`
}
