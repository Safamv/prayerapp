import { useParams } from 'react-router'
import { RUHI_PATH, ruhiUnitPath } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { ListRow, ScrollTail } from '../../components/ListSurface'
import { CompactTitleHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { ruhiReady } from '../../data/loadRuhi'
import { getRuhiBook, listRuhiUnitSummaries, type RuhiUnitSummary } from '../../data/ruhi'
import type { RuhiBookRow } from '../../data/types'
import { strings } from '../../strings'
import { typeStyle } from '../../theme'

/**
 * **One Ruhi book: its units.** Scope 5.3, 5.4.
 *
 * The container before its contents, which is decision D4.9's shape applied to a
 * curriculum: a book, then the units in it, then the sections in those. The book
 * is carried in the path so the back chevron walks back up the way the reader
 * came and a unit's address says which book it was read in.
 *
 * ## The edition
 *
 * Scope 5.2: the mapping is versioned against a stated Ruhi edition, and that
 * edition "appears on the credits screen". The credits screen is scope 4.3's and
 * is `[v1.0]`, so until it exists the edition sits at the foot of the book it
 * belongs to. That is where somebody holding a printed copy would look to find
 * out whether the app is talking about the same book they have, which is the
 * whole reason scope 5.2 asks for it.
 */

const SURFACE = { padding: '0 26px' }

interface Loaded {
  readonly book: RuhiBookRow | undefined
  readonly units: readonly RuhiUnitSummary[]
}

export function RuhiBookScreen() {
  const { bookId = '' } = useParams()
  const back = useBack(RUHI_PATH)

  const loaded = useAsyncValue<Loaded>(async () => {
    await ruhiReady()
    const [book, units] = await Promise.all([getRuhiBook(bookId), listRuhiUnitSummaries(bookId)])
    return { book, units }
  }, bookId)

  const book = loaded?.book

  return (
    <Screen header={<CompactTitleHeader title={book?.title ?? ''} onBack={back} />}>
      {loaded !== undefined && book !== undefined && (
        <div style={SURFACE}>
          <ul aria-label={strings.accessibility.ruhiUnitList} style={{ paddingTop: 22 }}>
            {loaded.units.map((entry) => (
              <li key={entry.unit.id}>
                <ListRow
                  to={ruhiUnitPath(book.id, entry.unit.id)}
                  title={entry.unit.title}
                  secondary={strings.ruhi.unitLabel(entry.unit.number)}
                  trailing={strings.ruhi.quotationCount(entry.quotationCount)}
                />
              </li>
            ))}
          </ul>
          <p
            className="text-on-paper-50"
            style={{ ...typeStyle('bylineItalic'), padding: '22px 0 0' }}
          >
            {strings.ruhi.edition(book.edition)}
          </p>
          <ScrollTail />
        </div>
      )}
    </Screen>
  )
}
