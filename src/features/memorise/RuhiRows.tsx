import { Link } from 'react-router'
import { MINIMUM_ROW_HEIGHT } from '../../components/ListSurface'
import { ruhiQuotationPath } from '../../app/routes'
import type { RuhiQuotationWithPassage } from '../../data/ruhi'
import type { RuhiDesignation } from '../../data/types'
import { strings } from '../../strings'
import { passageAttribution } from '../../strings/attribution'
import { typeStyle } from '../../theme'

/**
 * **The row a quotation is drawn as, and the rule about its category.**
 * Design-tokens 5.3's list row; scope 5.4.
 *
 * Two screens list quotations - a section, and the results of a search across
 * all three books - and they draw the same row, so a quotation cannot come to
 * look like two different things depending on how it was found.
 *
 * ## Why the category is not always on the row
 *
 * 112 of the 115 sections hold one category only: the curriculum has already
 * done the sorting, and a section that says TO MEMORISE beside every one of
 * sixteen rows is design-tokens 5.3's caps line spent on a word the screen has
 * already said. That is the mistake decision D4.8 named about a column of
 * passages all reading THE HIDDEN WORDS.
 *
 * So `showDesignation` is true only where the list holds both, which is where
 * the word tells the reader something and where scope 5.4's filter appears. The
 * two are the same condition on purpose: the filter is the control and the row
 * is what it acts on, and one appearing without the other would be confusing in
 * both directions.
 *
 * ## This file is in the Memorise folder, and it must stay there
 *
 * It knows what a Ruhi quotation is. Session 11 found that
 * `discover-isolation.test.ts` reads what a file imports, so a Ruhi-aware row
 * put in `src/components/` and handed its data as a prop would pass every
 * assertion in it and still breach decision D1.10 the first time the library
 * drew one. `src/principles/ruhi-in-memorise.test.ts` closes that from the other
 * side, exactly as `one-star.test.ts` does for the freshness star.
 */
export function RuhiQuotationRow({
  entry,
  showDesignation,
}: {
  entry: RuhiQuotationWithPassage
  showDesignation: boolean
}) {
  const designation = strings.ruhi.designationsCaps[entry.quotation.designation]
  return (
    <Link
      to={ruhiQuotationPath(entry.quotation.id)}
      aria-label={strings.accessibility.ruhiQuotationRow(
        entry.passage.title,
        strings.ruhi.designations[entry.quotation.designation],
      )}
      className="flex items-center border-b border-rule last:border-b-0"
      style={{ gap: 13, padding: '11px 0', minHeight: MINIMUM_ROW_HEIGHT }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-deep" style={typeStyle('listRowTitle')}>
          {entry.passage.title}
        </span>
        {/* Principle 7.10: a surface naming a passage names who wrote it. */}
        <span
          className="block text-on-paper-44"
          style={{ ...typeStyle('rowAttribution'), marginTop: 3 }}
        >
          {passageAttribution(entry.passage)}
        </span>
      </span>
      {showDesignation && (
        <span className="flex-none text-on-paper-40" style={typeStyle('rowAttribution')}>
          {designation}
        </span>
      )}
    </Link>
  )
}

/** Whether a list of quotations holds both categories, which is when the word means something. */
export function holdsBothDesignations(
  entries: readonly { readonly quotation: { readonly designation: RuhiDesignation } }[],
): boolean {
  return (
    entries.some((entry) => entry.quotation.designation === 'memorise') &&
    entries.some((entry) => entry.quotation.designation === 'reflection')
  )
}
