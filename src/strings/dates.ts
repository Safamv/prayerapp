/**
 * A day, written the way a person says it.
 *
 * This lives in `src/strings/` for the same reason `attribution.ts` does: the
 * output is user-facing text. The day and the month are data, but the language
 * they are rendered in, and the order they are put in, are the app's own words
 * (principle 7.11).
 *
 * ## Australian English, and why the month is spelled out
 *
 * `14 September`, not `September 14` and not `14/09`. A numeric date is
 * ambiguous between two conventions and this app is read in both. The year is
 * absent because every date the app states is within a month of today, so a year
 * would be noise; if a `[v2]` surface ever needs one it gets its own function
 * rather than a flag on this one.
 *
 * The build stamp of CLAUDE.md section 8 has its own format (`7 Sept 2026`) and
 * its own home in `src/config/build.ts`. Deliberately not shared: one is a
 * sentence a user reads and the other is a serial number a tester reads out.
 */

const FORMAT = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  // The day is a calendar day rather than an instant, so it is parsed and
  // rendered in the same zone. Without this, `2026-09-14` is midnight UTC and
  // renders as the 13th for a reader west of Greenwich.
  timeZone: 'UTC',
})

/** `2026-09-14` becomes `14 September`. */
export function formatDay(day: string): string {
  const time = Date.parse(`${day}T00:00:00Z`)
  // A missing or malformed date renders as nothing rather than as the word
  // "Invalid Date" in the middle of a sentence.
  return Number.isNaN(time) ? '' : FORMAT.format(new Date(time))
}

/**
 * A number of days, said the way a person says it: `3 weeks`, `1 month`,
 * `5 days`.
 *
 * Scope 11.3 asks for the longest interval reached to be "stated plainly", and
 * gives its own example in weeks. The intervals this app produces run from one
 * day to a year (`maximumIntervalDays`), and "97 days" is a number rather than a
 * span: nobody holds it. So each range is said in the unit a person would use
 * for it.
 *
 * The unit changes at the point where the smaller one stops being natural. Four
 * weeks is still a span someone pictures; five is a month. Eleven months is
 * still months; twelve is a year, and a year is where the scheduler's ceiling
 * sits, so nothing above it is reachable.
 *
 * It is here, in `src/strings/`, rather than in a component or beside the
 * arithmetic, for the same reason `formatDay` is: the number is data and the
 * word beside it is the app's own vocabulary (principle 7.11).
 */
const DAYS_PER_WEEK = 7
const DAYS_PER_MONTH = 30.44
const DAYS_PER_YEAR = 365.25

function plural(count: number, unit: string): string {
  return `${String(count)} ${unit}${count === 1 ? '' : 's'}`
}

export function formatInterval(days: number): string {
  const whole = Math.max(1, Math.round(days))
  if (whole < DAYS_PER_WEEK) return plural(whole, 'day')
  if (whole < 31) return plural(Math.round(whole / DAYS_PER_WEEK), 'week')

  const months = Math.round(whole / DAYS_PER_MONTH)
  if (months < 12) return plural(months, 'month')
  return plural(Math.max(1, Math.round(whole / DAYS_PER_YEAR)), 'year')
}
