/**
 * **What the sort and filter controls do to a list of bookmarks.** Scope 6.7.
 *
 * Every function here is pure and touches no database. That is the point: scope
 * 6.7's central promise is that choosing a sort is a *view* over the same
 * bookmarks and never a rewrite of the arrangement underneath, and a module that
 * cannot write anything is the strongest possible form of that promise.
 *
 * > The manual order is itself one of the sort options, and it is remembered.
 * > Choosing another sort is a view over the same bookmarks, never a rewrite of
 * > the arrangement underneath; returning to the manual sort restores it exactly
 * > as it was. Any other behaviour makes dragging feel unsafe, because one tap
 * > on a sort control would silently destroy an arrangement the user built by
 * > hand.
 *
 * ## The axes, and where they came from
 *
 * Scope 6.7 deliberately does not fix them: "collection, author, word count and
 * when it was bookmarked are the obvious candidates, and the session that builds
 * it should propose a set and ask." Safa chose four sorts and two filters
 * (decision D7.2).
 *
 * The types are structural rather than named, so a `BookmarkedPassage` satisfies
 * them as it is and this module needs to import nothing at all - the same
 * bargain `attribution.ts` makes with `AttributedPassage`.
 */

/** The four sorts, in the order they are offered. `manual` is the default. */
export type BookmarkSort = 'manual' | 'recent' | 'title' | 'shortest'

export const BOOKMARK_SORTS: readonly BookmarkSort[] = Object.freeze([
  'manual',
  'recent',
  'title',
  'shortest',
])

/** The hand arrangement of scope 6.7, and the only sort a row can be dragged in. */
export const DEFAULT_BOOKMARK_SORT: BookmarkSort = 'manual'

/** `null` on an axis means every value on it, which is the chip labelled ALL. */
export interface BookmarkFilters {
  readonly collection: string | null
  readonly author: string | null
}

export const NO_FILTERS: BookmarkFilters = Object.freeze({ collection: null, author: null })

export interface ViewableBookmark {
  readonly bookmark: { readonly created_at: string; readonly sort_order: number }
  readonly passage: {
    readonly title: string
    readonly author: string
    readonly collection: string
    readonly word_count: number
  }
}

/**
 * The collections present among these bookmarks, in the order they first appear
 * in the hand arrangement.
 *
 * **A one-value axis returns nothing**, and the screen draws no chips for it.
 * A filter that can only be switched between "all" and "all" is furniture, and
 * the screen it would sit on is a devotional one where furniture costs the most.
 */
export function collectionsIn(entries: readonly ViewableBookmark[]): string[] {
  return manyOf(entries.map((entry) => entry.passage.collection))
}

/** The authors present among these bookmarks. The library has three in total. */
export function authorsIn(entries: readonly ViewableBookmark[]): string[] {
  return manyOf(entries.map((entry) => entry.passage.author))
}

function manyOf(values: readonly string[]): string[] {
  const distinct = [...new Set(values)]
  return distinct.length > 1 ? distinct : []
}

/**
 * The rows to draw: filtered, then sorted. Never the other way round, so the
 * chips a screen offers are always chips that match something.
 *
 * **`manual` returns the rows exactly as they were handed in**, which is the
 * order `listBookmarkedPassages` read out of `sort_order`. It does no sorting of
 * its own at all, so there is no arithmetic here that could disagree with the
 * column, and it is the same list whether or not a filter is on.
 */
export function viewBookmarks<T extends ViewableBookmark>(
  entries: readonly T[],
  sort: BookmarkSort,
  filters: BookmarkFilters,
): T[] {
  const kept = entries.filter(
    (entry) =>
      (filters.collection === null || entry.passage.collection === filters.collection) &&
      (filters.author === null || entry.passage.author === filters.author),
  )

  if (sort === 'manual') return kept
  return [...kept].sort(comparators[sort])
}

/**
 * Australian English collates as the rest of the anglophone world does here, but
 * the locale is named so that sorting does not change with the device - the same
 * rule `passages.ts` follows.
 */
const comparators: Record<
  Exclude<BookmarkSort, 'manual'>,
  (a: ViewableBookmark, b: ViewableBookmark) => number
> = {
  /** Newest kept place first, which is what "recent" means about a bookmark. */
  recent: (a, b) => b.bookmark.created_at.localeCompare(a.bookmark.created_at),
  title: (a, b) => a.passage.title.localeCompare(b.passage.title, 'en-AU'),
  /**
   * Fewest words first. Scope 6.2 demoted length as a browsing axis and it is
   * right about the library; a bookmark list is the one place the question is
   * real, because you are choosing something to read in the ten minutes you have.
   */
  shortest: (a, b) => a.passage.word_count - b.passage.word_count,
}
