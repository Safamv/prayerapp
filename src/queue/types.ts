import type { Day, PassageProgress, SegmentProgress, UpkeepState } from '../scheduler'

/**
 * What today's queue is built from, and what it is.
 *
 * Every shape here is a plain value. Nothing in `src/queue/` reads a database,
 * reads the clock or renders anything, for the same reason `src/scheduler/` does
 * none of those things: queue construction is on CLAUDE.md section 11's list of
 * pure functions that are unit tested without exception, because a silent bug in
 * one of them invalidates the V0 data rather than announcing itself.
 *
 * The caller in `src/data/dailyQueue.ts` reads the rows and hands them over.
 */

/**
 * One line of one passage, as the queue considers it.
 *
 * `progress` is the scheduler's own shape rather than a due date, so that
 * whether a line is due is decided by `isSegmentDue` in `src/scheduler/` and
 * never by a comparison written here. `null` means the line has never been
 * reviewed: a new line, which is counted against a different cap.
 */
export interface QueueCandidateSegment {
  readonly segmentId: string
  readonly orderIndex: number
  readonly progress: SegmentProgress | null
}

/**
 * One passage on the user's list, with the lines under it.
 *
 * `upkeepState` and the two focus fields are the `user_prayers` columns of scope
 * section 10, renamed to camelCase the way `src/data/progressMapping.ts` renames
 * the progress columns.
 */
export interface QueueCandidatePassage {
  readonly passageId: string
  readonly upkeepState: UpkeepState
  /**
   * The whole-passage card of scope 8.7, once the milestone has promoted the
   * passage to one. `null` for everything that has not been promoted, which is
   * everything until a reader recites a passage right through.
   *
   * When it is set, the passage stops offering its lines to the queue and offers
   * itself instead: "segment state is retained but not surfaced". The lines are
   * still there, untouched, which is what makes a demotion resume rather than
   * restart.
   */
  readonly passage: PassageProgress | null
  readonly isFocus: boolean
  /**
   * The day focus lifts, and the first day it is no longer in force. Scope 8.6
   * defaults it to seven days out. `null` is a focus with no end date, which the
   * app never writes and which is treated as still in force.
   */
  readonly focusUntil: Day | null
  /** `user_prayers.list_order`. The order the user put their list in (scope 6.5). */
  readonly listOrder: number
  /** In `order_index` order, which is the order scope 8.1 learns them in. */
  readonly segments: readonly QueueCandidateSegment[]
}

/**
 * Scope 8.3's two caps, as the user has them set. Both come from
 * `user_settings`, which holds the scope's defaults of 15 and 2 until the user
 * changes them in Settings.
 */
export interface QueueCaps {
  readonly reviews: number
  readonly new: number
}

export interface QueueInput {
  readonly today: Day
  readonly passages: readonly QueueCandidatePassage[]
  readonly caps: QueueCaps
}

/**
 * Why this piece of work is in today's queue.
 *
 * `due` and `new` are both lines. Scope 8.3 mixes the two rather than separating
 * them into modes, so the distinction exists to count each against its own cap
 * and for nothing else; it is deliberately not a heading the screen groups by.
 *
 * `passage` is the promoted whole-passage card of scope 8.7, which is not a line
 * and is counted against the review cap because that is what it is: a review,
 * come round again. A passage contributes either its lines or itself, never
 * both.
 */
export type QueueItemKind = 'due' | 'new' | 'passage'

export interface QueueItem {
  readonly kind: QueueItemKind
  readonly passageId: string
  /** The line, or `null` on a whole-passage card, which is not one. */
  readonly segmentId: string | null
  /**
   * Where the line sits in its passage, which is what arranges the day. A
   * whole-passage card is the whole passage, so it takes the first position.
   */
  readonly orderIndex: number
}
