import { describe, expect, it } from 'vitest'
import {
  DAILY_NEW_LIMIT_RANGE,
  DAILY_REVIEW_LIMIT_RANGE,
  DEFAULT_DAILY_NEW_LIMIT,
  DEFAULT_DAILY_REVIEW_LIMIT,
  DEFAULT_FOCUS_DAYS,
  DEFAULT_USER_SETTINGS,
  FOCUS_DAYS_RANGE,
  clampToRange,
} from './defaults'

/**
 * The tuneable numbers the scope names, checked against the scope.
 *
 * Cheap, and it catches the one failure that would otherwise be invisible: a
 * later session adjusting a default to make a test pass, and quietly changing
 * what every new user gets.
 */

describe('the numbers scope 8.3 and 8.6 name', () => {
  it('defaults to 15 reviews and 2 new segments a day', () => {
    expect(DEFAULT_DAILY_REVIEW_LIMIT).toBe(15)
    expect(DEFAULT_DAILY_NEW_LIMIT).toBe(2)
    expect(DEFAULT_USER_SETTINGS.daily_review_limit).toBe(15)
    expect(DEFAULT_USER_SETTINGS.daily_new_limit).toBe(2)
  })

  it('defaults a focus to seven days', () => {
    expect(DEFAULT_FOCUS_DAYS).toBe(7)
  })

  it('keeps both defaults inside the range the user can move them through', () => {
    for (const [value, range] of [
      [DEFAULT_DAILY_REVIEW_LIMIT, DAILY_REVIEW_LIMIT_RANGE],
      [DEFAULT_DAILY_NEW_LIMIT, DAILY_NEW_LIMIT_RANGE],
      [DEFAULT_FOCUS_DAYS, FOCUS_DAYS_RANGE],
    ] as const) {
      expect(clampToRange(value, range)).toBe(value)
    }
  })

  it('lets the user say no new lines today, but not no reviews ever', () => {
    // A review cap of nought is an app that never shows you anything, which
    // looks broken rather than restful. Scope 8.5's resting state is the honest
    // way to stop a passage coming round.
    expect(DAILY_NEW_LIMIT_RANGE.minimum).toBe(0)
    expect(DAILY_REVIEW_LIMIT_RANGE.minimum).toBeGreaterThan(0)
  })
})

describe('keeping a number inside its range', () => {
  it('holds it to the floor and the ceiling', () => {
    expect(clampToRange(-10, DAILY_REVIEW_LIMIT_RANGE)).toBe(5)
    expect(clampToRange(1000, DAILY_REVIEW_LIMIT_RANGE)).toBe(50)
  })

  it('puts it on the nearest step', () => {
    expect(clampToRange(17, DAILY_REVIEW_LIMIT_RANGE)).toBe(15)
    expect(clampToRange(18, DAILY_REVIEW_LIMIT_RANGE)).toBe(20)
  })

  it('falls back to the floor for a number that has gone missing', () => {
    expect(clampToRange(Number.NaN, FOCUS_DAYS_RANGE)).toBe(1)
  })
})
