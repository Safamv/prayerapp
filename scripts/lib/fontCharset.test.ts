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
