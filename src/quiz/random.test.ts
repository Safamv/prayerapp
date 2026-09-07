import { describe, expect, it } from 'vitest'
import { shuffled } from './random'

/**
 * The shuffle. It is seeded rather than random for three reasons, and the first
 * is the one a reader would notice: a re-render must not move the chips under
 * their thumb. See the header of `random.ts`.
 */

const ITEMS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

describe('shuffled', () => {
  it('gives the same order for the same seed, every time', () => {
    expect(shuffled(ITEMS, 'segment-1:3')).toEqual(shuffled(ITEMS, 'segment-1:3'))
  })

  it('gives a different order for a different seed', () => {
    expect(shuffled(ITEMS, 'segment-1:2')).not.toEqual(shuffled(ITEMS, 'segment-1:3'))
    expect(shuffled(ITEMS, 'segment-1:3')).not.toEqual(shuffled(ITEMS, 'segment-2:3'))
  })

  it('keeps every item exactly once', () => {
    expect([...shuffled(ITEMS, 'any')].sort()).toEqual([...ITEMS].sort())
  })

  it('does not touch what it was given', () => {
    const original = [...ITEMS]
    shuffled(ITEMS, 'any')
    expect(ITEMS).toEqual(original)
  })

  it('actually moves things, on the seeds the app uses', () => {
    // A shuffle that returned its input would be a bug that no other assertion
    // here would catch, because the input is also a valid shuffle.
    const unmoved = ['1', '2', '3', '4', '5'].filter(
      (seed) => shuffled(ITEMS, seed).join('') === ITEMS.join(''),
    )
    expect(unmoved).toEqual([])
  })

  it('copes with nothing and with one thing', () => {
    expect(shuffled([], 'any')).toEqual([])
    expect(shuffled(['only'], 'any')).toEqual(['only'])
  })
})
