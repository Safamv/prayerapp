import { describe, expect, it } from 'vitest'
import {
  freshnessCounts,
  lapseCount,
  longestIntervalDays,
  passageFreshness,
  segmentFreshness,
} from './freshness'
import type { PassageFreshnessInput, SegmentFreshnessInput } from './types'
import { FRESHNESS_FADING_REMAINDER } from '../config/defaults'
import { addDays, newSegmentProgress, reviewSegment, type SegmentProgress } from '../scheduler'

/**
 * **Design-tokens 4's four states, derived.** CLAUDE.md section 11 makes these
 * mandatory alongside the scheduler's own, and for the same reason: this is
 * arithmetic over stored columns, so it is testable against synthetic state and
 * a bug in it is invisible on screen.
 *
 * The states are asserted by their token labels. **The third is `needsReview`
 * and never `lapsed`** (scope 11.5, design-tokens 4's first hard rule), and a
 * test naming it is one more place the deleted word cannot come back through.
 */

const TODAY = '2026-09-08'

/** A line resting `interval` days, last reviewed `reviewedAgo` days ago. */
function line(interval: number, reviewedAgo: number, lapses = 0): SegmentProgress {
  return {
    easeFactor: 2.5,
    intervalDays: interval,
    repetitions: 2,
    dueDate: addDays(TODAY, interval - reviewedAgo),
    lastReviewedAt: addDays(TODAY, -reviewedAgo),
    lapses,
  }
}

function segments(...progress: (SegmentProgress | null)[]): SegmentFreshnessInput[] {
  return progress.map((entry) => ({ progress: entry }))
}

function passage(overrides: Partial<PassageFreshnessInput> = {}): PassageFreshnessInput {
  return { upkeepState: 'active', passage: null, segments: [], ...overrides }
}

