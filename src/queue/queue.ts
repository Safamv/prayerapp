import { isPassageDue, isQueueable, isSegmentDue, type Day } from '../scheduler'
import { focusedPassages } from './focus'
import type { QueueCandidatePassage, QueueCandidateSegment, QueueInput, QueueItem } from './types'

/**
 * **Today's queue.** Scope 8.3, and principle 7.3, which the scope calls "the
 * single most important requirement in this document".
 *
 * > Default 15 reviews and 2 new segments per day, user-adjustable. Overdue
 * > above the cap rolls forward silently. New and due material mixed, not
 * > separated into modes. When the queue is done, it is done.
 *
 * ## The one thing this function must never do
 *
 * It must never report what it left out. There is no count of the overflow in
 * the return value, and there is deliberately nowhere to put one: principle 7.3
 * says "overdue items roll forward silently and no discouraging count is ever
 * displayed", and the cheapest way to keep that true for the life of the product
 * is to make the number impossible to render rather than merely forbidden. A
 * user who misses four days comes back to a queue of fifteen lines, the same as
 * every other day, and the rest simply wait.
 *
 * ## A promoted passage is one piece of work, not many
 *
 * Scope 8.7: on reaching the milestone a passage becomes a single whole-passage
 * card, and its segment state "is retained but not surfaced". So a promoted
 * passage contributes exactly one item to the day when its card is due and none
 * at all when it is not, and never its lines. That is what makes the promotion
 * mechanically real rather than a label: the shape of the morning changes.
 *
 * ## Selection is by urgency, arrangement is by passage
 *
 * These are two different questions and getting them the same way round is the
 * whole design.
 *
 * **Which lines** is answered across the entire list, most overdue first. If the
 * cap took the first fifteen lines in list order instead, a long passage at the
 * top of the list would eat every review for ever and everything below it would
 * decay untouched.
 *
 * **In what order** is answered by the list, then by the line's place in its
 * passage. So the day's work arrives grouped as prayers rather than as a shuffle
 * of lines from four different texts, and the lines of one prayer come in the
 * order scope 8.1 builds them up in.
 *
 * The two caps are applied before the arrangement, so a new line and a due line
 * of the same passage sit next to each other with nothing marking them apart.
 * That is scope 8.3's "mixed, not separated into modes": there is one queue and
 * no mode to be in.
 *
 * ## New lines go in depth first
 *
 * Scope 6.5 says the list "feeds the queue when current material is finished",
 * so new lines are taken from the top of the list downward rather than one from
 * each passage. And a line is only eligible once every line before it in its own
 * passage has been seen at least once, which is scope 8.1's cumulative building:
 * there is no sense in being asked for line four of a prayer whose first line
 * you have never met.
 */

/** A selected line, with the two numbers the arrangement needs, before it becomes an item. */
interface Selected extends QueueItem {
  readonly listOrder: number
  /** The day it fell due. Absent for a new line, which has never had one. */
  readonly dueDate: Day | null
}

/**
 * A cap the user has set, made safe to slice with. A stored number that has
 * gone missing or negative means no lines of that kind rather than all of them.
 */
function capOf(cap: number): number {
  return Number.isFinite(cap) ? Math.max(Math.floor(cap), 0) : 0
}

function inOrder(segments: readonly QueueCandidateSegment[]): readonly QueueCandidateSegment[] {
  return [...segments].sort((a, b) => a.orderIndex - b.orderIndex)
}

/**
 * The whole-passage card, if this passage has been promoted and it has come
 * round. Scope 8.7.
 *
 * It sorts as though it were the first line of the passage, because that is
 * where the passage itself begins and the arrangement is by passage anyway. It
 * counts against the review cap like any other review: a reader who has
 * memorised six passages and has three due has three pieces of work today, not
 * three free ones.
 */
function promotedOf(passage: QueueCandidatePassage, today: Day): Selected[] {
  const promoted = passage.passage
  if (promoted === null) return []
  if (!isPassageDue(promoted, today, passage.upkeepState)) return []
  return [
    {
      kind: 'passage',
      passageId: passage.passageId,
      segmentId: null,
      orderIndex: 0,
      listOrder: passage.listOrder,
      dueDate: promoted.passageDueDate,
    },
  ]
}

