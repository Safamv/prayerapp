import { useAsyncValue } from '../../app/useAsyncValue'
import { ListRow, ListSurface, ScrollTail, SectionHeader } from '../../components/ListSurface'
import { TallHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { corpusReady } from '../../data/loadCorpus'
import { countDevotionalPassagesByCollection, DEVOTIONAL_COLLECTIONS } from '../../data/passages'
import { strings } from '../../strings'
import { collectionTitle } from '../../strings/attribution'
import { collectionPath } from '../../app/routes'

/**
 * Discover: the library. Scope 6.1.
 *
 * The four collections, in the order scope 6.1 lists them: Prayers, The Hidden
 * Words, Gleanings, Prayers and Meditations. Tapping one goes to its categories
 * if it has any and to its passages if it does not.
 *
 * ## Why this screen exists at all
 *
 * It did not, until decision D4.1. Category browse was built first, exactly as
 * scope 6.1 specified, and it turned out to reach 473 of the library's 976
 * passages: the tag feed tags prayers and nothing else, so every Hidden Word,
 * every Gleaning and every Prayer and Meditation had no category to be found
 * under. Collections are the axis that reaches them, and they are the axis a
 * printed prayer book has - a contents page before an index.
 *
 * ## What is deliberately not here
 *
 * **No search field.** Design-tokens 5.2 draws one into the tall header and a
 * library screen is the most natural place in the app for it, which is exactly
 * why this is written down: search is scope 6.3 and is `[v1.0]`.
 *
 * **No Recents** (6.4, `[v1.0]`), **no by-author axis** (6.1, `[v1.0]`), **no
 * length filter chip** (6.2, `[v1.0]`).
 *
 * ## Two rules bind everything built in this folder
 *
 * **Principle 7.6.** No due counts, no focus banner, no streak, no freshness
 * state and no progress indicator anywhere under here. It is enforced by
 * `src/principles/discover-isolation.test.ts`, which fails the build if anything
 * in this folder imports the scheduler or a progress module.
 *
 * **Decision D1.10.** Discover never surfaces a Ruhi quotation, in browse or in
 * search. It reads through `src/data/passages.ts` and `src/data/tags.ts`, which
 * exclude the Ruhi collection at the query, so this is structural rather than a
 * filter to remember.
 */
interface Collection {
  readonly id: string
  readonly count: number
}

export function DiscoverScreen() {
  const collections = useAsyncValue<Collection[]>(async () => {
    // The library is written into IndexedDB beside the first render, so on a
    // first run this waits for it rather than settling on an empty list.
    await corpusReady()
    return Promise.all(
      DEVOTIONAL_COLLECTIONS.map(async (id) => ({
        id,
        count: await countDevotionalPassagesByCollection(id),
      })),
    )
  }, 'collections')

  // A collection with nothing in it is not offered. Every one of the four is
  // populated; this would take a feed that fetched empty.
  const shown = (collections ?? []).filter((collection) => collection.count > 0)

  return (
    <Screen
      header={
        <TallHeader eyebrow={strings.discover.eyebrow} title={strings.screenTitles.discover} />
      }
    >
      <ListSurface>
        <SectionHeader
          label={strings.discover.collectionsSection}
          count={collections === undefined ? undefined : String(shown.length)}
        />
        <nav aria-label={strings.accessibility.collectionList}>
          {shown.map((collection) => (
            <ListRow
              key={collection.id}
              to={collectionPath(collection.id)}
              title={collectionTitle(collection.id)}
              secondary={strings.discover.passageCount(collection.count)}
            />
          ))}
        </nav>
      </ListSurface>
      <ScrollTail />
    </Screen>
  )
}
