import { getPassage } from './corpus'
import { toSchedulerPassageProgress, toSchedulerSegmentProgress } from './progressMapping'
import { listSegmentProgress } from './segmentProgress'
import { listPassageSegments } from './segmentation'
import { listUserPrayers } from './userPrayers'
import { getOrCreateUserSettings } from './userSettings'
import { buildQueue, type QueueCandidatePassage, type QueueInput, type QueueItem } from '../queue'
import type { QuizLine } from '../quiz'
import type { SegmentProgress } from '../scheduler'
import type { Day, PassageRow } from './types'

/**
 * **Today's queue, read out of the database.** Scope 8.2 and 8.3.
 *
 * The decisions are all next door in `src/queue/`, which is pure and knows
 * nothing about Dexie. This module does the reading, the renaming and the
 * joining back to the passages a screen has to draw, and it makes no decision of
 * its own. That split is the same one `src/data/segmentation.ts` has with
 * `src/text/segmentation.ts`, for the same reason: the rules that would be
 * expensive to get wrong are testable without a database.
 *
 * A memorisation module. Nothing under `src/features/discover/` may import it
 * (principle 7.6).
 */

/**
 * A passage today's queue touches, and how many of its lines it holds.
 *
 * The screen groups by passage rather than listing lines, because a line's own
 * text is the thing the quiz is about to ask for and putting it on a list would
 * give the answer away, and because three identical rows saying the same prayer
 * name tell the reader nothing. The count is of today's work, already capped.
 */
export interface QueuedPassage {
  readonly passage: PassageRow
  readonly lineCount: number
  /**
   * Whether today's work on this passage is the promoted whole-passage card of
   * scope 8.7 rather than a set of its lines.
   *
   * The screen needs it for two things and both are visible: which screen the
   * row opens, and what the row says it holds. "3 LINES" is not true of a card
   * that is the whole passage.
   */
  readonly whole: boolean
}

export interface TodaysQueue {
  /** The lines to work through, in order. Session 8's ladder walks this. */
  readonly items: readonly QueueItem[]
  /** The same lines, gathered under the passages they belong to, in queue order. */
  readonly passages: readonly QueuedPassage[]
  /** Whether the user has anything on their list at all, which is a different empty. */
  readonly listIsEmpty: boolean
}

/**
 * Gathers what the queue needs: the list, the lines under each passage, and the
 * progress against those lines.
 *
 * Read as three whole-table queries and joined in memory rather than as one
 * query per passage. A V0 list is a handful of passages and a few dozen lines,
 * and the shape that matters is that this is one pass over the data rather than
 * a query inside a loop.
 */
export async function readQueueInput(userId: string, today: Day): Promise<QueueInput> {
  const [rows, settings, progressRows] = await Promise.all([
    listUserPrayers(userId),
    getOrCreateUserSettings(userId),
    listSegmentProgress(userId),
  ])

  const progressBySegment = new Map(progressRows.map((row) => [row.segment_id, row]))

  const passages: QueueCandidatePassage[] = await Promise.all(
    rows.map(async (row) => {
      const segments = await listPassageSegments(row.passage_id)
      return {
        passageId: row.passage_id,
        upkeepState: row.upkeep_state,
        // Scope 8.7's promoted card, or `null` before the milestone. A promoted
        // passage offers itself to the queue instead of its lines.
        passage: toSchedulerPassageProgress(row),
        isFocus: row.is_focus,
        focusUntil: row.focus_until,
        listOrder: row.list_order,
        segments: segments.map((segment) => {
          const progress = progressBySegment.get(segment.id)
          return {
            segmentId: segment.id,
            orderIndex: segment.order_index,
            progress: progress === undefined ? null : toSchedulerSegmentProgress(progress),
          }
        }),
      }
    }),
  )

  return {
    today,
    passages,
    caps: { reviews: settings.daily_review_limit, new: settings.daily_new_limit },
  }
}

