/**
 * AllergenPanel — banner simples de janela de segurança.
 * Aparece nos 3 dias após introdução de um novo alérgeno.
 * Some automaticamente após 3 dias — sem expansão, sem grid.
 */

import { useMemo } from 'react'
import type { LogEntry, MealPayload } from '../../../types'

interface Props {
  logs: LogEntry[]
  ageDays: number
}

export default function AllergenPanel({ logs, ageDays }: Props) {
  const windowInfo = useMemo(() => {
    if (ageDays < 180) return null

    const mealLogs = logs
      .filter((l) => {
        const p = l.payload as MealPayload | undefined
        return l.eventId === 'meal' && p?.isNewFood && p?.allergenKey
      })
      .sort((a, b) => b.timestamp - a.timestamp)

    if (mealLogs.length === 0) return null

    const last = mealLogs[0]
    const daysSince = Math.floor((Date.now() - last.timestamp) / (1000 * 60 * 60 * 24))
    if (daysSince >= 3) return null

    const daysLeft = 3 - daysSince
    return { daysLeft }
  }, [logs, ageDays])

  if (!windowInfo) return null

  return (
    <div className="mx-5 mt-3 flex items-start gap-3 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-md">
      <span className="text-base leading-none mt-0.5">⚠️</span>
      <div>
        <p className="font-label text-sm font-semibold text-amber-400">Janela de segurança ativa</p>
        <p className="font-label text-xs text-on-surface-variant mt-0.5">
          Aguarde mais {windowInfo.daysLeft} dia{windowInfo.daysLeft !== 1 ? 's' : ''} antes de
          introduzir outro alimento novo.
        </p>
      </div>
    </div>
  )
}
