import { nowInstant } from './clock'
import { db } from './db'
import { newId } from './ids'
import type { QuizType, ReviewLogRow, SelfRating } from './types'

/**
 * `review_log`: one row per completed review, append-only.
 *
 * A memorisation table, not importable from Discover.
 *
 * Scope 9.7 removed `auto_score` from this table. Nothing here is graded by the
 * app: the only judgement recorded is the user's own rating of themselves
 * (scope 9.6, principle 7.2). The log exists so that session 9 can derive the
 * streak and so that a future FSRS swap has a real review history to work from,
 * which is the one thing a scheduler change cannot reconstruct afterwards.
 */

export async function appendReviewLog(
  userId: string,
  entry: { segmentId: string; quizType: QuizType; selfRating: SelfRating },
  createdAt: string = nowInstant(),
): Promise<ReviewLogRow> {
  const row: ReviewLogRow = {
    id: newId(),
    user_id: userId,
    segment_id: entry.segmentId,
    quiz_type: entry.quizType,
    self_rating: entry.selfRating,
    created_at: createdAt,
  }
  await db.review_log.put(row)
  return row
}

/** Oldest first, because a review history is read forwards. */
export async function listReviewLog(userId: string): Promise<ReviewLogRow[]> {
  const rows = await db.review_log.where('user_id').equals(userId).toArray()
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
}

/**
 * Reviews recorded between two instants, inclusive of both ends. Session 9
 * derives the streak from this rather than from a running counter, so a missed
 * write cannot leave a streak permanently wrong.
 */
export async function listReviewLogBetween(
  userId: string,
  from: string,
  to: string,
): Promise<ReviewLogRow[]> {
  const rows = await db.review_log
    .where('[user_id+created_at]')
    .between([userId, from], [userId, to], true, true)
    .toArray()
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export async function countReviews(userId: string): Promise<number> {
  return db.review_log.where('user_id').equals(userId).count()
}
