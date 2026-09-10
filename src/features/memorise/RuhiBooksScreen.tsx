import { useState } from 'react'
import { MEMORISE_PATH, ruhiBookPath } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { ListRow, ScrollTail, SectionHeader } from '../../components/ListSurface'
import { CompactTitleHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { SearchField } from '../../components/SearchField'
import { ruhiReady } from '../../data/loadRuhi'
import {
  listRuhiBookSummaries,
  searchRuhiQuotations,
  type RuhiBookSummary,
  type RuhiSearchGroup,
} from '../../data/ruhi'
import { strings } from '../../strings'
import { typeStyle } from '../../theme'
import { holdsBothDesignations, RuhiQuotationRow } from './RuhiRows'

/**
 * **The first screen of the Ruhi route: three books, and a search.** Scope 5.4.
 *
 * Reached from one row at the foot of the Memorise tab, between My list and
 * Settings. That is Safa's call, made against a section listing the three books
 * on the tab itself and against a row above the day's work: a book of quotations
 * is something you go and look for, and the top of that tab is kept for what is
 * due today.
 *
 * ## What is deliberately not here
 *
 * No star, no due count, no progress. Design-tokens 4's second hard rule keeps
 * the freshness star out of every reading surface, and a book of quotations is a
 * reading surface. This screen lives inside `src/features/memorise/` and so
 * *could* import the star; that it does not is the point. Nothing on the Ruhi
 * route says anything about how the reader is going, including the counts, which
 * count the curriculum rather than the reader.
 *
 * ## The search
 *
 * Scope 5.4's, and only that: it reads `ruhi_quotations` and cannot return a
 * prayer. It is deliberately not the library search of scope 6.3, which is a
 * Discover surface and stays `[v1.0]`.
 *
 * Typing replaces the three books with what matches, grouped by the section each
 * match sits in and headed by its Ruhi reference. Scope 5.4 asks every quotation
 * to show its source work and its reference together; grouping says the
 * reference once above the rows it belongs to rather than on every row.
 */

/** Design-tokens 5.3: the list surface is `0 26px` over paper. */
const SURFACE = { padding: '0 26px' }

interface Loaded {
  readonly books: readonly RuhiBookSummary[]
}

export function RuhiBooksScreen() {
  const back = useBack(MEMORISE_PATH)
  const [query, setQuery] = useState('')
  const searching = query.trim() !== ''

  const loaded = useAsyncValue<Loaded>(async () => {
    await ruhiReady()
    return { books: await listRuhiBookSummaries() }
  }, 'ruhi-books')

  const results = useAsyncValue<readonly RuhiSearchGroup[]>(async () => {
    if (!searching) return []
    await ruhiReady()
    return searchRuhiQuotations(query)
  }, `ruhi-search:${query}`)

  return (
    <Screen
      header={
        <CompactTitleHeader title={strings.screenTitles.ruhi} onBack={back}>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder={strings.ruhi.searchPlaceholder}
            label={strings.ruhi.searchLabel}
          />
        </CompactTitleHeader>
      }
    >
      <div style={SURFACE}>
        {searching ? (
          <SearchResults groups={results} />
        ) : (
          loaded !== undefined && (
            <ul aria-label={strings.accessibility.ruhiBookList}>
              {loaded.books.map((entry) => (
                <li key={entry.book.id}>
                  <ListRow
                    to={ruhiBookPath(entry.book.id)}
                    title={entry.book.title}
                    secondary={strings.ruhi.bookLabel(entry.book.number)}
                    trailing={strings.ruhi.quotationCount(entry.quotationCount)}
                  />
                </li>
              ))}
            </ul>
          )
        )}
        <ScrollTail />
      </div>
    </Screen>
  )
}

function SearchResults({ groups }: { groups: readonly RuhiSearchGroup[] | undefined }) {
  if (groups === undefined) return null

  const all = groups.flatMap((group) => group.quotations)
  if (all.length === 0) return <Quiet text={strings.ruhi.searchNothing} />

  // Whether the word tells the reader anything is asked of the whole result
  // set rather than of each group, because the reader is looking at one list.
  const showDesignation = holdsBothDesignations(all)

  return (
    <div aria-label={strings.accessibility.ruhiSearchResults} role="region">
      {groups.map((group) => (
        <div key={group.place.section.id}>
          <SectionHeader
            label={strings.ruhi.reference(
              group.place.book.number,
              group.place.unit.number,
              group.place.section.title,
            )}
            count={strings.ruhi.quotationCount(group.quotations.length)}
          />
          <ul aria-label={strings.accessibility.ruhiQuotationList}>
            {group.quotations.map((entry) => (
              <li key={entry.quotation.id}>
                <RuhiQuotationRow entry={entry} showDesignation={showDesignation} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** A search that found nothing. One sentence, in the italic the app says things in. */
function Quiet({ text }: { text: string }) {
  return (
    <p className="text-on-paper-50" style={{ ...typeStyle('bylineItalic'), padding: '22px 0 8px' }}>
      {text}
    </p>
  )
}
