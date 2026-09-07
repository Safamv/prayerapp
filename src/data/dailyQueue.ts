import { getPassage } from './corpus'
import { toSchedulerSegmentProgress } from './progressMapping'
import { listSegmentProgress } from './segmentProgress'
import { listPassageSegments } from './segmentation'
import { listUserPrayers } from './userPrayers'
import { getOrCreateUserSettings } from './userSettings'
import { buildQueue, type QueueCandidatePassage, type QueueInput, type QueueItem } from '../queue'
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
  for (const item of items) {
    const seen = counts.get(item.passageId)
    if (seen === undefined) order.push(item.passageId)
    counts.set(item.passageId, (seen ?? 0) + 1)
  }

  const passages = await Promise.all(
    order.map(async (passageId) => {
      const passage = await getPassage(passageId)
      return passage === undefined ? null : { passage, lineCount: counts.get(passageId) ?? 0 }
    }),
  )

  return {
    items,
    passages: passages.filter((entry): entry is QueuedPassage => entry !== null),
    listIsEmpty: input.passages.length === 0,
  }
}
