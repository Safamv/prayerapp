import { today as todayOf } from './clock'
import { db } from './db'
import { fromSchedulerSegmentProgress, toSchedulerSegmentProgress } from './progressMapping'
import { appendReviewLog } from './reviewLog'
import { getSegmentProgress, putSegmentProgress } from './segmentProgress'
import type { Day, QuizType, SelfRating } from './types'
import type { QuizLevel } from '../quiz'
import { newSegmentProgress, reviewSegment } from '../scheduler'

/**
 * **The write a finished line makes.** Scope 9.6.
 *
 * > *Again, Hard, Good, Easy*, chosen after the reveal. This is the only input
 * > to SM-2. Nothing is auto-scored.
 *
 * `reviewSegment` has been written and called by nothing since session 1. This
 * is the caller. It is the entire join between the quiz and the scheduler, and
 * it is deliberately small: read the row, rename the six fields, call the pure
 * function, write back what it returns. **No scheduling arithmetic happens
 * here.** The multiplier for an occasional passage, the ease floor, the one day
 * and six day steps are all inside `src/scheduler/`, which is sealed.
 *
 * ## Two rows, one act
 *
 * A completed review writes `segment_progress` - the new ease, interval,
 * repetition count and due date - and appends to `review_log`. They are one act,
 * so they are one transaction. The log landing without the progress would give a
 * streak that counts a review the queue will offer again tomorrow.
 *
 * The log exists because it is the one thing a change of scheduler cannot
 * reconstruct afterwards. Session 10 derives the streak from it rather than from
 * a running counter, so a missed write cannot leave a streak permanently wrong.
 *
 * ## The third write, which is a column and not a row
 *
 * A passage whose first line has just been reviewed stops being something you
 * intend to learn and starts being something you are learning, so
 * `user_prayers.status` moves from `list` to `learning` (scope section 10's own
 * three values). Nothing reads it yet; session 10's passage detail will. It is
 * written now because a column that says `list` about a passage you have
 * reviewed twenty times is a column that lies, and because it costs one update
 * inside a transaction that is already open. See decision D8.5.
 *
 * ## A memorisation module
 *
 * Nothing under `src/features/discover/` may import it (principle 7.6).
 */

/** Scope section 10's `review_log.quiz_type`, from the rung of the ladder. */
function quizTypeOf(level: QuizLevel): QuizType {
  return `level${String(level)}` as QuizType
}

export interface FinishedLine {
  readonly passageId: string
  readonly segmentId: string
  /** The rung it was served at, which is what the log records. */
  readonly level: QuizLevel
  /** The reader's own rating. The only thing the scheduler is ever told. */
  readonly rating: SelfRating
}

/**
 * Applies one self-rating and records it.
 *
 * A line met for the first time has no `segment_progress` row, so it is handed a
 * fresh state and reviewed like any other. That is deliberate: a separate branch
 * for the first review is a second copy of the ladder's first step, and the two
 * copies would drift.
 *
 * The passage's upkeep state is passed to the scheduler so that an occasional
 * passage's next date is three times further out (scope 8.5). It is applied to
 * the date and never stored in the interval, which is decision D1.1 and is what
 * makes moving a passage back to active lose nothing.
 */
export async function recordReview(
  userId: string,
  finished: FinishedLine,
  today: Day = todayOf(),
): Promise<void> {
  const prayer = await db.user_prayers
    .where('[user_id+passage_id]')
    .equals([userId, finished.passageId])
    .first()
  const existing = await getSegmentProgress(userId, finished.segmentId)

  const before =
    existing === undefined ? newSegmentProgress(today) : toSchedulerSegmentProgress(existing)
  const after = reviewSegment(before, finished.rating, today, prayer?.upkeep_state ?? 'active')

  await db.transaction('rw', db.segment_progress, db.review_log, db.user_prayers, async () => {
    await putSegmentProgress(userId, finished.segmentId, fromSchedulerSegmentProgress(after))
    await appendReviewLog(userId, {
      segmentId: finished.segmentId,
      quizType: quizTypeOf(finished.level),
      selfRating: finished.rating,
    })
    if (prayer !== undefined && prayer.status === 'list') {
      await db.user_prayers.update(prayer.id, { status: 'learning' })
    }
  })
}