describe('segmentFreshness', () => {
  it('is resting whenever the passage is at rest, whatever the dates say', () => {
    // Scope 8.5: a resting passage "never decays into needs review".
    expect(segmentFreshness({ progress: line(6, 90) }, TODAY, 'resting')).toBe('resting')
    expect(segmentFreshness({ progress: null }, TODAY, 'resting')).toBe('resting')
  })

  it('is needsReview for a line the app has never shown the reader', () => {
    expect(segmentFreshness({ progress: null }, TODAY, 'active')).toBe('needsReview')
  })

  it('is needsReview for a fresh row that has never been reviewed', () => {
    expect(segmentFreshness({ progress: newSegmentProgress(TODAY) }, TODAY, 'active')).toBe(
      'needsReview',
    )
  })

  it('is needsReview once the day it was asked for has passed', () => {
    expect(segmentFreshness({ progress: line(6, 7) }, TODAY, 'active')).toBe('needsReview')
    expect(segmentFreshness({ progress: line(6, 60) }, TODAY, 'active')).toBe('needsReview')
  })

  it('is fading on the day it falls due, not needsReview', () => {
    // The app is asking for it today and nothing has been missed. Principle 7.1.
    expect(segmentFreshness({ progress: line(6, 6) }, TODAY, 'active')).toBe('fading')
  })

  it('is fading through the last quarter of its rest', () => {
    // Six days: a quarter is 1.5, so one day left fades and two do not.
    expect(segmentFreshness({ progress: line(6, 5) }, TODAY, 'active')).toBe('fading')
    expect(segmentFreshness({ progress: line(6, 4) }, TODAY, 'active')).toBe('strong')
  })

  it('is strong the day a line is reviewed', () => {
    expect(segmentFreshness({ progress: line(6, 0) }, TODAY, 'active')).toBe('strong')
    expect(segmentFreshness({ progress: line(30, 0) }, TODAY, 'active')).toBe('strong')
  })

  it('is strong on a one day interval until the day it falls due', () => {
    // The shortest interval there is. It must not read as permanently fading.
    expect(segmentFreshness({ progress: line(1, 0) }, TODAY, 'active')).toBe('strong')
    expect(segmentFreshness({ progress: line(1, 1) }, TODAY, 'active')).toBe('fading')
    expect(segmentFreshness({ progress: line(1, 2) }, TODAY, 'active')).toBe('needsReview')
  })

  it('scales the fading window with the interval', () => {
    // A month's rest fades for its last week, not for its last day.
    expect(segmentFreshness({ progress: line(28, 21) }, TODAY, 'active')).toBe('fading')
    expect(segmentFreshness({ progress: line(28, 20) }, TODAY, 'active')).toBe('strong')
  })

  it('measures an occasional passage against its tripled rest', () => {
    // Decision D1.1 keeps the multiplier out of the stored interval and applies
    // it to the date. Without `effectiveIntervalDays` here, a six day interval
    // eighteen days out would read as strong for its whole life.
    const occasional: SegmentProgress = { ...line(6, 0), dueDate: addDays(TODAY, 18) }
    expect(segmentFreshness({ progress: occasional }, TODAY, 'occasional')).toBe('strong')

    const nearlyDue: SegmentProgress = { ...line(6, 0), dueDate: addDays(TODAY, 4) }
    expect(segmentFreshness({ progress: nearlyDue }, TODAY, 'occasional')).toBe('fading')
    // The same date on an active passage is comfortably strong.
    expect(segmentFreshness({ progress: nearlyDue }, TODAY, 'active')).toBe('strong')
  })

  it('takes its threshold as an argument, so it is tuneable from config', () => {
    expect(segmentFreshness({ progress: line(6, 4) }, TODAY, 'active', 0.4)).toBe('fading')
    expect(FRESHNESS_FADING_REMAINDER).toBe(0.25)
  })

  it('agrees with the scheduler about a line walked through real reviews', () => {
    // Synthetic state built by the scheduler rather than by hand, so the two
    // cannot drift about what an interval means.
    let progress = reviewSegment(newSegmentProgress(TODAY), 'good', TODAY, 'active')
    expect(segmentFreshness({ progress }, TODAY, 'active')).toBe('strong')

    const due = progress.dueDate
    expect(segmentFreshness({ progress }, due, 'active')).toBe('fading')
    expect(segmentFreshness({ progress }, addDays(due, 1), 'active')).toBe('needsReview')

    progress = reviewSegment(progress, 'good', due, 'active')
    expect(segmentFreshness({ progress }, due, 'active')).toBe('strong')
  })
})

describe('passageFreshness', () => {
  it('is resting when the reader has put the passage at rest', () => {
    const input = passage({ upkeepState: 'resting', segments: segments(line(6, 90)) })
    expect(passageFreshness(input, TODAY)).toBe('resting')
  })

  it('is needsReview for a passage with no lines yet', () => {
    expect(passageFreshness(passage(), TODAY)).toBe('needsReview')
  })

  it('is needsReview for a passage just added, whose lines have not been shown', () => {
    expect(passageFreshness(passage({ segments: segments(null, null, null) }), TODAY)).toBe(
      'needsReview',
    )
  })

  it('is its weakest line', () => {
    const input = passage({ segments: segments(line(30, 0), line(30, 0), line(6, 5)) })
    expect(passageFreshness(input, TODAY)).toBe('fading')

    const worse = passage({ segments: segments(line(30, 0), line(6, 9)) })
    expect(passageFreshness(worse, TODAY)).toBe('needsReview')
  })

  it('is strong only when every line is', () => {
    expect(passageFreshness(passage({ segments: segments(line(30, 0), line(30, 1)) }), TODAY)).toBe(
      'strong',
    )
  })

  it('reads a promoted passage from its card and not from its lines', () => {
    // Scope 8.7: after promotion the lines are retained but not surfaced, and
    // none of them has been reviewed since. Read from the lines, a passage
    // memorised a fortnight ago would show as needing review the next morning.
    const input = passage({
      passage: {
        passageEaseFactor: 2.5,
        passageIntervalDays: 30,
        passageRepetitions: 3,
        passageDueDate: addDays(TODAY, 28),
      },
      segments: segments(line(6, 40), line(6, 40)),
    })
    expect(passageFreshness(input, TODAY)).toBe('strong')
  })

  it('lets a promoted passage fall due and go past like anything else', () => {
    const card = {
      passageEaseFactor: 2.5,
      passageIntervalDays: 30,
      passageRepetitions: 3,
      passageDueDate: TODAY,
    }
    expect(passageFreshness(passage({ passage: card }), TODAY)).toBe('fading')
    expect(passageFreshness(passage({ passage: card }), addDays(TODAY, 1), 0.25)).toBe(
      'needsReview',
    )
  })

  it('rests a promoted passage as readily as any other', () => {
    const input = passage({
      upkeepState: 'resting',
      passage: {
        passageEaseFactor: 2.5,
        passageIntervalDays: 30,
        passageRepetitions: 3,
        passageDueDate: addDays(TODAY, -60),
      },
    })
    expect(passageFreshness(input, TODAY)).toBe('resting')
  })
})