/**
 * Today's queue, with the passages it touches.
 *
 * **Nothing here counts what the cap left out**, and there is nowhere in
 * `TodaysQueue` to put it. Principle 7.3: overdue rolls forward silently and no
 * discouraging count is ever displayed.
 */
export async function getTodaysQueue(userId: string, today: Day): Promise<TodaysQueue> {
  const input = await readQueueInput(userId, today)
  const items = buildQueue(input)

  const order: string[] = []
  const counts = new Map<string, number>()
  const whole = new Set<string>()
  for (const item of items) {
    const seen = counts.get(item.passageId)
    if (seen === undefined) order.push(item.passageId)
    counts.set(item.passageId, (seen ?? 0) + 1)
    if (item.kind === 'passage') whole.add(item.passageId)
  }

  const passages = await Promise.all(
    order.map(async (passageId) => {
      const passage = await getPassage(passageId)
      return passage === undefined
        ? null
        : {
            passage,
            lineCount: counts.get(passageId) ?? 0,
            whole: whole.has(passageId),
          }
    }),
  )

  return {
    items,
    passages: passages.filter((entry): entry is QueuedPassage => entry !== null),
    listIsEmpty: input.passages.length === 0,
  }
}

/**
 * **One passage's work for today.** Scope 8.2 and 9.1.
 *
 * Decision D8.1: a row on the Memorise tab opens the lines of that prayer and
 * nothing else, so the walk needs the day's queue narrowed to one passage, and
 * it needs three more things the queue itself has no reason to carry.
 *
 * **Every line of the passage, not only today's.** Level 4 puts the lines
 * leading up to the served one back in order (scope 8.1), and levels 2 and 3
 * take their distractors from elsewhere in the same passage (scope 9.3).
 * Neither is answerable from today's queue alone.
 *
 * **The progress against each line**, because scope 9.1 selects the quiz type by
 * mastery level, and `src/quiz/level.ts` reads that off `repetitions`.
 *
 * It is read once, when the screen opens, and the walk holds it. So a rating
 * written halfway through does not rebuild the day underneath the reader and
 * take the next line away from them.
 */
export interface PassageWork {
  readonly passage: PassageRow
  /** Every line of the passage, in the order scope 8.1 learns them in. */
  readonly lines: readonly QuizLine[]
  /** Today's lines of this passage, in queue order. Never the whole-passage card. */
  readonly items: readonly (QueueItem & { segmentId: string })[]
  /** The SM-2 state of each line that has one, by segment id. */
  readonly progress: ReadonlyMap<string, SegmentProgress>
}

export async function getPassageWork(
  userId: string,
  passageId: string,
  today: Day,
): Promise<PassageWork | undefined> {
  const passage = await getPassage(passageId)
  if (passage === undefined) return undefined

  const [queue, segments, progressRows] = await Promise.all([
    getTodaysQueue(userId, today),
    listPassageSegments(passageId),
    listSegmentProgress(userId),
  ])

  const lines: QuizLine[] = segments.map((segment) => ({
    segmentId: segment.id,
    orderIndex: segment.order_index,
    text: segment.text,
  }))

  const ofThisPassage = new Set(lines.map((line) => line.segmentId))
  const progress = new Map(
    progressRows
      .filter((row) => ofThisPassage.has(row.segment_id))
      .map((row) => [row.segment_id, toSchedulerSegmentProgress(row)] as const),
  )

  return {
    passage,
    lines,
    // Lines only. A promoted passage's work today is the whole-passage card of
    // scope 8.7, which is recited on its own screen and is not part of this
    // walk; leaving it out here is what sends a reader who reaches the review
    // route for a promoted passage back to the Memorise tab rather than into an
    // empty walk. See `RecitalScreen`.
    items: queue.items.filter(
      (item): item is QueueItem & { segmentId: string } =>
        item.passageId === passageId && item.segmentId !== null,
    ),
    progress,
  }
}
