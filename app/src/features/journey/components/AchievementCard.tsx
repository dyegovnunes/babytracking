import type { AchievementDef } from '../achievements'
import { SEALS } from '../seals'

interface Props {
  achievement: AchievementDef
  /** Se já foi desbloqueado; locked mostra versão esmaecida + howTo. */
  unlocked: boolean
  /** Data ISO do unlock (só mostra se unlocked). */
  unlockedAt?: string | null
  onTap?: () => void
}

/**
 * Card de achievement em layout horizontal compacto.
 *
 * **Unlocked**: emoji em destaque à esquerda, label + data à direita.
 * **Locked**: versão esmaecida com emoji cinza e `howTo` mostrando o
 * caminho pra destravar (clareza > curiosidade — user feedback V1 foi
 * que "ainda bloqueado" sem contexto gerava dúvida "preciso fazer algo?").
 *
 * Radius `rounded-md` (6px) segue o padrão do app — não é botão.
 * Selo da camada aparece discreto no canto inferior direito.
 */
export default function AchievementCard({
  achievement,
  unlocked,
  unlockedAt,
  onTap,
}: Props) {
  const seal = SEALS[achievement.seal]
  const dateLabel = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      })
    : null

  const Comp = onTap ? 'button' : 'div'

  return (
    <Comp
      type={onTap ? 'button' : undefined}
      onClick={onTap}
      className={`relative flex items-center gap-3 rounded-md bg-surface-container p-3 w-full text-left transition-colors ${
        onTap ? 'active:bg-surface-container-high' : ''
      } ${!unlocked ? 'opacity-60' : ''}`}
    >
      {/* Emoji */}
      <div
        className={`shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-2xl leading-none ${
          unlocked ? 'bg-surface-container-high' : 'bg-surface-container-high/40'
        } ${!unlocked ? 'grayscale' : ''}`}
        aria-hidden
      >
        {unlocked ? achievement.emoji : '🔒'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4
          className={`font-headline text-sm font-bold leading-tight truncate ${
            unlocked ? 'text-on-surface' : 'text-on-surface-variant'
          }`}
        >
          {achievement.label}
        </h4>
        <p className="font-label text-[11px] leading-snug mt-0.5 text-on-surface-variant/70 line-clamp-2">
          {unlocked
            ? dateLabel
              ? `Desbloqueado em ${dateLabel}`
              : achievement.description
            : achievement.howTo}
        </p>
      </div>

      {/* Selo (canto inferior direito, discreto) */}
      <span
        className="absolute bottom-1.5 right-2 text-[11px] opacity-50"
        aria-label={`Categoria ${seal.label}`}
        title={seal.description}
      >
        {seal.emoji}
      </span>
    </Comp>
  )
}
