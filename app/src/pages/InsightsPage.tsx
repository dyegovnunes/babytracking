import { useState } from 'react'
import { useAppState } from '../contexts/AppContext'
import { useInsights } from '../hooks/useInsights'
import DaySummaryCard from '../components/insights/DaySummaryCard'
import FeedingInsights from '../components/insights/FeedingInsights'
import SleepInsights from '../components/insights/SleepInsights'
import WeekChart from '../components/insights/WeekChart'
import { usePremium } from '../hooks/usePremium'
import { PaywallModal } from '../components/ui/PaywallModal'

export default function InsightsPage() {
  const { logs, loading } = useAppState()
  const insights = useInsights(logs)
  const { isPremium } = usePremium()
  const [showPaywall, setShowPaywall] = useState(false)

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
      <section className="px-5 pt-6 pb-4">
        <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
          Insights
        </h1>
        <p className="font-label text-sm text-on-surface-variant">
          Padrões e tendências
        </p>
      </section>

      <div className="px-5 space-y-4">
        <DaySummaryCard summary={insights.todaySummary} />

        {isPremium ? (
          <>
            <FeedingInsights pattern={insights.feedingPattern} />
            <SleepInsights pattern={insights.sleepPattern} />
            <WeekChart trends={insights.weekTrends} />
          </>
        ) : (
          <div className="relative">
            {/* Blurred preview */}
            <div className="blur-sm opacity-50 pointer-events-none select-none">
              <FeedingInsights pattern={insights.feedingPattern} />
              <div className="mt-4">
                <SleepInsights pattern={insights.sleepPattern} />
              </div>
            </div>

            {/* Upgrade overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setShowPaywall(true)}
                className="bg-[#0d0a27]/90 backdrop-blur-sm border border-primary/30 rounded-2xl px-6 py-4 flex flex-col items-center gap-2 active:bg-[#0d0a27] transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-3xl">insights</span>
                <span className="text-on-surface font-label font-bold text-sm">Ver insights completos</span>
                <span className="text-on-surface-variant font-label text-xs">Desbloqueie com Yaya+</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="insights"
      />
    </div>
  )
}
