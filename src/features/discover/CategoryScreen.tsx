import { useParams } from 'react-router'
import { ListRow, ListSurface, ScrollTail } from '../../components/ListSurface'
import { CompactTitleHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { listDevotionalPassagesByTag } from '../../data/passages'
import { getTag } from '../../data/tags'
import type { PassageRow, TagRow } from '../../data/types'
import { strings } from '../../strings'
import { passageRowAttribution } from '../../strings/attribution'
import { DISCOVER_PATH, passagePath } from './routes'
import { useAsyncValue } from './useAsyncValue'
import { useBack } from './useBack'

/**
 * One category's passages. Scope 6.1 ("drill in to a passage list") and 6.2.
 *
 * > **Passage rows show:** title or opening phrase, author, and **word count**.
 * > Word count is precise, honest, and free at ingestion. It is not a band and
 * > not a judgement.
 *
 * So a row is the title, then the author and the word count on the caps line
 * beneath it, composed by `passageRowAttribution` so that principle 7.10 is met
 * the same way on every surface in the app.
 *
 * Alphabetical by title, which is the order `listDevotionalPassagesByTag`
 * returns and the order scope 6.5 wants.
 *
 * ## Not here
 *
 * **The length filter chip** (scope 6.2) is `[v1.0]`. Length bands are still
 * computed at ingestion and lead nowhere, which is 6.2's own wording.
 *
 * **Nothing about memorisation.** Not whether a passage is on the list, not
 * whether it is due, not how fresh it is. Principle 7.6.
 */
interface Category {
  readonly tag: TagRow | undefined
  readonly passages: PassageRow[]
}

export function CategoryScreen() {
  const { tagId = '' } = useParams()
  const back = useBack(DISCOVER_PATH)

  const category = useAsyncValue<Category>(async () => {
    const [tag, passages] = await Promise.all([getTag(tagId), listDevotionalPassagesByTag(tagId)])
    return { tag, passages }
  }, tagId)

  return (
    <Screen header={<CompactTitleHeader title={category?.tag?.name ?? ''} onBack={back} />}>
      <ListSurface>
        {/* The rhythm the section header would have set, without a header: the
            category's name is already the title of the screen. */}
        <div style={{ height: 22 }} />
        <nav aria-label={strings.accessibility.passageList}>
          {(category?.passages ?? []).map((passage) => (
            <ListRow
              key={passage.id}
              to={passagePath(passage.id)}
              title={passage.title}
              secondary={passageRowAttribution(passage)}
            />
          ))}
        </nav>
      </ListSurface>
      <ScrollTail />
    </Screen>
  )
}
