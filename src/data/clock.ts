/**
 * The two ways this app reads the clock, in one place.
 *
 * Every data function that stamps a time takes it as a defaulted argument
 * rather than calling these directly, so a test can pass a fixed instant and
 * assert on it. That is the same discipline the scheduler enforces absolutely
 * (it may not read the clock at all); the data layer relaxes it to a default,
 * because a caller writing a bookmark should not have to know what day it is.
 */

/** An ISO 8601 instant in UTC. Used for every `*_at` column. */
export function nowInstant(): string {
  return new Date().toISOString()
}

/**
 * Today as `YYYY-MM-DD` **in the device's own timezone**, which is the same
 * convention the scheduler's `Day` uses.
 *
 * Deliberately not `toISOString().slice(0, 10)`: that is UTC, so a user in
 * Melbourne reviewing at 9am would have it recorded as the previous day and
 * would appear to have broken a streak they did not break.
 */
export function today(at: Date = new Date()): string {
  const year = at.getFullYear()
  const month = String(at.getMonth() + 1).padStart(2, '0')
  const day = String(at.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
