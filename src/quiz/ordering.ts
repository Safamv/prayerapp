import { cumulativeGroup } from './group'
import { shuffled } from './random'
import type { QuizLine } from './types'

/**
 * **Level 4: the lines of the group put back in order.** Scope 9.1.
 *
 * ## What "the group" is
 *
 * Scope 8.1 builds a passage cumulatively: "Learn segment 1. Then segment 2.
 * Then 1 and 2 together. Then 3. Then 1 to 3." So the group is the run of lines
 * ending at the one the queue has served, and never anything after it: a line
 * the reader has not met yet must not appear in a puzzle about order.
 *
 * It is capped at five. Ordering twelve lines is a clerical task rather than a
 * memory one, and twelve rows do not fit a phone above a bank of controls.
 *
 * A group of fewer than three is not a puzzle - two lines are a coin toss - so
 * `servedLevel` sends those lines to level 3 instead.
 */

/** Ordering five lines is a memory task. Ordering twelve is filing. */
export const MAXIMUM_LINES_TO_ORDER = 5

/**
 * Fewer than three lines is a coin toss rather than a question, so `servedLevel`
 * sends a line with fewer than two before it to level 3 instead.
 */
export const MINIMUM_LINES_TO_ORDER = 3

/**
 * The lines to be put in order: the one served, and up to four before it.
 *
 * `lines` is the whole passage in `order_index` order. `throughIndex` is the
 * position in that array of the line the queue served.
 *
 * The run itself is `cumulativeGroup` in `group.ts`, which is scope 8.1's method
 * rather than this rung's rule: levels 5 and 6 ask for the same run and recite
 * it instead. This function is the cap that belongs to ordering alone.
 */
export function orderingGroup(
  lines: readonly QuizLine[],
  throughIndex: number,
  maximum: number = MAXIMUM_LINES_TO_ORDER,
): readonly QuizLine[] {
  return cumulativeGroup(lines, throughIndex, maximum)
}

/**
 * The group, shuffled into the order it is first shown in.
 *
 * A shuffle that happens to come out right would hand the reader a finished
 * puzzle, so the one arrangement that is not allowed is the correct one: if the
 * shuffle lands on it, the list is rotated by one instead. With three lines or
 * more that is always a different order.
 */
export function shuffledOrdering(group: readonly QuizLine[], seed: string): readonly QuizLine[] {
  if (group.length < 2) return group

  const drawn = shuffled(group, seed)
  const isCorrect = drawn.every((line, index) => line.segmentId === group[index]?.segmentId)
  if (!isCorrect) return drawn

  return [...drawn.slice(1), ...drawn.slice(0, 1)]
}

/**
 * Which of the reader's rows were in the right place, keyed by segment id.
 *
 * Principle 7.2: "The correct text is always shown after an attempt, with
 * deviations highlighted. Nothing is scored." So this answers "which lines were
 * out of place", and deliberately does not answer "how many".
 */
export function misplacedLines(
  group: readonly QuizLine[],
  attempt: readonly string[],
): ReadonlySet<string> {
  const misplaced = new Set<string>()
  for (const [index, line] of group.entries()) {
    if (attempt[index] !== line.segmentId) misplaced.add(line.segmentId)
  }
  return misplaced
}
