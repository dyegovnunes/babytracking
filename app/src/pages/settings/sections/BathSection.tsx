import { useState } from 'react'
import { useBathHours } from '../useBathHours'
import { MAX_BATH_HOURS } from '../constants'
import { padH } from '../utils'

interface Props {
  onOpenPicker: () => void
  onToast: (msg: string) => void
}

export default function BathSection({ onOpenPicker, onToast }: Props) {
  const { bathHours, removeBathHour, renameBathHour } = useBathHours()
  const [editingIdx, setEditingIdx] = useState<number | null>(null)

  return (
    <section>
      <div className="bg-surface-container rounded-md p-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="material-symbols-outlined text-primary text-lg">bathtub</span>
          <div className="flex-1">
            <h2 className="font-headline text-sm font-bold text-on-surface">Banho</h2>
            <p className="font-label text-[11px] text-on-surface-variant">
              Aviso 15 min antes · máx. {MAX_BATH_HOURS} horários
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {[...bathHours]
            .sort((a, b) => a - b)
            .map((h, idx) => (
              <div
                key={h}
                className="flex items-center gap-1 bg-surface-container-low rounded-md pl-1 pr-1 py-1"
              >
                {editingIdx === idx ? (
                  <input
                    type="time"
                    autoFocus
                    defaultValue={padH(h)}
                    onBlur={async (e) => {
                      const newH = parseInt(e.target.value.split(':')[0], 10)
                      setEditingIdx(null)
                      if (isNaN(newH)) return
                      const res = await renameBathHour(h, newH)
                      if (res === 'duplicate') onToast('Horário já existe')
                      else if (res === 'error') onToast('Erro ao salvar')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    }}
                    className="w-20 bg-transparent text-on-surface font-headline text-sm font-bold text-center outline-none"
                  />
                ) : (
                  <button
                    onClick={() => setEditingIdx(idx)}
                    className="px-2.5 py-1.5 rounded-md active:bg-surface-container-high min-h-[36px]"
                  >
                    <span className="font-headline text-sm text-on-surface font-bold">
                      {padH(h)}
                    </span>
                  </button>
                )}
                {bathHours.length > 1 && (
                  <button
                    onClick={async () => {
                      const ok = await removeBathHour(h)
                      if (ok) onToast('Horário removido!')
                    }}
                    className="w-7 h-7 rounded-full flex items-center justify-center active:bg-error/10"
                  >
                    <span className="material-symbols-outlined text-error/60 text-sm">
                      close
                    </span>
                  </button>
                )}
              </div>
            ))}

          {bathHours.length < MAX_BATH_HOURS && (
            <button
              onClick={() => {
                if (bathHours.length >= MAX_BATH_HOURS) {
                  onToast(`Máximo de ${MAX_BATH_HOURS} horários`)
                  return
                }
                onOpenPicker()
              }}
              className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center active:bg-primary/20"
            >
              <span className="material-symbols-outlined text-primary text-lg">add</span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
