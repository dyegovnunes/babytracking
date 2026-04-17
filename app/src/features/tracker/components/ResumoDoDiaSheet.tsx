import { useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import { supabase } from '../../../lib/supabase'
import { useCaregiverShift, type ShiftScore } from '../useCaregiverShift'
import Toast from '../../../components/ui/Toast'

interface Props {
  babyId: string
  babyName: string
  caregiverId: string
  onClose: () => void
}

const MOODS: Array<{ value: number; emoji: string; label: string }> = [
  { value: 1, emoji: '😞', label: 'Difícil' },
  { value: 2, emoji: '😕', label: 'Complicado' },
  { value: 3, emoji: '😐', label: 'Ok' },
  { value: 4, emoji: '🙂', label: 'Bom' },
  { value: 5, emoji: '😊', label: 'Ótimo' },
]

const NOTE_MAX = 280

const SCORE_LABEL: Record<1 | 2 | 3, string> = {
  1: 'ruim',
  2: 'médio',
  3: 'bom',
}

/**
 * Sheet para o caregiver registrar o "resumo do dia" antes de encerrar o turno.
 * Dispara push para os parents/guardians (via edge function send-immediate-push).
 */
export default function ResumoDoDiaSheet({ babyId, babyName, caregiverId, onClose }: Props) {
  useSheetBackClose(true, onClose)
  const { shift, submitResume } = useCaregiverShift(babyId, caregiverId)
  const existingQuickNotes = shift?.quickNotes ?? []

  const [mood, setMood] = useState<number | null>(null)
  const [ateScore, setAteScore] = useState<ShiftScore>(null)
  const [sleptScore, setSleptScore] = useState<ShiftScore>(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showQuickNotes, setShowQuickNotes] = useState(false)

  const handleSubmit = async () => {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    const row = await submitResume({
      moodScore: mood,
      ateScore,
      sleptScore,
      note: note || null,
    })
    if (!row) {
      setSubmitting(false)
      setError('Não foi possível enviar. Tente novamente.')
      return
    }
    hapticSuccess()
    setToast('Resumo enviado!')

    // Dispara push imediato (fire-and-forget, não bloqueia o fluxo se falhar)
    const moodEmoji = MOODS.find((m) => m.value === mood)?.emoji ?? ''
    const chips: string[] = []
    if (ateScore !== null) chips.push(`🍽 ${SCORE_LABEL[ateScore]}`)
    if (sleptScore !== null) chips.push(`😴 ${SCORE_LABEL[sleptScore]}`)
    const preview = note.trim()
      ? note.trim().slice(0, 60) + (note.trim().length > 60 ? '…' : '')
      : chips.length > 0
        ? ''
        : 'Veja mais no app.'
    const bodyParts: string[] = []
    if (moodEmoji) bodyParts.push(moodEmoji)
    if (chips.length > 0) bodyParts.push(chips.join(' · '))
    if (preview) bodyParts.push(preview)
    supabase.functions
      .invoke('send-immediate-push', {
        body: {
          babyId,
          type: 'daily_summary',
          title: `📋 Resumo do dia — ${babyName}`,
          body: bodyParts.join(' '),
          excludeUserId: caregiverId,
        },
      })
      .catch((err) => console.warn('push failed', err))

    setTimeout(() => onClose(), 800)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-container-highest rounded-t-md p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] border-t-2 border-primary-fixed animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">Resumo do dia</h2>
            <p className="font-label text-xs text-on-surface-variant">Como foi com {babyName}?</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="p-1 -m-1 rounded-md active:bg-surface-container"
          >
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Humor */}
        <div className="mb-5">
          <label className="block font-label text-xs text-on-surface-variant mb-2">
            Como foi o dia? <span className="opacity-60">(opcional)</span>
          </label>
          <div className="flex gap-2">
            {MOODS.map((m) => {
              const active = mood === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { hapticLight(); setMood((prev) => (prev === m.value ? null : m.value)) }}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-md transition-colors ${
                    active
                      ? 'bg-primary/15 ring-2 ring-primary'
                      : 'bg-surface-container active:bg-surface-container-high'
                  }`}
                  aria-pressed={active}
                  aria-label={m.label}
                >
                  <span className="text-2xl">{m.emoji}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Comeu bem? */}
        <ScoreQuestion
          label="Comeu bem?"
          value={ateScore}
          onChange={setAteScore}
        />

        {/* Dormiu bem? */}
        <ScoreQuestion
          label="Dormiu bem?"
          value={sleptScore}
          onChange={setSleptScore}
        />

        {/* Quick notes (se houver) */}
        {existingQuickNotes.length > 0 && (
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowQuickNotes((v) => !v)}
              className="w-full flex items-center justify-between p-3 rounded-md bg-surface-container active:bg-surface-container-high"
            >
              <span className="font-label text-xs text-on-surface-variant">
                {existingQuickNotes.length} {existingQuickNotes.length === 1 ? 'nota rápida do dia' : 'notas rápidas do dia'}
              </span>
              <span className={`material-symbols-outlined text-on-surface-variant text-base transition-transform ${showQuickNotes ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>
            {showQuickNotes && (
              <ul className="mt-2 space-y-1">
                {existingQuickNotes.map((qn, i) => (
                  <li key={i} className="font-body text-xs text-on-surface-variant pl-3 border-l border-outline-variant">
                    {qn}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Nota livre */}
        <div className="mb-5">
          <label className="block font-label text-xs text-on-surface-variant mb-1">
            Algo importante? <span className="opacity-60">(opcional)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
            placeholder="Ex: Dormiu pouco à tarde, comeu bem, brincou muito..."
            rows={4}
            className="w-full px-3 py-2.5 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary resize-none"
          />
          <div className="mt-1 text-right font-label text-[10px] text-on-surface-variant/70">
            {note.length}/{NOTE_MAX}
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 rounded-md bg-error/10 border border-error/20">
            <p className="font-label text-xs text-error">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm disabled:opacity-40"
        >
          {submitting ? 'Enviando...' : 'Enviar resumo'}
        </button>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

interface ScoreQuestionProps {
  label: string
  value: ShiftScore
  onChange: (next: ShiftScore) => void
}

// Ordem visual: Ruim → Médio → Bom. value: 1 = ruim, 2 = médio, 3 = bom.
const SCORE_OPTIONS: Array<{ value: 1 | 2 | 3; label: string; activeClass: string }> = [
  {
    value: 1,
    label: 'Ruim',
    activeClass: 'bg-error/15 ring-2 ring-error text-error',
  },
  {
    value: 2,
    label: 'Médio',
    activeClass: 'bg-amber-500/15 ring-2 ring-amber-500 text-amber-600',
  },
  {
    value: 3,
    label: 'Bom',
    activeClass: 'bg-primary/15 ring-2 ring-primary text-primary',
  },
]

function ScoreQuestion({ label, value, onChange }: ScoreQuestionProps) {
  const pick = (v: 1 | 2 | 3) => () => {
    hapticLight()
    // Tap no já-selecionado → desmarca (volta pra null)
    onChange(value === v ? null : v)
  }
  return (
    <div className="mb-5">
      <span className="block font-label text-sm text-on-surface mb-2">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {SCORE_OPTIONS.map((opt) => {
          const active = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={pick(opt.value)}
              aria-pressed={active}
              aria-label={`${label} — ${opt.label}`}
              className={`h-11 rounded-md font-label text-sm font-semibold transition-colors ${
                active
                  ? opt.activeClass
                  : 'bg-surface-container text-on-surface-variant active:bg-surface-container-high'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
