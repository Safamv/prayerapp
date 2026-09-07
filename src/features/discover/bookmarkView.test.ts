import { describe, expect, it } from 'vitest'
import {
  authorsIn,
  BOOKMARK_SORTS,
  collectionsIn,
  DEFAULT_BOOKMARK_SORT,
  NO_FILTERS,
  viewBookmarks,
  type ViewableBookmark,
} from './bookmarkView'

/**
 * **Scope 6.7's ordering rule, checked on plain values.** The screen test in
 * `src/app/lists.test.tsx` checks that the screen honours it; this checks the
 * arithmetic underneath, which is where a sort that quietly rewrote the hand
 * order would actually live.
 */

function entry(
  overrides: Partial<ViewableBookmark['passage']> & {
    readonly order?: number
    readonly at?: string
  },
): ViewableBookmark {
  const { order = 0, at = '2026-01-01T00:00:00.000Z', ...passage } = overrides
  return {
    bookmark: { created_at: at, sort_order: order },
    passage: {
      title: 'Blessed is the spot',
      author: "Bahá'u'lláh",
      collection: 'prayers',
      word_count: 42,
      ...passage,
    },
  }
}

/** Three bookmarks whose hand order disagrees with every other axis. */
const arranged = [
  entry({
    order: 0,
    title: 'Zenith',
    author: 'The Báb',
    collection: 'gleanings',
    word_count: 300,
    at: '2026-01-01T00:00:00.000Z',
  }),
  entry({
    order: 1,
    title: 'Apex',
    author: "Bahá'u'lláh",
    collection: 'prayers',
    word_count: 10,
    at: '2026-03-01T00:00:00.000Z',
  }),
  entry({
    order: 2,
    title: 'Middle',
    author: "'Abdu'l-Bahá",
    collection: 'prayers',
    word_count: 100,
    at: '2026-02-01T00:00:00.000Z',
  }),
]

const titles = (entries: readonly ViewableBookmark[]) => entries.map((e) => e.passage.title)

describe('the four sorts of decision D7.2', () => {
  it('offers exactly four, with the hand order first and as the default', () => {
    expect(BOOKMARK_SORTS).toEqual(['manual', 'recent', 'title', 'shortest'])
    expect(DEFAULT_BOOKMARK_SORT).toBe('manual')
  })

  it('leaves the hand order exactly as it was handed in', () => {
    expect(titles(viewBookmarks(arranged, 'manual', NO_FILTERS))).toEqual([
      'Zenith',
      'Apex',
      'Middle',
    ])
  })

  it('puts the newest kept place first under RECENT', () => {
    expect(titles(viewBookmarks(arranged, 'recent', NO_FILTERS))).toEqual([
      'Apex',
      'Middle',
      'Zenith',
    ])
  })

  it('sorts alphabetically under TITLE', () => {
    expect(titles(viewBookmarks(arranged, 'title', NO_FILTERS))).toEqual([
      'Apex',
      'Middle',
      'Zenith',
    ])
  })

  it('puts the fewest words first under SHORTEST', () => {
    expect(titles(viewBookmarks(arranged, 'shortest', NO_FILTERS))).toEqual([
      'Apex',
      'Middle',
      'Zenith',
    ])
  })
})

describe('scope 6.7 - a sort is a view and never a rewrite', () => {
  it('does not touch the rows it was given', () => {
    const before = structuredClone(arranged)
    viewBookmarks(arranged, 'title', NO_FILTERS)
    viewBookmarks(arranged, 'shortest', { collection: 'prayers', author: null })
    expect(arranged).toEqual(before)
  })

  it('gives the hand order back unchanged after every other sort has been through', () => {
    // This is the promise the scope makes in as many words: "returning to the
    // manual sort restores it exactly as it was".
    for (const sort of BOOKMARK_SORTS) viewBookmarks(arranged, sort, NO_FILTERS)
    expect(titles(viewBookmarks(arranged, 'manual', NO_FILTERS))).toEqual([
      'Zenith',
      'Apex',
      'Middle',
    ])
  })
})

describe('the two filters of decision D7.2', () => {
  it('keeps only the named collection', () => {
    const shown = viewBookmarks(arranged, 'manual', { collection: 'prayers', author: null })
    expect(titles(shown)).toEqual(['Apex', 'Middle'])
  })

  it('keeps only the named author', () => {
    const shown = viewBookmarks(arranged, 'manual', { collection: null, author: 'The Báb' })
    expect(titles(shown)).toEqual(['Zenith'])
  })

  it('applies both at once, and can end with nothing', () => {
    const shown = viewBookmarks(arranged, 'manual', {
      collection: 'gleanings',
      author: "Bahá'u'lláh",
    })
    expect(shown).toEqual([])
  })

  it('filters before it sorts, so a sort never reorders a row that was filtered out', () => {
    const shown = viewBookmarks(arranged, 'shortest', { collection: 'prayers', author: null })
    expect(titles(shown)).toEqual(['Apex', 'Middle'])
  })
})

describe('a filter row is drawn only once it means something', () => {
  it('offers no axis at all when every bookmark shares its value', () => {
    const oneCollection = [entry({ title: 'A' }), entry({ title: 'B' })]
    expect(collectionsIn(oneCollection)).toEqual([])
    expect(authorsIn(oneCollection)).toEqual([])
  })

  it('offers the values present, in the order the hand arrangement meets them', () => {
    expect(collectionsIn(arranged)).toEqual(['gleanings', 'prayers'])
    expect(authorsIn(arranged)).toEqual(['The Báb', "Bahá'u'lláh", "'Abdu'l-Bahá"])
  })

  it('offers nothing for an empty list', () => {
    expect(collectionsIn([])).toEqual([])
    expect(authorsIn([])).toEqual([])
  })
})
