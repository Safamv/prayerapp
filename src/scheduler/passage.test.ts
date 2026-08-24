import { describe, expect, it } from 'vitest'
import { isPassageDue, promoteToPassage, reviewPassage } from './passage'
import type { PassageProgress, Rating, SegmentProgress } from './types'

const TODAY = '2026-08-24'

function segment(intervalDays: number, easeFactor = 2.5, repetitions = 5): SegmentProgress {
  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueDate: TODAY,
    lastReviewedAt: TODAY,
    lapses: 0,
  }
}

describe('promoteToPassage, on reaching the milestone', () => {
  it('schedules on the slowest of its segments, so the weakest line sets the pace', () => {
    const promoted = promoteToPassage([segment(30), segment(8), segment(60)], TODAY)
    expect(promoted.passageIntervalDays).toBe(8)
    expect(promoted.passageDueDate).toBe('2026-09-01')
  })

  it('inherits the governing segment’s ease factor and repetition count', () => {
    const promoted = promoteToPassage(
      [segment(30, 2.8, 9), segment(8, 1.9, 4), segment(60, 2.5, 11)],
      TODAY,
    )
    expect(promoted.passageEaseFactor).toBe(1.9)
    expect(promoted.passageRepetitions).toBe(4)
  })

  it('breaks a tie on interval by taking the lower ease factor', () => {
    const promoted = promoteToPassage([segment(10, 2.6), segment(10, 2.1)], TODAY)
    expect(promoted.passageEaseFactor).toBe(2.1)
  })

  it('mirrors a single segment exactly', () => {
    const promoted = promoteToPassage([segment(21, 2.4, 7)], TODAY)
    expect(promoted).toEqual({
      passageEaseFactor: 2.4,
      passageIntervalDays: 21,
      passageRepetitions: 7,
      passageDueDate: '2026-09-14',
    })
  })

  it('triples the wait for occasional upkeep', () => {
    const promoted = promoteToPassage([segment(10)], TODAY, 'occasional')
    expect(promoted.passageIntervalDays).toBe(10)
    expect(promoted.passageDueDate).toBe('2026-09-23')
  })

  it('never schedules a passage today, even if a segment was never reviewed', () => {
    const promoted = promoteToPassage([segment(0, 2.5, 0), segment(40)], TODAY)
    expect(promoted.passageIntervalDays).toBe(1)
    expect(promoted.passageDueDate).toBe('2026-08-25')
  })

  it('refuses to promote a passage with no segments', () => {
    expect(() => promoteToPassage([], TODAY)).toThrow(/at least one segment/)
  })

  it('does not modify the segments it was given', () => {
    const segments = [Object.freeze(segment(30)), Object.freeze(segment(8))]
    promoteToPassage(segments, TODAY)
    expect(segments[1]?.intervalDays).toBe(8)
  })
})

describe('reviewPassage', () => {
  const promoted: PassageProgress = {
    passageEaseFactor: 2.3,
    passageIntervalDays: 8,
    passageRepetitions: 5,
    passageDueDate: TODAY,
  }

  it('keeps the passage scheduled and grows the interval when rated Good', () => {
    const result = reviewPassage(promoted, 'good', TODAY)
    expect(result.outcome).toBe('scheduled')
    expect(result.progress.passageIntervalDays).toBe(18)
    expect(result.progress.passageRepetitions).toBe(6)
    expect(result.progress.passageDueDate).toBe('2026-09-11')
  })

  it('uses the hard multiplier when rated Hard, and lowers the ease factor', () => {
    const result = reviewPassage(promoted, 'hard', TODAY)
    expect(result.outcome).toBe('scheduled')
    expect(result.progress.passageIntervalDays).toBe(10)
    expect(result.progress.passageEaseFactor).toBe(2.15)
  })

  it('applies the easy bonus when rated Easy', () => {
    const result = reviewPassage(promoted, 'easy', TODAY)
    expect(result.outcome).toBe('scheduled')
    expect(result.progress.passageIntervalDays).toBe(25)
  })

  it('demotes back to segment review when rated Again', () => {
    const result = reviewPassage(promoted, 'again', TODAY)
    expect(result.outcome).toBe('demoted')
  })

  it('returns coherent state on demotion, so nothing downstream reads a stale interval', () => {
    const result = reviewPassage(promoted, 'again', TODAY)
    expect(result.progress).toEqual({
      passageEaseFactor: 2.1,
      passageIntervalDays: 1,
      passageRepetitions: 0,
      passageDueDate: '2026-08-25',
    })
  })

  it('never drives the passage ease factor below its floor', () => {
    let progress = promoted
    for (let i = 0; i < 20; i += 1) {
      progress = reviewPassage(progress, 'again', TODAY).progress
    }
    expect(progress.passageEaseFactor).toBe(1.3)
  })

  it('honours occasional upkeep without compounding it into the stored interval', () => {
    const first = reviewPassage(promoted, 'good', TODAY, 'occasional')
    expect(first.progress.passageIntervalDays).toBe(18)
    expect(first.progress.passageDueDate).toBe('2026-10-17')
    const second = reviewPassage(first.progress, 'good', TODAY, 'occasional')
    expect(second.progress.passageIntervalDays).toBe(41)
  })

  it('refuses a rating it does not recognise', () => {
    expect(() => reviewPassage(promoted, 'perfect' as Rating, TODAY)).toThrow(/perfect/)
  })

  it('refuses corrupt incoming state', () => {
    const corrupt: PassageProgress = { ...promoted, passageIntervalDays: -3 }
    expect(() => reviewPassage(corrupt, 'good', TODAY)).toThrow(/passageIntervalDays/)
  })

  it('does not modify the state it was given', () => {
    const frozen = Object.freeze({ ...promoted })
    reviewPassage(frozen, 'good', TODAY)
    expect(frozen.passageIntervalDays).toBe(8)
  })
})

describe('isPassageDue', () => {
  const progress: PassageProgress = {
    passageEaseFactor: 2.5,
    passageIntervalDays: 10,
    passageRepetitions: 6,
    passageDueDate: '2026-08-24',
  }

  it('is due on and after its due date', () => {
    expect(isPassageDue(progress, '2026-08-24')).toBe(true)
    expect(isPassageDue(progress, '2026-12-01')).toBe(true)
  })

  it('is not due before its due date', () => {
    expect(isPassageDue(progress, '2026-08-23')).toBe(false)
  })

  it('is never due while resting', () => {
    expect(isPassageDue(progress, '2027-01-01', 'resting')).toBe(false)
  })
})
