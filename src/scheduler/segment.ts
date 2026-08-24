import { DEFAULT_SCHEDULER_CONFIG, type SchedulerConfig } from './config'
import { addDays, assertDay, isOnOrBefore } from './dates'
import { assertNumberAtLeast, assertWholeNumberAtLeast, roundTo } from './numbers'
import type { Day, Rating, SegmentProgress, UpkeepState } from './types'
import { effectiveIntervalDays, isQueueable } from './upkeep'

const RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy']

function assertRating(rating: Rating): Rating {
  if (!RATINGS.includes(rating)) {
    throw new RangeError(
      `Unknown self-rating: ${JSON.stringify(rating)}. Expected again, hard, good or easy.`,
    )
  }
  return rating
}

function assertSegmentProgress(progress: SegmentProgress): SegmentProgress {
  // An ease factor below 1 would shrink intervals on a successful review, which
  // is not a slow learner, it is corrupt data.
  assertNumberAtLeast('easeFactor', progress.easeFactor, 1)
  assertNumberAtLeast('intervalDays', progress.intervalDays, 0)
  assertWholeNumberAtLeast('repetitions', progress.repetitions, 0)
  assertWholeNumberAtLeast('lapses', progress.lapses, 0)
  assertDay(progress.dueDate)
  if (progress.lastReviewedAt !== null) {
    assertDay(progress.lastReviewedAt)
  }
  return progress
}

/** Keeps an interval inside one whole day and the configured ceiling. */
function clampInterval(days: number, config: SchedulerConfig): number {
  return Math.min(Math.max(Math.round(days), 1), config.maximumIntervalDays)
}

function nextEaseFactor(easeFactor: number, rating: Rating, config: SchedulerConfig): number {
  const moved = roundTo(easeFactor + config.easeFactorDeltas[rating], 3)
  return Math.max(moved, config.minimumEaseFactor)
}

/**
 * The SM-2 interval ladder. Reviews one and two use fixed steps, because two
 * data points are not enough to trust an ease factor. From the third review the
 * ease factor takes over.
 *
 * The `previous + 1` floor guarantees that a successful review always moves the
 * date further out, even for a segment sitting at the ease floor. Without it a
 * segment rated Hard forever could stand still, and standing still in a queue
 * means appearing every single day.
 */
function nextIntervalDays(
  previousIntervalDays: number,
  repetitions: number,
  rating: Rating,
  easeFactor: number,
  config: SchedulerConfig,
): number {
  if (repetitions <= 1) {
    return clampInterval(config.firstIntervalDays, config)
  }
  if (repetitions === 2) {
    return clampInterval(config.secondIntervalDays, config)
  }
  let grown: number
  switch (rating) {
    case 'hard':
      grown = previousIntervalDays * config.hardIntervalMultiplier
      break
    case 'easy':
      grown = previousIntervalDays * easeFactor * config.easyIntervalBonus
      break
    default:
      grown = previousIntervalDays * easeFactor
  }
  return clampInterval(Math.max(Math.round(grown), previousIntervalDays + 1), config)
}

/** A segment that has just been added to a passage. Due the day it is created. */
export function newSegmentProgress(
  today: Day,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): SegmentProgress {
  return {
    easeFactor: config.initialEaseFactor,
    intervalDays: 0,
    repetitions: 0,
    dueDate: assertDay(today),
    lastReviewedAt: null,
    lapses: 0,
  }
}

/**
 * Applies one self-rating to one segment and returns its new state.
 *
 * `today` is always passed in. The module never reads the clock, so a caller
 * decides what "today" means and a test can run two hundred of them in a row.
 */
export function reviewSegment(
  progress: SegmentProgress,
  rating: Rating,
  today: Day,
  upkeepState: UpkeepState = 'active',
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): SegmentProgress {
  assertSegmentProgress(progress)
  assertRating(rating)
  assertDay(today)

  const easeFactor = nextEaseFactor(progress.easeFactor, rating, config)

  if (rating === 'again') {
    const intervalDays = clampInterval(config.lapseIntervalDays, config)
    return {
      easeFactor,
      intervalDays,
      repetitions: 0,
      dueDate: addDays(today, effectiveIntervalDays(intervalDays, upkeepState, config)),
      lastReviewedAt: today,
      lapses: progress.lapses + 1,
    }
  }

  const repetitions = progress.repetitions + 1
  const intervalDays = nextIntervalDays(
    progress.intervalDays,
    repetitions,
    rating,
    easeFactor,
    config,
  )
  return {
    easeFactor,
    intervalDays,
    repetitions,
    dueDate: addDays(today, effectiveIntervalDays(intervalDays, upkeepState, config)),
    lastReviewedAt: today,
    lapses: progress.lapses,
  }
}

/**
 * Whether this segment should appear in today's queue.
 *
 * Resting is checked first: scope 8.5 says a resting passage is never queued,
 * so how overdue it looks is not a question that gets asked.
 */
export function isSegmentDue(
  progress: SegmentProgress,
  today: Day,
  upkeepState: UpkeepState = 'active',
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): boolean {
  if (!isQueueable(upkeepState, config)) {
    return false
  }
  return isOnOrBefore(progress.dueDate, assertDay(today))
}
