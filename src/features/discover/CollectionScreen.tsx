import { useParams } from 'react-router'
import { useAsyncValue } from '../../app/useAsyncValue'
import { ListRow, ListSurface, ScrollTail, SectionHeader } from '../../components/ListSurface'
import { CompactTitleHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { listDevotionalPassagesByCollection } from '../../data/passages'
import { listDevotionalTagsWithCountsForCollection, type TagWithCount } from '../../data/tags'
import type { PassageRow } from '../../data/types'
import { strings } from '../../strings'
import { collectionTitle, passageRowAttribution } from '../../strings/attribution'
import { categoryPath, DISCOVER_PATH, passagePath } from '../../app/routes'
import { useBack } from '../../app/useBack'

/**
 * One collection: its categories where it has any, its passages where it does
 * not. Scope 6.1.
 *
 * ## One screen, decided by the data rather than by a special case
 *
 * The obvious way to build this would be "Prayers has categories, the other
 * three do not". That is true today and it is true by accident: it is a fact
 * about what bahaiprayers.net has tagged, not about what a collection is. So the
 * screen asks instead, and shows whichever it finds.
 *
 * The consequence is worth having. If the Gleanings are ever tagged, the
 * Gleanings gain a category level and nothing here changes. If the tag feed is
 * ever withdrawn, Prayers falls back to a list of 473 and stays usable.
 */
interface CollectionContents {
  readonly categories: TagWithCount[]
  readonly passages: PassageRow[]
}

export function CollectionScreen() {
  const { collection = '' } = useParams()
  const back = useBack(DISCOVER_PATH)

  const contents = useAsyncValue<CollectionContents>(async () => {
    const categories = await listDevotionalTagsWithCountsForCollection(collection)
    if (categories.length > 0) return { categories, passages: [] }
    return { categories, passages: await listDevotionalPassagesByCollection(collection) }
  }, collection)

  return (
    <Screen header={<CompactTitleHeader title={collectionTitle(collection)} onBack={back} />}>
      <ListSurface>
        {contents !== undefined && contents.categories.length > 0 ? (
          <>
            <SectionHeader
              label={strings.discover.categoriesSection}
              count={String(contents.categories.length)}
            />
            <nav aria-label={strings.accessibility.categoryList}>
              {contents.categories.map((entry) => (
                <ListRow
                  key={entry.tag.id}
                  to={categoryPath(collection, entry.tag.id)}
                  title={entry.tag.name}
                  secondary={strings.discover.passageCount(entry.count)}
                />
              ))}
            </nav>
          </>
        ) : (
          <>
            {/* The rhythm a section header would have set, without one: the
                collection's name is already the title of the screen. */}
            <div style={{ height: 22 }} />
            <nav aria-label={strings.accessibility.passageList}>
              {(contents?.passages ?? []).map((passage) => (
                <ListRow
                  key={passage.id}
                  to={passagePath(passage.id)}
                  title={passage.title}
                  secondary={passageRowAttribution(passage)}
                />
              ))}
            </nav>
          </>
        )}
      </ListSurface>
      <ScrollTail />
    </Screen>
  )
}
