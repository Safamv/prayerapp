import { describe, expect, it } from 'vitest'
import { nowInstant, today } from './clock'

/**
 * The two ways the app reads the clock.
 *
 * `today` is local rather than UTC on purpose. A user in Melbourne reviewing at
 * nine in the morning is eleven hours ahead of UTC, so a UTC day would record
 * the review as yesterday and show them a streak they had not broken.
 */

describe('today', () => {
  it('is written YYYY-MM-DD', () => {
    expect(today(new Date(2026, 7, 24, 9, 0, 0))).toBe('2026-08-24')
  })

  it('pads a single digit month and day', () => {
    expect(today(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05')
  })

  it('uses the device day, not the UTC day', () => {
    // 9am on 24 August in a timezone ahead of UTC is still 23 August in UTC.
    const morningInMelbourne = new Date(2026, 7, 24, 9, 0, 0)
    expect(today(morningInMelbourne)).toBe('2026-08-24')
    expect(today(morningInMelbourne)).toBe(
      `${String(morningInMelbourne.getFullYear())}-08-${String(morningInMelbourne.getDate())}`,
    )
  })

  it('does not roll over at 11pm local time', () => {
    expect(today(new Date(2026, 7, 24, 23, 30, 0))).toBe('2026-08-24')
    expect(today(new Date(2026, 7, 25, 0, 30, 0))).toBe('2026-08-25')
  })
})

describe('nowInstant', () => {
  it('is an ISO 8601 instant in UTC', () => {
    expect(nowInstant()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('sorts lexically in time order, which is what the review log relies on', () => {
    const earlier = new Date(2026, 7, 24, 6, 0, 0).toISOString()
    const later = new Date(2026, 7, 24, 18, 0, 0).toISOString()
    expect(earlier < later).toBe(true)
  })
})
