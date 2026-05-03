// Hook: retorna o nudge de descoberta mais prioritário a ser mostrado.
// No máximo 1 nudge por vez.
// Enquanto a Trilha de Descoberta estiver ativa (14 dias), todos os nudges
// são suprimidos para evitar redundância — o usuário já está sendo guiado.
//
// Refresh automático ao foco/visibilidade: como as chaves são setadas por
// trackOnce em outras telas, o hook precisa re-ler o localStorage quando o
// usuário volta para a home.

import { useState, useEffect, useCallback } from 'react'
import type { LogEntry, Baby } from '../../types'

export interface DiscoveryNudge {
  id: string
  emoji: string
  title: string
  subtitle: string
  destination: string
}

// Verifica se a Trilha de Descoberta ainda está ativa para este bebê
function isTrailActive(babyId: string): boolean {
  if (localStorage.getItem(`yaya_trail_dismissed_${babyId}`) === '1') return false
  const startTs = localStorage.getItem(`yaya_discovery_start_${babyId}`)
  if (!startTs) return false
  const daysSinceStart = (Date.now() - Number(startTs)) / (1000 * 60 * 60 * 24)
  return daysSinceStart <= 14
}

function computeNudge(babyId: string, logs: LogEntry[], baby: Baby): DiscoveryNudge | null {
  // Trilha ativa → nudges suprimidos
  if (isTrailActive(babyId)) return null

  const name = baby.name
  const gen = baby.gender === 'girl' ? 'da' : baby.gender === 'boy' ? 'do' : 'de'

  // Prioridade 1 — nudge_insights: 5+ registros de sono + nunca abriu Insights
  const sleepCount = logs.filter((l) => l.eventId === 'sleep').length
  if (
    sleepCount >= 5 &&
    !localStorage.getItem('yaya_evt_insights_tab_opened') &&
    !localStorage.getItem(`yaya_nudge_nudge_insights_dismissed_${babyId}`)
  ) {
    return {
      id: 'nudge_insights',
      emoji: '✨',
      title: 'Já dá pra ver um padrão',
      subtitle: `Quer ver o que o Yaya descobriu sobre a rotina ${gen} ${name}?`,
      destination: '/insights',
    }
  }

  // Prioridade 2 — nudge_yaia: 10+ registros + nunca usou yaIA
  if (
    localStorage.getItem('yaya_evt_first_record_created') &&
    logs.length >= 10 &&
    !localStorage.getItem('yaya_evt_yaia_first_message') &&
    !localStorage.getItem(`yaya_nudge_nudge_yaia_dismissed_${babyId}`)
  ) {
    return {
      id: 'nudge_yaia',
      emoji: '🤖',
      title: `Pergunte sobre ${name}`,
      subtitle: `A yaIA tem o contexto completo ${gen} ${name} — sono, alimentação, marcos e mais.`,
      destination: '/yaia',
    }
  }

  // Prioridade 3 — nudge_report: registrou marco + nunca viu super relatório
  if (
    localStorage.getItem('yaya_evt_milestone_registered') &&
    !localStorage.getItem('yaya_evt_super_report_viewed') &&
    !localStorage.getItem(`yaya_nudge_nudge_report_dismissed_${babyId}`)
  ) {
    return {
      id: 'nudge_report',
      emoji: '📋',
      title: 'Quer compartilhar com o pediatra?',
      subtitle: `Crie um link com os marcos, vacinas e evolução ${gen} ${name}.`,
      destination: '/profile',
    }
  }

  return null
}

export function useDiscoveryNudges(
  babyId: string | undefined,
  logs: LogEntry[],
  baby: Baby | null,
) {
  // Forçar re-render quando o usuário volta para a home (foco/visibilidade)
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  const dismissNudge = useCallback(
    (id: string) => {
      if (!babyId) return
      localStorage.setItem(`yaya_nudge_${id}_dismissed_${babyId}`, '1')
      forceUpdate((n) => n + 1)
    },
    [babyId],
  )

  const nudge = babyId && baby ? computeNudge(babyId, logs, baby) : null

  return { nudge, dismissNudge }
}
