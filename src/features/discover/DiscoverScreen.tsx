import { ListRow, ListSurface, ScrollTail, SectionHeader } from '../../components/ListSurface'
import { TallHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { corpusReady } from '../../data/loadCorpus'
import { listDevotionalTagsWithCounts } from '../../data/tags'
import { strings } from '../../strings'
import { categoryPath } from './routes'
import { useAsyncValue } from './useAsyncValue'

/**
 * Discover: the library, browsed by category. Scope 6.1.
 *
 * > **By category.** Alphabetical list of topic tags from the API tag feed, each
 * > with a passage count. Drill in to a passage list. **V0.**
 *
 * A tall navy header (design-tokens 5.1) over a scrolling list surface (5.3).
 *
 * ## What is deliberately not here
 *
 * **No search field.** Design-tokens 5.2 draws one into the tall header and a
 * library screen is the most natural place in the app for it, which is exactly
 * why this is written down: search is scope 6.3 and is `[v1.0]`.
 *
 * **No length filter chip** (scope 6.2, `[v1.0]`), **no Recents** (6.4,
 * `[v1.0]`), **no by-collection or by-author axis** (6.1, both `[v1.0]`).
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
export function DiscoverScreen() {
  const categories = useAsyncValue(async () => {
    // The library is written into IndexedDB beside the first render, so on a
    // first run this waits for it rather than settling on an empty list.
    await corpusReady()
    return listDevotionalTagsWithCounts()
  }, 'categories')

  // A category carrying no devotional passage would open onto an empty list, so
  // it is not offered. Nothing in the committed corpus is in that state; a tag
  // could reach it if a later feed tagged only Ruhi material.
  const shown = (categories ?? []).filter((entry) => entry.count > 0)

  return (
    <Screen
      header={
        <TallHeader eyebrow={strings.discover.eyebrow} title={strings.screenTitles.discover} />
      }
    >
      <ListSurface>
        <SectionHeader
          label={strings.discover.categoriesSection}
          count={categories === undefined ? undefined : String(shown.length)}
        />
        <nav aria-label={strings.accessibility.categoryList}>
          {shown.map((entry) => (
            <ListRow
              key={entry.tag.id}
              to={categoryPath(entry.tag.id)}
              title={entry.tag.name}
              secondary={strings.discover.passageCount(entry.count)}
            />
          ))}
        </nav>
      </ListSurface>
      <ScrollTail />
    </Screen>
  )
}
