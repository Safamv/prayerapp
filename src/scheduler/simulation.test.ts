import { describe, expect, it } from 'vitest'
import { DEFAULT_SCHEDULER_CONFIG } from './config'
import { addDays, daysBetween } from './dates'
import { isSegmentDue, newSegmentProgress, reviewSegment } from './segment'
import type { Rating, SegmentProgress, UpkeepState } from './types'

/**
 * A synthetic run over 250 consecutive days.
 *
 * This is the cheapest possible answer to "do the intervals feel right", and it
 * arrives before anything has been built on top of an answer of no. No clock is
 * involved: the simulation simply hands the scheduler each day in turn.
 */

const START_DAY = '2026-08-24'
const DAYS = 250

/**
 * A deterministic pseudo-random source, so the run is reproducible.
 *
 * xorshift32 rather than a classic linear congruential generator: the usual
 * `state * 1103515245` exceeds the range JavaScript numbers hold exactly, so it
 * silently degenerates. Every operation here is 32 bit integer arithmetic.
 */
function seededFraction(seed: number): () => number {
  let state = seed | 0
  return () => {
    state ^= state << 13
    state |= 0
    state ^= state >>> 17
    state ^= state << 5
    state |= 0
    return ((state >>> 0) % 1_000_000) / 1_000_000
  }
}

interface Learner {
  readonly name: string
  readonly upkeepState: UpkeepState
  readonly rate: (reviewNumber: number) => Rating
}

interface Review {
  readonly reviewNumber: number
  readonly dayNumber: number
  readonly day: string
  readonly rating: Rating
  readonly progress: SegmentProgress
}

const erratic = seededFraction(20260824)

const LEARNERS: readonly Learner[] = [
  { name: 'always Good', upkeepState: 'active', rate: () => 'good' },
  {
    name: 'mostly Easy',
    upkeepState: 'active',
    rate: (n) => (n % 4 === 0 ? 'good' : 'easy'),
  },
  {
    name: 'mostly Hard, lapsing every third review',
    upkeepState: 'active',
    rate: (n) => (n % 3 === 0 ? 'again' : 'hard'),
  },
  {
    name: 'good then one bad day then good again',
    upkeepState: 'active',
    rate: (n) => (n === 4 ? 'again' : 'good'),
  },
  {
    name: 'erratic',
    upkeepState: 'active',
    rate: () => {
      const roll = erratic()
      if (roll < 0.25) return 'again'
      if (roll < 0.5) return 'hard'
      if (roll < 0.85) return 'good'
      return 'easy'
    },
  },
  { name: 'always Good, occasional upkeep', upkeepState: 'occasional', rate: () => 'good' },
  { name: 'always Good, resting', upkeepState: 'resting', rate: () => 'good' },
]

/** Runs one learner through `DAYS` consecutive days and records every review. */
function simulate(learner: Learner): Review[] {
  let progress = newSegmentProgress(START_DAY)
  const reviews: Review[] = []
  for (let dayNumber = 0; dayNumber < DAYS; dayNumber += 1) {
    const day = addDays(START_DAY, dayNumber)
    if (!isSegmentDue(progress, day, learner.upkeepState)) {
      continue
    }
    const reviewNumber = reviews.length + 1
    const rating = learner.rate(reviewNumber)
    progress = reviewSegment(progress, rating, day, learner.upkeepState)
    reviews.push({ reviewNumber, dayNumber, day, rating, progress })
  }
  return reviews
}

const runs = new Map(LEARNERS.map((learner) => [learner.name, simulate(learner)]))

function reviewsFor(name: string): Review[] {
  const reviews = runs.get(name)
  if (reviews === undefined) {
    throw new Error(`No simulation recorded for ${name}`)
  }
  return reviews
}

function intervalTable(name: string): string {
  const rows = reviewsFor(name).map((review) => {
    const columns = [
      String(review.reviewNumber).padStart(3),
      String(review.dayNumber).padStart(4),
      review.rating.padEnd(6),
      String(review.progress.intervalDays).padStart(6),
      review.progress.easeFactor.toFixed(2).padStart(6),
      String(review.progress.lapses).padStart(3),
      review.progress.dueDate,
    ]
    return `  ${columns.join('  ')}`
  })
  const header = `  ${['  #'.padStart(3), ' day'.padStart(4), 'rating'.padEnd(6), 'interv'.padStart(6), '  ease'.padStart(6), 'lap'.padStart(3), 'next due'].join('  ')}`
  return [`\n${name} — ${rows.length} reviews in ${DAYS} days`, header, ...rows].join('\n')
}

