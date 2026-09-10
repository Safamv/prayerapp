import { useParams } from 'react-router'
import { ruhiBookPath, ruhiSectionPath } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { ListRow, ScrollTail, SectionHeader } from '../../components/ListSurface'
import { CompactTitleHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { ruhiReady } from '../../data/loadRuhi'
import { getRuhiUnit, listRuhiSectionSummaries, type RuhiSectionSummary } from '../../data/ruhi'
import type { RuhiBookRow, RuhiUnitRow } from '../../data/types'
import { strings } from '../../strings'

/**
 * **One unit: its sections, and Book 3's twenty four lessons.** Scope 5.3, 5.4.
 *
 * ## Where the lessons sit, and why
 *
 * Book 3's second unit prints its numbered sections and then twenty four lesson
 * plans, which are a subsection of the unit rather than sections of it, and
 * which are the child-facing memorisation content - arguably the most useful
 * part of that book here (D11.7).
 *
 * They are **sections of Unit 2, listed after the numbered ones, each keeping
 * its own name**: "Lesson 1" rather than "Section 23". Three arrangements were
 * possible and the other two are worse. A unit of their own would say the book
 * has three units when it has two. Renumbering them into the section sequence
 * would print "Section 23" against a page headed "Lesson 1", which is the app
 * confidently telling a participant the wrong address - exactly what scope 5.2
 * exists to prevent.
 *
 * `ruhi_sections` has four columns and the schema is finished for V0, so there
 * is no column saying which a row is. The distinction lives in the two columns
 * there are: **`title` is what the reader sees and `number` is only what
 * orders**, with a lesson taking `100 + n` so it lands after every section
 * however a later edition renumbers them.
 *
 * ## What each row says
 *
 * A section's own name, how many quotations it holds, and - where the section
 * holds one category only, which 112 of the 115 do - which category that is.
 * That last line is the reason the filter of scope 5.4 is rarely needed: the
 * curriculum has already sorted its own material, and this is where a
 * participant looking for what to memorise can see it without opening anything.
 */

const SURFACE = { padding: '0 26px' }

interface Loaded {
  readonly unit: RuhiUnitRow | undefined
  readonly book: RuhiBookRow | undefined
  readonly sections: readonly RuhiSectionSummary[]
}

export function RuhiUnitScreen() {
  const { bookId = '', unitId = '' } = useParams()
  const back = useBack(ruhiBookPath(bookId))

  const loaded = useAsyncValue<Loaded>(async () => {
    await ruhiReady()
    const [found, sections] = await Promise.all([
      getRuhiUnit(unitId),
      listRuhiSectionSummaries(unitId),
    ])
    return { unit: found?.unit, book: found?.book, sections }
  }, unitId)

  const unit = loaded?.unit
  const book = loaded?.book

  return (
    <Screen header={<CompactTitleHeader title={unit?.title ?? ''} onBack={back} />}>
      {loaded !== undefined && unit !== undefined && book !== undefined && (
        <div style={SURFACE}>
          <SectionHeader
            label={strings.ruhi.bookLabel(book.number)}
            count={strings.ruhi.quotationCount(
              loaded.sections.reduce((total, entry) => total + entry.quotationCount, 0),
            )}
          />
          <ul aria-label={strings.accessibility.ruhiSectionList}>
            {loaded.sections.map((entry) => (
              <li key={entry.section.id}>
                <ListRow
                  to={ruhiSectionPath(book.id, unit.id, entry.section.id)}
                  title={entry.section.title}
                  secondary={onlyDesignation(entry)}
                  trailing={strings.ruhi.quotationCount(entry.quotationCount)}
                />
              </li>
            ))}
          </ul>
          <ScrollTail />
        </div>
      )}
    </Screen>
  )
}

/**
 * The one category a section holds, or nothing where it holds both.
 *
 * A section that holds both is where scope 5.4's filter appears, one tap inside.
 * Naming both here would be two words on a row that already carries a count, and
 * it would say less than the filter does.
 */
function onlyDesignation(entry: RuhiSectionSummary): string | undefined {
  const [first] = entry.designations
  if (entry.designations.length !== 1 || first === undefined) return undefined
  return strings.ruhi.designationsCaps[first]
}
