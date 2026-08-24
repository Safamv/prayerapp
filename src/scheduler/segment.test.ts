import { describe, expect, it } from 'vitest'
import { DEFAULT_SCHEDULER_CONFIG } from './config'
import { isSegmentDue, newSegmentProgress, reviewSegment } from './segment'
import type { Rating, SegmentProgress } from './types'

const TODAY = '2026-08-24'

/** Rate a fresh segment repeatedly, one review per day is not needed: the
 *  scheduler only cares about the day it is told. */
function rate(ratings: readonly Rating[], today = TODAY): SegmentProgress {
  let progress = newSegmentProgress(today)
  for (const rating of ratings) {
    progress = reviewSegment(progress, rating, today)
  }
  return progress
}

describe('newSegmentProgress', () => {
  it('starts at the initial ease factor with nothing learned', () => {
    expect(newSegmentProgress(TODAY)).toEqual({
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      dueDate: TODAY,
      lastReviewedAt: null,
      lapses: 0,
    })
  })

  it('is due the day it is created, because a new segment is new material', () => {
    expect(isSegmentDue(newSegmentProgress(TODAY), TODAY)).toBe(true)
  })

  it('rejects a malformed day', () => {
    expect(() => newSegmentProgress('24 August 2026')).toThrow(/YYYY-MM-DD/)
  })
})

describe('reviewSegment, rated Good throughout', () => {
  it('waits one day after the first review', () => {
    const progress = rate(['good'])
    expect(progress.intervalDays).toBe(1)
    expect(progress.repetitions).toBe(1)
    expect(progress.dueDate).toBe('2026-08-25')
    expect(progress.lastReviewedAt).toBe(TODAY)
    expect(progress.easeFactor).toBe(2.5)
  })

  it('waits six days after the second review', () => {
    const progress = rate(['good', 'good'])
    expect(progress.intervalDays).toBe(6)
    expect(progress.repetitions).toBe(2)
    expect(progress.dueDate).toBe('2026-08-30')
  })

  it('multiplies by the ease factor from the third review onward', () => {
    expect(rate(['good', 'good', 'good']).intervalDays).toBe(15)
    expect(rate(['good', 'good', 'good', 'good']).intervalDays).toBe(38)
    expect(rate(['good', 'good', 'good', 'good', 'good']).intervalDays).toBe(95)
  })

  it('leaves the ease factor untouched, because Good is the expected outcome', () => {
    expect(rate(['good', 'good', 'good', 'good']).easeFactor).toBe(2.5)
  })
})

describe('reviewSegment, rated Easy', () => {
  it('raises the ease factor', () => {
    expect(rate(['easy']).easeFactor).toBe(2.6)
    expect(rate(['easy', 'easy']).easeFactor).toBe(2.7)
  })

  it('still uses the fixed first and second intervals', () => {
    expect(rate(['easy']).intervalDays).toBe(1)
    expect(rate(['easy', 'easy']).intervalDays).toBe(6)
  })

  it('applies the easy bonus on top of the ease factor from the third review', () => {
    // 6 days * ease 2.8 * bonus 1.3, rounded.
    expect(rate(['easy', 'easy', 'easy']).intervalDays).toBe(22)
  })

  it('reaches a longer interval than Good over the same number of reviews', () => {
    const easy = rate(['easy', 'easy', 'easy', 'easy'])
    const good = rate(['good', 'good', 'good', 'good'])
    expect(easy.intervalDays).toBeGreaterThan(good.intervalDays)
  })
})

describe('reviewSegment, rated Hard', () => {
  it('lowers the ease factor without drifting into floating point noise', () => {
    expect(rate(['hard']).easeFactor).toBe(2.35)
    expect(rate(['hard', 'hard']).easeFactor).toBe(2.2)
    expect(rate(['hard', 'hard', 'hard']).easeFactor).toBe(2.05)
  })

  it('counts as a successful review, so it advances the repetition count', () => {
    expect(rate(['hard']).repetitions).toBe(1)
    expect(rate(['hard', 'hard']).repetitions).toBe(2)
  })

  it('is not a lapse', () => {
    expect(rate(['hard', 'hard', 'hard']).lapses).toBe(0)
  })

  it('grows the interval by the hard multiplier rather than the ease factor', () => {
    // 6 days * 1.2, rounded. The ease factor is not used for Hard.
    expect(rate(['good', 'good', 'hard']).intervalDays).toBe(7)
  })
})

describe('reviewSegment, rated Again', () => {
  it('drops the interval back to one day', () => {
    const progress = rate(['good', 'good', 'good', 'again'])
    expect(progress.intervalDays).toBe(1)
    expect(progress.dueDate).toBe('2026-08-25')
  })

  it('resets the repetition count, so the fixed steps are walked again', () => {
    const lapsed = rate(['good', 'good', 'good', 'again'])
    expect(lapsed.repetitions).toBe(0)
    const recovering = reviewSegment(lapsed, 'good', TODAY)
    expect(recovering.repetitions).toBe(1)
    expect(recovering.intervalDays).toBe(1)
    expect(reviewSegment(recovering, 'good', TODAY).intervalDays).toBe(6)
  })

  it('counts the lapse', () => {
    expect(rate(['good', 'good', 'again']).lapses).toBe(1)
    expect(rate(['good', 'good', 'again', 'good', 'good', 'again']).lapses).toBe(2)
  })

  it('lowers the ease factor', () => {
    expect(rate(['again']).easeFactor).toBe(2.3)
  })

  it('never drives the ease factor below its floor, however many times it is rated', () => {
    const floor = DEFAULT_SCHEDULER_CONFIG.minimumEaseFactor
    const ratings = Array.from({ length: 50 }, () => 'again' as const)
    expect(rate(ratings).easeFactor).toBe(floor)
  })

  it('still schedules a real day, so a lapsed segment reappears rather than vanishing', () => {
    const progress = rate(['again'])
    expect(isSegmentDue(progress, '2026-08-25')).toBe(true)
  })
})

