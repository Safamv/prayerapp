import type { Day } from './types'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MILLISECONDS_PER_DAY = 86_400_000

/*
 * All arithmetic here is in UTC. `new Date(number)` and `Date.parse(string)`
 * both take an explicit value, so nothing in this file consults the clock.
 * `new Date()` and `Date.now()` are absent by design and are checked for by
 * src/scheduler-isolation.test.ts.
 */

function format(time: number): Day {
  const date = new Date(time)
  const year = String(date.getUTCFullYear()).padStart(4, '0')
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Throws unless `value` is a real calendar day written `YYYY-MM-DD`. */
export function assertDay(value: Day): Day {
  if (!DAY_PATTERN.test(value)) {
    throw new RangeError(`A day must be written as YYYY-MM-DD. Received: ${JSON.stringify(value)}`)
  }
  const time = Date.parse(`${value}T00:00:00Z`)
  if (Number.isNaN(time) || format(time) !== value) {
    throw new RangeError(`${JSON.stringify(value)} is not a real day.`)
  }
  return value
}

function toTime(day: Day): number {
  return Date.parse(`${assertDay(day)}T00:00:00Z`)
}

/** The day `count` days after `day`. Negative counts go backwards. */
export function addDays(day: Day, count: number): Day {
  if (!Number.isInteger(count)) {
    throw new RangeError(`A number of days must be a whole number. Received: ${String(count)}`)
  }
  return format(toTime(day) + count * MILLISECONDS_PER_DAY)
}

/** Days from `from` to `to`. Negative when `to` is the earlier of the two. */
export function daysBetween(from: Day, to: Day): number {
  return (toTime(to) - toTime(from)) / MILLISECONDS_PER_DAY
}

/** True when `day` falls on or before `other`. */
export function isOnOrBefore(day: Day, other: Day): boolean {
  return toTime(day) <= toTime(other)
}
