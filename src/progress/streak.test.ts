import { describe, expect, it } from 'vitest'
import { currentStreak, lastActiveDay, longestStreak } from './streak'
import { STREAK_RULES } from '../config/defaults'
import { addDays } from '../scheduler'

/**
 * **Scope 11.4's streak, at its boundaries.** CLAUDE.md section 11 makes these
 * mandatory: streak arithmetic is a pure function whose bugs are invisible on
 * screen, and a wrong streak is the one number in the app a reader would notice
 * and could not check.
 *
 * The interesting cases are all gaps: one, two, one on either side of today, and
 * a day whose only review was a whole-passage milestone. They are written
 * relative to a fixed today so that a day never has to be counted by hand.
 */

const TODAY = '2026-09-08'

/** `ago(0)` is today, `ago(1)` yesterday. Reads the way the cases are described. */
function ago(days: number): string {
  return addDays(TODAY, -days)
}

describe('currentStreak', () => {
  it('is nought with no history at all', () => {
    expect(currentStreak([], TODAY)).toBe(0)
  })

  it('counts one day for a reader who has only reviewed today', () => {
    expect(currentStreak([ago(0)], TODAY)).toBe(1)
  })

  it('counts a run of consecutive days', () => {
    expect(currentStreak([ago(4), ago(3), ago(2), ago(1), ago(0)], TODAY)).toBe(5)
  })

  it('does not count the same day twice, however many reviews it holds', () => {
    expect(currentStreak([ago(1), ago(1), ago(0), ago(0), ago(0)], TODAY)).toBe(2)
  })

  it('does not care what order the days arrive in', () => {
    expect(currentStreak([ago(0), ago(3), ago(1), ago(2)], TODAY)).toBe(4)
  })

  it('is alive on a day the reader has not started yet', () => {
    // Nothing today, reviewed yesterday. Today is not over, so nothing is missed.
    expect(currentStreak([ago(2), ago(1)], TODAY)).toBe(2)
  })

  describe('one missed day pauses the streak and does not reset it', () => {
    it('keeps a run going across a single gap', () => {
      // Missed ago(2). The run is ago(4), ago(3), ago(1), ago(0): four days.
      expect(currentStreak([ago(4), ago(3), ago(1), ago(0)], TODAY)).toBe(4)
    })

    it('does not count the missed day itself', () => {
      expect(currentStreak([ago(3), ago(1)], TODAY)).toBe(2)
    })

    it('survives yesterday having been missed, when today has been done', () => {
      expect(currentStreak([ago(2), ago(0)], TODAY)).toBe(2)
    })

    it('survives yesterday having been missed, when today has not been done yet', () => {
      // The last active day is the day before yesterday, so exactly one day -
      // yesterday - has been missed. Today is not over and is not a missed day.
      expect(currentStreak([ago(3), ago(2)], TODAY)).toBe(2)
    })
  })

  describe('two consecutive missed days reset it', () => {
    it('breaks a run across a gap of two', () => {
      // Missed ago(3) and ago(2). Only ago(1) and ago(0) are still in the run.
      expect(currentStreak([ago(6), ago(5), ago(4), ago(1), ago(0)], TODAY)).toBe(2)
    })

    it('is nought when the last active day was three days ago', () => {
      // Two whole days missed, and today does not count as a third.
      expect(currentStreak([ago(9), ago(8), ago(7), ago(3)], TODAY)).toBe(0)
    })

    it('is nought after a long absence', () => {
      expect(currentStreak([ago(90), ago(89), ago(88)], TODAY)).toBe(0)
    })
  })

  describe('a gap on either side of today', () => {
    it('counts only the days after the break', () => {
      // ago(5) then a two day hole, then ago(2), a one day hole, then ago(0).
      expect(currentStreak([ago(6), ago(5), ago(2), ago(0)], TODAY)).toBe(2)
    })

    it('is nought when the break is the most recent thing that happened', () => {
      expect(currentStreak([ago(5), ago(4), ago(3)], TODAY)).toBe(0)
    })
  })

  it('counts a day whose only review was a whole-passage milestone', () => {
    // A milestone recital writes a `review_log` row like any other (D9.3), so it
    // reaches this function as a day and nothing here can tell the difference.
    // The assertion is that the caller's day list is all this needs.
    expect(currentStreak([ago(1), ago(0)], TODAY)).toBe(2)
  })

  it('ignores days after today rather than counting them', () => {
    // Only reachable by a device clock that has moved backwards.
    expect(currentStreak([addDays(TODAY, 3), ago(0)], TODAY)).toBe(1)
  })

  it('reads its rule from config, so the pause can be tuned', () => {
    const strict = { survivableMissedDays: 0 }
    expect(currentStreak([ago(3), ago(1), ago(0)], TODAY, strict)).toBe(2)
    expect(currentStreak([ago(3), ago(1), ago(0)], TODAY)).toBe(3)
  })

  it('uses scope 11.4s rule by default', () => {
    expect(STREAK_RULES.survivableMissedDays).toBe(1)
  })
})

describe('longestStreak', () => {
  it('is nought with no history', () => {
    expect(longestStreak([])).toBe(0)
  })

  it('finds a run that has since been broken', () => {
    const days = [ago(20), ago(19), ago(18), ago(17), ago(1), ago(0)]
    expect(longestStreak(days)).toBe(4)
    expect(currentStreak(days, TODAY)).toBe(2)
  })

  it('joins runs across a single missed day, exactly as the current streak does', () => {
    expect(longestStreak([ago(20), ago(19), ago(17), ago(16)])).toBe(4)
  })
})

describe('lastActiveDay', () => {
  it('is null with no history', () => {
    expect(lastActiveDay([])).toBeNull()
  })

  it('is the most recent day, whatever order they arrive in', () => {
    expect(lastActiveDay([ago(4), ago(0), ago(2)])).toBe(ago(0))
  })
})
