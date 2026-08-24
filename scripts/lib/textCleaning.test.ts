import { describe, expect, it } from 'vitest'
import {
  buildSearchVector,
  cleanLines,
  deriveTitle,
  estimateSegmentCount,
  firstSentence,
  joinLines,
  lengthBandFor,
  wordCount,
} from './textCleaning'

/**
 * Every string below is a real feed response, not an invented example — saved
 * while building session 3, by calling the live bahaiprayers.net endpoints
 * named in scope 4.1. CLAUDE.md section 11 requires normalisation to be
 * unit-tested, because a silent bug here would be wrong for every passage
 * built on top of it.
 */

describe('cleanLines', () => {
  it('drops an embedded editorial note and keeps the prayer, prayer id 208', () => {
    const raw =
      '##For Women\n\nO my God, O Forgiver of sins and Dispeller of afflictions!  ' +
      'O Thou Who art pardoning and merciful!'
    expect(cleanLines(raw, 'plain')).toEqual([
      'O my God, O Forgiver of sins and Dispeller of afflictions! O Thou Who art pardoning and merciful!',
    ])
  })

  it('drops a bold title and an attributed quotation ahead of the real text, the Tablet of Ahmad preamble', () => {
    const raw =
      '**Tablet of Aḥmad\n\n*“These daily obligatory prayers…have been invested by Bahá’u’lláh ' +
      'with a special potency”\n\n*—From a letter written on behalf of Shoghi Effendi\n\n' +
      'He is the King, the All-Knowing, the Wise!'
    expect(cleanLines(raw, 'plain')).toEqual(['He is the King, the All-Knowing, the Wise!'])
  })

  it('drops a stray footnote back-link with no plain-text meaning, prayer id 15698', () => {
    const raw = 'on the occasion of the death of his newborn child. ↩'
    expect(cleanLines(raw, 'plain')).toEqual(['on the occasion of the death of his newborn child.'])
  })

  it('preserves the poetic line breaks of a one-sentence prayer, "Blessed is the spot" (id 4966)', () => {
    const raw =
      'Blessed is the spot, and the house,\nand the place, and the city,\n' +
      'and the heart, and the mountain,\nand the refuge, and the cave,\n' +
      'and the valley, and the land,\nand the sea, and the island,\n' +
      'and the meadow where mention\nof God hath been made,\nand His praise glorified.'
    expect(cleanLines(raw, 'plain')).toEqual([
      'Blessed is the spot, and the house,',
      'and the place, and the city,',
      'and the heart, and the mountain,',
      'and the refuge, and the cave,',
      'and the valley, and the land,',
      'and the sea, and the island,',
      'and the meadow where mention',
      'of God hath been made,',
      'and His praise glorified.',
    ])
  })

  it('unwraps HTML paragraphs, Hidden Word Arabic 1', () => {
    const raw =
      '<p>O SON OF SPIRIT!</p>\n<p>My first counsel is this: Possess a pure, kindly and radiant ' +
      'heart, that thine may be a sovereignty ancient, imperishable and everlasting.</p>'
    expect(cleanLines(raw, 'html')).toEqual([
      'O SON OF SPIRIT!',
      'My first counsel is this: Possess a pure, kindly and radiant heart, that thine may be a ' +
        'sovereignty ancient, imperishable and everlasting.',
    ])
  })
})

describe('joinLines', () => {
  it('joins HTML-sourced lines on a blank line', () => {
    expect(joinLines(['O SON OF SPIRIT!', 'My first counsel is this.'], 'html')).toBe(
      'O SON OF SPIRIT!\n\nMy first counsel is this.',
    )
  })

  it('joins prayers-feed lines on a single break, preserving the authored rhythm', () => {
    expect(joinLines(['Blessed is the spot, and the house,', 'and the place.'], 'plain')).toBe(
      'Blessed is the spot, and the house,\nand the place.',
    )
  })
})

describe('firstSentence', () => {
  it('stops at the first sentence, not the first authored line break, "He is God." prayers', () => {
    const text =
      'He is God.\nO Thou kind Lord! Illumine the hearts with the light of Thy most great guidance.'
    expect(firstSentence(text)).toBe('He is God.')
  })

  it('reads a whole one-sentence prayer as its first sentence, "Blessed is the spot"', () => {
    const text =
      'Blessed is the spot, and the house,\nand the place, and the city,\n' +
      'and the meadow where mention\nof God hath been made,\nand His praise glorified.'
    expect(firstSentence(text)).toBe(
      'Blessed is the spot, and the house, and the place, and the city, and the meadow where ' +
        'mention of God hath been made, and His praise glorified.',
    )
  })

  it('reads a short address as the whole first sentence, Hidden Word Arabic 1', () => {
    expect(firstSentence('O SON OF SPIRIT!\nMy first counsel is this.')).toBe('O SON OF SPIRIT!')
  })
})

describe('deriveTitle', () => {
  it('returns a short first sentence verbatim', () => {
    expect(deriveTitle('O SON OF SPIRIT!')).toBe('O SON OF SPIRIT!')
  })

  it('truncates a long first sentence at a word boundary with an ellipsis', () => {
    const long =
      'Blessed is the spot, and the house, and the place, and the city, and the meadow where ' +
      'mention of God hath been made, and His praise glorified.'
    expect(deriveTitle(long)).toBe('Blessed is the spot, and the house, and…')
  })
})

describe('wordCount', () => {
  it('counts words in a real gleaning', () => {
    const text =
      'The beginning of all things is the knowledge of God, and the end of all things is strict ' +
      'observance of whatsoever hath been sent down from the empyrean of the Divine Will that ' +
      'pervadeth all that is in the heavens and all that is on the earth.'
    expect(wordCount(text)).toBe(47)
  })

  it('returns zero for empty text', () => {
    expect(wordCount('')).toBe(0)
  })
})

describe('estimateSegmentCount and lengthBandFor', () => {
  it('counts a short prayer as one segment, banded short', () => {
    const text = 'He is God.'
    expect(estimateSegmentCount(text)).toBe(1)
    expect(lengthBandFor(estimateSegmentCount(text))).toBe('short')
  })

  it('bands a nine-sentence passage as long', () => {
    const nineSentences = Array.from({ length: 9 }, (_, i) => `Sentence number ${i + 1}.`).join(' ')
    expect(estimateSegmentCount(nineSentences)).toBe(9)
    expect(lengthBandFor(estimateSegmentCount(nineSentences))).toBe('long')
  })

  it('bands a passage over twenty sentences as extended', () => {
    const manySentences = Array.from({ length: 21 }, (_, i) => `Sentence number ${i + 1}.`).join(
      ' ',
    )
    expect(lengthBandFor(estimateSegmentCount(manySentences))).toBe('extended')
  })
})

describe('buildSearchVector', () => {
  it('lowercases and joins the given fields, dropping nulls', () => {
    expect(buildSearchVector(['Blessed is the spot', null, "Bahá'u'lláh"])).toBe(
      "blessed is the spot bahá'u'lláh",
    )
  })
})
