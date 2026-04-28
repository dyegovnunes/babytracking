/**
 * PottyPanel — acompanhamento do desfralde.
 * Aparece quando o bebê tem potty_pee ou potty_poop no grid (requer >= 18m).
 * Mostra totais de hoje + histórico de 7 dias em mini gráfico de barras.
 */

import { useState, useMemo } from 'react'
import { hapticLight } from '../../../lib/haptics'
import type { LogEntry, EventType } from '../../../types'

interface Props {
  logs: LogEntry[]
  ageDays: number
  gridEvents: EventType[]
}

function localDateKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function PottyPanel({ logs, ageDays, gridEvents }: Props) {
  const [expanded, setExpanded] = useState(false)

  const hasPottyInGrid = useMemo(
    () => gridEvents.some((e) => e.id === 'potty_pee' || e.id === 'potty_poop'),
    [gridEvents],
  )

  const stats = useMemo(() => {
    const todayKey = localDateKey(Date.now())
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const pottyLogs = logs.filter(
      (l) => (l.eventId === 'potty_pee' || l.eventId === 'potty_poop') && l.timestamp >= sevenDaysAgo,
    )

    const peeToday  = pottyLogs.filter((l) => l.eventId === 'potty_pee'  && localDateKey(l.timestamp) === todayKey).length
    const poopToday = pottyLogs.filter((l) => l.eventId === 'potty_poop' && localDateKey(l.timestamp) === todayKey).length

    // Build 7-day history (oldest → today)
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key = localDateKey(d.getTime())
      const pee  = pottyLogs.filter((l) => l.eventId === 'potty_pee'  && localDateKey(l.timestamp) === key).length
      const poop = pottyLogs.filter((l) => l.eventId === 'potty_poop' && localDateKey(l.timestamp) === key).length
      return { key, label: i === 6 ? 'Hoje' : DAY_LABELS[d.getDay()], pee, poop, total: pee + poop }
    })

    const weekTotal   = pottyLogs.length
    const successDays = days.filter((d) => d.total > 0).length

    return { peeToday, poopToday, days, weekTotal, successDays }
  }, [logs])

  // Só renderiza com dados e quando os eventos estão no grid
  if (ageDays < 540 || !hasPottyInGrid) return null
  if (stats.weekTotal === 0 && stats.peeToday === 0 && stats.poopToday === 0) return null

  const maxBar = Math.max(...stats.days.map((d) => d.total), 1)

  return (
    <div className="mx-5 mt-4">
      <button
        onClick={() => { hapticLight(); setExpanded((v) => !v) }}
        className="w-full flex items-center justify-between px-4 py-3 rounded-md bg-surface-container active:bg-surface-container-high transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🚽</span>
          <div className="text-left">
            <p className="font-label text-sm font-semibold text-on-surface">Desfralde</p>
            <p className="font-label text-xs text-on-surface-variant">
              Hoje: {stats.peeToday} xixi · {stats.poopToday} cocô
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-label text-xs text-primary font-semibold">
            {stats.successDays}/7 dias
          </span>
          <span className="material-symbols-outlined text-on-surface-variant text-base">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-1 px-4 py-3 bg-surface-container rounded-md space-y-4">

          {/* Mini gráfico de barras — 7 dias */}
          <div>
            <p className="font-label text-xs text-on-surface-variant mb-2">Últimos 7 dias</p>
            <div className="flex items-end justify-between gap-1 h-14">
              {stats.days.map((d) => {
                const heightPx = d.total === 0 ? 4 : Math.max(8, Math.round((d.total / maxBar) * 48))
                return (
                  <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-sm ${d.total > 0 ? 'bg-primary/40' : 'bg-outline-variant/20'}`}
                      style={{ height: `${heightPx}px` }}
                    />
                    <span className="font-label text-[10px] text-on-surface-variant/70 leading-none">
                      {d.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Resumo numérico */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-container-high rounded-md px-3 py-2.5">
              <p className="font-label text-[10px] text-on-surface-variant">Esta semana</p>
              <p className="font-headline text-2xl font-bold text-on-surface leading-tight">{stats.weekTotal}</p>
              <p className="font-label text-[10px] text-on-surface-variant">registros no penico</p>
            </div>
            <div className="bg-surface-container-high rounded-md px-3 py-2.5">
              <p className="font-label text-[10px] text-on-surface-variant">Dias com sucesso</p>
              <p className="font-headline text-2xl font-bold text-primary leading-tight">{stats.successDays}</p>
              <p className="font-label text-[10px] text-on-surface-variant">dos últimos 7 dias</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
