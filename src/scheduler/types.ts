/**
 * A calendar day, written `YYYY-MM-DD`.
 *
 * The scheduler works in whole days and never in instants. It also never reads
 * the system clock: today is always passed in. That is what makes a 200 day
 * simulation possible in a few milliseconds, and it is what stops a review at
 * 11pm and a review at 1am the next morning being treated as the same day in
 * one timezone and different days in another.
 *
 * It is a plain string rather than a branded type so that a literal such as
 * '2026-08-24' can be passed directly. Validity is checked at runtime by
 * `assertDay`, which every entry point calls.
 */
export type Day = string

/**
 * The user's self-rating after a reveal. Scope 9.6: this is the only input to
 * the scheduler. Nothing is auto-scored, and with no typed input there is
 * nothing to grade.
 */
export type Rating = 'again' | 'hard' | 'good' | 'easy'

/**
 * Scope 8.5. `resting` is not a slow interval, it is an absence of one: a
 * resting passage is never queued and never decays into "needs review".
 */
export type UpkeepState = 'active' | 'occasional' | 'resting'

/**
 * One segment's scheduling state. Field names are the camelCase form of the
 * `segment_progress` columns in scope section 10, so the mapping in
 * `src/data/` is a rename and nothing more.
 *
 * `intervalDays` is always the plain SM-2 interval, never multiplied by the
 * upkeep factor. See `effectiveIntervalDays` for why.
 */
export interface SegmentProgress {
  readonly easeFactor: number
  readonly intervalDays: number
  readonly repetitions: number
  readonly dueDate: Day
  readonly lastReviewedAt: Day | null
  readonly lapses: number
}

/**
 * A promoted whole-passage card. Field names are the camelCase form of the
 * whole-passage scheduling columns on `user_prayers` in scope section 10.
 */
export interface PassageProgress {
  readonly passageEaseFactor: number
  readonly passageIntervalDays: number
  readonly passageRepetitions: number
  readonly passageDueDate: Day
}

/**
 * The outcome of reviewing a whole-passage card. Scope 8.7: a rating of Again
 * demotes the passage back to segment review, which is a change of status and
 * not just a shorter interval, so it cannot be expressed as a new date.
 */
export type PassageReviewOutcome =
  | { readonly outcome: 'scheduled'; readonly progress: PassageProgress }
  | { readonly outcome: 'demoted'; readonly progress: PassageProgress }
