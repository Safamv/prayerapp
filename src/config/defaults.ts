import type { UserSettingsRow } from '../data/types'
import { DEFAULT_PALETTE_ID, DEFAULT_TEXT_SCALE, DEFAULT_TYPEFACE_ID } from '../theme'

/**
 * The tuneable constants the scope names, in one place (CLAUDE.md section 9).
 *
 * The scheduler's own numbers are deliberately not here. It may import nothing,
 * so it carries its own defaults and takes overrides as an argument
 * (decision D1.7). Everything in this file is a number a user or a later session
 * can change without the scheduler knowing.
 */

/** Scope 8.3: "Default 15 reviews and 2 new segments per day, user-adjustable." */
export const DEFAULT_DAILY_REVIEW_LIMIT = 15
export const DEFAULT_DAILY_NEW_LIMIT = 2

/**
 * Scope 8.3 says the two caps are user-adjustable and does not say between what,
 * so these are the build's choice and are logged as decision D6.4.
 *
 * The review floor is five rather than nought: a cap of nought would be an app
 * that never shows you anything, which looks broken rather than restful, and
 * scope 8.5's resting state is the honest way to stop a passage coming round.
 * The new floor **is** nought, because "no new lines today, just review" is a
 * real thing to want and is the only way to say it.
 */
export const DAILY_REVIEW_LIMIT_RANGE = Object.freeze({ minimum: 5, maximum: 50, step: 5 })
export const DAILY_NEW_LIMIT_RANGE = Object.freeze({ minimum: 0, maximum: 10, step: 1 })

/**
 * Scope 8.6: "Focus has an end date, defaulting to 7 days, user-settable."
 *
 * The maximum is 30 days. The expiry exists precisely because an open-ended
 * focus is how a user ends up with a list of dormant passages four months later,
 * so a range that stretched to a year would give that failure back.
 */
export const DEFAULT_FOCUS_DAYS = 7
export const FOCUS_DAYS_RANGE = Object.freeze({ minimum: 1, maximum: 30, step: 1 })

/** Keeps a number inside one of the ranges above, on its own step. */
export function clampToRange(
  value: number,
  range: { readonly minimum: number; readonly maximum: number; readonly step: number },
): number {
  if (!Number.isFinite(value)) return range.minimum
  const stepped = Math.round(value / range.step) * range.step
  return Math.min(Math.max(stepped, range.minimum), range.maximum)
}

/**
 * The row written for a user on first run. Scope 7.9's text size and scope
 * 12.3's palette and typeface come from the theme registry, so there is one
 * definition of "Paris Navy is the default" and not two that can drift.
 *
 * `high_contrast` is `[v1.0]` (scope 7.9). The column exists now and is false.
 */
export const DEFAULT_USER_SETTINGS: Omit<UserSettingsRow, 'user_id'> = Object.freeze({
  daily_new_limit: DEFAULT_DAILY_NEW_LIMIT,
  daily_review_limit: DEFAULT_DAILY_REVIEW_LIMIT,
  text_size: DEFAULT_TEXT_SCALE,
  high_contrast: false,
  typeface: DEFAULT_TYPEFACE_ID,
  palette: DEFAULT_PALETTE_ID,
})

/**
 * **Scope 11.4's streak rule, as one number.**
 *
 * > Missing one day **pauses** the streak. It does not reset. Two consecutive
 * > missed days reset it.
 *
 * Both sentences are the same statement seen from two sides: a run of days
 * survives a gap of one missed day and does not survive a gap of two. So the
 * rule is one number and not two, and there is no second place for the two
 * halves to disagree.
 *
 * `survivableMissedDays` is also what decides whether the streak is still alive
 * today, which is the boundary worth being careful about. Today is not over, so
 * today is never a missed day: a reader whose last day was the day before
 * yesterday has missed exactly one day, and still has their streak.
 */
export const STREAK_RULES = Object.freeze({
  survivableMissedDays: 1,
})

/**
 * **Where design-tokens 4's second freshness state begins.**
 *
 * A line is Fading once this much or less of its rest is left: with a quarter,
 * a line resting six days fades for the last two of them, and one resting a
 * month fades for the last week.
 *
 * It is a fraction of the interval rather than a fixed number of days because
 * the intervals in this app run from one day to a year. "Fading three days
 * before it is due" would mean a line on a one day interval was never anything
 * else, and a line on a year's interval fading for the last one per cent of it.
 *
 * Nothing about the scheduler changes when this moves. Freshness is a reading of
 * SM-2 state and never an input to it, so this number changes what a star looks
 * like and nothing at all about when a line comes round.
 */
export const FRESHNESS_FADING_REMAINDER = 0.25
