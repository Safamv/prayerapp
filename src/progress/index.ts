/**
 * **Progress: freshness and the streak.** Scope 11, as pure functions.
 *
 * The name is the one CLAUDE.md sections 9 and 11 already use for this material
 * - "No component under `src/features/discover/**` may import from `scheduler`,
 * `progress`, or progress-related types" - so the wall was written against this
 * folder before the folder existed.
 *
 * It sits beside `src/queue/` and `src/quiz/` and follows the same rule they do:
 * the decisions that would be expensive to get wrong are arithmetic over plain
 * values, testable without a database and without a browser. `src/data/progress.ts`
 * does the reading and the joining and makes no decision of its own.
 *
 * It reads from `src/scheduler/` and never writes to it. Freshness is a reading
 * of SM-2 state; nothing here is ever an input to scheduling.
 */

export {
  freshnessCounts,
  lapseCount,
  longestIntervalDays,
  passageFreshness,
  segmentFreshness,
  FRESHNESS_STATES,
} from './freshness'
export { currentStreak, lastActiveDay, longestStreak } from './streak'
export type { StreakRules } from './streak'
export { FRESHNESS_SEVERITY } from './types'
export type {
  Freshness,
  FreshnessCounts,
  PassageFreshnessInput,
  SegmentFreshnessInput,
} from './types'
