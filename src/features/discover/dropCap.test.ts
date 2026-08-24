import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitDropCap } from './dropCap'

/**
 * Design-tokens 8.2 asks for a defined fallback. This is what it was defined to
 * be, and the last test is the one that keeps it honest: every passage in the
 * committed corpus is put through it.
 */

const CORPUS_DIR = join(import.meta.dirname, '..', '..', 'data', 'corpus-data')

function corpusTexts(): string[] {
  return [
    'prayers.json',
    'hidden-words.json',
    'gleanings.json',
    'prayers-and-meditations.json',
  ].flatMap((file) =>
    (JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8')) as { text: string }[]).map(
      (row) => row.text,
    ),
  )
}

describe('splitDropCap', () => {
  it('takes the first letter and leaves the rest', () => {
    expect(splitDropCap('Blessed is the spot')).toEqual({
      cap: 'B',
      rest: 'lessed is the spot',
    })
  })

  it('keeps a letter and its diacritic together as one cap', () => {
    // Ḥ written as H plus a combining dot below: one letter to a reader, two
    // code points to a naive slice, which would set the H and orphan the dot.
    const decomposed = 'Ḥamd'
    const split = splitDropCap(decomposed)
    expect(split?.cap).toBe('Ḥ')
    expect(split?.rest).toBe('amd')
  })

  it('takes a precomposed accented letter as the cap', () => {
    expect(splitDropCap('Álláh')?.cap).toBe('Á')
  })

  it('ignores leading whitespace rather than capping a space', () => {
    expect(splitDropCap('\n  Blessed')).toEqual({ cap: 'B', rest: 'lessed' })
  })

  describe('the fallback, when the passage does not open with a letter', () => {
    it('sets a passage opening with a quotation mark without a cap', () => {
      expect(splitDropCap('“Blessed is the spot')).toBeNull()
    })

    it('sets a passage opening with a turned comma without a cap', () => {
      // The apostrophe that opens 'Abdu'l-Bahá.
      expect(splitDropCap('‘Abdu’l-Bahá said')).toBeNull()
    })

    it('sets a passage opening with a digit or a bracket without a cap', () => {
      expect(splitDropCap('1. The first')).toBeNull()
      expect(splitDropCap('[A note]')).toBeNull()
    })

    it('returns nothing at all for empty or blank text', () => {
      expect(splitDropCap('')).toBeNull()
      expect(splitDropCap('   \n ')).toBeNull()
    })
  })

  describe('against the committed corpus', () => {
    it('never loses or reorders a character of any passage', () => {
      for (const text of corpusTexts()) {
        const split = splitDropCap(text)
        if (split === null) continue
        expect(split.cap + split.rest).toBe(text.replace(/^\s+/, ''))
      }
    })

    it('finds a cap for every passage, because every one opens with a letter', () => {
      const without = corpusTexts().filter((text) => splitDropCap(text) === null)
      expect(without).toEqual([])
    })
  })
})
