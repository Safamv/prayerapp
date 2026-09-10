import { describe, expect, it } from 'vitest'
import { resolveCitation } from './ruhiCitation.ts'

/**
 * Attribution, which principle 7.10 admits no exception to.
 *
 * Every case here is a citation shape that actually occurs across the three
 * books. The ones that throw matter as much as the ones that resolve: this
 * module's whole design is that it stops the build rather than attributing a
 * passage of scripture to a guess.
 */

describe('an author named in the citation', () => {
  it('takes the name at the head of it, before the work', () => {
    expect(
      resolveCitation(
        "Bahá'u'lláh, cited by Shoghi Effendi, *The Advent of Divine Justice* (Wilmette: " +
          "Bahá'í Publishing Trust, 2006, 2018 printing), par. 39, pp. 36–37.",
        null,
      ),
    ).toEqual({ author: "Bahá'u'lláh", sourceWork: 'The Advent of Divine Justice' })
  })

  it("reads a name ending in a letter JavaScript's \\b does not recognise", () => {
    // `'Abdu'l-Bahá` ends in an accented letter, and the boundary escape is
    // ASCII-only, so this is the case that silently attributed 32 quotations to
    // whatever their volume happened to be compiled from.
    expect(resolveCitation("'Abdu'l-Bahá, in *Bahá'í Prayers*, p. 28.", null)).toEqual({
      author: "'Abdu'l-Bahá",
      sourceWork: "Bahá'í Prayers",
    })
  })

  it('reads "Words of X, cited by" somebody else', () => {
    expect(
      resolveCitation(
        "Words of 'Abdu'l-Bahá, cited by J. E. Esslemont, *Bahá'u'lláh and the New Era*, p. 106.",
        null,
      ).author,
    ).toBe("'Abdu'l-Bahá")
  })

  it('reads a letter written on behalf of somebody', () => {
    expect(
      resolveCitation(
        'From a letter dated 10 January 1936 written on behalf of Shoghi Effendi, quoted in ' +
          "*Bahá'í Prayers*, p. 301.",
        null,
      ).author,
    ).toBe('Shoghi Effendi')
  })

  it('reads a letter written on behalf of the House of Justice', () => {
    expect(
      resolveCitation(
        'From a letter dated 28 July 2016 written on behalf of the Universal House of Justice.',
        null,
      ),
    ).toEqual({ author: 'The Universal House of Justice', sourceWork: 'Letter' })
  })
})

describe('an author the work supplies', () => {
  it('takes it from the volume where the citation names nobody', () => {
    expect(
      resolveCitation(
        "*Gleanings from the Writings of Bahá'u'lláh* (Wilmette: Bahá'í Publishing Trust, " +
          '1983, 2017 printing), CXXXIX, par. 8, p. 345.',
        null,
      ),
    ).toEqual({ author: "Bahá'u'lláh", sourceWork: "Gleanings from the Writings of Bahá'u'lláh" })
  })

  it('reads a title that is not in italics, which is how Book 2 writes them', () => {
    expect(
      resolveCitation(
        "Gleanings from the Writings of Bahá'u'lláh (Wilmette: Bahá'í Publishing Trust, 1983), " +
          'CLIII, par. 5, p. 369.',
        null,
      ).author,
    ).toBe("Bahá'u'lláh")
  })

  it('folds a subtitle onto the title the work is known by', () => {
    expect(
      resolveCitation(
        "*Paris Talks: Addresses Given by 'Abdu'l-Bahá in 1911* (Wilmette: Bahá'í Publishing, " +
          '2006), no. 1.7, p. 6.',
        null,
      ).sourceWork,
    ).toBe('Paris Talks')
  })

  it('gives a document with no volume the kind of document it is', () => {
    expect(
      resolveCitation("From a Tablet of 'Abdu'l-Bahá (authorized translation).", null),
    ).toEqual({ author: "'Abdu'l-Bahá", sourceWork: 'Tablet' })
  })
})

describe('Ibid.', () => {
  const previous = { author: "'Abdu'l-Bahá", sourceWork: 'The Compilation of Compilations' }

  it('reads the work out of the resolution the curation wrote', () => {
    expect(
      resolveCitation(
        'Ibid., Arabic no. 12, p. 6. *(Ibid. resolved to The Hidden Words.)*',
        previous,
      ),
    ).toEqual({ author: "Bahá'u'lláh", sourceWork: 'The Hidden Words' })
  })

  it('carries the author down where the resolution names a work and no author', () => {
    expect(
      resolveCitation(
        'Ibid., no. 2024, p. 330. *(Ibid. resolved to "Trustworthiness," The Compilation of ' +
          'Compilations, vol. 2.)*',
        previous,
      ).author,
    ).toBe("'Abdu'l-Bahá")
  })

  it('finds a resolution note that follows the author rather than opening the line', () => {
    expect(
      resolveCitation(
        "'Abdu'l-Bahá, ibid., p. 29. *(ibid. resolved to Bahá'í Prayers.)*",
        previous,
      ),
    ).toEqual({ author: "'Abdu'l-Bahá", sourceWork: "Bahá'í Prayers" })
  })

  it('stops on an unresolved chain rather than inheriting silently', () => {
    expect(() => resolveCitation('Ibid., p. 42.', previous)).toThrow(/unresolved/)
  })
})

describe('what it refuses to guess at', () => {
  it('stops when it cannot name the author', () => {
    expect(() => resolveCitation('*A Book Nobody Has Heard Of*, p. 1.', null)).toThrow(
      /names no author/,
    )
  })

  it('stops when it cannot name the work', () => {
    expect(() => resolveCitation("Bahá'u'lláh, somewhere unrecorded.", null)).toThrow(
      /names no source work/,
    )
  })
})