describe('a 250 day simulation', () => {
  it('reviews every learner at least a handful of times, so the run is not empty', () => {
    const counts = LEARNERS.filter((learner) => learner.upkeepState !== 'resting').map(
      (learner) => reviewsFor(learner.name).length,
    )
    for (const count of counts) {
      expect(count).toBeGreaterThan(4)
    }
    expect(counts.reduce((total, count) => total + count, 0)).toBeGreaterThan(60)
  })

  it('never produces an interval that is negative, zero, fractional or unbounded', () => {
    const { maximumIntervalDays } = DEFAULT_SCHEDULER_CONFIG
    for (const learner of LEARNERS) {
      for (const review of reviewsFor(learner.name)) {
        expect(Number.isInteger(review.progress.intervalDays)).toBe(true)
        expect(review.progress.intervalDays).toBeGreaterThanOrEqual(1)
        expect(review.progress.intervalDays).toBeLessThanOrEqual(maximumIntervalDays)
      }
    }
  })

  it('never schedules a segment for the same day it was just reviewed', () => {
    for (const learner of LEARNERS) {
      for (const review of reviewsFor(learner.name)) {
        expect(daysBetween(review.day, review.progress.dueDate)).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('keeps every ease factor at or above the floor, and finite', () => {
    const { minimumEaseFactor } = DEFAULT_SCHEDULER_CONFIG
    for (const learner of LEARNERS) {
      for (const review of reviewsFor(learner.name)) {
        expect(review.progress.easeFactor).toBeGreaterThanOrEqual(minimumEaseFactor)
        expect(Number.isFinite(review.progress.easeFactor)).toBe(true)
      }
    }
  })

  it('grows the interval on every successful review of a well-rated segment', () => {
    const reviews = reviewsFor('always Good')
    for (let i = 1; i < reviews.length; i += 1) {
      const previous = reviews[i - 1]
      const current = reviews[i]
      expect(previous).toBeDefined()
      expect(current).toBeDefined()
      expect(current?.progress.intervalDays).toBeGreaterThan(previous?.progress.intervalDays ?? 0)
    }
  })

  it('resets a lapsed segment to a single day and counts the lapse', () => {
    const reviews = reviewsFor('good then one bad day then good again')
    const lapse = reviews.find((review) => review.rating === 'again')
    expect(lapse).toBeDefined()
    expect(lapse?.progress.intervalDays).toBe(1)
    expect(lapse?.progress.repetitions).toBe(0)
    expect(lapse?.progress.lapses).toBe(1)
  })

  it('rebuilds the interval after a lapse rather than leaving it stuck at one day', () => {
    const reviews = reviewsFor('good then one bad day then good again')
    const lapseIndex = reviews.findIndex((review) => review.rating === 'again')
    const after = reviews.slice(lapseIndex + 1).map((review) => review.progress.intervalDays)
    // 1, 6, then 6 x the ease factor. The third step is 14 rather than the 15 a
    // fresh segment would get, because the lapse cost the segment 0.2 of ease.
    // Recovery is deliberately a little slower than starting out.
    expect(after.slice(0, 3)).toEqual([1, 6, 14])
  })

  it('asks less of a well-rated segment than of a struggling one', () => {
    const good = reviewsFor('always Good').length
    const struggling = reviewsFor('mostly Hard, lapsing every third review').length
    expect(good).toBeLessThan(struggling)
    // A segment rated Good every time should be a handful of reviews across
    // eight months, not a weekly chore.
    expect(good).toBeLessThan(12)
  })

  it('asks less again of a segment rated Easy', () => {
    expect(reviewsFor('mostly Easy').length).toBeLessThanOrEqual(reviewsFor('always Good').length)
  })

  it('reviews occasional upkeep material markedly less often than active', () => {
    const active = reviewsFor('always Good').length
    const occasional = reviewsFor('always Good, occasional upkeep').length
    expect(occasional).toBeLessThan(active)
  })

  it('never queues a resting segment, across all 250 days', () => {
    expect(reviewsFor('always Good, resting')).toEqual([])
  })

  it('counts exactly one lapse per Again, never double counting or resetting', () => {
    const reviews = reviewsFor('erratic')
    const agains = reviews.filter((review) => review.rating === 'again').length
    const last = reviews.at(-1)
    expect(agains).toBeGreaterThan(0)
    expect(last?.progress.lapses).toBe(agains)
  })

  it('prints the growth curves for eyeballing', () => {
    const report = [
      intervalTable('always Good'),
      intervalTable('mostly Hard, lapsing every third review'),
      intervalTable('always Good, occasional upkeep'),
      '',
      '  Reviews required over 250 days:',
      ...LEARNERS.map(
        (learner) =>
          `    ${learner.name.padEnd(42)} ${String(reviewsFor(learner.name).length).padStart(3)}`,
      ),
      '',
    ].join('\n')
    console.log(report)
    expect(report).toContain('always Good')
  })
})
