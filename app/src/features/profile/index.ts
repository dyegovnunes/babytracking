/**
 * Public API for the Profile feature.
 *
 * Currently consumed only by App.tsx (via React.lazy import to the page
 * file directly — lazy needs a module with a default export).
 * Exposes the hooks and helpers that could eventually be reused elsewhere.
 */

// Hooks
export { useInviteCodes } from './useInviteCodes'

// Shared reports API (used by Profile components today, could also be
// consumed by a future admin/stats feature)
export type { SharedReport } from './sharedReports'
export {
  createSharedReport,
  listSharedReports,
  deleteSharedReport,
  toggleSharedReport,
  getReportUrl,
  getExpirationDate,
  hashPassword,
  generateToken,
} from './sharedReports'
