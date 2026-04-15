import type { Vaccine, VaccineStatus } from '../vaccineData'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'

interface Props {
  vaccine: Vaccine
  status: VaccineStatus
  appliedAt?: string | null
  onTap: () => void
  /** Ação rápida: aplica a vacina com a data de hoje, sem abrir nenhuma sheet. */
  onQuickApply: () => void
}

/**
 * Linha individual de uma vacina.
 * Ícone de status + nome + subtítulo (dose/proteção) + 2 badges:
 *   - SUS / Particular (source)
 *   - Obrigatória / Opcional (isMandatory)
 *
 * Tap na linha → abre o detail sheet.
 * Tap no botão ✓ (lateral direita) → aplica direto com a data de hoje,
 * sem sheets intermediárias. Só aparece em can_take / overdue.
 */
export default function VaccineRow({
  vaccine,
  status,
  appliedAt,
  onTap,
  onQuickApply,
}: Props) {
  const statusInfo = getStatusInfo(status)
  const isSkipped = status === 'skipped'
  const isDim = status === 'future' || isSkipped
  const canQuickApply = status === 'can_take' || status === 'overdue'

  const handleRowClick = () => {
    hapticLight()
    onTap()
  }

  const handleQuick = (e: React.MouseEvent) => {
    e.stopPropagation()
    hapticSuccess()
    onQuickApply()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleRowClick()
        }
      }}
      className={`w-full flex items-center gap-3 p-3 rounded-md bg-surface-container active:bg-surface-container-high transition-colors text-left cursor-pointer ${
        isSkipped ? 'opacity-60' : ''
      }`}
    >
      {/* Ícone de status */}
      <div
        className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${statusInfo.iconBg}`}
      >
        <span
          className={`material-symbols-outlined text-xl ${statusInfo.iconColor}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {statusInfo.icon}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3
          className={`font-headline text-sm font-bold leading-tight truncate mb-0.5 ${
            isDim ? 'text-on-surface-variant' : 'text-on-surface'
          } ${isSkipped ? 'line-through decoration-on-surface-variant/60' : ''}`}
        >
          {vaccine.name}
        </h3>
        <p className="font-label text-[11px] text-on-surface-variant truncate">
          {vaccine.doseLabel}
          {status === 'applied' && appliedAt
            ? ` · Aplicada em ${formatAppliedDate(appliedAt)}`
            : ` · ${statusInfo.label}`}
        </p>
      </div>

      {/* Badges */}
      <div className="flex flex-col gap-1 items-end shrink-0">
        <span
          className={`font-label text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            vaccine.source === 'PNI'
              ? 'bg-primary/10 text-primary'
              : 'bg-tertiary/10 text-tertiary'
          }`}
        >
          {vaccine.source === 'PNI' ? 'SUS' : 'Particular'}
        </span>
        <span
          className={`font-label text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            vaccine.isMandatory
              ? 'bg-on-surface/10 text-on-surface'
              : 'bg-on-surface-variant/10 text-on-surface-variant'
          }`}
        >
          {vaccine.isMandatory ? 'Obrigatória' : 'Opcional'}
        </span>
      </div>

      {/* Quick apply button — só em can_take / overdue */}
      {canQuickApply && (
        <button
          type="button"
          onClick={handleQuick}
          aria-label={`Marcar ${vaccine.name} como aplicada hoje`}
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
  )
}

// -------------------------------------------------------------------------

interface StatusVisual {
  icon: string
  iconBg: string
  iconColor: string
  label: string
}

function getStatusInfo(status: VaccineStatus): StatusVisual {
  switch (status) {
    case 'applied':
      return {
        icon: 'check_circle',
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-400',
        label: 'Aplicada',
      }
    case 'skipped':
      return {
        icon: 'do_not_disturb_on',
        iconBg: 'bg-surface-container-high',
        iconColor: 'text-on-surface-variant/60',
        label: 'Não será aplicada',
      }
    case 'can_take':
      return {
        icon: 'vaccines',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        label: 'Pode tomar',
      }
    case 'overdue':
      return {
        icon: 'warning',
        iconBg: 'bg-yellow-500/10',
        iconColor: 'text-yellow-400',
        label: 'Atrasada',
      }
    case 'future':
    default:
      return {
        icon: 'lock',
        iconBg: 'bg-surface-container-high',
        iconColor: 'text-on-surface-variant/60',
        label: 'Futura',
      }
  }
}

function formatAppliedDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