/**
 * Every line of this passage that has come round. Overdue lines are included.
 *
 * **A promoted passage offers none of them.** Scope 8.7: "segment state is
 * retained but not surfaced." The rows stay exactly as they were, which is what
 * lets a demotion pick the lines back up rather than start them again.
 */
function dueOf(passage: QueueCandidatePassage, today: Day): Selected[] {
  if (passage.passage !== null) return promotedOf(passage, today)
  return inOrder(passage.segments).flatMap((segment) => {
    const progress = segment.progress
    if (progress === null) return []
    if (!isSegmentDue(progress, today, passage.upkeepState)) return []
    return [
      {
        kind: 'due' as const,
        passageId: passage.passageId,
        segmentId: segment.segmentId,
        orderIndex: segment.orderIndex,
        listOrder: passage.listOrder,
        dueDate: progress.dueDate,
      },
    ]
  })
}

/**
 * The lines of this passage that could be started, which is the unbroken run of
 * never-seen lines beginning at the first one. A gap stops the run: if line
 * three has been reviewed and line two has not, only line two is offered, and
 * line four waits until three has been met.
 */
function newOf(passage: QueueCandidatePassage): Selected[] {
  // A promoted passage has no new lines by definition: every line was met before
  // it could be recited whole. Guarded all the same, because a passage the user
  // re-segments after promotion would otherwise start feeding new lines into a
  // queue that is already offering the whole thing.
  if (passage.passage !== null) return []

  const ordered = inOrder(passage.segments)
  const first = ordered.findIndex((segment) => segment.progress === null)
  if (first === -1) return []

  const run: Selected[] = []
  for (const segment of ordered.slice(first)) {
    if (segment.progress !== null) break
    run.push({
      kind: 'new',
      passageId: passage.passageId,
      segmentId: segment.segmentId,
      orderIndex: segment.orderIndex,
      listOrder: passage.listOrder,
      dueDate: null,
    })
  }
  return run
}

/** Most overdue first, then by where the passage sits on the list. */
function byUrgency(a: Selected, b: Selected): number {
  const dueA = a.dueDate ?? ''
  const dueB = b.dueDate ?? ''
  if (dueA !== dueB) return dueA < dueB ? -1 : 1
  return byListPosition(a, b)
}

/** The list's own order, then the line's place in its passage. */
function byListPosition(a: Selected, b: Selected): number {
  if (a.listOrder !== b.listOrder) return a.listOrder - b.listOrder
  if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex
  // Two lines of two different passages can share both numbers only if a list
  // order was written twice. Ordering by id keeps the queue stable anyway; a
  // whole-passage card has no line, and sorts ahead of one that has.
  const left = a.segmentId ?? ''
  const right = b.segmentId ?? ''
  return left < right ? -1 : left > right ? 1 : 0
}

function asItem(selected: Selected): QueueItem {
  return {
    kind: selected.kind,
    passageId: selected.passageId,
    segmentId: selected.segmentId,
    orderIndex: selected.orderIndex,
  }
}

/**
 * The material the queue is allowed to draw on today.
 *
 * Focus first (scope 8.6): when focus is in force on anything, it is the only
 * thing there is, both new and due. Then resting (scope 8.5), which is not a
 * slow interval but an absence of one, so a resting passage is never queued and
 * therefore never decays into "needs review".
 */
function drawableFrom(
  passages: readonly QueueCandidatePassage[],
  today: Day,
): readonly QueueCandidatePassage[] {
  const focused = focusedPassages(passages, today)
  const visible = focused.length > 0 ? focused : passages
  return visible.filter((passage) => isQueueable(passage.upkeepState))
}

/**
 * Builds today's queue. Pure: the same input gives the same queue, every time,
 * on any device, which is what makes the caps testable at all.
 */
export function buildQueue(input: QueueInput): readonly QueueItem[] {
  const drawable = drawableFrom(input.passages, input.today)

  const due = drawable
    .flatMap((passage) => dueOf(passage, input.today))
    .sort(byUrgency)
    .slice(0, capOf(input.caps.reviews))

  const started = drawable.flatMap(newOf).sort(byListPosition).slice(0, capOf(input.caps.new))

  return [...due, ...started].sort(byListPosition).map(asItem)
}
