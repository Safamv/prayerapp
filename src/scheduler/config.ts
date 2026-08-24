import type { Rating, UpkeepState } from './types'

/**
 * Every tuneable number the scheduler uses.
 *
 * These live here rather than in `src/config/` because nothing may be imported
 * into `src/scheduler/` (CLAUDE.md 4.5, decision D0.3). The app's own config
 * module passes a `SchedulerConfig` in; the scheduler never reaches out for one.
 * Every entry point takes it as a defaulted last argument, so a caller that
 * does not care about tuning writes nothing.
 */
export interface SchedulerConfig {
  /** Where a brand new segment starts. Classic SM-2 uses 2.5. */
  readonly initialEaseFactor: number
  /** The floor. Below about 1.3 intervals stop growing and reviews pile up. */
  readonly minimumEaseFactor: number
  /** What each self-rating does to the ease factor. */
  readonly easeFactorDeltas: Readonly<Record<Rating, number>>
  /** Interval after the first successful review. */
  readonly firstIntervalDays: number
  /** Interval after the second successful review. */
  readonly secondIntervalDays: number
  /** Interval a lapse drops back to. */
  readonly lapseIntervalDays: number
  /** Hard grows the interval by this instead of by the ease factor. */
  readonly hardIntervalMultiplier: number
  /** Easy grows the interval by the ease factor and then by this. */
  readonly easyIntervalBonus: number
  /** The ceiling on any due date, before or after the upkeep multiplier. */
  readonly maximumIntervalDays: number
  /**
   * Scope 8.5. `null` for resting is not a multiplier of zero: a resting
   * passage has no interval because it is never queued. See `isQueueable`.
   */
  readonly upkeepIntervalMultipliers: Readonly<Record<UpkeepState, number | null>>
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = Object.freeze({
  initialEaseFactor: 2.5,
  minimumEaseFactor: 1.3,
  easeFactorDeltas: Object.freeze({
    again: -0.2,
    hard: -0.15,
    good: 0,
    easy: 0.1,
  }),
  firstIntervalDays: 1,
  secondIntervalDays: 6,
  lapseIntervalDays: 1,
  hardIntervalMultiplier: 1.2,
  easyIntervalBonus: 1.3,
  maximumIntervalDays: 365,
  upkeepIntervalMultipliers: Object.freeze({
    active: 1,
    occasional: 3,
    resting: null,
  }),
})
