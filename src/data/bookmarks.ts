import { nowInstant } from './clock'
import { db } from './db'
import { newId } from './ids'
import type { BookmarkRow } from './types'

/**
 * Bookmarks. Scope 14 lists "Bookmark, and separately Add to my list" as two
 * distinct V0 actions: a bookmark is a devotional act of keeping a place, and
 * adding to the list is a commitment to memorise. They share no state on
 * purpose, and this module knows nothing about `user_prayers`.
 *
 * Every function takes the user id rather than reaching for one, so v1.0 can
 * swap a real account in without touching a single call site (scope 13.1).
 *
 * `sort_order` is written from the first bookmark and read by nothing yet:
 * scope 6.7 makes the bookmarks screen reorderable by hand and session 7 builds
 * it. See the note on `nextSortOrder`.
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
 *
 * Nothing reads `sort_order` until session 7 builds the screen. It is written
 * from the first bookmark all the same, because a column that starts being
 * written later has a gap in it exactly where the earliest data is.
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
