import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bareWord, isSameWords, normalise, normalisedWords } from './normalise'

/**
 * Normalisation. Scope 9.7, and CLAUDE.md section 11, which names it as one of
 * the six things that must be unit tested because "a silent bug in any of them
 * invalidates the V0 data".
 *
 * The last block is the one that keeps this honest: every one of the 975
 * passages in the committed corpus is normalised, and the result is required to
 * carry nothing but lowercase letters, digits and single spaces. A rule written
 * against the six examples somebody thought of is a rule with a hole in it.
 */

const CORPUS_DIR = join(import.meta.dirname, '..', 'data', 'corpus-data')

interface CorpusRow {
  readonly id: string
  readonly title: string
  readonly text: string
}

function corpus(): CorpusRow[] {
  return [
    'prayers.json',
    'hidden-words.json',
    'gleanings.json',
    'prayers-and-meditations.json',
  ].flatMap((file) => JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8')) as CorpusRow[])
}

describe('normalise', () => {
  it('lowercases', () => {
    expect(normalise('Blessed Is The Spot')).toBe('blessed is the spot')
  })

  it('folds the diacritics of the transliteration', () => {
    expect(normalise('Bahá')).toBe('baha')
    expect(normalise('Ṭáhirih')).toBe('tahirih')
    expect(normalise('Ḥusayn')).toBe('husayn')
    expect(normalise('Muṣṭafá')).toBe('mustafa')
  })

  it('folds a diacritic that arrives already decomposed', () => {
    // The same letter written as one code point and as two. A corpus edited on
    // one platform and a search box typed on another can differ by exactly this.
    expect(normalise('á')).toBe(normalise('á'))
  })

  it('removes an apostrophe rather than spacing it', () => {
    expect(normalise('Bahá’í')).toBe('bahai')
    expect(normalise("God's")).toBe('gods')
    expect(normalise('Bahá’u’lláh')).toBe('bahaullah')
  })

  it('treats every apostrophe the corpus and a keyboard can produce as the same mark', () => {
    expect(normalise("God's")).toBe('gods')
    expect(normalise('God’s')).toBe('gods')
    expect(normalise('God‘s')).toBe('gods')
    expect(normalise('Godʼs')).toBe('gods')
  })

  it('turns a hyphen into a space, so a compound is findable as one word or two', () => {
    expect(normalise('All-Merciful')).toBe('all merciful')
    expect(normalise('loving-kindness')).toBe('loving kindness')
    expect(normalise('‘Abdu’l-Bahá')).toBe('abdul baha')
  })

  it('strips the punctuation the corpus actually uses', () => {
    expect(normalise('Thee,')).toBe('thee')
    expect(normalise('“Lord!”')).toBe('lord')
    expect(normalise('spot…')).toBe('spot')
    expect(normalise('one — two')).toBe('one two')
    expect(normalise('[Muhammad-‘Alí]')).toBe('muhammad ali')
  })

  it('collapses whitespace of every kind, and trims', () => {
    expect(normalise('  the   house \n\n and \t the city  ')).toBe('the house and the city')
  })

  it('removes the invisible format characters a pasted text can carry', () => {
    expect(normalise('one‎two')).toBe('onetwo')
  })

  it('gives nothing for text with no words in it', () => {
    expect(normalise('')).toBe('')
    expect(normalise('   ')).toBe('')
    expect(normalise('— … !')).toBe('')
  })

  it('keeps digits, which a search box is entitled to be given', () => {
    expect(normalise('Súrih 19')).toBe('surih 19')
  })

  it('gives the same answer applied twice as applied once', () => {
    for (const text of ['Bahá’u’lláh’s All-Merciful, “Lord!”', '  a  ', '‘Abdu’l-Bahá']) {
      expect(normalise(normalise(text))).toBe(normalise(text))
    }
  })
})

describe('normalisedWords', () => {
  it('splits into words', () => {
    expect(normalisedWords('Blessed is the spot!')).toEqual(['blessed', 'is', 'the', 'spot'])
  })

  it('gives no words for text with none', () => {
    expect(normalisedWords('  —  ')).toEqual([])
  })

  it('counts a hyphenated compound as two words', () => {
    expect(normalisedWords('the All-Merciful')).toEqual(['the', 'all', 'merciful'])
  })
})

describe('isSameWords', () => {
  /**
   * This is the comparison chip matching is built on. Every case here is one a
   * naive `chip === answer` would get wrong, which is exactly why CLAUDE.md
   * section 11 singles the interaction out for a component test as well.
   */
  it('matches a chip against the word the line had, punctuation and all', () => {
    expect(isSameWords('Thee', 'Thee,')).toBe(true)
    expect(isSameWords('Lord', '“Lord!”')).toBe(true)
    expect(isSameWords('spot', 'spot…')).toBe(true)
  })

  it('matches across capitalisation, so a word at the start of a line is not special', () => {
    expect(isSameWords('blessed', 'Blessed')).toBe(true)
  })

  it('matches across the two spellings of an accented word', () => {
    expect(isSameWords('Bahai', 'Bahá’í')).toBe(true)
  })

  it('does not match two different words', () => {
    expect(isSameWords('Thee', 'Thou')).toBe(false)
    expect(isSameWords('mercy', 'merciful')).toBe(false)
  })

  it('does not match text with no words in it against itself', () => {
    expect(isSameWords('—', '—')).toBe(false)
    expect(isSameWords('', '')).toBe(false)
  })
})

describe('bareWord', () => {
  it('takes the punctuation off both ends and leaves the middle alone', () => {
    expect(bareWord('Thee,')).toBe('Thee')
    expect(bareWord('“Lord!”')).toBe('Lord')
    expect(bareWord('All-Merciful.')).toBe('All-Merciful')
    expect(bareWord('God’s,')).toBe('God’s')
    expect(bareWord('‘Abdu’l-Bahá')).toBe('Abdu’l-Bahá')
  })

  it('leaves a word that needs nothing done to it exactly as it was', () => {
    expect(bareWord('Blessed')).toBe('Blessed')
  })

  it('gives nothing for a token with no letters in it', () => {
    expect(bareWord('—')).toBe('')
    expect(bareWord('')).toBe('')
  })
})

describe('every passage in the committed corpus', () => {
  const rows = corpus()

  it('has passages to check, so this suite cannot pass vacuously', () => {
    expect(rows.length).toBeGreaterThan(900)
  })

  it('normalises to lowercase letters, digits and single spaces, and nothing else', () => {
    const offenders: string[] = []

    for (const row of rows) {
      const normalised = normalise(row.text)
      if (!/^[\p{Ll}\p{N}]+( [\p{Ll}\p{N}]+)*$/u.test(normalised) && normalised !== '') {
        offenders.push(row.id)
      }
    }

    expect(offenders).toEqual([])
  })

  it('never loses a word, however the passage is punctuated', () => {
    /**
     * Every whitespace-separated token that has a letter or a digit in it comes
     * out as at least one normalised word. A rule that quietly ate one would be
     * invisible on screen and would take a chip's answer with it.
     *
     * At least, rather than exactly: a hyphen becomes a space, so `All-Merciful`
     * is one token and two words. The apostrophe goes the other way, which is
     * why the count is not asserted from the other side.
     */
    const offenders: string[] = []

    for (const row of rows) {
      const tokens = row.text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token))
      if (normalisedWords(row.text).length < tokens.length) offenders.push(row.id)
    }

    expect(offenders).toEqual([])
  })

  it('matches every word of every passage against the word it came from', () => {
    // The chip-matching guarantee, over the whole corpus rather than over six
    // hand-written examples: a chip cut from a token always matches that token.
    const offenders: string[] = []

    for (const row of rows) {
      for (const token of row.text.split(/\s+/)) {
        const bare = bareWord(token)
        if (bare !== '' && !isSameWords(bare, token)) offenders.push(`${row.id}: ${token}`)
      }
    }

    expect(offenders).toEqual([])
  })
})
