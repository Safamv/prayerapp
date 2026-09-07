import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { passagePath } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useUserId } from '../../app/userContext'
import { ChipRow, type ChipChoice } from '../../components/Chips'
import { ListSurface, ScrollTail } from '../../components/ListSurface'
import { TallHeader } from '../../components/NavyHeader'
import { ReorderableList, type ReorderableRow } from '../../components/Reorderable'
import { Screen } from '../../components/Screen'
import {
  listBookmarkedPassages,
  reorderBookmarks,
  type BookmarkedPassage,
} from '../../data/bookmarks'
import { strings } from '../../strings'
import { capsCase, collectionLabel, passageRowAttribution } from '../../strings/attribution'
import { typeStyle } from '../../theme'
import {
  authorsIn,
  BOOKMARK_SORTS,
  collectionsIn,
  DEFAULT_BOOKMARK_SORT,
  NO_FILTERS,
  viewBookmarks,
  type BookmarkFilters,
  type BookmarkSort,
} from './bookmarkView'

/**
 * **Bookmarks.** Scope 6.7: the passages a user has kept a place in.
 *
 * > Deliberately separate from the list, and for a different reason: a bookmark
 * > is "find this again on Sunday", the list is "I intend to learn this". They
 * > share no state.
 *
 * They share no state here either. This screen reads `data/bookmarks.ts` and
 * nothing else, and a row opens the reading view rather than anything on the
 * memorisation side.
 *
 * ## Why a devotional screen is in this folder when it is its own tab
 *
 * `src/features/discover/` is not the Discover tab; it is the half of the app
 * where **principle 7.6 is a failing build** rather than a paragraph. Both
 * `eslint.config.js` and `discover-isolation.test.ts` match on this folder path,
 * so a screen written here cannot import the scheduler, the queue, or any module
 * carrying progress, even by accident and even in a later session that has never
 * read the principle. A screen full of prayers that must never grow a freshness
 * star is exactly what that wall is for. See decision D7.1.
 *
 * ## The ordering rule, which is the whole of scope 6.7
 *
 * > The manual order is itself one of the sort options, and it is remembered.
 * > Choosing another sort is a view over the same bookmarks, never a rewrite of
 * > the arrangement underneath.
 *
 * Two things make that true rather than promised. The sorting is a pure function
 * in `bookmarkView.ts` that cannot write anything. And **the handles are simply
 * absent under any sort but MY ORDER**, so there is no arrangement to destroy: a
 * sorted view is a view, and you can see that it is one because you cannot drag
 * it.
 *
 * ## The controls appear when they start to mean something
 *
 * A collection row is drawn only once your bookmarks span more than one
 * collection, and the same for authors (`collectionsIn`, `authorsIn` return
 * nothing for a single value). Four bookmarks get a sort row and nothing else.
 * Decision D7.2.
 */

/** Design-tokens 5.3's list surface, and the rhythm a section header would set. */
const CONTROLS_TOP = 22

