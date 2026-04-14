import { useRef, useState } from 'react'
import { hapticLight, hapticSuccess } from '../../lib/haptics'
import type { Milestone } from '../../lib/milestoneData'
import { useSheetBackClose } from '../../hooks/useSheetBackClose'

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

// Downscale image to ~1024px longest side before storing as data URL
async function fileToDataUrl(file: File, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas context failed'))
          return
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function MilestoneRegister({
  milestone,
  birthDate,
  onCancel,
  onSave,
}: Props) {
  const today = getLocalToday()
  const [achievedAt, setAchievedAt] = useState(today)
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  useSheetBackClose(true, onCancel)

  const handlePickPhoto = () => {
    hapticLight()
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await fileToDataUrl(file)
      setPhotoDataUrl(dataUrl)
    } catch {
      // ignore
    }
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    hapticSuccess()
    try {
      await onSave({
        achievedAt,
        photoDataUrl,
        note: note.trim() || undefined,
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
      <div className="min-h-full flex flex-col max-w-lg mx-auto px-5 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
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
          <div className="text-5xl mb-2">{milestone.emoji}</div>
          <h2 className="font-headline text-xl font-bold text-on-surface leading-tight mb-1">
            {milestone.name}
          </h2>
          <p className="font-label text-sm text-on-surface-variant leading-relaxed">
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

        {/* Photo */}
        <div className="mb-4">
          <span className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
            Foto (opcional)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          {photoDataUrl ? (
            <div className="relative">
              <img
                src={photoDataUrl}
                alt="Foto do marco"
                className="w-full aspect-square object-cover rounded-md"
              />
              <button
                type="button"
                onClick={() => setPhotoDataUrl(undefined)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Remover foto"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handlePickPhoto}
              className="w-full aspect-[4/3] rounded-md border-2 border-dashed border-white/15 bg-surface-container/50 flex flex-col items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/70">
                add_a_photo
              </span>
              <span className="font-label text-xs text-on-surface-variant">
                Tocar para adicionar
              </span>
            </button>
          )}
        </div>

        {/* Note */}
        <label className="block mb-6">
          <span className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5 block">
            Nota (opcional)
          </span>
          <textarea
            value={note}
            onChange={(e) =>
              setNote(e.target.value.slice(0, 140))
            }
            rows={3}
            placeholder="Como foi esse momento?"
            className="w-full bg-surface-container rounded-md px-4 py-3 text-on-surface font-body text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <span className="font-label text-[10px] text-on-surface-variant/60 block text-right mt-1">
            {note.length}/140
          </span>
        </label>

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
