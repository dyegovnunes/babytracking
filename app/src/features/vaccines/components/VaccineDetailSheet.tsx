import { useEffect } from 'react'
import type { BabyVaccine, Vaccine, VaccineStatus } from '../vaccineData'
import { hapticLight } from '../../../lib/haptics'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  vaccine: Vaccine
  status: VaccineStatus
  applied?: BabyVaccine
  isPremium: boolean
  onClose: () => void
  onMarkApplied: () => void
}

/**
 * Bottom sheet informativo (free para todo mundo).
 * Mostra detalhes da vacina e oferece botão "Marcar como aplicada".
 *
 *   - Free + clique em marcar → abre PaywallModal (pai é que controla)
 *   - Yaya+ + clique em marcar → abre VaccineApplySheet
 */
export default function VaccineDetailSheet({
  vaccine,
  status,
  applied,
  isPremium,
  onClose,
  onMarkApplied,
}: Props) {
  useSheetBackClose(true, onClose)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const handleMark = () => {
    hapticLight()
    onMarkApplied()
  }

  const showMarkButton = status !== 'applied'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-md bg-surface-container-highest p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-on-surface-variant/30 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-14 h-14 rounded-md bg-surface-container flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-2xl text-primary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              vaccines
            </span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary">
              {vaccine.source === 'PNI' ? 'SUS (Gratuita)' : 'Particular'}
            </p>
            <h3 className="font-headline text-lg font-bold text-on-surface leading-tight mt-0.5">
              {vaccine.name}
            </h3>
            <p className="font-label text-xs text-on-surface-variant mt-1">
              {vaccine.doseLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:bg-surface-variant"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Body */}
        <Section label="Protege contra">
          <p className="font-body text-sm text-on-surface leading-relaxed">
            {vaccine.protectsAgainst}
          </p>
        </Section>

        <Section label="Esquema">
          <p className="font-body text-sm text-on-surface leading-relaxed">
            {vaccine.doseLabel}
            {vaccine.totalDoses > 1 ? ` · ${vaccine.totalDoses} doses no total` : ''}
          </p>
        </Section>

        <Section label="Status">
          <StatusChip status={status} />
          {status === 'applied' && applied && (
            <p className="font-label text-xs text-on-surface-variant mt-2">
              Aplicada em {formatDate(applied.appliedAt)}
              {applied.location ? ` · ${applied.location}` : ''}
              {applied.batchNumber ? ` · Lote ${applied.batchNumber}` : ''}
            </p>
          )}
        </Section>

        {vaccine.note && (
          <Section label="Observação">
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              {vaccine.note}
            </p>
          </Section>
        )}

        {vaccine.source === 'SBP' && (
          <div className="mt-2 p-3 rounded-md bg-tertiary/5 border border-tertiary/15">
            <p className="font-body text-xs text-on-surface-variant leading-relaxed">
              Disponível em clínicas particulares. Consulte seu pediatra.
            </p>
          </div>
        )}

        {/* Action */}
        {showMarkButton && (
          <button
            type="button"
            onClick={handleMark}
            className="w-full mt-5 py-3 rounded-md bg-primary text-on-primary font-label text-xs font-bold active:opacity-90 flex items-center justify-center gap-2"
          >
            {!isPremium && (
              <span className="material-symbols-outlined text-base">lock</span>
            )}
            Marcar como aplicada
          </button>
        )}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------------

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="font-label text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
        {label}
      </p>
      {children}
    </div>
  )
}

function StatusChip({ status }: { status: VaccineStatus }) {
  const map: Record<VaccineStatus, { label: string; cls: string }> = {
    applied: { label: 'Aplicada', cls: 'bg-green-500/10 text-green-400' },
    can_take: { label: 'Pode tomar', cls: 'bg-primary/10 text-primary' },
    overdue: { label: 'Atrasada', cls: 'bg-yellow-500/10 text-yellow-400' },
    future: {
      label: 'Ainda não é hora',
      cls: 'bg-surface-container text-on-surface-variant',
    },
  }
  const info = map[status]
  return (
    <span
      className={`inline-block font-label text-[11px] font-bold px-2.5 py-1 rounded-full ${info.cls}`}
    >
      {info.label}
    </span>
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}
