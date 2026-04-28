/**
 * GridSettingsSheet — painel de personalização manual do grid do tracker.
 *
 * Lista todos os eventos do EVENT_CATALOG agrupados por categoria.
 * Cada toggle liga/desliga o evento via toggleEvent (useGridItems).
 * Proteção: se só 1 evento habilitado, seu toggle fica bloqueado.
 */

import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { EVENT_CATALOG, CATEGORY_LABELS } from '../../../lib/constants'
import { hapticLight } from '../../../lib/haptics'
import type { EventType } from '../../../types'

interface Props {
  babyId: string
  isOpen: boolean
  onClose: () => void
  gridEvents: EventType[]
  onToggle: (eventId: string, enabled: boolean) => Promise<void>
}

export default function GridSettingsSheet({
  isOpen,
  onClose,
  gridEvents,
  onToggle,
}: Props) {
  useSheetBackClose(isOpen, onClose)
  if (!isOpen) return null

  const enabledIds = new Set(gridEvents.map((e) => e.id))
  const onlyOneEnabled = enabledIds.size === 1

  // Group by category preserving EVENT_CATALOG order
  const categories = ['feed', 'diaper', 'sleep', 'care'] as const
  const grouped = categories.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    events: EVENT_CATALOG.filter((e) => e.category === cat),
  }))

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-md max-h-[85dvh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-on-surface/20" />
        </div>

        {/* Header */}
        <div className="px-5 pb-3 shrink-0">
          <h2 className="font-title text-base text-on-surface">Personalizar painel</h2>
          <p className="font-body text-xs text-on-surface-variant mt-0.5">
            Escolha quais botões aparecem no tracker
          </p>
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto px-5 pb-8">
          {grouped.map(({ cat, label, events }) => (
            <div key={cat} className="mb-5">
              <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-wide mb-2">
                {label}
              </p>
              <div className="bg-surface-container rounded-md divide-y divide-outline-variant/30">
                {events.map((event) => {
                  const isEnabled = enabledIds.has(event.id)
                  const isBlocked = isEnabled && onlyOneEnabled

                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      {/* Emoji */}
                      <span className="text-xl w-7 text-center select-none" aria-hidden>
                        {event.emoji}
                      </span>

                      {/* Label */}
                      <span className="flex-1 font-body text-sm text-on-surface">
                        {event.label}
                      </span>

                      {/* Toggle */}
                      <button
                        role="switch"
                        aria-checked={isEnabled}
                        disabled={isBlocked}
                        onClick={async () => {
                          if (isBlocked) return
                          hapticLight()
                          await onToggle(event.id, !isEnabled)
                        }}
                        className={[
                          'relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 shrink-0',
                          isBlocked ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer',
                          isEnabled ? 'bg-primary' : 'bg-on-surface/20',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                            isEnabled ? 'translate-x-5' : 'translate-x-0',
                          ].join(' ')}
                        />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
