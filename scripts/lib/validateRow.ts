/**
 * Runtime shape checks for the committed corpus JSON.
 *
 * `PassageRow` and friends are compile-time types: once a JSON file is parsed
 * it is just `unknown`, and TypeScript cannot tell us whether the fetch script
 * actually wrote rows shaped the way `src/data/types.ts` promises. These
 * functions check at runtime, so `corpus-data.test.ts` can assert "every row
 * in the committed dataset satisfies `PassageRow`" as a real test rather than
 * a type annotation nobody is checking.
 *
 * The literal value lists below (source feeds, length bands, visibility)
 * mirror the unions in `src/data/types.ts` and have to be kept in step with
 * it by hand; there is no way to derive a runtime list from a compile-time
 * type.
 */

const SOURCE_FEEDS = ['prayers', 'hidden-words', 'gleanings', 'prayers-and-meditations', 'ruhi']
const LENGTH_BANDS = ['short', 'medium', 'long', 'extended']
const VISIBILITIES = ['global', 'private']

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

export function isPassageRow(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return (
    isNonEmptyString(row.id) &&
    isNonEmptyString(row.source_id) &&
    typeof row.source_feed === 'string' &&
    SOURCE_FEEDS.includes(row.source_feed) &&
    isNonEmptyString(row.title) &&
    typeof row.display_title === 'string' &&
    typeof row.first_line === 'string' &&
    isNonEmptyString(row.text) &&
    isNonEmptyString(row.author) &&
    isNullableString(row.translator) &&
    isNonEmptyString(row.text_type) &&
    isNullableString(row.source_work) &&
    isNonEmptyString(row.collection) &&
    isNonEmptyString(row.language) &&
    typeof row.word_count === 'number' &&
    row.word_count >= 0 &&
    typeof row.length_band === 'string' &&
    LENGTH_BANDS.includes(row.length_band) &&
    typeof row.segment_count === 'number' &&
    typeof row.visibility === 'string' &&
    VISIBILITIES.includes(row.visibility) &&
    isNullableString(row.created_by) &&
    typeof row.search_vector === 'string'
  )
}

export function isTagRow(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return (
    isNonEmptyString(row.id) && isNonEmptyString(row.name) && isNonEmptyString(row.source_tag_id)
  )
}

export function isPassageTagRow(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return isNonEmptyString(row.passage_id) && isNonEmptyString(row.tag_id)
}
