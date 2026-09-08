import { describe, expect, it } from 'vitest'
import { MAXIMUM_LINES_TO_RECITE, cumulativeGroup, recitalGroup } from './group'
import { MAXIMUM_LINES_TO_ORDER, orderingGroup } from './ordering'
import type { QuizLine } from './types'

/**
 * The cumulative run of scope 8.1, which three rungs of the ladder ask for.
 *
 * The one assertion that matters more than the rest is that **the run never
 * reaches past the served line**. A line the reader has not met appearing in a
 * puzzle about the lines before it would give away material the queue is
 * deliberately holding back, and it would look like correct behaviour from
 * every angle except the reader's.
 */

function lines(count: number): QuizLine[] {
  return Array.from({ length: count }, (_, index) => ({
    segmentId: `s${String(index)}`,
    orderIndex: index,
    text: `line ${String(index)}`,
  }))
}

const ids = (group: readonly QuizLine[]) => group.map((line) => line.segmentId)

describe('cumulativeGroup', () => {
  it('ends at the line the queue served and never reaches past it', () => {
    expect(ids(cumulativeGroup(lines(8), 3, 5))).toEqual(['s0', 's1', 's2', 's3'])
  })

  it('takes at most the maximum, counting back from the served line', () => {
    expect(ids(cumulativeGroup(lines(20), 15, 5))).toEqual(['s11', 's12', 's13', 's14', 's15'])
  })

  it('starts at the first line when there are fewer before it than the maximum', () => {
    expect(ids(cumulativeGroup(lines(10), 2, 5))).toEqual(['s0', 's1', 's2'])
  })

  it('is the served line alone at the top of the passage', () => {
    expect(ids(cumulativeGroup(lines(4), 0, 5))).toEqual(['s0'])
  })

  it('never gives back nothing for a line that exists', () => {
    // A maximum of nought would otherwise produce an empty group for a line the
    // queue has served, which is a screen with no question on it.
    expect(ids(cumulativeGroup(lines(4), 2, 0))).toEqual(['s2'])
  })

  it('is empty for a line that is not in the passage', () => {
    expect(cumulativeGroup(lines(3), 9, 5)).toEqual([])
    expect(cumulativeGroup(lines(3), -1, 5)).toEqual([])
    expect(cumulativeGroup([], 0, 5)).toEqual([])
  })
})

describe('recitalGroup', () => {
  it('is the cumulative run, capped at what a morning can hold', () => {
    expect(MAXIMUM_LINES_TO_RECITE).toBe(5)
    expect(ids(recitalGroup(lines(12), 9))).toEqual(['s5', 's6', 's7', 's8', 's9'])
  })

  it('agrees with the ordering rung about which lines the run is', () => {
    // The two caps happen to be the same number today and are deliberately two
    // numbers. What must never differ is the run itself.
    expect(MAXIMUM_LINES_TO_RECITE).toBe(MAXIMUM_LINES_TO_ORDER)
    for (const through of [0, 1, 4, 7]) {
      expect(ids(recitalGroup(lines(9), through))).toEqual(ids(orderingGroup(lines(9), through)))
    }
  })
})
