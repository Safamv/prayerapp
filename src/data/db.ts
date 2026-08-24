import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  BookmarkRow,
  PassageRow,
  PassageSegmentRow,
  PassageTagRow,
  ReviewLogRow,
  RuhiBookRow,
  RuhiQuotationRow,
  RuhiSectionRow,
  RuhiUnitRow,
  SegmentProgressRow,
  TagRow,
  UserPrayerRow,
  UserSettingsRow,
  UserStatsRow,
} from './types'

/**
 * The database. **This is the only file in the application that imports Dexie**
 * (CLAUDE.md rule 4, decision D0.9), enforced by `no-restricted-imports` in
 * eslint.config.js. Everything else in `src/data/` uses the tables below;
 * everything outside `src/data/` uses the functions those modules export.
 *
 * IndexedDB is the source of truth (scope 12.2). There is no network call, no
 * account and no server anywhere in V0.
 *
 * ## What the schema string does and does not say
 *
 * Dexie's `stores()` string declares the primary key and the indexes, not the
 * columns. A column that is never queried by is simply absent from it and is
 * still stored. So the list below is shorter than scope section 10; the full
 * column set lives in `types.ts` and the compiler is what holds it to the scope.
 *
 * `++` would mean an auto-incrementing key. Every table here uses an explicit
 * string id from `ids.ts` instead, because an auto-increment number is local to
 * one device and would collide the moment v1.0 sync merges two of them.
 *
 * Booleans (`is_focus`, `high_contrast`) are deliberately not indexed.
 * IndexedDB cannot index a boolean at all, and storing 0 and 1 instead would
 * break the column shape that makes v1.0 sync additive. The sets they filter
 * are small enough to scan.
 *
 * ## The four empty tables
 *
 * `ruhi_books`, `ruhi_units`, `ruhi_sections` and `ruhi_quotations` are tagged
 * `[v0.1]` in the scope and hold no rows until session 10. They are declared
 * now on purpose (decision D1.10): adding a table later means a schema version
 * bump running against a device that already holds a tester's fortnight of real
 * data, and declaring it now costs nothing.
 *
 * `users`, `reading_history` and `ingestion_runs` stay `[v1.0]` and are not here.
 */
export class ByHeartDatabase extends Dexie {
  declare passages: EntityTable<PassageRow, 'id'>
  declare passage_segments: EntityTable<PassageSegmentRow, 'id'>
  declare tags: EntityTable<TagRow, 'id'>
  /** A compound primary key, so the key type is the pair rather than a prop name. */
  declare passage_tags: Table<PassageTagRow, [string, string]>
  declare ruhi_books: EntityTable<RuhiBookRow, 'id'>
  declare ruhi_units: EntityTable<RuhiUnitRow, 'id'>
  declare ruhi_sections: EntityTable<RuhiSectionRow, 'id'>
  declare ruhi_quotations: EntityTable<RuhiQuotationRow, 'id'>
  declare bookmarks: EntityTable<BookmarkRow, 'id'>
  declare user_prayers: EntityTable<UserPrayerRow, 'id'>
  declare segment_progress: EntityTable<SegmentProgressRow, 'id'>
  declare review_log: EntityTable<ReviewLogRow, 'id'>
  declare user_stats: EntityTable<UserStatsRow, 'user_id'>
  declare user_settings: EntityTable<UserSettingsRow, 'user_id'>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      // `[source_feed+source_id]` is what makes re-ingestion idempotent
      // (scope 4.2): the fetch script can run again and upsert rather than
      // duplicate. `collection` carries the Ruhi exclusion of D1.10.
      passages:
        'id, source_id, source_feed, [source_feed+source_id], collection, author, ' +
        'language, length_band, visibility, word_count, title, first_line',
      passage_segments: 'id, passage_id, [passage_id+order_index]',
      tags: 'id, name, source_tag_id',
      // No `id` column in scope 10, so the pair is the primary key.
      passage_tags: '[passage_id+tag_id], passage_id, tag_id',
      ruhi_books: 'id, number',
      ruhi_units: 'id, book_id, [book_id+number]',
      ruhi_sections: 'id, unit_id, [unit_id+number]',
      ruhi_quotations: 'id, section_id, passage_id, designation, [section_id+order_index]',
      bookmarks: 'id, user_id, passage_id, [user_id+passage_id], created_at',
      user_prayers:
        'id, user_id, passage_id, [user_id+passage_id], status, [user_id+status], ' +
        'passage_due_date, [user_id+list_order]',
      segment_progress:
        'id, user_id, segment_id, [user_id+segment_id], due_date, [user_id+due_date]',
      review_log: 'id, user_id, segment_id, created_at, [user_id+created_at]',
      user_stats: 'user_id',
      user_settings: 'user_id',
    })
  }
}

/** The name the app opens. Tests open their own, so they never touch this one. */
export const DATABASE_NAME = 'by-heart'

export const db = new ByHeartDatabase(DATABASE_NAME)

/**
 * Empty every table and reopen. For tests only, so each one starts from a real
 * empty IndexedDB rather than from whatever the previous test left behind.
 *
 * It clears rather than deletes because deleting a Dexie instance and reopening
 * it re-runs the schema, which is slower and can race the connection the
 * previous test still holds.
 */
export async function resetDatabase(): Promise<void> {
  if (!db.isOpen()) await db.open()
  await Promise.all(db.tables.map((table) => table.clear()))
}
