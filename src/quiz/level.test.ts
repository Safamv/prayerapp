import { describe, expect, it } from 'vitest'
import { HIGHEST_LEVEL_BUILT, masteryLevel, servedLevel } from './level'
import type { SegmentProgress } from '../scheduler'

/**
 * Which rung of scope 9.1's ladder a line is served at. Decision D8.2: one rung
 * per correct review, chosen by Safa.
 *
 * The second block is the one that matters most. A lapse is not handled here at
 * all: the scheduler sets `repetitions` back to nought (decision D1.5) and the
 * ladder simply reads it, so "forgetting a line puts it back to reading it" is
 * a consequence rather than a rule, and these tests hold it in place.
 */

function progressAfter(repetitions: number): SegmentProgress {
  return {
    easeFactor: 2.5,
    intervalDays: 6,
    repetitions,
    dueDate: '2026-09-08',
    lastReviewedAt: '2026-09-02',
    lapses: 0,
  }
}

/** Material that refuses nothing, so a test of the ladder tests only the ladder. */
const ROOMY = { linesInGroup: 5, line: 'Blessed is the spot and the house and the place' }

describe('masteryLevel', () => {
  it('starts a line that has never been met at level 1', () => {
    expect(masteryLevel(null)).toBe(1)
    expect(masteryLevel(progressAfter(0))).toBe(1)
  })

  it('climbs one rung per correct review', () => {
    expect(masteryLevel(progressAfter(1))).toBe(2)
    expect(masteryLevel(progressAfter(2))).toBe(3)
    expect(masteryLevel(progressAfter(3))).toBe(4)
    expect(masteryLevel(progressAfter(4))).toBe(5)
    expect(masteryLevel(progressAfter(5))).toBe(6)
  })

  it('stops at the top of the ladder rather than running off it', () => {
    expect(masteryLevel(progressAfter(9))).toBe(6)
    expect(masteryLevel(progressAfter(200))).toBe(6)
  })

  it('puts a lapsed line back to reading it', () => {
    // Decision D1.5: rating Again sets repetitions to nought. This is the whole
    // of what a lapse does to the ladder, and it is deliberate.
    expect(masteryLevel({ ...progressAfter(0), lapses: 3, easeFactor: 1.9 })).toBe(1)
  })
})

describe('servedLevel', () => {
  it('serves the rung the ladder gives, when nothing is in the way', () => {
    expect(servedLevel(progressAfter(1), ROOMY)).toBe(2)
    expect(servedLevel(progressAfter(2), ROOMY)).toBe(3)
    expect(servedLevel(progressAfter(3), ROOMY)).toBe(4)
  })

  it('holds at the highest rung that has been built, which is now the last one', () => {
    // Session 9 raised the ceiling from 4 to 6 and the ladder is finished. The
    // constant stays because it is what a `[v1.1]` rung would lower again, and
    // because a reader who has climbed past the top must always meet the top
    // rather than a blank screen.
    expect(HIGHEST_LEVEL_BUILT).toBe(6)
    expect(servedLevel(progressAfter(4), ROOMY)).toBe(5)
    expect(servedLevel(progressAfter(5), ROOMY)).toBe(6)
    expect(servedLevel(progressAfter(7), ROOMY)).toBe(6)
    expect(servedLevel(progressAfter(40), ROOMY)).toBe(6)
  })

  it('still holds at a lower ceiling, which is how session 8 shipped four rungs', () => {
    expect(servedLevel(progressAfter(4), ROOMY, 4)).toBe(4)
    expect(servedLevel(progressAfter(9), ROOMY, 4)).toBe(4)
  })

  it('lets the top two rungs take a line the lower ones would refuse', () => {
    // A one word line on its own has nowhere to hide a blank and nothing to be
    // put in an order with, so every rung between the first and the fifth falls
    // back to reading it. It can still be recited, so the top two stand.
    const tiny = { linesInGroup: 1, line: 'Amen.' }
    expect(servedLevel(progressAfter(2), tiny)).toBe(1)
    expect(servedLevel(progressAfter(3), tiny)).toBe(1)
    expect(servedLevel(progressAfter(4), tiny)).toBe(5)
    expect(servedLevel(progressAfter(5), tiny)).toBe(6)
  })

  it('drops to the heavy cloze when there are too few lines to put in order', () => {
    expect(servedLevel(progressAfter(3), { ...ROOMY, linesInGroup: 2 })).toBe(3)
    expect(servedLevel(progressAfter(3), { ...ROOMY, linesInGroup: 1 })).toBe(3)
    expect(servedLevel(progressAfter(3), { ...ROOMY, linesInGroup: 3 })).toBe(4)
  })

  it('drops to reading a line that has nowhere to hide a blank', () => {
    expect(servedLevel(progressAfter(1), { linesInGroup: 5, line: 'Amen.' })).toBe(1)
    expect(servedLevel(progressAfter(2), { linesInGroup: 5, line: '— …' })).toBe(1)
    // Three letters is the floor rather than the preference, so a line of very
    // short words is still a cloze rather than a line you only read.
    expect(servedLevel(progressAfter(2), { linesInGroup: 5, line: 'O my God!' })).toBe(3)
  })

  it('never serves a rung below the first', () => {
    expect(servedLevel(null, { linesInGroup: 1, line: '' })).toBe(1)
  })
})
