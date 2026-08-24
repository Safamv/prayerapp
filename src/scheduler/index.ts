/**
 * The scheduler. Pure SM-2 over per-segment state, and nothing else.
 *
 * Three rules hold this module together, and all three are enforced rather than
 * stated. It imports nothing from outside itself (ESLint, see eslint.config.js).
 * It never reads the system clock, so today is always an argument (checked by
 * src/scheduler-isolation.test.ts). It holds no state: every function takes
 * state in and returns new state out, so persistence is somebody else's job.
 *
 * Together they are what makes scope 8.2's "swappable for FSRS without touching
 * anything else" true rather than aspirational. A replacement has to provide the
 * surface asserted in index.test.ts and nothing more.
 */

export { DEFAULT_SCHEDULER_CONFIG } from './config'
export type { SchedulerConfig } from './config'
export { addDays, daysBetween, isOnOrBefore } from './dates'
export { isPassageDue, promoteToPassage, reviewPassage } from './passage'
export { isSegmentDue, newSegmentProgress, reviewSegment } from './segment'
export type {
  Day,
  PassageProgress,
  PassageReviewOutcome,
  Rating,
  SegmentProgress,
  UpkeepState,
} from './types'
export { effectiveIntervalDays, isQueueable } from './upkeep'
