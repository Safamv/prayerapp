import { DEFAULT_SCHEDULER_CONFIG, type SchedulerConfig } from './config'
import { addDays, assertDay, isOnOrBefore } from './dates'
import { assertNumberAtLeast, assertWholeNumberAtLeast } from './numbers'
import { reviewSegment } from './segment'
import type {
  Day,
  PassageProgress,
  PassageReviewOutcome,
  Rating,
  SegmentProgress,
  UpkeepState,
} from './types'
import { effectiveIntervalDays, isQueueable } from './upkeep'

function assertPassageProgress(progress: PassageProgress): PassageProgress {
  assertNumberAtLeast('passageEaseFactor', progress.passageEaseFactor, 1)
  assertNumberAtLeast('passageIntervalDays', progress.passageIntervalDays, 0)
  assertWholeNumberAtLeast('passageRepetitions', progress.passageRepetitions, 0)
  assertDay(progress.passageDueDate)
  return progress
}

/**
 * The segment that sets the pace for the whole passage.
 *
 * Scope 8.7 says the promoted passage schedules on the slowest of its segments'
 * intervals. The slowest segment is the one that still needs seeing most often,
 * which is the one with the shortest interval. Reading it the other way round
 * would let a passage with one shaky line disappear for months, which would
 * empty out the freshness states that section 11 depends on.
 *
 * A tie goes to the lower ease factor, because between two segments due equally
 * soon the harder one is the one that will lapse.
 */
function governingSegment(segments: readonly SegmentProgress[]): SegmentProgress {
  const [first, ...rest] = segments
  if (first === undefined) {
    throw new RangeError('A passage needs at least one segment before it can be promoted.')
  }
  return rest.reduce((slowest, candidate) => {
    if (candidate.intervalDays < slowest.intervalDays) {
      return candidate
    }
    if (candidate.intervalDays === slowest.intervalDays) {
      return candidate.easeFactor < slowest.easeFactor ? candidate : slowest
    }
    return slowest
  }, first)
}

/**
 * Scope 8.7. On reaching the milestone the passage becomes a single card.
 *
 * Segment state is retained by the caller and simply stops being surfaced, so a
 * later demotion resumes rather than restarts.
 */
export function promoteToPassage(
  segments: readonly SegmentProgress[],
  today: Day,
  upkeepState: UpkeepState = 'active',
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): PassageProgress {
  assertDay(today)
  const governing = governingSegment(segments)
  const passageIntervalDays = Math.min(
    Math.max(Math.round(governing.intervalDays), 1),
    config.maximumIntervalDays,
  )
  return {
    passageEaseFactor: governing.easeFactor,
    passageIntervalDays,
    passageRepetitions: governing.repetitions,
    passageDueDate: addDays(today, effectiveIntervalDays(passageIntervalDays, upkeepState, config)),
  }
}

/**
 * Applies one self-rating to a promoted whole-passage card.
 *
 * The arithmetic is `reviewSegment`'s, deliberately. A whole-passage card is
 * scheduled the same way a segment is; only the demotion rule differs. Sharing
 * the code means the two can never drift apart, and swapping SM-2 for FSRS
 * later remains one change rather than two.
 *
 * Scope 8.7: a rating of Again demotes the passage back to segment review. That
 * is a change of status rather than a shorter interval, so it is reported as an
 * outcome and left for the caller to act on.
 */
export function reviewPassage(
  progress: PassageProgress,
  rating: Rating,
  today: Day,
  upkeepState: UpkeepState = 'active',
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): PassageReviewOutcome {
  assertPassageProgress(progress)

  const asSegment: SegmentProgress = {
    easeFactor: progress.passageEaseFactor,
    intervalDays: progress.passageIntervalDays,
    repetitions: progress.passageRepetitions,
    dueDate: progress.passageDueDate,
    lastReviewedAt: null,
    lapses: 0,
  }
  const reviewed = reviewSegment(asSegment, rating, today, upkeepState, config)
  const next: PassageProgress = {
    passageEaseFactor: reviewed.easeFactor,
    passageIntervalDays: reviewed.intervalDays,
    passageRepetitions: reviewed.repetitions,
    passageDueDate: reviewed.dueDate,
  }

  return rating === 'again'
    ? { outcome: 'demoted', progress: next }
    : { outcome: 'scheduled', progress: next }
}

/** Whether the promoted whole-passage card should appear in today's queue. */
export function isPassageDue(
  progress: PassageProgress,
  today: Day,
  upkeepState: UpkeepState = 'active',
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): boolean {
  if (!isQueueable(upkeepState, config)) {
    return false
  }
  return isOnOrBefore(progress.passageDueDate, assertDay(today))
}
