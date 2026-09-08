import { daysBetween, type Day } from '../scheduler'
import { STREAK_RULES } from '../config/defaults'

/**
 * **The daily streak.** Scope 11.4.
 *
 * > The streak counts days on which the day's queue was completed.
 * > Missing one day **pauses** the streak. It does not reset.
 * > Two consecutive missed days reset it.
 * > No grace-day accounting, no tokens, no "streak freeze" screen.
 * > **No notification about a streak at risk, ever.**
 *
 * Pure arithmetic over a list of days. CLAUDE.md section 11 puts streak
 * arithmetic on the mandatory unit test list, and the whole of the interest is
 * at the boundaries: one gap, two gaps, and a gap on either side of today.
 *
 * ## What an active day is, and why it is not the finished queue
 *
 * A day counts when the reader finished at least one line or one whole passage
 * on it. That is not quite the scope's sentence, and the difference is forced:
 * **whether a past day's queue was emptied cannot be worked out afterwards.**
 * Finishing a line moves its due date, so the queue that stood on Tuesday does
 * not exist anywhere on Thursday, in `review_log` or anywhere else. Recording it
 * would mean a new column, every day before it unreadable, and a streak that
 * restarted at nought on the day it shipped.
 *
 * Safa chose the derived reading (decision D11.2). It is also the forgiving one,
 * which is the direction scope 11.4 says the product's principles already point.
 *
 * ## Derived, never counted up
 *
 * The streak is worked out from the whole history every time rather than
 * incremented in a stored counter. A counter that misses one write is wrong for
 * ever and there is nothing to compare it against; a derivation is wrong only
 * for as long as the bug is. `src/data/reviewLog.ts` was written in session 2
 * with this in mind.
 */

export interface StreakRules {
  /**
   * How many missed days in a row a run of days survives. Scope 11.4's two
   * sentences are one number: a gap of one is survived, a gap of two is not.
   */
  readonly survivableMissedDays: number
}

/** Ascending, with duplicates removed. Days are compared as strings, which sorts them. */
function ordered(days: readonly Day[]): Day[] {
  return [...new Set(days)].sort((a, b) => a.localeCompare(b))
}

/**
 * The largest gap, in days, that keeps two active days in the same run.
 *
 * One survivable missed day means consecutive active days may be two days apart:
 * Monday and Wednesday are one run with Tuesday missed inside it.
 */
function largestGap(rules: StreakRules): number {
  return rules.survivableMissedDays + 1
}

/**
 * The runs of days, oldest first, each one a list of active days unbroken by
 * more missed days than the rules allow.
 */
function runsOf(days: readonly Day[], rules: StreakRules): Day[][] {
  const sorted = ordered(days)
  const limit = largestGap(rules)
  const runs: Day[][] = []

  for (const day of sorted) {
    const run = runs[runs.length - 1]
    const previous = run?.[run.length - 1]
    if (run === undefined || previous === undefined || daysBetween(previous, day) > limit) {
      runs.push([day])
    } else {
      run.push(day)
    }
  }

  return runs
}

/**
 * **The streak as it stands today.**
 *
 * Nought when there is no history, and nought when the most recent active day is
 * too far back to still be in a run that reaches today.
 *
 * **Today is never a missed day.** It is not over. So a reader whose last active
 * day was the day before yesterday has missed exactly one day - yesterday - and
 * still has their streak, paused. The day after that, two days have been missed
 * and it is gone. That is the boundary this function exists to get right, and it
 * is why the comparison is against `today` rather than against yesterday.
 *
 * Days after `today` are ignored rather than counted or rejected. They are only
 * reachable by a device clock that has moved backwards, and a streak is not the
 * place to raise that.
 */
export function currentStreak(
  activeDays: readonly Day[],
  today: Day,
  rules: StreakRules = STREAK_RULES,
): number {
  const upToToday = ordered(activeDays).filter((day) => daysBetween(day, today) >= 0)
  const runs = runsOf(upToToday, rules)
  const last = runs[runs.length - 1]
  if (last === undefined) return 0

  const mostRecent = last[last.length - 1]
  if (mostRecent === undefined) return 0
  return daysBetween(mostRecent, today) <= largestGap(rules) ? last.length : 0
}

/**
 * The longest run the history holds, under the same rules.
 *
 * **Nothing renders this.** Scope 11.1 asks for a daily streak and scope 11.2
 * excludes every score, and a personal best is a number to beat. It is computed
 * because scope section 10 gives `user_stats` a `streak_longest` column and a
 * column that says nought about a reader who has done ninety days is a column
 * that lies. See decision D11.4.
 */
export function longestStreak(
  activeDays: readonly Day[],
  rules: StreakRules = STREAK_RULES,
): number {
  return runsOf(activeDays, rules).reduce((longest, run) => Math.max(longest, run.length), 0)
}

/** The most recent active day, or `null`. `user_stats.last_active_date`. */
export function lastActiveDay(activeDays: readonly Day[]): Day | null {
  const sorted = ordered(activeDays)
  return sorted[sorted.length - 1] ?? null
}
