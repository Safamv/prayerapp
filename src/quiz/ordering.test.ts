import { describe, expect, it } from 'vitest'
import { MAXIMUM_LINES_TO_ORDER, misplacedLines, orderingGroup, shuffledOrdering } from './ordering'
import type { QuizLine } from './types'

/**
 * Level 4: the lines of the group put back in order. Scope 9.1.
 *
 * The rule that matters is the first block's last test. Scope 8.1 builds a
 * passage cumulatively, so the group runs up to the line the queue served and
 * never past it: a line the reader has not met yet must not appear in a puzzle
 * about the order of the ones they have.
 */

function lines(count: number): QuizLine[] {
  return Array.from({ length: count }, (_unused, index) => ({
    segmentId: `segment-${String(index)}`,
    orderIndex: index,
    text: `Line ${String(index + 1)} of the prayer, which runs on a little.`,
  }))
}

const ids = (group: readonly QuizLine[]) => group.map((line) => line.segmentId)

describe('orderingGroup', () => {
  it('takes the line served and the ones before it', () => {
    expect(ids(orderingGroup(lines(6), 3))).toEqual([
      'segment-0',
      'segment-1',
      'segment-2',
      'segment-3',
    ])
  })

  it('never reaches past the line the queue served', () => {
    // Scope 8.1 is cumulative. A line the reader has not met yet appearing in a
    // puzzle about order would be handing out the passage out of order.
    const group = orderingGroup(lines(10), 2)
    expect(ids(group)).toEqual(['segment-0', 'segment-1', 'segment-2'])
  })

  it('holds at five lines, however long the passage is', () => {
    expect(MAXIMUM_LINES_TO_ORDER).toBe(5)
    const group = orderingGroup(lines(20), 15)
    expect(group).toHaveLength(5)
    expect(ids(group)).toEqual([
      'segment-11',
      'segment-12',
      'segment-13',
      'segment-14',
      'segment-15',
    ])
  })

  it('gives what there is when the passage is shorter than the cap', () => {
    expect(orderingGroup(lines(2), 1)).toHaveLength(2)
  })

  it('gives nothing for a line that is not in the passage', () => {
    expect(orderingGroup(lines(3), 9)).toEqual([])
    expect(orderingGroup(lines(3), -1)).toEqual([])
  })
})

describe('shuffledOrdering', () => {
  it('gives the same first arrangement every time', () => {
    const group = orderingGroup(lines(6), 4)
    expect(ids(shuffledOrdering(group, 'seed'))).toEqual(ids(shuffledOrdering(group, 'seed')))
  })

  it('keeps every line exactly once', () => {
    const group = orderingGroup(lines(6), 4)
    expect(ids(shuffledOrdering(group, 'seed')).sort()).toEqual(ids(group).sort())
  })

  it('never opens on the correct order, whatever the seed', () => {
    // A puzzle that arrives finished is not a puzzle, and the reader would rate
    // themselves against something they had not done.
    const group = orderingGroup(lines(8), 4)
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) {
      expect(ids(shuffledOrdering(group, seed))).not.toEqual(ids(group))
    }
  })

  it('leaves a group too small to shuffle alone', () => {
    expect(shuffledOrdering(lines(1), 'seed')).toHaveLength(1)
    expect(shuffledOrdering([], 'seed')).toEqual([])
  })
})

describe('misplacedLines', () => {
  const group = orderingGroup(lines(4), 3)

  it('finds nothing wrong with the correct order', () => {
    expect(misplacedLines(group, ids(group)).size).toBe(0)
  })

  it('names the lines that were not where they belong', () => {
    const attempt = ['segment-1', 'segment-0', 'segment-2', 'segment-3']
    expect([...misplacedLines(group, attempt)]).toEqual(['segment-0', 'segment-1'])
  })

  it('names every line when nothing is where it belongs', () => {
    const attempt = ['segment-3', 'segment-2', 'segment-1', 'segment-0']
    expect(misplacedLines(group, attempt).size).toBe(4)
  })

  it('counts an unanswered position as misplaced rather than throwing', () => {
    expect(misplacedLines(group, []).size).toBe(4)
  })
})
