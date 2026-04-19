import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppState } from '../../contexts/AppContext'
import { useInsightsEngine, type PeriodOption } from './useInsightsEngine'
import { useBabyPremium } from '../../hooks/useBabyPremium'
import { useMyRole } from '../../hooks/useMyRole'
import { can } from '../../lib/roles'
import DaySummaryCard from './components/DaySummaryCard'
import PeriodDropdown from './components/PeriodDropdown'
import InsightCard from './components/InsightCard'
import InsightPaywallBanner from './components/InsightPaywallBanner'
import WeekChart from './components/WeekChart'
import { PaywallModal } from '../../components/ui/PaywallModal'
import { hapticLight } from '../../lib/haptics'
import { InsightsSkeleton } from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { useFeatureSeen } from '../journey/useFeatureSeen'

const FREE_INSIGHT_LIMIT = 2

export default function InsightsPage() {
  useFeatureSeen('insights')
  const { logs, baby, loading, quietHours } = useAppState()
  const isPremium = useBabyPremium()
  const myRole = useMyRole()
  const canViewInsights = can.viewInsights(myRole)
  const navigate = useNavigate()
  const [period, setPeriod] = useState<PeriodOption>('last_7')
  const [showPaywall, setShowPaywall] = useState(false)

  const { periodSummary, insights, weekTrends, availablePeriods } = useInsightsEngine(
    logs,
    baby?.birthDate,
    period,
    { start: quietHours.start, end: quietHours.end },
  )

  // Se o período selecionado não estiver disponível, prefere last_7, depois
  // yesterday, today, ou o maior disponível.
  useEffect(() => {
    if (availablePeriods.length === 0) return
    if (availablePeriods.includes(period)) return
    const preferenceOrder: PeriodOption[] = [
      'last_7',
      'yesterday',
      'today',
      'last_15',
      'last_30',
      'current_month',
      'last_month',
      'all',
    ]
    const fallback = preferenceOrder.find((p) => availablePeriods.includes(p))
    if (fallback) setPeriod(fallback)
  }, [availablePeriods, period])

  const visibleInsights = isPremium
    ? insights
    : insights.slice(0, FREE_INSIGHT_LIMIT)
  const hiddenCount = isPremium
    ? 0
    : Math.max(0, insights.length - FREE_INSIGHT_LIMIT)

  const handleOpenSharedReport = () => {
    hapticLight()
    navigate('/profile#shared-reports')
  }

  if (loading) {
    return <InsightsSkeleton />
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
        <EmptyState
          emoji="📊"
          title="Os padrões vão aparecer aqui"
          description="Registre alguns dias de amamentação, sono e trocas — o Yaya começa a identificar tendências em poucas rotinas."
        />
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

        {/* Insight cards (only for roles with viewInsights permission) */}
        {canViewInsights && (
          <>
            {visibleInsights.length === 0 && (
              <div className="rounded-md border border-white/5 bg-surface-container">
                <EmptyState
                  emoji="✨"
                  title="Ainda juntando contexto"
                  description="Poucos dados pra conclusões confiáveis nesse período. Continue registrando — logo aparecem padrões."
                  size="compact"
                />
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
                className="rounded-md p-4 text-center"
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
                  Veja a evolução de sono, fraldas e amamentação dia a dia
                </p>
                <button
                  type="button"
                  onClick={() => setShowPaywall(true)}
                  className="bg-primary/20 text-primary font-label text-xs font-bold px-4 py-2 rounded-md active:scale-95 transition-transform"
                >
                  Desbloquear com Yaya+
                </button>
              </div>
            )}
          </>
        )}

        {/* ===== SUPER RELATÓRIO CTA ===== */}
        <button
          type="button"
          onClick={handleOpenSharedReport}
          className="w-full rounded-md p-5 relative overflow-hidden active:scale-[0.98] transition-transform text-left"
          style={{
            background:
              'linear-gradient(135deg, #7C4DFF 0%, #a78bfa 55%, #b79fff 100%)',
            boxShadow: '0 14px 40px -14px rgba(124, 77, 255, 0.55)',
          }}
        >
          {/* decorative blobs */}
          <span
            aria-hidden
            className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10 blur-2xl pointer-events-none"
          />
          <span
            aria-hidden
            className="absolute -bottom-10 -left-6 w-24 h-24 rounded-full bg-white/10 blur-2xl pointer-events-none"
          />

          <div className="relative flex items-center gap-4">
            <div className="w-14 h-14 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/25">
              <span className="material-symbols-outlined text-white text-3xl">
                clinical_notes
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-label text-[10px] uppercase tracking-wider text-white/80 font-bold">
                Novo
              </p>
              <h3 className="font-headline text-base font-bold text-white leading-tight">
                Super Relatório
              </h3>
              <p className="font-label text-xs text-white/85 mt-1 leading-snug">
                Gere e compartilhe um super relatório para pediatra ou profissionais de saúde
              </p>
            </div>
            <span className="material-symbols-outlined text-white text-2xl shrink-0">
              arrow_forward
            </span>
          </div>
        </button>
      </div>

      <PaywallModal
        isOpen={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="insights"
      />
    </div>
  )
}
