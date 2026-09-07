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
