import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BabyMilestone, Milestone } from '../../milestones/milestoneData'
import { MILESTONES } from '../../milestones/milestoneData'
import { hapticLight, hapticMedium } from '../../../lib/haptics'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'

interface Props {
  milestone: BabyMilestone
  onClose: () => void
  /** Desmarcar o marco (chama useMilestones.quickToggle no consumer). */
  onRemove: () => Promise<void>
}

/**
 * Sheet leve pro toque em marco na timeline. Ações rápidas:
 * ver detalhes (vai pra /marcos) ou remover.
 */
export default function MilestoneTimelineSheet({ milestone, onClose, onRemove }: Props) {
  useSheetBackClose(true, onClose)

  const ref: Milestone | undefined = MILESTONES.find((m) => m.code === milestone.milestoneCode)
  const [removing, setRemoving] = useState(false)
  const navigate = useNavigate()

  const handleOpenDetails = () => {
    hapticLight()
    navigate(`/marcos?edit=${encodeURIComponent(milestone.milestoneCode)}`)
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
          <div className="w-14 h-14 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-3xl leading-none">{ref?.emoji ?? '🎉'}</span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-label text-[10px] font-bold uppercase tracking-wider text-primary">
              MARCO
            </p>
            <h3 className="font-headline text-lg font-bold text-on-surface leading-tight mt-0.5">
              {ref ? ref.name : milestone.milestoneCode}
            </h3>
            {ref && (
              <p className="font-body text-xs text-on-surface-variant mt-0.5">
                {ref.description}
              </p>
            )}
          </div>
        </div>

        {milestone.achievedAt && (
          <p className="font-label text-xs text-on-surface-variant mb-4">
            Atingido em {new Date(milestone.achievedAt).toLocaleDateString('pt-BR')}
          </p>
        )}

        {milestone.note && (
          <div className="mb-4 p-3 rounded-md bg-primary/5 border border-primary/15">
            <p className="font-body text-xs text-on-surface italic">"{milestone.note}"</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleOpenDetails}
          className="w-full py-3.5 rounded-md bg-primary text-on-primary font-label font-bold text-sm mb-2 active:opacity-90 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">edit</span>
          Ver detalhes no diário
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
