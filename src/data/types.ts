/**
 * Row shapes for every table in scope section 10.
 *
 * **Column names are the scope's, exactly, in snake_case.** This is deliberate
 * and it is the whole point of decision D0.9. When v1.0 adds Supabase, a row
 * read out of IndexedDB is already shaped like a row read out of Postgres, so
 * sync is a transport change rather than a rename of every field in the app.
 *
 * The scheduler uses camelCase for the same concepts (`SegmentProgress.easeFactor`
 * against `segment_progress.ease_factor`). That mapping lives in `progressMapping.ts`
 * and nowhere else, which is what the scheduler's own header comment promised.
 */

/** A calendar day, written `YYYY-MM-DD`. The same convention the scheduler uses. */
export type Day = string

/** An ISO 8601 instant, written in UTC. Used for `*_at` columns. */
export type Instant = string

/**
 * The four feeds of scope 4.1, plus `ruhi` for quotations reached from the
 * memorisation side (D1.10). Session 3 owns the feed values; session 10 owns
 * `ruhi`. Both are declared now so that the exclusion in `passages.ts` is a
 * type the compiler knows about rather than a string somebody has to spell right.
 */
export type SourceFeed =
  'prayers' | 'hidden-words' | 'gleanings' | 'prayers-and-meditations' | 'ruhi'

/**
 * The collection a passage belongs to. Free-form because session 3's
 * normalisation decides how the feeds group, with one reserved value.
 */
export type Collection = string

/**
 * D1.10. A passage carrying this collection is a Ruhi quotation and must never
 * be returned by a devotional-surface function. `passages.ts` is the only place
 * that reads it.
 */
export const RUHI_COLLECTION = 'ruhi'

/**
 * Scope 6.2. Session 3 assigns the bands; the column exists from the first schema.
 * Widened to add `'extended'` in session 3: scope 6.2 defines four bands (Short,
 * Medium, Long, Extended) but session 2 typed only three. See decision D3.2.
 */
export type LengthBand = 'short' | 'medium' | 'long' | 'extended'

/** Scope 10. `private` is the v1.0 personal library; V0 writes only `global`. */
export type Visibility = 'global' | 'private'

/** Scope 8.7. `list` was called `playlist` before scope v4.0. */
export type UserPrayerStatus = 'list' | 'learning' | 'memorised'

/** Scope 8.5. `resting` is an absence of an interval, not a slow one. */
export type UpkeepState = 'active' | 'occasional' | 'resting'

/** Scope 9.6. The user's self-rating. Nothing is auto-scored. */
export type SelfRating = 'again' | 'hard' | 'good' | 'easy'

/**
 * Scope 9.1's ladder, as `review_log.quiz_type` records it.
 *
 * The six rungs, and the milestone. Scope 9.1's own table lists Milestone as a
 * row beneath level 6 - "Whole passage, first line visible" - so it is a kind of
 * review the log has to be able to name. Added in session 9 with the whole
 * passage recital (decision D9.3); no stored row is affected, because before
 * session 9 no row could have carried it.
 */
export type QuizType = 'level1' | 'level2' | 'level3' | 'level4' | 'level5' | 'level6' | 'milestone'

/** D1.10. Belongs to the quotation's appearance in a section, not to the text. */
export type RuhiDesignation = 'memorise' | 'reflection'

export interface PassageRow {
  readonly id: string
  readonly source_id: string
  readonly source_feed: SourceFeed
  readonly title: string
  /** Scope 18.23. Carries an authored line break for the reading view layout. */
  readonly display_title: string
  readonly first_line: string
  /**
   * The passage in full, plain text, paragraphs separated by a blank line.
   * Added session 3 (decision D3.1): the reading view (scope 6.6) needs the
   * whole passage, and `passage_segments` stays empty until a user adds the
   * passage to their list (scope 8.4), so nothing else in the schema carries it.
   */
  readonly text: string
  readonly author: string
  readonly translator: string | null
  readonly text_type: string
  readonly source_work: string | null
  readonly collection: Collection
  readonly language: string
  readonly word_count: number
  readonly length_band: LengthBand
  readonly segment_count: number
  readonly visibility: Visibility
  /** The `user_id` of whoever added it. `null` for the committed corpus. */
  readonly created_by: string | null
  /** Present from day one, unused in V0. Full-text search is v1.0 (scope 6.3). */
  readonly search_vector: string
}

export interface PassageSegmentRow {
  readonly id: string
  readonly passage_id: string
  readonly order_index: number
  readonly text: string
}

export interface TagRow {
  readonly id: string
  readonly name: string
  readonly source_tag_id: string
}

/**
 * Scope 10 gives this table no `id`, so the pair is the primary key. Dexie
 * expresses that as a compound key, which is also the only index it needs.
 */
