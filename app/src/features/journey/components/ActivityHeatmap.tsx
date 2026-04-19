import { useMemo } from 'react'
import type { LogEntry } from '../../../types'

interface Props {
  logs: LogEntry[]
  /** Quantos dias mostrar (default 90 — ~12 semanas). */
  days?: number
}

/**
 * Heatmap binário estilo GitHub — célula colorida = dia teve ≥1 registro,
 * célula cinza = sem registro. 7 linhas × ~13 colunas. Layout vertical:
 * cada coluna é uma semana, cada linha é um dia da semana.
 *
 * Escolhi binário em vez de "intensidade por volume" pra evitar pressão
 * (user não sente ansiedade por ter um dia com "pouco" registro) —
 * basta ter algum cuidado pro dia "contar".
 */
export default function ActivityHeatmap({ logs, days = 90 }: Props) {
  // Para cada dia nos últimos `days`, conta se tem log
  const activeDays = useMemo(() => {
    const set = new Set<string>()
    for (const l of logs) {
      const d = new Date(l.timestamp)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      set.add(key)
    }
    return set
  }, [logs])

  // Grid: calcula a partir de hoje pra trás, agrupando por semana.
  // Primeira coluna = semana mais antiga. Última = semana atual.
  const columns = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - days + 1)
    // Alinha começo pra segunda-feira
    const dow = (start.getDay() + 6) % 7 // 0=seg, 6=dom
    start.setDate(start.getDate() - dow)

    const cols: Array<Array<{ date: Date; active: boolean }>> = []
    let cur = new Date(start)
    while (cur <= now) {
      const week: Array<{ date: Date; active: boolean }> = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(cur)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        week.push({
          date: d,
          active: activeDays.has(key) && d <= now,
        })
        cur.setDate(cur.getDate() + 1)
      }
      cols.push(week)
    }
    return cols
  }, [activeDays, days])

  return (
    <div className="flex gap-[3px]" role="img" aria-label="Heatmap de consistência dos últimos 90 dias">
      {columns.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((cell, di) => (
            <div
              key={di}
              className={`w-[10px] h-[10px] rounded-[2px] ${
                cell.active ? 'bg-primary/80' : 'bg-outline-variant/20'
              }`}
              title={cell.date.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
              })}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
