import { useEffect, useState, useCallback, useRef } from 'react'
import { useAchievements, type AchievementRow } from './useAchievements'
import { getAchievement, type AchievementDef } from './achievements'
import Toast from '../../components/ui/Toast'
import { hapticSuccess } from '../../lib/haptics'

const LS_KEY = 'yaya_celebrated_achievements'

/**
 * Lê/escreve o set de achievement ids já celebrados (localStorage).
 * Usado pra garantir que a celebração só aparece UMA VEZ por achievement,
 * mesmo que o user recarregue a página depois de destravar.
 *
 * Trade-off: multi-device não sincroniza. Se user destrava no celular
 * e depois abre no tablet, pode ver a mesma celebração de novo. Pra
 * jornada-v1 é aceitável — a grande maioria usa 1 device.
 */
function readCelebrated(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed as string[])
  } catch {
    return new Set()
  }
}

function writeCelebrated(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    /* ignora — se localStorage falhar, na pior das hipóteses a
       celebração volta a aparecer uma vez. Não trava a UX. */
  }
}

export interface CelebrationItem {
  row: AchievementRow
  def: AchievementDef
}

/**
 * Detecta achievements destravados que ainda não foram celebrados
 * visualmente e entrega **um por vez** pro consumer renderizar.
 *
 * Uso:
 * ```tsx
 * const { current, next } = useCelebrationQueue()
 * if (current) return <CelebrationFor item={current} onClose={next} />
 * ```
 *
 * `next()` marca o atual como celebrado (localStorage) e avança pro
 * próximo da fila, se houver. Se não tem próximo, current fica null.
 *
 * **Priority**: big > medium > micro. Dentro do mesmo nível, mais
 * antigo primeiro (ordem de unlock).
 */
export function useCelebrationQueue() {
  const { rows } = useAchievements()
  const [currentId, setCurrentId] = useState<string | null>(null)
  // `tick` força re-avaliação da fila depois de processar um micro
  // (que marca como celebrado mas não muda rows nem currentId).
  const [tick, setTick] = useState(0)
  const celebratedRef = useRef<Set<string>>(readCelebrated())

  // Ordena achievements que ainda não foram celebrados por prioridade
  // de celebração (big → medium → micro) e por data de unlock (asc).
  const buildQueue = useCallback((): CelebrationItem[] => {
    const levelWeight: Record<string, number> = { big: 0, medium: 1, micro: 2 }
    const items: CelebrationItem[] = []
    for (const row of rows) {
      if (celebratedRef.current.has(row.id)) continue
      const def = getAchievement(row.achievementKey)
      if (!def) continue
      items.push({ row, def })
    }
    items.sort((a, b) => {
      const byLevel =
        levelWeight[a.def.celebration] - levelWeight[b.def.celebration]
      if (byLevel !== 0) return byLevel
      return a.row.unlockedAt.localeCompare(b.row.unlockedAt)
    })
    return items
  }, [rows])

  // Processa a fila quando: rows mudam, current fecha, ou tick avança
  // (micro consumido sem alterar rows/currentId).
  useEffect(() => {
    if (currentId !== null) return
    const queue = buildQueue()
    if (queue.length === 0) return
    const first = queue[0]
    if (first.def.celebration === 'micro') {
      showMicroToast(first)
      celebratedRef.current.add(first.row.id)
      writeCelebrated(celebratedRef.current)
      // Força re-avaliação pra pegar próximo item (se houver mais micros
      // ou se um medium/big virou o topo após este micro)
      setTick((t) => t + 1)
      return
    }
    setCurrentId(first.row.id)
  }, [rows, currentId, buildQueue, tick])

  const current: CelebrationItem | null = currentId
    ? (() => {
        const row = rows.find((r) => r.id === currentId)
        if (!row) return null
        const def = getAchievement(row.achievementKey)
        if (!def) return null
        return { row, def }
      })()
    : null

  const next = useCallback(() => {
    if (currentId) {
      celebratedRef.current.add(currentId)
      writeCelebrated(celebratedRef.current)
    }
    setCurrentId(null)
    // próximo item é pego pelo useEffect quando currentId vira null
  }, [currentId])

  return { current, next }
}

/**
 * Toast micro — feedback discreto pra achievements de nível `micro`.
 * Não abre modal, só chama window.dispatchEvent pra ser consumido por
 * um <MicroToastHost /> global no AppShell.
 *
 * Por enquanto, renderização micro é via evento custom — o host pega
 * a mensagem e renderiza o Toast existente por 3s.
 */
function showMicroToast(item: CelebrationItem) {
  hapticSuccess()
  const message = `${item.def.emoji} ${item.def.label}`
  window.dispatchEvent(
    new CustomEvent<{ message: string }>('yaya:micro-toast', {
      detail: { message },
    }),
  )
}

// Avoid linter unused warning — re-export Toast for callers that want
// to embed the micro toast host directly
export { Toast }
