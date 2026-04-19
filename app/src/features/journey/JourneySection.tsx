import { useMemo } from 'react'
import { useAppState } from '../../contexts/AppContext'
import { useAuth } from '../../contexts/AuthContext'
import { ACHIEVEMENTS } from './achievements'
import { SEALS, type SealKey } from './seals'
import { useAchievements } from './useAchievements'
import ActivityHeatmap from './components/ActivityHeatmap'
import AchievementCard from './components/AchievementCard'

const SEAL_ORDER: SealKey[] = ['begin', 'explorer', 'milestone']

/**
 * Seção "Sua jornada" no Profile — casa oficial das conquistas.
 *
 * Diferença pro AchievementSheet:
 *   - Sheet é atalho rápido aberto pelo JourneyBadge (modal bottom)
 *   - Esta seção vive dentro do Profile, sempre visível quando usuário
 *     desce a tela. Não marca seen_at automático (é consulta, não fila)
 *
 * Layout:
 *   - Header: título sóbrio + 3 contadores grandes (Dias app · Total
 *     registros · Marcos conquistados)
 *   - ActivityHeatmap 90 dias binário
 *   - Lista completa de achievements agrupada por selo, unlocked no
 *     topo de cada grupo
 */
export default function JourneySection() {
  const { user } = useAuth()
  const { baby, logs } = useAppState()
  const { rows, unlockedKeys } = useAchievements()

  const daysInApp = useMemo(() => {
    if (!user) return 0
    const createdAt = user.created_at ? new Date(user.created_at) : new Date()
    return Math.max(
      1,
      Math.floor((Date.now() - createdAt.getTime()) / 86400000),
    )
  }, [user])

  const totalLogs = logs.length
  const totalUnlocked = unlockedKeys.size

  const unlockedByKey = useMemo(() => {
    const map = new Map<string, { unlockedAt: string }>()
    for (const r of rows) {
      map.set(r.achievementKey, { unlockedAt: r.unlockedAt })
    }
    return map
  }, [rows])

  if (!baby) return null

  return (
    <section className="px-5 pt-2 pb-6">
      <h2 className="font-headline text-lg font-bold text-on-surface mb-1">
        Sua jornada
      </h2>
      <p className="font-label text-xs text-on-surface-variant mb-4">
        O que você construiu com {baby.name}
      </p>

      {/* Contadores */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-md bg-surface-container p-3 text-center">
          <div className="font-headline text-2xl font-extrabold text-on-surface leading-none tracking-tight">
            {daysInApp}
          </div>
          <div className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mt-1">
            dias no app
          </div>
        </div>
        <div className="rounded-md bg-surface-container p-3 text-center">
          <div className="font-headline text-2xl font-extrabold text-on-surface leading-none tracking-tight">
            {totalLogs}
          </div>
          <div className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mt-1">
            registros
          </div>
        </div>
        <div className="rounded-md bg-surface-container p-3 text-center">
          <div className="font-headline text-2xl font-extrabold text-on-surface leading-none tracking-tight">
            {totalUnlocked}
            <span className="font-label text-sm font-normal text-on-surface-variant">
              /{ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="font-label text-[10px] uppercase tracking-wider text-on-surface-variant mt-1">
            marcos
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="rounded-md bg-surface-container p-4 mb-4">
        <p className="font-label text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant mb-3">
          Últimos 90 dias
        </p>
        <ActivityHeatmap logs={logs} days={90} />
      </div>

      {/* Lista por selo */}
      {SEAL_ORDER.map((sealKey) => {
        const seal = SEALS[sealKey]
        const achievements = ACHIEVEMENTS.filter((a) => a.seal === sealKey)
        // Unlocked primeiro, preservando a ordem do registry
        const sorted = [...achievements].sort((a, b) => {
          const aU = unlockedKeys.has(a.key) ? 0 : 1
          const bU = unlockedKeys.has(b.key) ? 0 : 1
          return aU - bU
        })
        return (
          <section key={sealKey} className="mb-4">
            <h3 className="font-label text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
              <span>{seal.emoji}</span>
              <span>{seal.label}</span>
              <span className="text-on-surface-variant/50 ml-1">
                ({achievements.filter((a) => unlockedKeys.has(a.key)).length}/
                {achievements.length})
              </span>
            </h3>
            <div className="space-y-2">
              {sorted.map((a) => (
                <AchievementCard
                  key={a.key}
                  achievement={a}
                  unlocked={unlockedKeys.has(a.key)}
                  unlockedAt={unlockedByKey.get(a.key)?.unlockedAt}
                />
              ))}
            </div>
          </section>
        )
      })}
    </section>
  )
}
