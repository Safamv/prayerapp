import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BASE_CHARSET, collectCharset } from '../../scripts/lib/fontCharset'
import {
  capsCase,
  collectionLabel,
  passageAttribution,
  passageRowAttribution,
  textTypeLabel,
  type AttributedPassage,
} from './attribution'
import { strings } from './index'

/**
 * Attribution is a licence condition (principle 7.10), so it is tested like one.
 *
 * The second half of this file is the unusual part: it checks that every
 * character the app can put on screen has a glyph in the subset font. See the
 * comment above that block.
 */

const CORPUS_DIR = join(import.meta.dirname, '..', 'data', 'corpus-data')
const CORPUS_FILES = [
  'prayers.json',
  'hidden-words.json',
  'gleanings.json',
  'prayers-and-meditations.json',
]

function corpusPassages(): AttributedPassage[] {
  return CORPUS_FILES.flatMap(
    (file) => JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8')) as AttributedPassage[],
  )
}

const prayer: AttributedPassage = {
  author: "Bahá'u'lláh",
  translator: null,
  source_work: null,
  collection: 'prayers',
  text_type: 'prayer',
  word_count: 109,
}

describe('passageAttribution', () => {
  it('names the author and the work, in capitals, per design-tokens 5.4', () => {
    expect(passageAttribution(prayer)).toBe("BAHÁ'U'LLÁH · PRAYERS")
  })

  it('prefers the work a passage names over its collection', () => {
    expect(passageAttribution({ ...prayer, source_work: 'Fire Tablet' })).toBe(
      "BAHÁ'U'LLÁH · FIRE TABLET",
    )
  })

  it('names the translator where there is one, which scope 4.3 requires', () => {
    expect(passageAttribution({ ...prayer, translator: 'Shoghi Effendi' })).toBe(
      "BAHÁ'U'LLÁH · TRANSLATED BY SHOGHI EFFENDI · PRAYERS",
    )
  })

  it('always names both an author and a source, for every passage in the corpus', () => {
    for (const passage of corpusPassages()) {
      const line = passageAttribution(passage)
      expect(line).toContain(capsCase(passage.author))
      // A separator means a second part followed, so the line never ends at a
      // name with nothing after it. Principle 7.10 is the reason.
      expect(line).toContain(' · ')
    }
  })
})

describe('passageRowAttribution', () => {
  it('is the author and the word count, which is what scope 6.2 puts on a row', () => {
    expect(passageRowAttribution(prayer)).toBe("BAHÁ'U'LLÁH · 109 WORDS")
  })

  it('counts one word without an s', () => {
    expect(passageRowAttribution({ ...prayer, word_count: 1 })).toBe("BAHÁ'U'LLÁH · 1 WORD")
  })

  it('never names the work, so a screen of Hidden Words does not repeat itself', () => {
    expect(passageRowAttribution({ ...prayer, source_work: 'The Hidden Words' })).not.toContain(
      'HIDDEN',
    )
  })
})

describe('labels', () => {
  it("uses the app's own capitalised names for the four collections", () => {
    expect(collectionLabel('hidden-words')).toBe('THE HIDDEN WORDS')
    expect(textTypeLabel('hidden-word')).toBe('HIDDEN WORD')
  })

  it('falls back to the raw value rather than showing nothing for an unknown one', () => {
    expect(collectionLabel('a-fifth-feed')).toBe('A-FIFTH-FEED')
    expect(textTypeLabel('meditation')).toBe('MEDITATION')
  })
})

/**
 * **The font subset covers everything the app can uppercase.**
 *
 * Decision D3.6 found that design-tokens 8.1's list of accented letters was
 * short of what the corpus actually uses, and the symptom was invisible: one
 * character of one word falling back to the system serif. Folding an author or
 * a work's name to capitals for the caps slot (design-tokens 2.3) can produce a
 * letter that appears nowhere in the corpus in that case — `Súrih of the Pen`
 * becomes `SÚRIH OF THE PEN`, and there is no Ú anywhere in the corpus.
 *
 * So this checks the app's side of the bargain against the script's: every
 * character `attribution.ts` can put on screen, for every passage actually
 * committed, has a glyph in the subset that `scripts/fetch-fonts.ts` cuts. If
 * this fails, the fix is to widen `BASE_CHARSET` and re-run the script - never
 * to stop uppercasing, and never to edit the font files.
 */
describe('the subset font can draw every attribution the corpus produces', () => {
  it('leaves no character without a glyph', () => {
    const corpusText: string[] = []
    for (const file of CORPUS_FILES) {
      const rows = JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf8')) as Record<
        string,
        unknown
      >[]
      for (const row of rows) {
        for (const value of Object.values(row)) {
          if (typeof value === 'string') corpusText.push(value)
        }
      }
    }
    const subset = new Set(collectCharset(corpusText))

    const rendered = corpusPassages().flatMap((passage) => [
      passageAttribution(passage),
      passageRowAttribution(passage),
      textTypeLabel(passage.text_type),
    ])
    rendered.push(strings.reading.copyright, strings.discover.eyebrow)

    const missing = new Set<string>()
    for (const line of rendered) {
      for (const char of line) if (!subset.has(char)) missing.add(char)
    }

    expect([...missing]).toEqual([])
  })

  it('carries the uppercase diacritics whether or not the corpus proves each one', () => {
    // Ú is the one this test was written for: it exists in the corpus only as ú.
    for (const char of 'ÁÍÚḤṬṢẒ') expect(BASE_CHARSET).toContain(char)
  })
})
