import { describe, expect, it } from 'vitest'
import { firstLetters, openingWords } from './scaffold'

/**
 * Level 5's scaffold, and the milestone's opening words. Scope 9.1 and 9.5.
 *
 * Both take sacred text and give back less of it, so the thing worth holding
 * down is that neither ever gives back **different** text: the punctuation is
 * the passage's, the spacing is the passage's, and nothing is moved to make a
 * layout work.
 */

describe('firstLetters', () => {
  it('keeps the first letter of each word', () => {
    expect(firstLetters('Remove not O Lord')).toBe('R n O L')
  })

  it('keeps the punctuation exactly where the passage put it', () => {
    expect(firstLetters('Remove not, O Lord, the lamp.')).toBe('R n, O L, t l.')
  })

  it('keeps punctuation on both sides of a word', () => {
    expect(firstLetters('He said “Lord!” again')).toBe('H s “L!” a')
  })

  it('gives a hyphenated compound one letter, because it is one word', () => {
    // The scaffold's usefulness is that its letters and the passage's words
    // count the same. `loving-kindness` is one word of the prayer.
    expect(firstLetters('Thy loving-kindness')).toBe('T l')
  })

  it('keeps a word whole when there is no letter in it to take', () => {
    expect(firstLetters('the sea — the land')).toBe('t s — t l')
  })

  it('keeps the line breaks the corpus wrote', () => {
    // The shape on the page is part of what a reciter is remembering.
    expect(firstLetters('O my God!\nThe first line.')).toBe('O m G!\nT f l.')
  })

  it('folds nothing and lowercases nothing, so a capital stays a capital', () => {
    expect(firstLetters("Bahá'u'lláh spoke")).toBe('B s')
  })

  it('is empty for a line with nothing in it', () => {
    expect(firstLetters('')).toBe('')
    expect(firstLetters('   ')).toBe('')
  })
})

describe('openingWords', () => {
  it('shows the first few words and hides the rest', () => {
    const { shown, hidden } = openingWords('Remove not, O Lord, the lamp of Thy loving-kindness', 5)
    expect(shown).toBe('Remove not, O Lord, the')
    expect(hidden).toBe(' lamp of Thy loving-kindness')
  })

  it('loses nothing: the two halves are the line', () => {
    const line = 'O my God, the God of bounty and mercy!'
    for (const count of [0, 1, 3, 5, 9, 20]) {
      const { shown, hidden } = openingWords(line, count)
      expect(shown + hidden).toBe(line)
    }
  })

  it('shows the whole line when it is shorter than the opening', () => {
    expect(openingWords('O my God!', 5)).toEqual({ shown: 'O my God!', hidden: '' })
  })

  it('shows nothing at all when asked for nothing', () => {
    expect(openingWords('O my God!', 0)).toEqual({ shown: '', hidden: 'O my God!' })
  })
})
