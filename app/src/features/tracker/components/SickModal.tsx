/**
 * SickModal — registro rápido de sintomas e temperatura.
 * Gera log com eventId='sick_log' e payload SickPayload.
 * Aceita initialLog para modo edição (mesma estrutura do MealModal).
 */

import { useState } from 'react'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight, hapticSuccess } from '../../../lib/haptics'
import type { LogEntry, SickPayload } from '../../../types'

interface Props {
  babyName: string
  initialLog?: LogEntry
  onConfirm: (payload: SickPayload, timestamp?: number) => void
  onDelete?: () => void
  onClose: () => void
}

const SYMPTOMS: { id: string; label: string; emoji: string }[] = [
  { id: 'fever',       label: 'Febre',              emoji: '🌡️' },
  { id: 'cough',       label: 'Tosse',              emoji: '😮‍💨' },
  { id: 'runny_nose',  label: 'Coriza',             emoji: '🤧' },
  { id: 'vomit',       label: 'Vômito',             emoji: '🤢' },
  { id: 'diarrhea',    label: 'Diarreia',           emoji: '💧' },
  { id: 'crying',      label: 'Choro excessivo',    emoji: '😭' },
  { id: 'no_appetite', label: 'Recusa alimentar',   emoji: '🙅' },
  { id: 'rash',        label: 'Erupção na pele',    emoji: '🔴' },
  { id: 'other',       label: 'Outro',              emoji: '❓' },
]

function tsToTimeDate(ts?: number) {
  const d = ts ? new Date(ts) : new Date()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { time, date }
}

export default function SickModal({ babyName, initialLog, onConfirm, onDelete, onClose }: Props) {
  useSheetBackClose(true, onClose)

  const isEdit = !!initialLog
  const initPayload = initialLog?.payload as SickPayload | undefined

  const [tempStr,      setTempStr]      = useState(initPayload?.temp?.toString() ?? '')
  const [symptoms,     setSymptoms]     = useState<string[]>(initPayload?.symptoms ?? [])
  const [note,         setNote]         = useState(initPayload?.note ?? '')
  const [confirmDel,   setConfirmDel]   = useState(false)

  const init = tsToTimeDate(initialLog?.timestamp)
  const [timeVal, setTimeVal] = useState(init.time)
  const [dateVal, setDateVal] = useState(init.date)

  function toggleSymptom(id: string) {
    hapticLight()
    setSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function buildTimestamp() {
    const [h, m] = timeVal.split(':').map(Number)
    const [y, mo, day] = dateVal.split('-').map(Number)
    return new Date(y, mo - 1, day, h, m).getTime()
  }

  function handleConfirm() {
    const temp = tempStr ? parseFloat(tempStr.replace(',', '.')) : undefined
    const payload: SickPayload = {
      temp:     Number.isFinite(temp) ? temp : undefined,
      symptoms: symptoms.length > 0 ? symptoms : undefined,
      note:     note.trim() || undefined,
    }
    hapticSuccess()
    onConfirm(payload, isEdit ? buildTimestamp() : undefined)
  }

  const tempNum = tempStr ? parseFloat(tempStr.replace(',', '.')) : undefined
  const hasFever = Number.isFinite(tempNum) && (tempNum as number) >= 37.8

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md pb-sheet animate-slide-up max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 bg-surface-container-highest z-10 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤒</span>
            <div>
              <h2 className="font-headline text-base font-bold text-on-surface">
                {isEdit ? 'Editar registro' : 'Criança doente'}
              </h2>
              <p className="font-label text-xs text-on-surface-variant">{babyName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 -m-1 rounded-md active:bg-surface-container">
            <span className="material-symbols-outlined text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="px-5 space-y-5 pt-4 pb-4">

          {/* Horário (modo edição) */}
          {isEdit && (
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="font-label text-xs text-on-surface-variant mb-1.5">Data</p>
                <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)}
                  className="w-full px-3 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary min-h-[44px]" />
              </div>
              <div className="flex-1">
                <p className="font-label text-xs text-on-surface-variant mb-1.5">Horário</p>
                <input type="time" value={timeVal} onChange={(e) => setTimeVal(e.target.value)}
                  className="w-full px-3 py-3 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary min-h-[44px]" />
              </div>
            </div>
          )}

          {/* Temperatura */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-1.5">
              Temperatura <span className="text-on-surface-variant/50">(opcional)</span>
            </p>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                min="35"
                max="42"
                value={tempStr}
                onChange={(e) => setTempStr(e.target.value)}
                placeholder="37.0"
                className={`w-full px-3 py-2.5 rounded-md border font-body text-base focus:outline-none pr-10 ${
                  hasFever
                    ? 'bg-error/10 border-error/50 text-on-surface focus:border-error'
                    : 'bg-surface-container border-outline-variant text-on-surface focus:border-primary'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-label text-xs text-on-surface-variant">°C</span>
            </div>
            {hasFever && (
              <p className="font-label text-xs text-error mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                Febre detectada. Verifique com o pediatra.
              </p>
            )}
          </div>

          {/* Sintomas */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-2">Sintomas</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SYMPTOMS.map((s) => {
                const sel = symptoms.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleSymptom(s.id)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-xs font-label text-left transition-colors ${
                      sel
                        ? 'border-primary/50 bg-primary/10 text-on-surface font-medium'
                        : 'border-outline-variant bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    <span className="text-base leading-none w-5 shrink-0 text-center">{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Nota */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-1.5">
              Observação <span className="text-on-surface-variant/50">(opcional)</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: começou a tossir depois do banho..."
              rows={2}
              className="w-full px-3 py-2 rounded-md bg-surface-container border border-outline-variant text-on-surface font-body text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {/* Confirmar */}
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-md bg-primary text-on-primary font-label font-semibold text-sm active:bg-primary/90"
          >
            {isEdit ? 'Salvar alterações' : 'Registrar'}
          </button>

          {/* Excluir (modo edição) */}
          {isEdit && onDelete && (
            confirmDel ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDel(false)}
                  className="flex-1 py-2.5 rounded-md border border-outline-variant text-on-surface-variant font-label text-sm">
                  Cancelar
                </button>
                <button onClick={() => { hapticLight(); onDelete() }}
                  className="flex-1 py-2.5 rounded-md bg-error/15 border border-error/30 text-error font-label text-sm font-semibold">
                  Confirmar exclusão
                </button>
              </div>
            ) : (
              <button onClick={() => { hapticLight(); setConfirmDel(true) }}
                className="w-full py-2.5 rounded-md border border-outline-variant/50 text-on-surface-variant/60 font-label text-sm flex items-center justify-center gap-1.5 active:text-error active:border-error/30">
                <span className="material-symbols-outlined text-base">delete</span>
                Excluir registro
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