describe('freshnessCounts', () => {
  it('reports every state, including the ones at nought', () => {
    const input = passage({ segments: segments(line(30, 0), line(6, 5), line(6, 9), null) })
    expect(freshnessCounts(input, TODAY)).toEqual({
      strong: 1,
      fading: 1,
      needsReview: 2,
      resting: 0,
    })
  })

  it('is empty of everything for a passage with no lines', () => {
    expect(freshnessCounts(passage(), TODAY)).toEqual({
      strong: 0,
      fading: 0,
      needsReview: 0,
      resting: 0,
    })
  })

  it('counts every line of a resting passage as resting', () => {
    const input = passage({ upkeepState: 'resting', segments: segments(line(6, 90), null) })
    expect(freshnessCounts(input, TODAY)).toMatchObject({ resting: 2, needsReview: 0 })
  })
})

describe('longestIntervalDays', () => {
  it('is null before anything has settled into an interval', () => {
    expect(longestIntervalDays(passage())).toBeNull()
    expect(longestIntervalDays(passage({ segments: segments(null, null) }))).toBeNull()
    expect(
      longestIntervalDays(passage({ segments: segments(newSegmentProgress(TODAY)) })),
    ).toBeNull()
  })

  it('is the largest interval among the lines', () => {
    const input = passage({ segments: segments(line(6, 0), line(21, 0), line(1, 0)) })
    expect(longestIntervalDays(input)).toBe(21)
  })

  it('includes a promoted passage own card', () => {
    const input = passage({
      passage: {
        passageEaseFactor: 2.5,
        passageIntervalDays: 90,
        passageRepetitions: 4,
        passageDueDate: addDays(TODAY, 10),
      },
      segments: segments(line(21, 0)),
    })
    expect(longestIntervalDays(input)).toBe(90)
  })

  it('reports the plain interval and not the tripled one', () => {
    // Scope 8.5's multiplier is the reader's own instruction about how often
    // they want to see it. Crediting it as an interval reached would credit
    // the setting rather than the reader, and moving back to active would
    // shorten a number meant to be a high-water mark.
    const input = passage({ upkeepState: 'occasional', segments: segments(line(6, 0)) })
    expect(longestIntervalDays(input)).toBe(6)
  })
})

describe('lapseCount', () => {
  it('is nought for a passage nothing has gone wrong with', () => {
    expect(lapseCount(passage({ segments: segments(line(6, 0), null) }))).toBe(0)
  })

  it('adds up every line that has gone back to the beginning', () => {
    const input = passage({ segments: segments(line(6, 0, 2), line(1, 0, 1), null) })
    expect(lapseCount(input)).toBe(3)
  })
})
