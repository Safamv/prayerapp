import { db } from './db'
import type {
  PassageRow,
  RuhiBookRow,
  RuhiDesignation,
  RuhiQuotationRow,
  RuhiSectionRow,
  RuhiUnitRow,
} from './types'

/**
 * **The Ruhi route.** Decision D1.10, scope 5.3 and 5.4.
 *
 * ## The four tables are empty, on purpose
 *
 * Ruhi is `[v0.1]` and lands in session 10, after the V0 exit review. Nothing
 * loads these tables and no screen reads them yet. They are declared and these
 * functions exist now because adding a table later means a schema migration
 * running against a device that already holds a tester's fortnight of real data,
 * and declaring it now costs nothing (D1.10, scope section 16).
 *
 * ## Why this is a separate module from `passages.ts`
 *
 * A Ruhi quotation must never appear when browsing or searching for prayers,
 * because meeting a study curriculum while opening the app to pray is the wrong
 * experience. That is the same reasoning as principle 7.6.
 *
 * D1.10 makes the exclusion structural rather than a filter someone has to
 * remember: the devotional surfaces call `passages.ts`, which excludes the Ruhi
 * collection at the query, and the Ruhi route calls this module. Discover cannot
 * show a quotation because the function it calls does not return one. Nothing
 * under `src/features/discover/` may import this file, enforced by
 * `src/principles/discover-isolation.test.ts`.
 *
 * ## How a quotation is stored
 *
 * As an ordinary passage row with `collection` set to `ruhi`, plus a
 * `ruhi_quotations` row pointing at it. That is what makes "memorised identically
 * to a prayer" literally true rather than a second code path: segmentation, the
 * queue, the quiz ladder, the scheduler and the log all work on it unchanged.
 *
 * `designation` belongs to the quotation's appearance in a section rather than to
 * the text, because twenty of the 314 quotations appear in two books and the
 * category can differ between the appearances (D1.9, D1.10).
 */

export async function putRuhiBooks(rows: readonly RuhiBookRow[]): Promise<void> {
  await db.ruhi_books.bulkPut(rows)
}

export async function putRuhiUnits(rows: readonly RuhiUnitRow[]): Promise<void> {
  await db.ruhi_units.bulkPut(rows)
}

export async function putRuhiSections(rows: readonly RuhiSectionRow[]): Promise<void> {
  await db.ruhi_sections.bulkPut(rows)
}

export async function putRuhiQuotations(rows: readonly RuhiQuotationRow[]): Promise<void> {
  await db.ruhi_quotations.bulkPut(rows)
}

/** Book, unit and section all read in their printed order, which is `number`. */
export async function listRuhiBooks(): Promise<RuhiBookRow[]> {
  const rows = await db.ruhi_books.toArray()
  return rows.sort((a, b) => a.number - b.number)
}

export async function listRuhiUnits(bookId: string): Promise<RuhiUnitRow[]> {
  const rows = await db.ruhi_units.where('book_id').equals(bookId).toArray()
  return rows.sort((a, b) => a.number - b.number)
}

export async function listRuhiSections(unitId: string): Promise<RuhiSectionRow[]> {
  const rows = await db.ruhi_sections.where('unit_id').equals(unitId).toArray()
  return rows.sort((a, b) => a.number - b.number)
}

/** A quotation together with the passage that holds its text. */
export interface RuhiQuotationWithPassage {
  readonly quotation: RuhiQuotationRow
  readonly passage: PassageRow
}

/**
 * A section's quotations in printed order, optionally filtered to one
 * designation. Scope 5.4's "filter a section's quotations by To Memorise or
 * Reflection" is this argument; the labels for the two values are session 10's.
 */
export async function listRuhiQuotations(
  sectionId: string,
  designation?: RuhiDesignation,
): Promise<RuhiQuotationWithPassage[]> {
  const quotations = (await db.ruhi_quotations.where('section_id').equals(sectionId).toArray())
    .filter((row) => designation === undefined || row.designation === designation)
    .sort((a, b) => a.order_index - b.order_index)

  const passages = await db.passages.bulkGet(quotations.map((row) => row.passage_id))
  const pairs: RuhiQuotationWithPassage[] = []
  for (const [index, quotation] of quotations.entries()) {
    const passage = passages[index]
    if (passage !== undefined) pairs.push({ quotation, passage })
  }
  return pairs
}

export async function countRuhiQuotations(): Promise<number> {
  return db.ruhi_quotations.count()
}
