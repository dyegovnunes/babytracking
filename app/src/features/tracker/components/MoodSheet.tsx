import { useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import type { MoodPayload } from '../../../types'

interface Props {
  babyName: string
  onConfirm: (payload: MoodPayload) => void
  onClose: () => void
}

const MOODS: { level: MoodPayload['level']; emoji: string; label: string; color: string }[] = [
  { level: 1, emoji: '😊', label: 'Bem',      color: 'text-green-500' },
  { level: 2, emoji: '😐', label: 'Normal',   color: 'text-amber-500' },
  { level: 3, emoji: '😢', label: 'Chateado', color: 'text-red-400'   },
]

export default function MoodSheet({ babyName, onConfirm, onClose }: Props) {
  useSheetBackClose(true, onClose)

  const [selected, setSelected] = useState<MoodPayload['level'] | null>(null)
  const [note, setNote] = useState('')

  const handleConfirm = () => {
    if (!selected) return
    hapticSuccess()
    onConfirm({ level: selected, note: note.trim() || undefined })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md pb-sheet animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="font-headline text-base font-bold text-on-surface">Como está o humor?</h2>
            <p className="font-label text-xs text-on-surface-variant">{babyName}</p>
          </div>
          <button onClick={onClose} className="p-1 -m-1 rounded-md active:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="px-5 pb-4 space-y-4">
          {/* Seletor de humor */}
          <div className="grid grid-cols-3 gap-3">
            {MOODS.map((m) => (
              <button
                key={m.level}
                onClick={() => { hapticLight(); setSelected(m.level) }}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-md border-2 transition-all ${
                  selected === m.level
                    ? 'border-primary bg-primary/10'
                    : 'border-outline-variant bg-surface-container'
                }`}
              >
                <span className="text-4xl">{m.emoji}</span>
                <span className={`font-label text-xs font-semibold ${selected === m.level ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {m.label}
                </span>
              </button>
            ))}
          </div>

          {/* Nota opcional */}
          {selected && (
            <div>
              <label className="block font-label text-xs text-on-surface-variant mb-1.5">
                Observação <span className="text-on-surface-variant/50">(opcional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: dormiu mal, dentição..."
                rows={2}
                className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary resize-none"
              />
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm active:bg-primary/90 disabled:opacity-40"
          >
            Registrar humor
          </button>
        </div>
      </div>
    </div>
  )
}
