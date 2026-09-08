/**
 * A shuffle that gives the same answer every time it is asked.
 *
 * ## Why the randomness is seeded rather than real
 *
 * Three reasons, and the first is the one that matters to a user.
 *
 * **A screen that re-draws must not re-shuffle.** React re-renders a component
 * for reasons that have nothing to do with the user - a keystroke elsewhere, a
 * slower read landing, the theme being written to the document. If the chip bank
 * were shuffled with `Math.random` on each render, the chips would walk about
 * under the reader's thumb.
 *
 * **A line met twice is met the same way twice.** Close the app halfway through
 * a line and come back to it, and the same words are missing from the same
 * places rather than a different puzzle.
 *
 * **It can be tested.** A test can state which words a particular line has taken
 * out of it, which is what makes CLAUDE.md section 11's demand for real coverage
 * of chip matching possible at all.
 *
 * The seed is a string - a segment id and the level - so two lines of the same
 * prayer, and the same line at two different levels, are shuffled differently.
 */

/**
 * FNV-1a, 32 bit. A small, fast, well-mixed string hash. Nothing here is
 * security sensitive: this decides which of eight chips is drawn first.
 */
function hash(seed: string): number {
  let value = 0x811c9dc5
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index)
    value = Math.imul(value, 0x01000193)
  }
  return value >>> 0
}

/** mulberry32: one multiply-shift generator, enough for a shuffle of eight. */
function generator(seed: string): () => number {
  let state = hash(seed)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state)
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4294967296
  }
}

/** A Fisher-Yates shuffle, drawn from the seed. The input is not touched. */
export function shuffled<T>(items: readonly T[], seed: string): T[] {
  const next = generator(seed)
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1))
    const held = result[index]
    const other = result[swap]
    if (held !== undefined && other !== undefined) {
      result[index] = other
      result[swap] = held
    }
  }
  return result
}
