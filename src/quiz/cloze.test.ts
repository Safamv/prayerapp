import { describe, expect, it } from 'vitest'
import { buildCloze, canCloze, chipFills, clozeTokens } from './cloze'
import { normalise } from '../text/normalise'

/**
 * Chip cloze. Scope 9.3, levels 2 and 3.
 *
 * CLAUDE.md section 11 singles this interaction out - "chip selection and
 * match-after-normalisation is the one interaction where a subtle bug looks like
 * correct behaviour" - and asks for a component test. This is the other half of
 * that: the rules, without a screen in the way. The component test that drives
 * the real screen is `src/app/quiz.test.tsx`.
 */

const BLESSED = 'Blessed is the spot, and the house, and the place, and the city.'
const OTHER = [
  'Blessed is the heart where the remembrance of God is uttered.',
  'And the mountain, and the refuge, and the cave.',
]

function cloze(level: 2 | 3, line = BLESSED, otherLines = OTHER) {
  return buildCloze({ line, otherLines, level, seed: `segment-1:${String(level)}` })
}

function blankedWords(built: ReturnType<typeof cloze>): string[] {
  return built.blanks.map((blank) => blank.token)
}

describe('clozeTokens', () => {
  it('splits a line into words and keeps the whitespace before each', () => {
    expect(clozeTokens('Blessed is the spot')).toEqual([
      { text: 'Blessed', before: '' },
      { text: 'is', before: ' ' },
      { text: 'the', before: ' ' },
      { text: 'spot', before: ' ' },
    ])
  })

  it('keeps a line break exactly, so a joined line is drawn as it was written', () => {
    const tokens = clozeTokens('Blessed is the spot.\nAnd the house.')
    expect(tokens.map((token) => token.text).join('|')).toBe('Blessed|is|the|spot.|And|the|house.')
    expect(tokens[4]?.before).toBe('\n')
  })

  it('rebuilds the line exactly, character for character', () => {
    for (const line of [BLESSED, 'a\n\n b  c ', ' leading space', '']) {
      const rebuilt = clozeTokens(line)
        .map((token) => token.before + token.text)
        .join('')
      expect(rebuilt).toBe(line.replace(/\s+$/, ''))
    }
  })
})

describe('canCloze', () => {
  it('is true of an ordinary line', () => {
    expect(canCloze(BLESSED)).toBe(true)
  })

  it('is false of a line with only one word in it', () => {
    expect(canCloze('Amen.')).toBe(false)
  })

  it('is false of a line with no words long enough to take out', () => {
    expect(canCloze('O my, ah!')).toBe(false)
  })
})

