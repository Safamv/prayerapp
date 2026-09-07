import { nowInstant } from './clock'
import { db } from './db'
import { newId } from './ids'
import { getDevotionalPassage } from './passages'
import type { BookmarkRow, PassageRow } from './types'

/**
 * Bookmarks. Scope 14 lists "Bookmark, and separately Add to my list" as two
 * distinct V0 actions: a bookmark is a devotional act of keeping a place, and
 * adding to the list is a commitment to memorise. They share no state on
 * purpose, and this module knows nothing about `user_prayers`.
 *
 * Every function takes the user id rather than reaching for one, so v1.0 can
 * swap a real account in without touching a single call site (scope 13.1).
 *
 * `sort_order` holds the hand arrangement of scope 6.7. Session 4 started
 * writing it (decision D4.13) and session 7 is what reads it: `listBookmarked`
 * returns rows in it, and `reorderBookmarks` is the one write that changes it.
 */

export async function addBookmark(
  userId: string,
  passageId: string,
  createdAt: string = nowInstant(),
): Promise<BookmarkRow> {
  const existing = await getBookmark(userId, passageId)
  if (existing !== undefined) return existing

  const row: BookmarkRow = {
    id: newId(),
    user_id: userId,
    passage_id: passageId,
    created_at: createdAt,
    sort_order: await nextSortOrder(userId),
  }
  await db.bookmarks.put(row)
  return row
}

/**
 * Where a new bookmark lands in the hand-arranged order of scope 6.7: at the
 * end, so keeping a place never moves anything the user arranged.
 */
async function nextSortOrder(userId: string): Promise<number> {
  const rows = await db.bookmarks.where('user_id').equals(userId).toArray()
  return rows.reduce((highest, row) => Math.max(highest, row.sort_order + 1), 0)
}

export async function removeBookmark(userId: string, passageId: string): Promise<void> {
  await db.bookmarks.where('[user_id+passage_id]').equals([userId, passageId]).delete()
}

export async function getBookmark(
  userId: string,
  passageId: string,
): Promise<BookmarkRow | undefined> {
  return db.bookmarks.where('[user_id+passage_id]').equals([userId, passageId]).first()
}

export async function isBookmarked(userId: string, passageId: string): Promise<boolean> {
  const count = await db.bookmarks.where('[user_id+passage_id]').equals([userId, passageId]).count()
  return count > 0
}

/** Newest first, which is the order a list of kept places wants to be read in. */
export async function listBookmarks(userId: string): Promise<BookmarkRow[]> {
  const rows = await db.bookmarks.where('user_id').equals(userId).toArray()
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** A bookmark and the passage it keeps a place in. What the screen of 6.7 renders. */
export interface BookmarkedPassage {
  readonly bookmark: BookmarkRow
  readonly passage: PassageRow
}

/**
 * Every bookmark, **in the order the user arranged them by hand**, with the
 * passage each one keeps a place in.
 *
 * The hand order is the one the screen starts in and the only one it can be
 * dragged in (scope 6.7). The other sorts are applied over these rows rather
 * than fetched differently, which is the whole of what makes the scope's promise
 * true: choosing a sort cannot write anything, because the only write that
 * touches `sort_order` is `reorderBookmarks` below.
 *
 * A bookmark whose passage has left the corpus is dropped rather than shown, the
 * way the list does it (decision D5.9), and a Ruhi quotation cannot appear
 * because the read goes through the devotional door (decision D1.10).
 *
 * **One row per passage, whatever the table holds.** `addBookmark` is idempotent
 * and `[user_id+passage_id]` is an index rather than a unique constraint, so a
 * second row for the same passage is something the schema permits and the app
 * does not create. v1.0 sync merging two devices is the way one would arrive,
 * and it is not worth finding out then: a screen drawing two rows for one prayer
 * would also be drawing two rows with the same identity, and the one you dragged
 * would not be the one that moved. The earliest place in the arrangement wins,
 * because that is the one the user put there.
 */
export async function listBookmarkedPassages(userId: string): Promise<BookmarkedPassage[]> {
  const rows = await db.bookmarks.where('user_id').equals(userId).toArray()
  rows.sort((a, b) => a.sort_order - b.sort_order)

  const seen = new Set<string>()
  const found = await Promise.all(
    rows.map(async (bookmark) => {
      if (seen.has(bookmark.passage_id)) return null
      seen.add(bookmark.passage_id)
      const passage = await getDevotionalPassage(bookmark.passage_id)
      return passage === undefined ? null : { bookmark, passage }
    }),
  )
  return found.filter((entry): entry is BookmarkedPassage => entry !== null)
}

/**
 * Rewrites `sort_order` to match the given sequence. Scope 6.7's hand order, and
 * the only thing in the app that changes it.
 *
 * Bookmarks the user holds but that were not named keep their relative order and
 * follow on behind, exactly as `reorderList` does for My list: the two screens
 * are one interaction on different material, so they may not differ in what a
 * drag does to the rows that were not on screen.
 */
export async function reorderBookmarks(
  userId: string,
  orderedPassageIds: readonly string[],
): Promise<void> {
  const rows = await db.bookmarks.where('user_id').equals(userId).toArray()
  rows.sort((a, b) => a.sort_order - b.sort_order)
  const named = new Map(orderedPassageIds.map((passageId, index) => [passageId, index]))
  const rest = rows.filter((row) => !named.has(row.passage_id))

  await db.transaction('rw', db.bookmarks, async () => {
    for (const row of rows) {
      const index = named.get(row.passage_id)
      if (index !== undefined) await db.bookmarks.update(row.id, { sort_order: index })
    }
    for (const [offset, row] of rest.entries()) {
      await db.bookmarks.update(row.id, { sort_order: named.size + offset })
    }
  })
}
