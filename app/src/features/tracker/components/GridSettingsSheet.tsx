/**
 * GridSettingsSheet — painel de personalização manual do grid do tracker.
 *
 * Lista todos os eventos do EVENT_CATALOG agrupados por categoria.
 * Limite: máximo de 9 eventos habilitados ao mesmo tempo (grid 3×3).
 * Proteção mínima: se só 1 evento habilitado, seu toggle fica bloqueado.
 */

import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { EVENT_CATALOG, CATEGORY_LABELS } from '../../../lib/constants'
import { hapticLight } from '../../../lib/haptics'
import type { EventType } from '../../../types'

const MAX_EVENTS = 9

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
  const enabledCount = enabledIds.size
  const atMax = enabledCount >= MAX_EVENTS
  const onlyOne = enabledCount === 1

  const categories = ['feed', 'diaper', 'sleep', 'care'] as const
  const grouped = categories.map((cat) => ({
    cat,
    label: CATEGORY_LABELS[cat],
    events: EVENT_CATALOG.filter((e) => e.category === cat),
  }))

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-md max-h-[88dvh] flex flex-col">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full bg-on-surface/20" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-4 shrink-0 border-b border-outline-variant/30">
          <div>
            <h2 className="font-title text-base font-semibold text-on-surface">Personalizar painel</h2>
            <p className="font-body text-xs text-on-surface-variant mt-0.5">
              Escolha quais botões aparecem no tracker
            </p>
          </div>
          {/* Counter badge */}
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full mt-0.5 shrink-0 ${
            atMax ? 'bg-primary/15' : 'bg-surface-container'
          }`}>
            <span className={`font-label text-sm font-semibold tabular-nums ${atMax ? 'text-primary' : 'text-on-surface'}`}>
              {enabledCount}
            </span>
            <span className="font-label text-xs text-on-surface-variant">/{MAX_EVENTS}</span>
          </div>
        </div>

        {/* Limite atingido — aviso discreto */}
        {atMax && (
          <div className="mx-5 mt-3 px-3 py-2.5 rounded-md bg-primary/8 border border-primary/20 flex items-start gap-2 shrink-0">
            <span className="material-symbols-outlined text-primary text-base mt-0.5">info</span>
            <p className="font-body text-xs text-on-surface leading-relaxed">
              Limite de {MAX_EVENTS} botões atingido. Desative um para liberar espaço.
            </p>
          </div>
        )}

        {/* Lista por categoria */}
        <div className="overflow-y-auto px-5 pb-10 pt-3">
          {grouped.map(({ cat, label, events }) => (
            <div key={cat} className="mb-5">
              {/* Categoria label */}
              <p className="font-label text-[11px] font-semibold text-on-surface-variant/70 uppercase tracking-wider mb-2 px-1">
                {label}
              </p>

              <div className="space-y-1">
                {events.map((event) => {
                  const isEnabled = enabledIds.has(event.id)
                  // Bloqueado se: é o único ativo (proteção mínima) OU quer ativar mas limite atingido
                  const isBlocked = (isEnabled && onlyOne) || (!isEnabled && atMax)

                  return (
                    <button
                      key={event.id}
                      onClick={async () => {
                        if (isBlocked) return
                        hapticLight()
                        await onToggle(event.id, !isEnabled)
                      }}
                      className={[
                        'flex items-center gap-3 w-full px-4 py-3 rounded-md transition-colors text-left',
                        isEnabled
                          ? 'bg-primary/8 border border-primary/25'
                          : 'bg-surface-container border border-transparent',
                        isBlocked ? 'opacity-40' : 'active:opacity-80',
                      ].join(' ')}
                    >
                      {/* Emoji */}
                      <span className="text-2xl w-8 text-center select-none shrink-0" aria-hidden>
                        {event.emoji}
                      </span>

                      {/* Label + hint */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-body text-sm ${isEnabled ? 'text-on-surface font-medium' : 'text-on-surface-variant'}`}>
                          {event.label}
                        </p>
                        {!isEnabled && atMax && (
                          <p className="font-label text-[10px] text-on-surface-variant/60 mt-0.5">
                            Desative outro para adicionar
                          </p>
                        )}
                      </div>

                      {/* Toggle visual */}
                      <div
                        className={[
                          'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200',
                          isEnabled ? 'bg-primary' : 'bg-on-surface/20',
                        ].join(' ')}
                      >
                        <span
                          className={[
                            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface shadow-sm transition-transform duration-200',
                            isEnabled ? 'translate-x-5' : 'translate-x-0',
                          ].join(' ')}
                        />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Dica de rodapé */}
          <p className="font-body text-[11px] text-on-surface-variant/50 text-center pt-1 pb-2">
            O grid sempre mostra em ordem de categoria
          </p>
        </div>
      </div>
    </>
  )
}
