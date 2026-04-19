import { useMemo } from 'react'
import { ACHIEVEMENTS, type AchievementDef } from '../achievements'
import { SEALS, type SealKey } from '../seals'
import { useAchievements } from '../useAchievements'
import { useSheetBackClose } from '../../../hooks/useSheetBackClose'
import { hapticLight } from '../../../lib/haptics'
import AchievementCard from './AchievementCard'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const SEAL_ORDER: SealKey[] = ['begin', 'explorer', 'milestone']

/**
 * Bottom sheet listando todos os 16 achievements, agrupados pelos 3 selos.
 *
 * Comportamento:
 *  - Header: 3 contadores (N conquistados / 16 total / % explorado)
 *  - Seção "Recentes" no topo com achievements unseen (seen_at=null)
 *    — tap marca como seen, some da lista
 *  - Abaixo, 3 blocos (🌱 Começo · 🔍 Explorador · 🏅 Marco) com cards
 *  - Locked cards aparecem esmaecidos, sem revelar howTo
 *
 * Fechamento: back button Android → useSheetBackClose
 */
export default function AchievementSheet({ isOpen, onClose }: Props) {
  useSheetBackClose(isOpen, onClose)
  const { rows, unlockedKeys, markSeen } = useAchievements()

  const unlockedByKey = useMemo(() => {
    const map = new Map<string, { unlockedAt: string; seenAt: string | null }>()
    for (const r of rows) {
      map.set(r.achievementKey, { unlockedAt: r.unlockedAt, seenAt: r.seenAt })
    }
    return map
  }, [rows])

  const recent = useMemo(
    () =>
      rows
        .filter((r) => r.seenAt === null)
        .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
        .slice(0, 5),
    [rows],
  )

  const recentDefs: AchievementDef[] = useMemo(
    () =>
      recent
        .map((r) => ACHIEVEMENTS.find((a) => a.key === r.achievementKey))
        .filter((a): a is AchievementDef => a !== undefined),
    [recent],
  )

  const totalUnlocked = unlockedKeys.size
  const totalAll = ACHIEVEMENTS.length
  const pct = Math.round((totalUnlocked / totalAll) * 100)

  if (!isOpen) return null

  const handleCardTap = (achievement: AchievementDef) => {
    hapticLight()
    if (unlockedKeys.has(achievement.key)) {
      // Marca como seen se ainda não foi
      const entry = unlockedByKey.get(achievement.key)
      if (entry?.seenAt === null) {
        // baby_id atual pode ser NULL pra user-scope ou UUID pra baby-scope.
        // Como não temos aqui (achievement sheet é global), passamos null —
        // o mark_achievement_seen lida com o match de achievement_key apenas
        // quando baby_id é null. Pra baby-scope, edge case: marcaria só o de
        // baby_id null, que não existe. TODO em v2: passar baby atual.
        markSeen(achievement.key, null)
      }
    }
    // locked: haptic + nada (curiosidade preservada)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Suas conquistas"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-surface-container-highest rounded-t-md pb-[calc(1rem+env(safe-area-inset-bottom))] border-t-2 border-primary-fixed animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-container-highest z-10 px-5 pt-5 pb-3 border-b border-outline-variant/10">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-headline text-lg font-bold text-on-surface">
              Sua jornada
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-8 h-8 rounded-full flex items-center justify-center active:bg-surface-container"
            >
              <span className="material-symbols-outlined text-on-surface-variant text-xl">
                close
              </span>
            </button>
          </div>
          <p className="font-label text-xs text-on-surface-variant">
            <span className="font-bold text-on-surface">{totalUnlocked}</span>{' '}
            de {totalAll} marcos conquistados · {pct}% explorado
          </p>
        </div>

        {/* Recentes (só mostra se tem unseen) */}
        {recentDefs.length > 0 && (
          <section className="px-5 pt-4">
            <h3 className="font-label text-[11px] font-bold uppercase tracking-wider text-tertiary mb-2">
              ✨ Recém desbloqueados
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {recentDefs.map((a) => (
                <AchievementCard
                  key={a.key}
                  achievement={a}
                  unlocked
                  unlockedAt={unlockedByKey.get(a.key)?.unlockedAt}
                  size="compact"
                  onTap={() => handleCardTap(a)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Blocos por selo */}
        {SEAL_ORDER.map((sealKey) => {
          const seal = SEALS[sealKey]
          const achievements = ACHIEVEMENTS.filter((a) => a.seal === sealKey)
          return (
            <section key={sealKey} className="px-5 pt-4">
              <h3 className="font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
                <span>{seal.emoji}</span>
                <span>{seal.label}</span>
                <span className="text-on-surface-variant/50 ml-1">
                  ({
                    achievements.filter((a) => unlockedKeys.has(a.key)).length
                  }/{achievements.length})
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {achievements.map((a) => (
                  <AchievementCard
                    key={a.key}
                    achievement={a}
                    unlocked={unlockedKeys.has(a.key)}
                    unlockedAt={unlockedByKey.get(a.key)?.unlockedAt}
                    size="compact"
                    onTap={() => handleCardTap(a)}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