export function BookmarksScreen() {
  const userId = useUserId()

  // Bumped after a reorder, so the screen re-reads what it just wrote rather
  // than holding a copy that has to be kept in step by hand.
  const [revision, setRevision] = useState(0)
  const loaded = useAsyncValue<BookmarkedPassage[]>(
    () => listBookmarkedPassages(userId),
    `${userId}:${String(revision)}`,
  )

  const [sort, setSort] = useState<BookmarkSort>(DEFAULT_BOOKMARK_SORT)
  const [filters, setFilters] = useState<BookmarkFilters>(NO_FILTERS)

  /**
   * The order as the reader last left it, until the read catches up. The same
   * shape `useMark` uses in the reading view and for the same reason (D5.6): a
   * drag redraws immediately, the write lands a millisecond later, and copying
   * the read into state through an effect is what lets a slower answer undo a
   * gesture that already happened on screen.
   */
  const [dragged, setDragged] = useState<readonly string[] | null>(null)

  const onReorder = useCallback(
    (orderedPassageIds: readonly string[]) => {
      setDragged(orderedPassageIds)
      void reorderBookmarks(userId, orderedPassageIds).then(
        () => {
          setRevision((previous) => previous + 1)
        },
        (error: unknown) => {
          console.error('Failed to save the bookmark order', error)
        },
      )
    },
    [userId],
  )

  const all = arrange(loaded ?? [], dragged)
  const shown = viewBookmarks(all, sort, filters)
  const collections = collectionsIn(all)
  const authors = authorsIn(all)

  return (
    <Screen
      header={
        <TallHeader eyebrow={strings.bookmarks.eyebrow} title={strings.screenTitles.bookmarks} />
      }
    >
      <ListSurface>
        {loaded !== undefined && all.length === 0 ? (
          <Quiet text={strings.bookmarks.empty} />
        ) : (
          <>
            <div style={{ paddingTop: CONTROLS_TOP }}>
              <ChipRow
                label={strings.bookmarks.sortLabel}
                ariaLabel={strings.accessibility.sortOptions}
                choices={SORT_CHOICES}
                selected={sort}
                onSelect={setSort}
              />
              {collections.length > 0 && (
                <ChipRow
                  label={strings.bookmarks.collectionLabel}
                  ariaLabel={strings.accessibility.collectionFilter}
                  choices={filterChoices(collections, collectionLabel)}
                  selected={filters.collection}
                  onSelect={(collection) => {
                    setFilters((previous) => ({ ...previous, collection }))
                  }}
                />
              )}
              {authors.length > 0 && (
                <ChipRow
                  label={strings.bookmarks.authorLabel}
                  ariaLabel={strings.accessibility.authorFilter}
                  choices={filterChoices(authors, capsCase)}
                  selected={filters.author}
                  onSelect={(author) => {
                    setFilters((previous) => ({ ...previous, author }))
                  }}
                />
              )}
            </div>

            {shown.length === 0 ? (
              <Quiet text={strings.bookmarks.noneMatch} />
            ) : (
              <ReorderableList
                label={strings.accessibility.bookmarkList}
                rows={shown.map(toRow)}
                canReorder={sort === 'manual'}
                onReorder={onReorder}
              />
            )}
          </>
        )}
      </ListSurface>
      <ScrollTail />
    </Screen>
  )
}

/**
 * One bookmark. Design-tokens 5.3's list row: a 20px title in `deep` with the
 * author and the word count on the caps line beneath it, composed by the same
 * function every other passage row in the app uses (principle 7.10).
 *
 * The whole row is the link, and the handle sits outside it, so a drag never
 * starts a navigation and a tap never starts a drag.
 */
function toRow(entry: BookmarkedPassage): ReorderableRow {
  return {
    id: entry.passage.id,
    title: entry.passage.title,
    content: (
      <Link to={passagePath(entry.passage.id)} className="block">
        <span className="block text-deep" style={typeStyle('listRowTitle')}>
          {entry.passage.title}
        </span>
        <span
          className="block text-on-paper-44"
          style={{ ...typeStyle('rowAttribution'), marginTop: 3 }}
        >
          {passageRowAttribution(entry.passage)}
        </span>
      </Link>
    ),
  }
}

/**
 * The word on each sort chip. Written out per sort rather than derived, so the
 * strings module holds four labels a tone pass can edit (principle 7.11) rather
 * than one rule that builds them.
 */
const SORT_LABELS: Record<BookmarkSort, string> = {
  manual: strings.bookmarks.sortManual,
  recent: strings.bookmarks.sortRecent,
  title: strings.bookmarks.sortTitle,
  shortest: strings.bookmarks.sortShortest,
}

const SORT_CHOICES: readonly ChipChoice<BookmarkSort>[] = Object.freeze(
  BOOKMARK_SORTS.map((value) => ({ value, label: SORT_LABELS[value] })),
)

function filterChoices(
  values: readonly string[],
  labelOf: (value: string) => string,
): ChipChoice<string | null>[] {
  return [
    { value: null, label: strings.bookmarks.filterAll },
    ...values.map((value) => ({ value, label: labelOf(value) })),
  ]
}

/**
 * The reader's own arrangement wins over the read for as long as it is newer.
 * Once the re-read lands it holds the same order, and this falls away.
 */
function arrange(
  entries: readonly BookmarkedPassage[],
  dragged: readonly string[] | null,
): BookmarkedPassage[] {
  if (dragged === null) return [...entries]
  const rank = new Map(dragged.map((id, index) => [id, index]))
  return [...entries].sort(
    (a, b) => (rank.get(a.passage.id) ?? Infinity) - (rank.get(b.passage.id) ?? Infinity),
  )
}

/**
 * Nothing kept, or nothing left after the filters. One calm sentence in the same
 * italic the finished queue uses, with nothing offered after it.
 */
function Quiet({ text }: { text: string }) {
  return (
    <p className="text-on-paper-50" style={{ ...typeStyle('bylineItalic'), padding: '26px 0 8px' }}>
      {text}
    </p>
  )
}