describe('buildCloze', () => {
  it('takes out about one word in seven at level 2', () => {
    // 13 words. 15% of 13 is 1.95, which rounds to two.
    expect(clozeTokens(BLESSED)).toHaveLength(13)
    expect(cloze(2).blanks).toHaveLength(2)
  })

  it('takes out about two words in five at level 3', () => {
    // 40% of 13 is 5.2, which rounds to five.
    expect(cloze(3).blanks).toHaveLength(5)
  })

  it('always takes out at least one word, however short the line', () => {
    const short = buildCloze({ line: 'Blessed spot', otherLines: OTHER, level: 2, seed: 's' })
    expect(short.blanks).toHaveLength(1)
  })

  it('never takes out every word', () => {
    const short = buildCloze({ line: 'Blessed spot', otherLines: OTHER, level: 3, seed: 's' })
    expect(short.blanks.length).toBeLessThan(clozeTokens('Blessed spot').length)
  })

  it('never takes out two words side by side', () => {
    for (const level of [2, 3] as const) {
      for (const seed of ['a', 'b', 'c', 'd', 'e']) {
        const built = buildCloze({ line: BLESSED, otherLines: OTHER, level, seed })
        const indices = built.blanks.map((blank) => blank.tokenIndex)
        const adjacent = indices.filter((index) => indices.includes(index + 1))
        expect(adjacent).toEqual([])
      }
    }
  })

  it('prefers the longer words and leaves the small ones standing', () => {
    // At level 2 there is room for two blanks and eight words of four letters or
    // more, so "is" and "the" should never be among them.
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const built = buildCloze({ line: BLESSED, otherLines: OTHER, level: 2, seed })
      for (const blank of built.blanks) {
        expect(normalise(blank.token).length).toBeGreaterThanOrEqual(4)
      }
    }
  })

  it('reaches for the three-letter words only when the line has nothing longer', () => {
    const built = buildCloze({
      line: 'O my God and my Lord',
      otherLines: OTHER,
      level: 3,
      seed: 's',
    })
    expect(built.blanks.length).toBeGreaterThan(0)
    for (const blank of built.blanks) {
      expect(normalise(blank.token).length).toBeGreaterThanOrEqual(3)
    }
  })

  it('gives the blanks in the order they appear in the line', () => {
    const indices = cloze(3).blanks.map((blank) => blank.tokenIndex)
    expect(indices).toEqual([...indices].sort((a, b) => a - b))
  })

  it('keeps the punctuation on the word the blank fills in with', () => {
    const built = buildCloze({
      line: 'Blessed is the spot, and the house.',
      otherLines: OTHER,
      level: 3,
      seed: 'punctuation',
    })
    const withComma = built.blanks.find((blank) => blank.token === 'spot,')
    expect(withComma).toBeDefined()
  })

  it('draws the chips without that punctuation', () => {
    const built = buildCloze({
      line: 'Blessed is the spot, and the house.',
      otherLines: OTHER,
      level: 3,
      seed: 'punctuation',
    })
    for (const chip of built.chips) {
      expect(chip.word).not.toMatch(/[,.!?]$/)
    }
  })

  it('offers a chip for every word it took out', () => {
    const built = cloze(3)
    for (const blank of built.blanks) {
      expect(built.chips.some((chip) => chipFills(chip, blank))).toBe(true)
    }
  })

  it('offers more chips than there are blanks, so the bank is not the answer', () => {
    for (const level of [2, 3] as const) {
      const built = cloze(level)
      expect(built.chips.length).toBeGreaterThan(built.blanks.length)
    }
  })

  it('takes its distractors from elsewhere in the same passage', () => {
    // Scope 9.3: "Distractors come free from other words in the same passage."
    // Nothing is invented and nothing is fetched.
    const built = cloze(2)
    const answers = new Set(built.blanks.map((blank) => normalise(blank.token)))
    const elsewhere = new Set(
      OTHER.join(' ')
        .split(/\s+/)
        .map((word) => normalise(word)),
    )

    const distractors = built.chips.filter((chip) => !answers.has(normalise(chip.word)))
    expect(distractors.length).toBeGreaterThan(0)
    for (const distractor of distractors) {
      expect(elsewhere.has(normalise(distractor.word))).toBe(true)
    }
  })

  it('never offers a distractor that is one of the answers', () => {
    const built = cloze(3)
    const answers = built.blanks.map((blank) => normalise(blank.token))
    const chips = built.chips.map((chip) => normalise(chip.word))
    for (const answer of answers) {
      // As many chips carrying that word as there are blanks wanting it, and no
      // more: a spare copy would be a distractor that is secretly correct.
      expect(chips.filter((word) => word === answer)).toHaveLength(
        answers.filter((word) => word === answer).length,
      )
    }
  })

  it('falls back to the words left standing when the passage has no other line', () => {
    const built = buildCloze({ line: BLESSED, otherLines: [], level: 2, seed: 'alone' })
    expect(built.chips.length).toBeGreaterThan(built.blanks.length)
  })

  it('gives the same puzzle for the same line and level, every time', () => {
    expect(blankedWords(cloze(3))).toEqual(blankedWords(cloze(3)))
    expect(cloze(3).chips).toEqual(cloze(3).chips)
  })

  it('gives a different puzzle at the two cloze levels', () => {
    expect(blankedWords(cloze(2))).not.toEqual(blankedWords(cloze(3)))
  })
})

describe('chipFills', () => {
  /**
   * The comparison the whole interaction turns on. Every case here is one a
   * naive `chip.word === blank.token` would mark wrong.
   */
  it('matches a chip against the punctuation the line had', () => {
    expect(chipFills({ id: 'c', word: 'spot' }, { tokenIndex: 3, token: 'spot,' })).toBe(true)
    expect(chipFills({ id: 'c', word: 'city' }, { tokenIndex: 9, token: 'city.' })).toBe(true)
    expect(chipFills({ id: 'c', word: 'Lord' }, { tokenIndex: 0, token: '“Lord!”' })).toBe(true)
  })

  it('matches whatever the capitalisation', () => {
    expect(chipFills({ id: 'c', word: 'blessed' }, { tokenIndex: 0, token: 'Blessed' })).toBe(true)
  })

  it('matches across the accents', () => {
    expect(chipFills({ id: 'c', word: 'Bahai' }, { tokenIndex: 0, token: 'Bahá’í,' })).toBe(true)
  })

  it('does not match a different word', () => {
    expect(chipFills({ id: 'c', word: 'house' }, { tokenIndex: 3, token: 'spot,' })).toBe(false)
  })

  it('matches a repeated word wherever it was taken from', () => {
    // "and" appears three times in the line. A chip for one of them fills any of
    // them, which is the only behaviour that is not a lie about the text.
    const built = buildCloze({
      line: 'And the house, and the place, and the city.',
      otherLines: OTHER,
      level: 3,
      seed: 'repeat',
    })
    for (const blank of built.blanks) {
      expect(built.chips.filter((chip) => chipFills(chip, blank)).length).toBeGreaterThan(0)
    }
  })
})
