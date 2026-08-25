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
