import { getPassage } from './corpus'
import { nowInstant, today as todayOf } from './clock'
import { db } from './db'
import {
  fromSchedulerPassageProgress,
  toSchedulerPassageProgress,
  toSchedulerSegmentProgress,
} from './progressMapping'
import { appendReviewLog } from './reviewLog'
import { listSegmentProgress } from './segmentProgress'
import { listPassageSegments } from './segmentation'
import { listUserPrayers } from './userPrayers'
import { isFocusActive } from '../queue'
import { promoteToPassage, reviewPassage, type SegmentProgress } from '../scheduler'
import type { QuizLine } from '../quiz'
import type { Day, PassageRow, SelfRating, UserPrayerRow } from './types'

/**
 * **The milestone, and the promotion behind it.** Scope 8.7 and 9.5.
 *
 * > On reaching the milestone, the passage is promoted to a single whole-passage
 * > card, scheduled on the slowest of its segments' intervals. Segment state is
 * > retained but not surfaced. A self-rating of *Again* on the whole-passage card
 * > demotes it back to segment review.
 *
 * `promoteToPassage` and `reviewPassage` in `src/scheduler/passage.ts` were
 * written in session 1 and called by nothing until now. **This is the caller**,
 * and like `src/data/review.ts` next door it is deliberately small: read the
 * rows, hand them to the pure function, write back what comes out. No scheduling
 * arithmetic happens here.
 *
 * ## The weakest line sets the pace
 *
 * Scope 8.7's "the slowest of its segments' intervals" reads both ways and
 * decision D1.3 read it as the shortest interval - the line that still needs
 * seeing most often. Safa confirmed that reading in D2.11 and closed the
 * question. It is `governingSegment` inside the scheduler and nothing here
 * touches it.
 *
 * ## Four states, and what moves between them
 *
 * | Before | Rating | After |
 * |---|---|---|
 * | Not promoted | Again | Nothing changes. The attempt is logged and the lines carry on. |
 * | Not promoted | Hard, Good, Easy | **Promoted.** The four columns and `milestone_reached_at` are filled and `status` becomes `memorised`. |
 * | Promoted | Hard, Good, Easy | Rescheduled, as a whole passage. |
 * | Promoted | Again | **Demoted.** The four columns are cleared and `status` returns to `learning`. |
 *
 * **A demotion keeps `milestone_reached_at`.** It happened, and scope 11.3 puts
 * "milestone date, if reached" on the passage detail view session 10 builds. The
 * four scheduling columns are what say whether a passage is promoted *now*; the
 * date is history and history does not un-happen. That is also why no column had
 * to be invented to tell a demoted passage from one that never got there.
 *
 * **A demotion resumes rather than restarts.** Segment progress was never
 * touched while the passage was promoted, so the lines come back exactly as they
 * were, overdue by however long the promotion lasted. They arrive most-overdue
 * first and the cap of scope 8.3 absorbs the rest silently, which is principle
 * 7.3 doing the job it was built for.
 *
 * ## A memorisation module
 *
 * Nothing under `src/features/discover/` may import it (principle 7.6).
 */

/** What a recital did to the passage. The screen says a different sentence for each. */
export type MilestoneOutcome = 'promoted' | 'scheduled' | 'demoted' | 'unchanged'

export interface RecitedPassage {
  readonly passageId: string
  /** The reader's own rating. The only thing the scheduler is ever told. */
  readonly rating: SelfRating
}

/**
 * Applies one self-rating to a whole passage and records it.
 *
 * The log row names the passage and carries no line, because a recital of the
 * whole thing is not a review of any one of them. See decision D9.3 and
 * `src/data/reviewLog.ts`.
 */
export async function recordMilestone(
  userId: string,
  recited: RecitedPassage,
  today: Day = todayOf(),
): Promise<MilestoneOutcome> {
  const prayer = await db.user_prayers
    .where('[user_id+passage_id]')
    .equals([userId, recited.passageId])
    .first()
  if (prayer === undefined) return 'unchanged'

  const segments = await listPassageSegments(recited.passageId)
  const progressRows = await listSegmentProgress(userId)
  const ofThisPassage = new Set(segments.map((segment) => segment.id))
  const progress: SegmentProgress[] = progressRows
    .filter((row) => ofThisPassage.has(row.segment_id))
    .map(toSchedulerSegmentProgress)

  const current = toSchedulerPassageProgress(prayer)
  const patch = nextState(prayer, current, progress, segments.length, recited.rating, today)

  await db.transaction('rw', db.user_prayers, db.review_log, async () => {
    if (patch.columns !== null) await db.user_prayers.update(prayer.id, patch.columns)
    await appendReviewLog(userId, {
      passageId: recited.passageId,
      quizType: 'milestone',
      selfRating: recited.rating,
    })
  })

  return patch.outcome
}

/** The four scheduling columns, emptied. A passage back on its lines. */
const NOT_PROMOTED = {
  passage_ease_factor: null,
  passage_interval_days: null,
  passage_repetitions: null,
  passage_due_date: null,
} as const

type Columns = Partial<Omit<UserPrayerRow, 'id' | 'user_id' | 'passage_id'>>

/**
 * What the rating does to the row, decided before anything is written.
 *
 * Separated from the write so the whole of scope 8.7's behaviour is one pure
 * function over the four states, testable without a database and readable
 * without one either.
 */
