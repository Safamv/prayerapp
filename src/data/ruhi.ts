import { db } from './db'
import { addProposedSegmentation } from './segmentation'
import { normalise } from '../text/normalise'
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
 *
 * ## The joins are done here, in memory, on purpose
 *
 * The whole mapping is three books, eight units, 115 sections and 344
 * quotations. IndexedDB has no joins, and building the browse out of an index
 * per screen would mean four round trips to draw one list of three rows. Reading
 * the four tables whole costs a few milliseconds and lets every screen ask its
 * real question - "what does this unit hold" - in one call.
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

/** A book with how much is in it. Scope 5.4's browse, top level. */
export interface RuhiBookSummary {
  readonly book: RuhiBookRow
  readonly quotationCount: number
}

/** A unit with how much is in it. */
export interface RuhiUnitSummary {
  readonly unit: RuhiUnitRow
  readonly quotationCount: number
}

/**
 * A section with how much is in it, and which of the two categories it holds.
 *
 * `designations` is what lets a unit's list say what each section is for without
 * anybody opening it, and it is what decides whether the filter of scope 5.4
 * appears at all. 112 of the 115 sections hold one category only, which is the
 * curriculum doing the sorting itself.
 */
export interface RuhiSectionSummary {
  readonly section: RuhiSectionRow
  readonly quotationCount: number
  readonly designations: readonly RuhiDesignation[]
}

/** Where a quotation sits in the curriculum. Scope 5.4: shown with its source work. */
export interface RuhiPlace {
  readonly book: RuhiBookRow
  readonly unit: RuhiUnitRow
  readonly section: RuhiSectionRow
}

/** Every quotation, keyed by the section it is in. Read once, joined in memory. */
async function quotationsBySection(): Promise<Map<string, RuhiQuotationRow[]>> {
  const rows = await db.ruhi_quotations.toArray()
  const bySection = new Map<string, RuhiQuotationRow[]>()
  for (const row of rows) {
    const existing = bySection.get(row.section_id)
    if (existing === undefined) bySection.set(row.section_id, [row])
    else existing.push(row)
  }
  return bySection
}

/** The two categories in a fixed order, so a row never reorders them by accident. */
function designationsIn(quotations: readonly RuhiQuotationRow[]): RuhiDesignation[] {
  const held = new Set(quotations.map((row) => row.designation))
  return (['memorise', 'reflection'] as const).filter((value) => held.has(value))
}

export async function listRuhiBookSummaries(): Promise<RuhiBookSummary[]> {
  const [books, units, sections, bySection] = await Promise.all([
    listRuhiBooks(),
    db.ruhi_units.toArray(),
    db.ruhi_sections.toArray(),
    quotationsBySection(),
  ])
  const unitsOf = new Map(units.map((unit) => [unit.id, unit.book_id]))
  const counts = new Map<string, number>()
  for (const section of sections) {
    const bookId = unitsOf.get(section.unit_id)
    if (bookId === undefined) continue
    const held = bySection.get(section.id)?.length ?? 0
    counts.set(bookId, (counts.get(bookId) ?? 0) + held)
  }
  return books.map((book) => ({ book, quotationCount: counts.get(book.id) ?? 0 }))
}

export async function listRuhiUnitSummaries(bookId: string): Promise<RuhiUnitSummary[]> {
  const [units, sections, bySection] = await Promise.all([
    listRuhiUnits(bookId),
    db.ruhi_sections.toArray(),
    quotationsBySection(),
  ])
  const counts = new Map<string, number>()
  for (const section of sections) {
    const held = bySection.get(section.id)?.length ?? 0
    counts.set(section.unit_id, (counts.get(section.unit_id) ?? 0) + held)
  }
  return units.map((unit) => ({ unit, quotationCount: counts.get(unit.id) ?? 0 }))
}

export async function listRuhiSectionSummaries(unitId: string): Promise<RuhiSectionSummary[]> {
  const [sections, bySection] = await Promise.all([listRuhiSections(unitId), quotationsBySection()])
  return sections.map((section) => {
    const held = bySection.get(section.id) ?? []
    return {
      section,
      quotationCount: held.length,
      designations: designationsIn(held),
    }
  })
}

/**
 * Where a section sits: its book, its unit and itself.
 *
 * Every screen below the first needs this, because the header names where you
 * are and the back chevron walks back up the way you came (decision D4.9's
 * shape). `undefined` for an id that is not in the mapping, which is what a
 * hand-typed URL or a restored tab from an older dataset would produce.
 */
export async function getRuhiPlace(sectionId: string): Promise<RuhiPlace | undefined> {
  const section = await db.ruhi_sections.get(sectionId)
  if (section === undefined) return undefined
  const unit = await db.ruhi_units.get(section.unit_id)
  if (unit === undefined) return undefined
  const book = await db.ruhi_books.get(unit.book_id)
  if (book === undefined) return undefined
  return { book, unit, section }
}

/** One book, for the header of the screen listing its units. */
export async function getRuhiBook(bookId: string): Promise<RuhiBookRow | undefined> {
  return db.ruhi_books.get(bookId)
}

