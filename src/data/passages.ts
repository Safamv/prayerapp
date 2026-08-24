import { db } from './db'
import { RUHI_COLLECTION, type PassageRow, type PassageSegmentRow } from './types'

/**
 * **The devotional surface.** Everything Discover reads, it reads from here.
 *
 * ## Why this module exists as a separate thing
 *
 * Decision D1.10: a Ruhi quotation must never appear when browsing or searching
 * for prayers, because meeting a study curriculum while opening the app to pray
 * is the wrong experience. That is the same reasoning as principle 7.6.
 *
 * The obvious way to honour that would be a filter every screen remembers to
 * apply. This module is the other way. Every read below is built on `devotional()`,
 * which excludes the Ruhi collection at the query, so **Discover cannot show a
 * Ruhi quotation because the function it calls does not return one.** The
 * exclusion is structural rather than something somebody has to remember, which
 * is decision D0.9's single-folder discipline doing the work it was created for.
 *
 * The Ruhi route reads from `ruhi.ts` instead. The two never share a read.
 *
 * ## Principle 7.6 lives here too
 *
 * `isOnList` returns a boolean and nothing else. Scope 7.6 permits Discover to
 * know that "the add button reads as already added" and permits it nothing
 * further: no due date, no freshness, no progress. Returning the row would hand
 * a component every one of those. Returning a boolean cannot.
 */

/** True when a passage belongs to the devotional corpus rather than the Ruhi route. */
export function isDevotional(row: Pick<PassageRow, 'collection'>): boolean {
  return row.collection !== RUHI_COLLECTION
}

/** Every devotional read starts here. Nothing in this module queries `passages` directly. */
function devotional() {
  return db.passages.where('collection').notEqual(RUHI_COLLECTION)
}

/** Returns `undefined` for a Ruhi quotation, exactly as it does for a missing id. */
export async function getDevotionalPassage(id: string): Promise<PassageRow | undefined> {
  const row = await db.passages.get(id)
  return row !== undefined && isDevotional(row) ? row : undefined
}

/** Alphabetical by title, which is the order the passage list of scope 6.5 wants. */
export async function listDevotionalPassages(): Promise<PassageRow[]> {
  const rows = await devotional().toArray()
  return sortByTitle(rows)
}

export async function listDevotionalPassagesByTag(tagId: string): Promise<PassageRow[]> {
  const links = await db.passage_tags.where('tag_id').equals(tagId).toArray()
  const rows = await db.passages.bulkGet(links.map((link) => link.passage_id))
  return sortByTitle(
    rows.filter((row): row is PassageRow => row !== undefined && isDevotional(row)),
  )
}

export async function listDevotionalPassagesByCollection(
  collection: string,
): Promise<PassageRow[]> {
  if (collection === RUHI_COLLECTION) return []
  return sortByTitle(await db.passages.where('collection').equals(collection).toArray())
}

export async function countDevotionalPassages(): Promise<number> {
  return devotional().count()
}

/**
 * A passage's segments, in reading order. Guarded on the passage being
 * devotional so that a Ruhi passage id cannot be used to read its text through
 * the devotional door, even by accident.
 */
export async function listSegmentsForDevotionalPassage(
  passageId: string,
): Promise<PassageSegmentRow[]> {
  const passage = await getDevotionalPassage(passageId)
  if (passage === undefined) return []
  return db.passage_segments
    .where('[passage_id+order_index]')
    .between([passageId, -Infinity], [passageId, Infinity])
    .toArray()
}

/**
 * Whether this passage is already on the user's list. A boolean, deliberately:
 * see the note on principle 7.6 at the top of this file.
 */
export async function isOnList(userId: string, passageId: string): Promise<boolean> {
  const count = await db.user_prayers
    .where('[user_id+passage_id]')
    .equals([userId, passageId])
    .count()
  return count > 0
}

/**
 * Australian English uses the same collation as the rest of the anglophone
 * world here, but the locale is named explicitly so that sorting does not
 * change with the device.
 */
function sortByTitle(rows: PassageRow[]): PassageRow[] {
  return [...rows].sort((a, b) => a.title.localeCompare(b.title, 'en-AU'))
}
