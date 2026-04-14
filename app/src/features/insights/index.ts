/**
 * Public API for the Insights feature.
 *
 * Currently consumed only by App.tsx (via React.lazy import to the page
 * file directly — lazy needs a module with a default export).
 *
 * Exports the insights engine hook, types and the rules engine for any
 * future consumer that needs to compute insights outside the page
 * (e.g. Tracker highlights, shared reports).
 */

export {
  useInsightsEngine,
  getAvailablePeriods,
  ALL_PERIODS,
  PERIOD_LABELS,
  type PeriodOption,
  type PeriodSummary,
  type DayTrend,
} from './useInsightsEngine'

export {
  generateInsights,
  type InsightResult,
  type InsightContext,
  type InsightType,
} from './insightRules'
