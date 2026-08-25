import { db } from './db'
import { RUHI_COLLECTION, type PassageRow, type PassageSegmentRow } from './types'
import { addToList, removeFromList } from './userPrayers'

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
 *
 * `addPassageToList` is the same idea pointed the other way, and it is the one
 * write in this module. Scope 6.6 puts "add to my list" in the reading view's
 * toolbar, so Discover has to be able to commit a passage — but `addToList` in
 * `userPrayers.ts` returns the row it wrote, and that row carries
 * `passage_due_date`, `upkeep_state` and `is_focus`. Both the ESLint Discover
 * wall and `discover-isolation.test.ts` refuse that module and that name, and
 * they are right to: a component holding the row could render every piece of
 * chrome principle 7.6 forbids. So the commitment crosses the boundary and the
 * progress does not, because this returns nothing at all.
 */

/**
 * The collections of scope 6.1, in the order that section lists them, which is
 * the order they are offered in.
 *
 * Written out rather than read off the database, because the order is editorial
 * and a `SELECT DISTINCT` would return it alphabetically. `passages.test.ts`
 * checks that every collection actually present in the corpus appears here, so a
 * fifth feed fails a test rather than quietly becoming unreachable.
 *
 * Ruhi is deliberately absent, and structurally so: it is not a Discover surface
 * (scope 5.4, decision D1.10).
 */
export const DEVOTIONAL_COLLECTIONS: readonly string[] = Object.freeze([
  'prayers',
  'hidden-words',
  'gleanings',
  'prayers-and-meditations',
])

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
 * How many passages a collection holds, without reading any of them. The
 * collection browse shows four counts on its first screen and would otherwise
 * load the whole library to add them up.
 */
export async function countDevotionalPassagesByCollection(collection: string): Promise<number> {
  if (collection === RUHI_COLLECTION) return 0
  return db.passages.where('collection').equals(collection).count()
}

/**
 * A category's passages within one collection.
 *
 * Every tag in the corpus today belongs to a prayer, so this returns the same
 * rows as `listDevotionalPassagesByTag` for every category that exists. It is
 * scoped anyway, because the browse is now a hierarchy - a collection, then its
 * categories - and a hierarchy that is only accidentally true is one feed away
 * from being false. If the Gleanings are ever tagged, "Prayers, then Healing"
 * keeps meaning prayers.
 */
export async function listDevotionalPassagesByCollectionAndTag(
  collection: string,
  tagId: string,
): Promise<PassageRow[]> {
  if (collection === RUHI_COLLECTION) return []
  const rows = await listDevotionalPassagesByTag(tagId)
  return rows.filter((row) => row.collection === collection)
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
 * Adds the passage to the user's list, and reports nothing back.
 *
 * Deliberately `void`: see the note on principle 7.6 at the top of this file.
 * Idempotent, because `addToList` is - a second tap writes nothing and changes
 * no `list_order`.
 *
 * **This does not segment the passage.** Scope 8.4 runs segmentation at the
 * moment of adding, suggested then confirmed by the user, and confirmation is a
 * screen Discover does not own. Session 5 builds it and calls it from here.
 */
export async function addPassageToList(userId: string, passageId: string): Promise<void> {
  await addToList(userId, passageId)
}

/**
 * Undoes an add, and reports nothing back.
 *
 * `void` for the same reason `addPassageToList` is. This exists for the undo
 * offered in the moment of adding (decision D4.9) and for nothing else: the
 * function beneath it also throws away a passage's segment progress and review
 * history, which is right when undoing an add seconds old and is destructive
 * anywhere else. Removing a passage the user has actually worked on belongs on
 * the list screen, where they can see what they are giving up.
 */
export async function removePassageFromList(userId: string, passageId: string): Promise<void> {
  await removeFromList(userId, passageId)
}

/**
 * Australian English uses the same collation as the rest of the anglophone
 * world here, but the locale is named explicitly so that sorting does not
 * change with the device.
 */
function sortByTitle(rows: PassageRow[]): PassageRow[] {
  return [...rows].sort((a, b) => a.title.localeCompare(b.title, 'en-AU'))
}
