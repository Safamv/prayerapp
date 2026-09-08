import type { QuizLine } from './types'

/**
 * **The cumulative run of lines**, which is scope 8.1's method rather than any
 * one rung's rule.
 *
 * > Learn segment 1. Then segment 2. Then 1 and 2 together. Then 3. Then 1 to 3.
 * > Continue until the whole passage is recited unaided.
 *
 * Two rungs of the ladder ask for it and they ask for the same thing. Level 4
 * puts the run back in order (`orderingGroup`); levels 5 and 6 recite it
 * (`recitalGroup`). It lives here rather than inside either one so that the two
 * cannot drift into disagreeing about what "the lines leading up to this one"
 * means, which is a thing the reader would notice and nothing would catch.
 *
 * **It never reaches past the served line.** A line the reader has not met yet
 * must not appear in a puzzle about the lines before it, and must not be asked
 * for in a recital of them.
 */

/**
 * The run of lines ending at the served one, at most `maximum` of them.
 *
 * `lines` is the whole passage in `order_index` order. `throughIndex` is the
 * position in that array of the line the queue served.
 */
export function cumulativeGroup(
  lines: readonly QuizLine[],
  throughIndex: number,
  maximum: number,
): readonly QuizLine[] {
  if (throughIndex < 0 || throughIndex >= lines.length) return []
  const from = Math.max(0, throughIndex + 1 - Math.max(maximum, 1))
  return lines.slice(from, throughIndex + 1)
}

/**
 * How much a reader is asked to recite in one go at levels 5 and 6.
 *
 * The same five as the ordering rung, and for a related reason rather than the
 * same one. Ordering caps at five because twelve draggable rows do not fit a
 * phone. Reciting has no layout problem, and would have a worse one instead: the
 * queue can serve four lines of one passage in a morning, and four recitals of
 * the whole of a twenty line passage is an hour of work drawn from a queue that
 * scope 8.3 caps precisely so a morning cannot run away.
 *
 * Five is also the point at which the milestone stops being a bigger version of
 * the same thing and starts being a different act, which is what scope 9.5 says
 * it is.
 */
export const MAXIMUM_LINES_TO_RECITE = 5

/** The lines to recite: the one served, and up to four before it. */
export function recitalGroup(
  lines: readonly QuizLine[],
  throughIndex: number,
  maximum: number = MAXIMUM_LINES_TO_RECITE,
): readonly QuizLine[] {
  return cumulativeGroup(lines, throughIndex, maximum)
}
