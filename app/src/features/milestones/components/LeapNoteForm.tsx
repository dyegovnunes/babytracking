import { useState } from 'react'
import { hapticLight } from '../../../lib/haptics'
import Toast from '../../../components/ui/Toast'
import type { LeapNote } from '../useLeapNotes'

interface LeapNoteFormProps {
  leapId: number
  note: LeapNote | undefined
  onSave: (leapId: number, text: string) => Promise<{ error: string | null } | undefined>
}

const MAX_CHARS = 280

export default function LeapNoteForm({ leapId, note, onSave }: LeapNoteFormProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const isShowingNote = note && !editing
  const isEditing = editing || !note

  async function handleSave() {
    const trimmed = text.trim()
    if (!trimmed) return

    hapticLight()
    setSaving(true)
    const result = await onSave(leapId, trimmed)
    setSaving(false)

    if (result?.error) {
      setToast('Erro ao salvar anotacao')
    } else {
      setToast('Anotacao salva')
      setEditing(false)
    }
  }

  return (
    <div className="rounded-md bg-surface-container-high p-3">
      <p className="text-xs font-semibold text-on-surface-variant mb-1.5">
        Sua anotacao
      </p>

      {isShowingNote && (
        <div>
          <p className="text-xs text-on-surface-variant leading-relaxed mb-1">
            {note.note}
          </p>
          <button
            type="button"
            className="text-xs text-primary font-semibold"
            onClick={() => {
              setText(note.note)
              setEditing(true)
            }}
          >
            Editar
          </button>
        </div>
      )}

      {isEditing && (
        <div>
          <textarea
            className="w-full rounded-md border border-outline-variant bg-surface p-2 text-xs text-on-surface resize-none focus:outline-none focus:border-primary"
            rows={3}
            maxLength={MAX_CHARS}
            placeholder="Como foi esse salto?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-on-surface-variant/50">
              {text.length}/{MAX_CHARS}
            </span>
            <div className="flex gap-2">
              {note && editing && (
                <button
                  type="button"
                  className="text-xs text-on-surface-variant"
                  onClick={() => setEditing(false)}
                >
                  Cancelar
                </button>
              )}
              <button
                type="button"
                className="text-xs font-semibold text-primary disabled:opacity-40"
                disabled={saving || text.trim().length === 0}
                onClick={handleSave}
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
