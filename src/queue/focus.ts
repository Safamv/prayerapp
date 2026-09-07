import { addDays, isOnOrBefore, type Day } from '../scheduler'
import type { QueueCandidatePassage } from './types'

/**
 * Focus mode, scope 8.6. One boolean and one date, and no filing system.
 *
 * > When focus is active, all non-focused material is suppressed, both new and
 * > due. Focus has an end date, defaulting to 7 days, user-settable. On expiry
 * > it releases automatically and tells the user.
 *
 * ## Why the expiry is decided here rather than trusted from the column
 *
 * A passage whose focus has run out is released by `src/data/upkeep.ts` the next
 * time the app is opened, which is what tells the user it has ended. But an app
 * that was not opened for a month has a row still saying `is_focus` with a date
 * four weeks past, and a queue that believed that column would suppress the
 * user's whole list until something got round to writing to it. So the date is
 * checked every time the queue is built, and the release is what tells the user,
 * not what makes it true.
 */

/**
 * The shape this module needs. Structural, so a `QueueCandidatePassage` and a
 * renamed `user_prayers` row both satisfy it without either being imported here.
 */
export interface Focusable {
  readonly isFocus: boolean
  readonly focusUntil: Day | null
}

/**
 * Whether focus is in force on this passage today.
 *
 * `focusUntil` is the day focus **lifts**, not the last day it holds, so a focus
 * started on the 7th with the seven day default carries the 14th and is in force
 * on the 7th through the 13th. That is what makes "paused until the 14th" a true
 * sentence rather than a nearly true one.
 */
export function isFocusActive(passage: Focusable, today: Day): boolean {
  if (!passage.isFocus) return false
  if (passage.focusUntil === null) return true
  return !isOnOrBefore(passage.focusUntil, today)
}

/** Whether focus has run out and the passage is waiting to be released. */
export function isFocusExpired(passage: Focusable, today: Day): boolean {
  return passage.isFocus && !isFocusActive(passage, today)
}

/** The day a focus started today should lift. Scope 8.6's user-settable count. */
export function focusUntilDay(today: Day, days: number): Day {
  return addDays(today, Math.max(Math.round(days), 1))
}

/**
 * The passages focus is in force on. Empty when focus is off, which is the
 * ordinary case and the one where nothing is suppressed.
 */
export function focusedPassages(
  passages: readonly QueueCandidatePassage[],
  today: Day,
): readonly QueueCandidatePassage[] {
  return passages.filter((passage) => isFocusActive(passage, today))
}
