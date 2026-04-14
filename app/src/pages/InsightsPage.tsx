import { useEffect, useState } from 'react'
import { useAppState } from '../contexts/AppContext'
import { useInsightsEngine, type PeriodOption } from '../hooks/useInsightsEngine'
import { markInsightsSeen } from '../lib/insightRules'
import { usePremium } from '../hooks/usePremium'
import DaySummaryCard from '../components/insights/DaySummaryCard'
import PeriodDropdown from '../components/insights/PeriodDropdown'
import InsightCard from '../components/insights/InsightCard'
import InsightPaywallBanner from '../components/insights/InsightPaywallBanner'
import WeekChart from '../components/insights/WeekChart'
import { PaywallModal } from '../components/ui/PaywallModal'
import { AdBanner } from '../components/ui/AdBanner'

const FREE_INSIGHT_LIMIT = 2

export default function InsightsPage() {
  const { logs, baby, loading } = useAppState()
  const { isPremium } = usePremium()
  const [period, setPeriod] = useState<PeriodOption>('last_7')
  const [showPaywall, setShowPaywall] = useState(false)

  const { periodSummary, insights, weekTrends, availablePeriods } = useInsightsEngine(
    logs,
    baby?.birthDate,
    period
  )

  // Se o período padrão não estiver disponível, cai para o maior disponível
  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(period)) {
      setPeriod(availablePeriods[availablePeriods.length - 1])
    }
  }, [availablePeriods, period])

  // Marca os insights visíveis como vistos (rotação de 48h)
  const visibleInsights = isPremium
    ? insights
    : insights.slice(0, FREE_INSIGHT_LIMIT)
  const hiddenCount = isPremium
    ? 0
    : Math.max(0, insights.length - FREE_INSIGHT_LIMIT)

  useEffect(() => {
    if (visibleInsights.length > 0) {
      const ids = visibleInsights
        .filter((i) => i.type !== 'alert')
        .map((i) => i.id)
      if (ids.length > 0) markInsightsSeen(ids)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleInsights.map((i) => i.id).join(',')])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined text-primary text-4xl animate-spin">
          progress_activity
        </span>
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="pb-4 page-enter">
        <section className="px-5 pt-6 pb-4">
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
            Insights
          </h1>
          <p className="font-label text-sm text-on-surface-variant">
            Padrões e tendências
          </p>
        </section>
        <div className="flex flex-col items-center justify-center py-16 px-5">
          <span className="text-4xl mb-4">📊</span>
          <p className="text-center text-on-surface-variant font-label text-sm">
            Registre atividades para ver os insights do seu bebê.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-4 page-enter">
      {/* Header + dropdown */}
      <section className="px-5 pt-6 pb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
            Insights
          </h1>
          <p className="font-label text-sm text-on-surface-variant truncate">
            Padrões e tendências
          </p>
        </div>
        <PeriodDropdown
          selected={period}
          available={availablePeriods}
          onChange={setPeriod}
        />
      </section>

      <div className="px-5 space-y-4">
        {/* Period summary (free + premium) */}
        <DaySummaryCard summary={periodSummary} />

        {/* Insight cards */}
        {visibleInsights.length === 0 && (
          <div className="rounded-xl p-5 border border-white/5 bg-surface-container text-center">
            <span className="text-3xl mb-2 block">✨</span>
            <p className="font-label text-sm text-on-surface-variant">
              Ainda não há insights suficientes para esse período. Continue registrando!
            </p>
          </div>
        )}

        {visibleInsights.map((insight) => (
          <InsightCard key={insight.id} {...insight} />
        ))}

        {/* Paywall banner (free users com insights escondidos) */}
        {!isPremium && hiddenCount > 0 && (
          <InsightPaywallBanner
            remainingCount={hiddenCount}
            onUpgrade={() => setShowPaywall(true)}
          />
        )}

        {/* Week chart (Yaya+ only) */}
        {isPremium && weekTrends.length > 0 && <WeekChart trends={weekTrends} />}

        {/* Chart teaser para free (sem blur gigante) */}
        {!isPremium && (
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background:
                'linear-gradient(135deg, rgba(183,159,255,0.08), rgba(125,255,186,0.06))',
              border: '1px solid rgba(183,159,255,0.15)',
            }}
          >
            <span className="text-2xl block mb-1">📈</span>
            <p className="font-label text-sm text-on-surface mb-1">
              Gráfico semanal dos padrões
            </p>
            <p className="font-label text-xs text-on-surface-variant/70 mb-3">
              Veja a evolução de sono, fraldas e mamadas dia a dia
            </p>
            <button
              type="button"
              onClick={() => setShowPaywall(true)}
              className="bg-primary/20 text-primary font-label text-xs font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform"
            >
              Desbloquear com Yaya+
            </button>
          </div>
        )}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="insights"
      />

      <AdBanner />
    </div>
  )
}