function nextState(
  prayer: UserPrayerRow,
  current: ReturnType<typeof toSchedulerPassageProgress>,
  progress: readonly SegmentProgress[],
  lineCount: number,
  rating: SelfRating,
  today: Day,
): { outcome: MilestoneOutcome; columns: Columns | null } {
  if (current === null) {
    // A first attempt. Rating Again is the reader saying it was not there yet,
    // and nothing happens: the lines carry on exactly as they were, which is
    // gentler and truer than promoting a passage and demoting it in one act.
    if (rating === 'again') return { outcome: 'unchanged', columns: null }

    // A passage cannot be promoted on a partial reading of itself. The card is
    // scheduled on the weakest of its lines (D1.3), and a line never met has no
    // interval to be the weakest, so promoting here would schedule the whole
    // passage off whichever lines happened to have been started. Nothing in the
    // app offers a recital in that state - `listRecitablePassages` requires
    // every line to have been met - but a typed URL reaches this function
    // directly, and `promoteToPassage` on an empty list would throw.
    if (progress.length === 0 || progress.length < lineCount) {
      return { outcome: 'unchanged', columns: null }
    }

    const promoted = promoteToPassage(progress, today, prayer.upkeep_state)
    return {
      outcome: 'promoted',
      columns: {
        ...fromSchedulerPassageProgress(promoted),
        status: 'memorised',
        milestone_reached_at: nowInstant(),
      },
    }
  }

  const result = reviewPassage(current, rating, today, prayer.upkeep_state)
  if (result.outcome === 'demoted') {
    // Scope 8.7. `milestone_reached_at` is deliberately not cleared: it is the
    // date it happened, and it happened.
    return { outcome: 'demoted', columns: { ...NOT_PROMOTED, status: 'learning' } }
  }
  return { outcome: 'scheduled', columns: fromSchedulerPassageProgress(result.progress) }
}

/**
 * **A passage the reader may attempt to recite whole.** Scope 9.5: the milestone
 * is "deliberately attempted" rather than served by the queue.
 *
 * ## The one condition, and why it is not a test
 *
 * A passage is offered once the app has shown the reader **every one of its
 * lines at least once**. That is a fact about what has been shown, not a verdict
 * on how well it is known: scope 9.6 makes the reader's own rating the only
 * judgement in the product, and a readiness gate built out of mastery levels
 * would be the app quietly holding a second opinion. The reader decides when
 * they are ready. This only decides when there is a whole passage to attempt
 * rather than a fragment.
 *
 * Decided by Safa, 8 September 2026, with the door itself. Decision D9.1.
 *
 * ## What is not offered
 *
 * **A passage already promoted.** Its recital is a review now, and reviews come
 * from the queue. It reappears here if a rating of Again ever demotes it.
 *
 * **A resting passage** (scope 8.5), which is never queued and should not be
 * invited either. Resting is a choice the app offered and it does not then nag.
 *
 * **Anything outside focus**, when focus is in force (scope 8.6): "all
 * non-focused material is suppressed, both new and due". A tab that suppresses
 * everything else in one section and offers it in the next is not focused.
 */
export interface RecitablePassage {
  readonly passage: PassageRow
  readonly lines: readonly QuizLine[]
}

export async function listRecitablePassages(
  userId: string,
  today: Day = todayOf(),
): Promise<readonly RecitablePassage[]> {
  const rows = await listUserPrayers(userId)
  const focused = rows.filter((row) =>
    isFocusActive({ isFocus: row.is_focus, focusUntil: row.focus_until }, today),
  )
  const visible = focused.length > 0 ? focused : rows

  const progressRows = await listSegmentProgress(userId)
  const met = new Set(progressRows.map((row) => row.segment_id))

  const candidates = visible.filter(
    (row) => row.upkeep_state !== 'resting' && toSchedulerPassageProgress(row) === null,
  )

  const found: (RecitablePassage | null)[] = await Promise.all(
    candidates.map(async (row): Promise<RecitablePassage | null> => {
      const segments = await listPassageSegments(row.passage_id)
      if (segments.length === 0) return null
      if (!segments.every((segment) => met.has(segment.id))) return null

      const passage = await getPassage(row.passage_id)
      if (passage === undefined) return null

      return {
        passage,
        lines: segments.map((segment) => ({
          segmentId: segment.id,
          orderIndex: segment.order_index,
          text: segment.text,
        })),
      }
    }),
  )

  return found.filter((entry): entry is RecitablePassage => entry !== null)
}

/**
 * One passage, with its lines, for the recital screen.
 *
 * Read whether or not the passage is currently offered above: the screen is
 * reached from the queue too, once a promoted card comes round, and a typed URL
 * can reach it at any time. `null` is a passage that is not on the list or has
 * no lines, which sends the screen back to the Memorise tab.
 */
export interface PassageRecital {
  readonly passage: PassageRow
  readonly lines: readonly QuizLine[]
  /** Whether this is a first attempt or a promoted card come round again. */
  readonly promoted: boolean
}

export async function getPassageRecital(
  userId: string,
  passageId: string,
): Promise<PassageRecital | null> {
  const prayer = await db.user_prayers
    .where('[user_id+passage_id]')
    .equals([userId, passageId])
    .first()
  if (prayer === undefined) return null

  const [passage, segments] = await Promise.all([
    getPassage(passageId),
    listPassageSegments(passageId),
  ])
  if (passage === undefined || segments.length === 0) return null

  return {
    passage,
    lines: segments.map((segment) => ({
      segmentId: segment.id,
      orderIndex: segment.order_index,
      text: segment.text,
    })),
    promoted: toSchedulerPassageProgress(prayer) !== null,
  }
}
