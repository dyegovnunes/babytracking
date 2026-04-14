import { hapticLight } from '../../lib/haptics'
import type { Milestone } from '../../lib/milestoneData'

interface Props {
  milestone: Milestone
  babyName: string
  babyGender?: 'boy' | 'girl'
  onRegister: (milestone: Milestone) => void
  onDismiss: (milestone: Milestone) => void
  onOpenAll?: () => void
}

export default function MilestoneHomeCard({
  milestone,
  babyName,
  babyGender,
  onRegister,
  onDismiss,
  onOpenAll,
}: Props) {
  const article = babyGender === 'boy' ? 'o' : babyGender === 'girl' ? 'a' : ''

  return (
    <div className="bg-surface-container rounded-2xl p-5 border border-tertiary/15 page-enter">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-tertiary/12 flex items-center justify-center text-2xl">
            🎯
          </div>
          <span className="font-headline text-sm font-bold text-tertiary">
            Marcos desta fase
          </span>
        </div>
        {onOpenAll && (
          <button
            type="button"
            onClick={() => {
              hapticLight()
              onOpenAll()
            }}
            className="text-on-surface-variant/70 font-label text-[11px] underline underline-offset-2"
          >
            Ver todos
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl leading-none mt-0.5">{milestone.emoji}</span>
        <div className="min-w-0 flex-1">
          <h4 className="font-headline text-sm font-bold text-on-surface mb-1">
            {milestone.name}
          </h4>
          <p className="font-label text-xs text-on-surface-variant leading-relaxed">
            {milestone.description}
          </p>
        </div>
      </div>

      <p className="font-label text-sm text-on-surface leading-relaxed mb-4">
        {article && (
          <span className="text-primary font-semibold">
            {article} {babyName}
          </span>
        )}
        {article ? ' já fez isso?' : `${babyName} já fez isso?`}
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            hapticLight()
            onRegister(milestone)
          }}
          className="bg-tertiary text-surface font-label text-sm font-bold py-2.5 px-5 rounded-xl active:scale-95 transition-transform"
        >
          Sim, registrar!
        </button>
        <button
          type="button"
          onClick={() => {
            hapticLight()
            onDismiss(milestone)
          }}
          className="text-on-surface-variant font-label text-xs underline underline-offset-2"
        >
          Ainda não
        </button>
      </div>
    </div>
  )
}