describe('the invariants that keep the queue sane', () => {
  it('never produces an interval below one day', () => {
    const ratings: readonly Rating[] = ['again', 'hard', 'again', 'hard', 'hard', 'again', 'good']
    let progress = newSegmentProgress(TODAY)
    for (const rating of ratings) {
      progress = reviewSegment(progress, rating, TODAY)
      expect(progress.intervalDays).toBeGreaterThanOrEqual(1)
    }
  })

  it('never produces an interval beyond the maximum, however well rated', () => {
    const max = DEFAULT_SCHEDULER_CONFIG.maximumIntervalDays
    let progress = newSegmentProgress(TODAY)
    for (let i = 0; i < 40; i += 1) {
      progress = reviewSegment(progress, 'easy', TODAY)
      expect(progress.intervalDays).toBeLessThanOrEqual(max)
    }
    expect(progress.intervalDays).toBe(max)
  })

  it('keeps the interval at the maximum rather than shrinking once the cap is reached', () => {
    const max = DEFAULT_SCHEDULER_CONFIG.maximumIntervalDays
    const atCap: SegmentProgress = {
      easeFactor: 2.5,
      intervalDays: max,
      repetitions: 12,
      dueDate: TODAY,
      lastReviewedAt: TODAY,
      lapses: 0,
    }
    expect(reviewSegment(atCap, 'good', TODAY).intervalDays).toBe(max)
  })

  it('always grows the interval on a successful review past the fixed steps', () => {
    const worst = { ...newSegmentProgress(TODAY), easeFactor: 1.3 }
    let progress = reviewSegment(reviewSegment(worst, 'good', TODAY), 'good', TODAY)
    for (let i = 0; i < 20; i += 1) {
      const next = reviewSegment(progress, 'hard', TODAY)
      expect(next.intervalDays).toBeGreaterThan(progress.intervalDays)
      progress = next
    }
  })

  it('does not modify the state it was given', () => {
    const before = newSegmentProgress(TODAY)
    const frozen = Object.freeze({ ...before })
    reviewSegment(frozen, 'good', TODAY)
    expect(frozen).toEqual(before)
  })

  it('refuses a rating it does not recognise, rather than guessing', () => {
    const progress = newSegmentProgress(TODAY)
    expect(() => reviewSegment(progress, 'brilliant' as Rating, TODAY)).toThrow(/brilliant/)
  })

  it('refuses corrupt incoming state, rather than computing a date from it', () => {
    const corrupt: SegmentProgress = {
      easeFactor: 2.5,
      intervalDays: Number.NaN,
      repetitions: 3,
      dueDate: TODAY,
      lastReviewedAt: TODAY,
      lapses: 0,
    }
    expect(() => reviewSegment(corrupt, 'good', TODAY)).toThrow(/intervalDays/)
  })
})

describe('upkeep state and the due date', () => {
  it('schedules occasional material three times further out', () => {
    const active = reviewSegment(rate(['good']), 'good', TODAY, 'active')
    const occasional = reviewSegment(rate(['good']), 'good', TODAY, 'occasional')
    expect(active.dueDate).toBe('2026-08-30')
    expect(occasional.dueDate).toBe('2026-09-11')
  })

  it('stores the plain SM-2 interval, so occasional upkeep does not compound', () => {
    let progress = newSegmentProgress(TODAY)
    const stored: number[] = []
    const due: string[] = []
    for (let i = 0; i < 3; i += 1) {
      progress = reviewSegment(progress, 'good', TODAY, 'occasional')
      stored.push(progress.intervalDays)
      due.push(progress.dueDate)
    }
    expect(stored).toEqual([1, 6, 15])
    expect(due).toEqual(['2026-08-27', '2026-09-11', '2026-10-08'])
  })

  it('gives a resting segment the same date it would have had when active', () => {
    const resting = reviewSegment(rate(['good']), 'good', TODAY, 'resting')
    expect(resting.dueDate).toBe('2026-08-30')
  })
})

describe('isSegmentDue', () => {
  const progress = { ...newSegmentProgress(TODAY), dueDate: '2026-08-24' }

  it('is due on its due date', () => {
    expect(isSegmentDue(progress, '2026-08-24')).toBe(true)
  })

  it('is due when overdue', () => {
    expect(isSegmentDue(progress, '2026-09-30')).toBe(true)
  })

  it('is not due before its due date', () => {
    expect(isSegmentDue(progress, '2026-08-23')).toBe(false)
  })

  it('is never due while resting, however overdue it looks', () => {
    expect(isSegmentDue(progress, '2027-08-24', 'resting')).toBe(false)
  })

  it('is due while occasional, once the date has arrived', () => {
    expect(isSegmentDue(progress, '2026-08-24', 'occasional')).toBe(true)
  })
})