/** One unit with the book it belongs to, for the header of its sections screen. */
export async function getRuhiUnit(
  unitId: string,
): Promise<{ unit: RuhiUnitRow; book: RuhiBookRow } | undefined> {
  const unit = await db.ruhi_units.get(unitId)
  if (unit === undefined) return undefined
  const book = await db.ruhi_books.get(unit.book_id)
  return book === undefined ? undefined : { unit, book }
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

/** A run of matches that share a place in the curriculum. */
export interface RuhiSearchGroup {
  readonly place: RuhiPlace
  readonly quotations: readonly RuhiQuotationWithPassage[]
}

/**
 * **Search within the Ruhi route.** Scope 5.4.
 *
 * > Search within the Ruhi route. Separate from the full-text search of 6.3,
 * > which is a Discover surface and stays at v1.0.
 *
 * It searches the mapping and nothing else: 344 quotations, by their words,
 * their author and the work they come from. It cannot return a prayer, because
 * the only rows it reads are `ruhi_quotations` rows.
 *
 * Matching is `normalise`d on both sides - the same fold the chip quiz compares
 * an answer with (scope 9.7) - so accents, capitals and punctuation are not
 * something anybody has to type. `search_vector` is deliberately not used: it is
 * a placeholder for the v1.0 library search and folds nothing.
 *
 * Results are grouped by the section they are in and returned in curriculum
 * order, which is what lets each group be headed by its own Ruhi reference. A
 * flat list of matches would have to repeat that reference on every row, and
 * scope 5.4 requires it on every quotation.
 */
export async function searchRuhiQuotations(query: string): Promise<RuhiSearchGroup[]> {
  const needle = normalise(query)
  if (needle === '') return []

  const [books, units, sections, quotations] = await Promise.all([
    listRuhiBooks(),
    db.ruhi_units.toArray(),
    db.ruhi_sections.toArray(),
    db.ruhi_quotations.toArray(),
  ])

  const passages = await db.passages.bulkGet([...new Set(quotations.map((row) => row.passage_id))])
  const byId = new Map<string, PassageRow>()
  for (const passage of passages) if (passage !== undefined) byId.set(passage.id, passage)

  const matches = new Map<string, boolean>()
  for (const [id, passage] of byId) {
    matches.set(
      id,
      normalise(`${passage.text} ${passage.author} ${passage.source_work ?? ''}`).includes(needle),
    )
  }

  const unitById = new Map(units.map((unit) => [unit.id, unit]))
  const bookById = new Map(books.map((book) => [book.id, book]))
  const sectionById = new Map(sections.map((section) => [section.id, section]))

  const bySection = new Map<string, RuhiQuotationWithPassage[]>()
  for (const quotation of quotations) {
    if (matches.get(quotation.passage_id) !== true) continue
    const passage = byId.get(quotation.passage_id)
    if (passage === undefined) continue
    const existing = bySection.get(quotation.section_id)
    if (existing === undefined) bySection.set(quotation.section_id, [{ quotation, passage }])
    else existing.push({ quotation, passage })
  }

  const groups: RuhiSearchGroup[] = []
  for (const [sectionId, found] of bySection) {
    const section = sectionById.get(sectionId)
    const unit = section === undefined ? undefined : unitById.get(section.unit_id)
    const book = unit === undefined ? undefined : bookById.get(unit.book_id)
    if (section === undefined || unit === undefined || book === undefined) continue
    groups.push({
      place: { book, unit, section },
      quotations: [...found].sort((a, b) => a.quotation.order_index - b.quotation.order_index),
    })
  }

  return groups.sort(
    (a, b) =>
      a.place.book.number - b.place.book.number ||
      a.place.unit.number - b.place.unit.number ||
      a.place.section.number - b.place.section.number,
  )
}

/** One quotation with everything a screen needs to show it. */
export interface RuhiQuotationDetail extends RuhiQuotationWithPassage {
  readonly place: RuhiPlace
}

export async function getRuhiQuotation(id: string): Promise<RuhiQuotationDetail | undefined> {
  const quotation = await db.ruhi_quotations.get(id)
  if (quotation === undefined) return undefined
  const [passage, place] = await Promise.all([
    db.passages.get(quotation.passage_id),
    getRuhiPlace(quotation.section_id),
  ])
  if (passage === undefined || place === undefined) return undefined
  return { quotation, passage, place }
}

/**
 * **A whole section onto My list, in one action.** Scope 5.4.
 *
 * The passages are added in the order the curriculum prints them, taking the
 * app's own proposed lines for each. `addProposedSegmentation` is where that
 * choice is argued out and where it says how it meets scope 8.4's confirmation.
 *
 * A quotation whose passage is already on the list is left alone rather than
 * re-segmented, so adding a section twice does not throw away a schedule.
 *
 * `designation` narrows it to what the reader is looking at, so that a filtered
 * section adds what the filter shows and not what it hides.
 */
export async function addRuhiSectionToList(
  userId: string,
  sectionId: string,
  designation?: RuhiDesignation,
): Promise<{ readonly added: number; readonly alreadyOnList: number }> {
  const pairs = await listRuhiQuotations(sectionId, designation)
  // The same passage can appear twice in one section only if the curriculum
  // prints it twice; deduplicating keeps the count honest either way.
  const seen = new Set<string>()
  const passages = pairs
    .map((pair) => pair.passage)
    .filter((passage) => !seen.has(passage.id) && seen.add(passage.id))

  const result = await addProposedSegmentation(userId, passages)
  return { added: result.added.length, alreadyOnList: result.alreadyOnList }
}
