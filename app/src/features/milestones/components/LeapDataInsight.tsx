import type { LogEntry } from '../../../types'
import type { DevelopmentLeap } from '../developmentLeaps'
import { getLeapDataInsight } from '../leapDataInsight'

interface LeapDataInsightProps {
  logs: LogEntry[]
  birthDate: string
  leap: DevelopmentLeap
}

export default function LeapDataInsight({ logs, birthDate, leap }: LeapDataInsightProps) {
  const insight = getLeapDataInsight(logs, birthDate, leap)

  if (!insight) return null

  const texts = [insight.feedsText, insight.sleepText, insight.diapersText].filter(
    (t): t is string => t !== null,
  )

  if (texts.length === 0) return null

  return (
    <div className="rounded-md bg-surface-container-high p-3">
      <p className="text-xs font-semibold text-on-surface-variant mb-1.5">
        Comparacao com dados reais
      </p>
      <ul className="space-y-1">
        {texts.map((text, i) => (
          <li key={i} className="text-xs text-on-surface-variant leading-relaxed">
            {text}
          </li>
        ))}
      </ul>
      <p className="text-[10px] text-on-surface-variant/50 mt-2">
        Dia {insight.leapDaysElapsed} de {insight.leapTotalDays} do salto
      </p>
    </div>
  )
}