export interface PassageTagRow {
  readonly passage_id: string
  readonly tag_id: string
}

export interface RuhiBookRow {
  readonly id: string
  readonly number: number
  readonly title: string
  /** Scope 5.2. The mapping is versioned against a stated Ruhi edition. */
  readonly edition: string
}

export interface RuhiUnitRow {
  readonly id: string
  readonly book_id: string
  readonly number: number
  readonly title: string
}

export interface RuhiSectionRow {
  readonly id: string
  readonly unit_id: string
  readonly number: number
  readonly title: string
}

export interface RuhiQuotationRow {
  readonly id: string
  readonly section_id: string
  readonly passage_id: string
  readonly order_index: number
  readonly designation: RuhiDesignation
}

export interface BookmarkRow {
  readonly id: string
  readonly user_id: string
  readonly passage_id: string
  readonly created_at: Instant
  /**
   * Scope 6.7 and 18.30. The order the user arranged their bookmarks in by
   * hand, which is one of the sort options on that screen and is remembered
   * when they switch to another and back.
   *
   * Written from the first bookmark, though nothing reads it until session 7
   * builds the screen: scope 10 declares columns from the first migration, and
   * a column added after a tester has a fortnight of data is a migration
   * running on their phone rather than a line in a schema.
   */
  readonly sort_order: number
}

export interface UserPrayerRow {
  readonly id: string
  readonly user_id: string
  readonly passage_id: string
  readonly status: UserPrayerStatus
  readonly upkeep_state: UpkeepState
  readonly is_focus: boolean
  readonly focus_until: Day | null
  readonly list_order: number
  readonly started_at: Instant
  readonly milestone_reached_at: Instant | null
  readonly passage_ease_factor: number | null
  readonly passage_interval_days: number | null
  readonly passage_repetitions: number | null
  readonly passage_due_date: Day | null
}

export interface SegmentProgressRow {
  readonly id: string
  readonly user_id: string
  readonly segment_id: string
  readonly ease_factor: number
  readonly interval_days: number
  readonly repetitions: number
  readonly due_date: Day
  readonly last_reviewed_at: Day | null
  readonly lapses: number
}

/**
 * One completed review, append-only. Scope 11.3: "`review_log` stores every
 * self-rating with a timestamp from day one."
 *
 * **Two of these columns changed shape in session 9, and neither is a schema
 * change.** Dexie's `stores()` string declares the primary key and the indexes,
 * not the columns, so a column that is never queried by is simply stored. No
 * version was bumped, no upgrade runs, and no row on a tester's device was
 * touched. See decision D9.3.
 *
 * The reason is scope 8.7. On reaching the milestone a passage is promoted to a
 * single whole-passage card and its lines stop being reviewed individually, so
 * from that day on the reader produces reviews that are not of any one line. As
 * the columns stood there was nowhere to put one, and a reader who had finished
 * everything on their list would have been writing no log rows at all - which
 * would have taken the streak of scope 11.4 with it, since session 10 derives
 * that from this table.
 */
export interface ReviewLogRow {
  readonly id: string
  readonly user_id: string
  /**
   * The line reviewed, or `null` for a whole-passage recital, which is not a
   * line. `quiz_type` is `milestone` on exactly those rows.
   */
  readonly segment_id: string | null
  /**
   * The passage the review belongs to. Written on every row from session 9 -
   * a segment review knows its passage and it costs nothing to say so.
   *
   * `null` means a row written before session 9, whose passage is found through
   * its line. Nothing backfills them: a backfill is a migration running on a
   * tester's phone against a fortnight of real data, which is precisely what
   * declaring columns early exists to avoid.
   */
  readonly passage_id: string | null
  readonly quiz_type: QuizType
  readonly self_rating: SelfRating
  readonly created_at: Instant
}

/** Scope 10 keys this on `user_id`, so there is no separate `id`. */
export interface UserStatsRow {
  readonly user_id: string
  readonly streak_current: number
  readonly streak_longest: number
  readonly last_active_date: Day | null
  readonly total_reviews: number
}

/** Scope 10 keys this on `user_id`, so there is no separate `id`. */
export interface UserSettingsRow {
  readonly user_id: string
  readonly daily_new_limit: number
  readonly daily_review_limit: number
  /**
   * The user text scale of design-tokens 2.4, stored as the multiplier itself
   * rather than a step name, so the range can be widened without a migration.
   */
  readonly text_size: number
  /** Scope 7.9 tags the full contrast pass as v1.0. The column exists now. */
  readonly high_contrast: boolean
  /** A `TypefaceId` from the theme registry. V0 only ever writes `italiana`. */
  readonly typeface: string
  /** A `PaletteId` from the theme registry. */
  readonly palette: string
}
