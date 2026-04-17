import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BabyVaccine, Vaccine } from '../../vaccines/vaccineData'
import { VACCINES } from '../../vaccines/vaccineData'
import { hapticLight, hapticMedium } from '../../../lib/haptics'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  vaccine: BabyVaccine
  onClose: () => void
  /** Desmarcar a vacina (chama useVaccines.quickToggle no consumer). */
  onRemove: () => Promise<void>
}

/**
 * Sheet leve que abre ao tocar numa vacina na timeline. Mostra contexto
 * rápido (nome, dose, data) e duas ações de 1 clique: ver detalhes na
 * caderneta ou remover o registro.
 *
 * Não duplica a lógica do VaccineDetailSheet (que é da feature inteira)
 * — essa sheet é só um "menu rápido" pra ações comuns.
 */
export default function VaccineTimelineSheet({ vaccine, onClose, onRemove }: Props) {
  useSheetBackClose(true, onClose)

  const ref: Vaccine | undefined = VACCINES.find((v) => v.code === vaccine.vaccineCode)
  const [removing, setRemoving] = useState(false)
  const navigate = useNavigate()

  const handleOpenDetails = () => {
    hapticLight()
    navigate(`/vacinas?edit=${encodeURIComponent(vaccine.vaccineCode)}`)
    onClose()
  }

  const handleRemove = async () => {
    hapticMedium()
    setRemoving(true)
    try {
      await onRemove()
    } finally {
      setRemoving(false)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-md bg-surface-container-highest p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-on-surface-variant/30 mx-auto mb-4" />

        <div className="flex items-start gap-3 mb-4">
          <div className="w-14 h-14 rounded-md bg-blue-500/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-blue-400 text-2xl">vaccines</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-blue-400">
              VACINA
            </p>
            <h3 className="font-headline text-lg font-bold text-on-surface leading-tight mt-0.5">
              {ref ? ref.name : vaccine.vaccineCode}
            </h3>
            {ref && (
              <p className="font-body text-xs text-on-surface-variant mt-0.5">
                {ref.doseLabel} · {ref.protectsAgainst}
              </p>
            )}
          </div>
        </div>

        {vaccine.appliedAt && (
          <p className="font-label text-xs text-on-surface-variant mb-4">
            Aplicada em {new Date(vaccine.appliedAt).toLocaleDateString('pt-BR')}
            {vaccine.location && ` · ${vaccine.location}`}
          </p>
        )}

        <button
          type="button"
          onClick={handleOpenDetails}
          className="w-full py-3.5 rounded-md bg-primary text-on-primary font-label font-bold text-sm mb-2 active:opacity-90 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">edit</span>
          Ver detalhes na caderneta
        </button>

        <button
          type="button"
          onClick={handleRemove}
          disabled={removing}
          className="w-full py-3 rounded-md text-error font-label text-sm font-semibold active:text-error/70 disabled:opacity-50"
        >
          {removing ? 'Removendo...' : 'Remover este registro'}
        </button>
      </div>
    </div>
  )
}
