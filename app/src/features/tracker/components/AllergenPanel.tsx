/**
 * AllergenPanel — banner de janela de segurança de 3 dias após novo alérgeno.
 * - Mostra qual alérgeno foi introduzido e quantos dias restam.
 * - Não reabre janela se o mesmo alérgeno já foi introduzido com segurança antes.
 * - Some automaticamente após 3 dias.
 */

import { useMemo } from 'react'
import type { LogEntry, MealPayload } from '../../../types'

interface Props {
  logs: LogEntry[]
  ageDays: number
}

const ALLERGEN_LABEL: Record<string, string> = {
  leite_vaca:  'Leite de vaca',
  ovo:         'Ovo',
  amendoim:    'Amendoim',
  trigo:       'Trigo/Glúten',
  soja:        'Soja',
  oleaginosas: 'Oleaginosas',
  peixe:       'Peixe',
  frutos_mar:  'Frutos do mar',
}

export default function AllergenPanel({ logs, ageDays }: Props) {
  const windowInfo = useMemo(() => {
    if (ageDays < 180) return null

    // Todos os logs de refeição com alérgeno marcado, do mais recente ao mais antigo
    const allergenLogs = logs
      .filter((l) => {
        const p = l.payload as MealPayload | undefined
        return l.eventId === 'meal' && p?.isNewFood && p?.allergenKey
      })
      .sort((a, b) => b.timestamp - a.timestamp)

    if (allergenLogs.length === 0) return null

    const last = allergenLogs[0]
    const lastPayload = last.payload as MealPayload
    const allergenKey = lastPayload.allergenKey!
    const daysSince = Math.floor((Date.now() - last.timestamp) / (1000 * 60 * 60 * 24))

    if (daysSince >= 3) return null

    // Não reabrir janela se este alérgeno já foi introduzido com segurança anteriormente
    const previousSafeIntro = allergenLogs.find((l) => {
      if (l.id === last.id) return false
      const p = l.payload as MealPayload
      if (p.allergenKey !== allergenKey) return false
      const daysAgo = Math.floor((Date.now() - l.timestamp) / (1000 * 60 * 60 * 24))
      return daysAgo >= 3 // já passou a janela de segurança → alérgeno conhecido e seguro
    })
    if (previousSafeIntro) return null

    return {
      daysLeft: 3 - daysSince,
      allergenName: ALLERGEN_LABEL[allergenKey] ?? allergenKey,
    }
  }, [logs, ageDays])

  if (!windowInfo) return null

  return (
    <div className="mx-5 mt-3 flex items-start gap-3 px-4 py-3 bg-amber-500/8 border border-amber-500/20 rounded-md">
      <span className="text-base leading-none mt-0.5">⚠️</span>
      <div>
        <p className="font-label text-sm font-semibold text-amber-400">Janela de segurança ativa</p>
        <p className="font-label text-xs text-on-surface-variant mt-0.5">
          <span className="font-medium text-on-surface">{windowInfo.allergenName}</span> introduzido.{' '}
          Aguarde mais {windowInfo.daysLeft} dia{windowInfo.daysLeft !== 1 ? 's' : ''} antes de
          introduzir outro alérgeno novo.
        </p>
      </div>
    </div>
  )
}
