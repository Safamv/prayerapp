import { db } from './db'
import type { PassageRow, PassageSegmentRow, PassageTagRow, SourceFeed, TagRow } from './types'

/**
 * Ingestion. The only module that writes to the shared content tables.
 *
 * Session 3's fetch script produces the committed JSON dataset and calls these
 * to load it into IndexedDB on first run (scope 4.2). Session 10 uses the same
 * functions for the Ruhi quotations, because a Ruhi quotation is stored as an
 * ordinary passage record (D1.10) and only its `collection` and its
 * `ruhi_quotations` row make it one.
 *
 * Everything here is an upsert keyed on the record's own id, so re-running the
 * load is idempotent and a corrected translation replaces the old text rather
 * than appearing beside it. `findPassageBySource` is how the fetch script maps
 * a feed record back to the row it wrote last time.
 */

export async function putPassages(rows: readonly PassageRow[]): Promise<void> {
  await db.passages.bulkPut(rows)
}

export async function putPassageSegments(rows: readonly PassageSegmentRow[]): Promise<void> {
  await db.passage_segments.bulkPut(rows)
}

/**
 * Takes a passage's lines away and puts its count back to zero, which is how
 * the library ships every passage (scope 8.4: "the library ships unsegmented").
 *
 * The two writes are one fact stated twice, so they are made in one place: a
 * `segment_count` left behind after the lines were deleted would have every
 * screen claiming a segmentation that no longer exists. Callers wrap this in
 * their own transaction, because both of them are doing something larger.
 */
export async function clearPassageSegments(passageId: string): Promise<void> {
  await db.passage_segments.where('passage_id').equals(passageId).delete()
  await db.passages.update(passageId, { segment_count: 0 })
}

export async function putTags(rows: readonly TagRow[]): Promise<void> {
  await db.tags.bulkPut(rows)
}

export async function putPassageTags(rows: readonly PassageTagRow[]): Promise<void> {
  await db.passage_tags.bulkPut(rows)
}

/**
 * The idempotency key of scope 4.2. A feed record has a stable id within its
 * feed, so re-fetching finds the existing row instead of writing a second one.
 */
export async function findPassageBySource(
  sourceFeed: SourceFeed,
  sourceId: string,
): Promise<PassageRow | undefined> {
  return db.passages.where('[source_feed+source_id]').equals([sourceFeed, sourceId]).first()
}

/**
 * One passage, whatever collection it belongs to.
 *
 * The devotional surface has its own read, `getDevotionalPassage` in
 * `passages.ts`, which returns `undefined` for a Ruhi quotation so that a
 * Discover screen cannot show one (decision D1.10). This is the plain read, for
 * the memorisation side, where a Ruhi quotation is exactly what session 11 will
 * be adding to a list.
 */
export async function getPassage(id: string): Promise<PassageRow | undefined> {
  return db.passages.get(id)
}

/** How many passages are loaded at all, Ruhi included. Used to decide whether to seed. */
export async function countAllPassages(): Promise<number> {
  return db.passages.count()
}

/**
 * Removes every passage the committed corpus no longer carries, and everything
 * that pointed at one.
 *
 * ## Why this exists
 *
 * The corpus is a committed dataset (scope 4.2), and a device loads it once.
 * Withdrawing a record from the dataset therefore did nothing at all to a phone
 * that already had it: session 5 dropped the Epistle to the Son of the Wolf
 * (decision D5.7) and it stayed on every device that had already opened the app,
 * including the only two that exist. A corpus that can gain a correction but
 * never lose one is not a source of truth.
 *
 * ## What it will and will not delete
 *
 * Two guards, both of which must hold. A passage is a candidate only if it is
 * `global` - so the personal library of scope 4.4 is untouchable whatever feed
 * a user's own text claims to come from - and only if some passage in the
 * committed set shares its `source_feed`, so the Ruhi collection is out of reach
 * until session 11 commits it.
 *
 * A withdrawn passage takes with it its lines, its tag links, any bookmark, and
 * any trace of it having been on a list. Leaving those behind would leave the
 * queue of session 6 holding a row whose passage cannot be read.
 *
 * Deliberately does nothing when handed an empty set: a load that failed to
 * import anything must not be able to empty the library.
 */
export async function removePassagesNotIn(committed: readonly PassageRow[]): Promise<string[]> {
  if (committed.length === 0) return []

  const keep = new Set(committed.map((row) => row.id))
  const feeds = new Set(committed.map((row) => row.source_feed))

  // Seven tables, so the array form: Dexie's positional overload stops at five.
  return db.transaction(
    'rw',
    [
      db.passages,
      db.passage_segments,
      db.passage_tags,
      db.bookmarks,
      db.user_prayers,
      db.segment_progress,
      db.review_log,
    ],
    async () => {
      const withdrawn = (await db.passages.toArray()).filter(
        (row) => row.visibility === 'global' && feeds.has(row.source_feed) && !keep.has(row.id),
      )
      if (withdrawn.length === 0) return []

      const ids = withdrawn.map((row) => row.id)
      const withdrawnIds = new Set(ids)
      const segments = await db.passage_segments.where('passage_id').anyOf(ids).toArray()
      const segmentIds = new Set(segments.map((segment) => segment.id))

      await db.passage_segments.where('passage_id').anyOf(ids).delete()
      await db.passage_tags.where('passage_id').anyOf(ids).delete()
      await db.bookmarks.where('passage_id').anyOf(ids).delete()
      await db.user_prayers.where('passage_id').anyOf(ids).delete()
      await db.segment_progress.filter((row) => segmentIds.has(row.segment_id)).delete()
      // Two shapes of row. A line review names its line; a whole-passage
      // recital names only the passage and has no line at all (decision D9.3).
      await db.review_log
        .filter(
          (row) =>
            (row.passage_id !== null && withdrawnIds.has(row.passage_id)) ||
            (row.segment_id !== null && segmentIds.has(row.segment_id)),
        )
        .delete()
      await db.passages.bulkDelete(ids)

      return ids
    },
  )
}

/** Removes every passage, segment and tag. For a corpus reload, not for a user. */
export async function clearCorpus(): Promise<void> {
  await db.transaction(
    'rw',
    db.passages,
    db.passage_segments,
    db.tags,
    db.passage_tags,
    async () => {
      await Promise.all([
        db.passages.clear(),
        db.passage_segments.clear(),
        db.tags.clear(),
        db.passage_tags.clear(),
      ])
    },
  )
}
