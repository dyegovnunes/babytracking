import { useNavigate } from 'react-router-dom'
import type { MedicationHomeAlert } from '../medicationUtils'
import { formatDueSoon, formatOverdue } from '../medicationUtils'
import { hapticLight } from '../../../lib/haptics'

interface Props {
  alerts: MedicationHomeAlert[]
  babyName: string
}

/**
 * Card discreto da TrackerPage para alertar sobre medicamentos.
 *
 * Regras (spec):
 * - Renderiza `null` se não há alertas.
 * - Sempre 1 card, nunca 2. Agrega múltiplos alertas no subtítulo.
 * - Cor/ícone do estado mais urgente: overdue (laranja) > due_soon (roxo).
 * - Tap navega pra /medicamentos.
 * - 2 alertas: "Dipirona atrasada · Vitamina D em 12min"
 * - 3+: "Dipirona atrasada · +2 pendentes"
 */
export default function MedicationAlertCard({ alerts, babyName }: Props) {
  const navigate = useNavigate()
  if (alerts.length === 0) return null

  // alerts já vem ordenado (overdue primeiro, depois due_soon)
  const hasOverdue = alerts.some((a) => a.alert.kind === 'overdue')

  const icon = hasOverdue ? 'warning' : 'medication'
  const colorClasses = hasOverdue
    ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
    : 'bg-primary/10 border-primary/30 text-primary'

  const title =
    alerts.length === 1
      ? hasOverdue
        ? `${babyName} tem medicamento atrasado`
        : `${babyName} tem medicamento para tomar`
      : `${babyName} tem medicamentos pendentes`

  const subtitle = buildSubtitle(alerts)

  return (
    <section className="px-5 mt-3">
      <button
        type="button"
        onClick={() => {
          hapticLight()
          navigate('/medicamentos')
        }}
        className={`w-full rounded-md border p-4 text-left active:opacity-90 transition-opacity ${colorClasses}`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              hasOverdue ? 'bg-yellow-500/15' : 'bg-primary/15'
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline text-sm font-bold text-on-surface leading-tight">
              {title}
            </p>
            <p className="font-label text-xs text-on-surface-variant mt-0.5 truncate">
              {subtitle}
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant text-lg shrink-0">
            chevron_right
          </span>
        </div>
      </button>
    </section>
  )
}

function buildSubtitle(alerts: MedicationHomeAlert[]): string {
  if (alerts.length === 1) {
    const a = alerts[0]
    const name = a.medicationName
    if (a.alert.kind === 'overdue') {
      return `${name} · prevista às ${a.alert.time} (${formatOverdue(a.alert.minutesLate)})`
    }
    return `${name} · ${a.alert.time} (${formatDueSoon(a.alert.minutesUntil)})`
  }

  if (alerts.length === 2) {
    const [a, b] = alerts
    return `${formatInlineAlert(a)} · ${formatInlineAlert(b)}`
  }

  // 3+
  const first = alerts[0]
  const extras = alerts.length - 1
  return `${formatInlineAlert(first)} · +${extras} ${extras === 1 ? 'pendente' : 'pendentes'}`
}

function formatInlineAlert(a: MedicationHomeAlert): string {
  if (a.alert.kind === 'overdue') return `${a.medicationName} atrasada`
  return `${a.medicationName} ${formatDueSoon(a.alert.minutesUntil)}`
}
