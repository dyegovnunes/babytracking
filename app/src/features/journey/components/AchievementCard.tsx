import type { AchievementDef } from '../achievements'
import { SEALS } from '../seals'

interface Props {
  achievement: AchievementDef
  /** Se já foi desbloqueado; locked mostra silhueta esmaecida + "?". */
  unlocked: boolean
  /** Data ISO do unlock (só mostra se unlocked). */
  unlockedAt?: string | null
  /** Visual compacto pro AchievementSheet (vs regular pra JourneySection). */
  size?: 'compact' | 'regular'
  onTap?: () => void
}

/**
 * Card individual de achievement. Duas variantes visuais:
 *  - **Unlocked**: emoji em destaque, label, data, howTo em tom discreto
 *  - **Locked**: silhueta cinza, "?", "Ainda bloqueado" — SEM revelar howTo
 *    (cria curiosidade, user quer descobrir o que destrava)
 *
 * Selo (🌱 / 🔍 / 🏅) aparece no canto inferior direito indicando categoria.
 */
export default function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
  size = 'regular',
  onTap,
}: Props) {
  const seal = SEALS[achievement.seal]
  const dateLabel = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  const padding = size === 'compact' ? 'p-3' : 'p-4'
  const emojiSize = size === 'compact' ? 'text-3xl' : 'text-4xl'
  const labelSize = size === 'compact' ? 'text-sm' : 'text-base'

  // Container base — usa button se onTap, senão div
  const Comp = onTap ? 'button' : 'div'

  return (
    <Comp
      type={onTap ? 'button' : undefined}
      onClick={onTap}
      className={`relative flex flex-col items-start gap-1.5 rounded-xl bg-surface-container ${padding} w-full text-left transition-colors ${
        onTap ? 'active:bg-surface-container-high' : ''
      } ${!unlocked ? 'opacity-60' : ''}`}
    >
      <span
        className={`${emojiSize} leading-none ${!unlocked ? 'grayscale' : ''}`}
        aria-hidden
      >
        {unlocked ? achievement.emoji : '❔'}
      </span>
      <div className="flex-1 min-w-0 w-full">
        <h4
          className={`font-headline ${labelSize} font-bold text-on-surface leading-tight truncate`}
        >
          {unlocked ? achievement.label : 'Ainda bloqueado'}
        </h4>
        {unlocked ? (
          <p className="font-label text-[11px] text-on-surface-variant/80 mt-0.5 truncate">
            {dateLabel ? `Desbloqueado em ${dateLabel}` : achievement.howTo}
          </p>
        ) : (
          <p className="font-label text-[11px] text-on-surface-variant/50 mt-0.5 truncate">
            Continue explorando
          </p>
        )}
      </div>
      {/* Selo no canto inferior direito */}
      <span
        className="absolute bottom-2 right-2 text-sm opacity-70"
        aria-label={`Categoria ${seal.label}`}
        title={seal.description}
      >
        {seal.emoji}
      </span>
    </Comp>
  )
}
