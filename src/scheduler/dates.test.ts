import { describe, expect, it } from 'vitest'
import { addDays, assertDay, daysBetween, isOnOrBefore } from './dates'

describe('addDays', () => {
  it('returns the same day when adding nothing', () => {
    expect(addDays('2026-08-24', 0)).toBe('2026-08-24')
  })

  it('crosses a month boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
  })

  it('crosses a year boundary', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('counts 29 February in a leap year', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('skips 29 February in a common year', () => {
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01')
  })

  it('does not drift across the start of Australian daylight saving', () => {
    // 4 October 2026 is when clocks go forward in Sydney. Day arithmetic done
    // in local time loses or gains a day here. This scheduler works in whole
    // days and must be immune to it.
    expect(addDays('2026-10-03', 1)).toBe('2026-10-04')
    expect(addDays('2026-10-04', 1)).toBe('2026-10-05')
    expect(addDays('2026-04-04', 1)).toBe('2026-04-05')
  })

  it('adds a long interval correctly', () => {
    expect(addDays('2026-08-24', 365)).toBe('2027-08-24')
  })

  it('goes backwards for a negative count', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('rejects a malformed day', () => {
    expect(() => addDays('24-08-2026', 1)).toThrow(/YYYY-MM-DD/)
    expect(() => addDays('2026-8-4', 1)).toThrow(/YYYY-MM-DD/)
    expect(() => addDays('', 1)).toThrow(/YYYY-MM-DD/)
  })

  it('rejects a day that does not exist', () => {
    expect(() => addDays('2027-02-29', 1)).toThrow(/not a real day/)
    expect(() => addDays('2026-13-01', 1)).toThrow(/not a real day/)
  })

  it('rejects a non-integer count of days', () => {
    expect(() => addDays('2026-08-24', 1.5)).toThrow(/whole number/)
  })
})

describe('daysBetween', () => {
  it('is zero for the same day', () => {
    expect(daysBetween('2026-08-24', '2026-08-24')).toBe(0)
  })

  it('counts forwards', () => {
    expect(daysBetween('2026-08-24', '2026-09-24')).toBe(31)
  })

  it('is negative when the second day is earlier', () => {
    expect(daysBetween('2026-09-24', '2026-08-24')).toBe(-31)
  })
})

describe('isOnOrBefore', () => {
  it('is true for the same day', () => {
    expect(isOnOrBefore('2026-08-24', '2026-08-24')).toBe(true)
  })

  it('is true for an earlier day', () => {
    expect(isOnOrBefore('2026-08-23', '2026-08-24')).toBe(true)
  })

  it('is false for a later day', () => {
    expect(isOnOrBefore('2026-08-25', '2026-08-24')).toBe(false)
  })

  it('compares by calendar order, not string length', () => {
    expect(isOnOrBefore('2026-09-01', '2026-10-01')).toBe(true)
  })
})

describe('assertDay', () => {
  it('returns the day it was given when valid', () => {
    expect(assertDay('2026-08-24')).toBe('2026-08-24')
  })

  it('names the offending value in the message', () => {
    expect(() => assertDay('tomorrow')).toThrow(/tomorrow/)
  })
})
