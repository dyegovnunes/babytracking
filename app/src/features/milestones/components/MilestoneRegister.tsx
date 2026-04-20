import { useState } from 'react'
import { hapticSuccess } from '../../../lib/haptics'
import type { Milestone } from '../milestoneData'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  milestone: Milestone
  birthDate: string
  onCancel: () => void
  onSave: (args: {
    achievedAt: string
    photoDataUrl?: string
    note?: string
  }) => Promise<void> | void
}

function getLocalToday(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function MilestoneRegister({
  milestone,
  birthDate,
  onCancel,
  onSave,
}: Props) {
  const today = getLocalToday()
  const [achievedAt, setAchievedAt] = useState(today)
  const [saving, setSaving] = useState(false)
  useSheetBackClose(true, onCancel)

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    hapticSuccess()
    try {
      await onSave({
        achievedAt,
      })
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!achievedAt && achievedAt >= birthDate && achievedAt <= today

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="min-h-full flex flex-col max-w-lg mx-auto px-5 pt-6 pb-sheet">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={onCancel}
            className="text-on-surface-variant"
            aria-label="Fechar"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
          <span className="font-label text-xs uppercase tracking-wider text-on-surface-variant/60">
            Registrar marco
          </span>
          <div className="w-8" />
        </div>

        {/* Milestone title */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">{milestone.emoji}</div>
          <h2 className="font-headline text-lg font-bold text-on-surface leading-tight mb-1 text-balance">
            {milestone.name}
          </h2>
          <p className="font-label text-xs text-on-surface-variant leading-relaxed text-balance">
            {milestone.description}
          </p>
        </div>

        {/* Date */}
        <label className="block mb-4">
          <span className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
            Quando aconteceu?
          </span>
          <input
            type="date"
            value={achievedAt}
            min={birthDate}
            max={today}
            onChange={(e) => setAchievedAt(e.target.value)}
            className="w-full bg-surface-container rounded-md px-4 py-3 text-on-surface font-body text-base outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>

        {/* Foto de marcos removida temporariamente — unreliability no iOS
            (câmera Capacitor + file picker) + payload de data URL pesando
            no Supabase. Voltar quando tivermos upload via Storage + testado
            em iOS real. Não apagamos o state/ref pra não quebrar imports. */}

        {/* Save button */}
        <div className="mt-auto flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-md bg-surface-variant text-on-surface-variant font-label font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={handleSave}
            className="flex-1 py-3 rounded-md bg-gradient-to-br from-tertiary to-tertiary/80 text-surface font-label font-bold text-sm disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar marco'}
          </button>
        </div>
      </div>
    </div>
  )
}
