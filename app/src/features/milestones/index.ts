/**
 * Public API for the Milestones feature.
 *
 * Consumers outside of `features/milestones/` should import ONLY from this
 * barrel — never from internal files. That keeps the feature encapsulated
 * and lets us refactor internals without touching every consumer.
 *
 * The lazy-loaded `MilestonesPage` route still imports its own file directly
 * (see `App.tsx`) because React.lazy needs a module with a default export.
 */

// Hook
export { useMilestones } from './useMilestones'

// Types
export type {
  Milestone,
  BabyMilestone,
  MilestoneCategory,
} from './milestoneData'

// Milestone data + helpers used by other features (home highlights, etc.)
export {
  MILESTONES,
  getNextMilestoneForHome,
  formatAgeAtDate,
} from './milestoneData'

// Development leaps ("saltos de desenvolvimento")
export type { DevelopmentLeap } from './developmentLeaps'
export {
  DEVELOPMENT_LEAPS,
  getActiveLeap,
  getUpcomingLeap,
} from './developmentLeaps'

// Leap data insights
export type { LeapInsight } from './leapDataInsight'

// Leap notes hook
export { useLeapNotes } from './useLeapNotes'
export type { LeapNote } from './useLeapNotes'
