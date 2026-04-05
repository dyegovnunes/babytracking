import { useAppState } from '../contexts/AppContext'
import { useInsights } from '../hooks/useInsights'
import DaySummaryCard from '../components/insights/DaySummaryCard'
import FeedingInsights from '../components/insights/FeedingInsights'
import SleepInsights from '../components/insights/SleepInsights'
import WeekChart from '../components/insights/WeekChart'

export default function InsightsPage() {
  const { logs, loading } = useAppState()
  const insights = useInsights(logs)

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
        <FeedingInsights pattern={insights.feedingPattern} />
        <SleepInsights pattern={insights.sleepPattern} />
        <WeekChart trends={insights.weekTrends} />
      </div>
    </div>
  )
}
