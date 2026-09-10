import { describe, expect, it } from 'vitest'
import { BASE_CHARSET, collectCharset } from './fontCharset'

describe('BASE_CHARSET', () => {
  it("covers printable ASCII and design-tokens 8.1's declared diacritics", () => {
    for (const char of 'abcXYZ0129 .,!?') expect(BASE_CHARSET).toContain(char)
    for (const char of 'áíúḥḤṭṬṣẓ') expect(BASE_CHARSET).toContain(char)
  })
})

describe('collectCharset', () => {
  it('includes every character from the base set even with no input text', () => {
    const charset = collectCharset([])
    for (const char of BASE_CHARSET) expect(charset).toContain(char)
  })

  it('adds a diacritic the corpus uses that design-tokens 8.1 does not list', () => {
    // Real corpus text (gleaning 13): "‘Abdu’lláh Ubayy, ‘Abú ‘Ámir…Ráḍíyih…Ṣáliḥ". Capital
    // Á and Ṣ are not in design-tokens 8.1's declared list, which names only lowercase á and ṣ.
    const charset = collectCharset(['‘Abdu’lláh Ubayy, ‘Abú ‘Ámir, Ráḍíyih, Ṣáliḥ'])
    expect(charset).toContain('Á')
    expect(charset).toContain('Ṣ')
    expect(charset).toContain('ḍ')
  })

  it('deduplicates repeated characters', () => {
    const charset = collectCharset(['aaaaaaaaaa'])
    expect(charset.split('a').length - 1).toBe(1)
  })
})

describe('characters that are never drawn', () => {
  /**
   * A newline, a tab and the left-to-right mark are all in the corpus and none
   * of them is a letter. No font has a glyph for any of them, so asking every
   * subset to keep one means `scripts/lib/fontCoverage.ts` reports a gap in all
   * fifteen faces - which would bury the real gaps it exists to find.
   */
  it('leaves out a newline, a tab and a bidi mark', () => {
    const charset = collectCharset(['one\nline\ttwo‎three'])
    expect(charset).not.toContain('\n')
    expect(charset).not.toContain('\t')
    expect(charset).not.toContain('‎')
  })

  it('keeps the ordinary space, which is drawn and is a glyph like any other', () => {
    expect(collectCharset([])).toContain(' ')
  })

  it('keeps a letter that happens to sit beside one', () => {
    expect(collectCharset(['‎ḥ'])).toContain('ḥ')
  })
})
