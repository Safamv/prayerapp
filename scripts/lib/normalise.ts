import { CORPUS_NAMESPACE, deterministicUuid } from './deterministicId.ts'
import type {
  RawGleaning,
  RawHiddenWord,
  RawPrayer,
  RawPrayerAndMeditation,
  RawTag,
} from './rawFeedTypes.ts'
import {
  buildSearchVector,
  cleanLines,
  deriveTitle,
  estimateSegmentCount,
  firstSentence,
  joinLines,
  lengthBandFor,
  wordCount,
} from './textCleaning.ts'
import type { PassageRow, PassageTagRow, TagRow } from '../../src/data/types.ts'

/**
 * Turning one raw feed record into the row `src/data/corpus.ts` writes.
 *
 * Every function here is pure: given the same record it always returns the
 * same row, with no network access and no clock. That is what CLAUDE.md
 * section 11 means by normalisation being unit-tested, and what makes these
 * functions safe to run against the real, saved sample records in
 * `normalise.test.ts` rather than invented ones.
 */

/**
 * `AuthorId` on the prayers feed, decoded empirically (decision D3.5): the API
 * gives no author name anywhere, only this numeric id. Confirmed against
 * known text and against the feed's own tags: "Is there any Remover of
 * difficulties" (a well-known prayer of the Báb) carries AuthorId 1;
 * "Blessed is the spot" (Bahá'u'lláh) carries AuthorId 2, and every prayer
 * tagged "Additional Prayers Revealed by Bahá'u'lláh" also carries AuthorId 2;
 * every prayer tagged "Additional Prayers Revealed by 'Abdu'l-Bahá" carries
 * AuthorId 3. Throws on an id outside this set rather than guessing, because a
 * wrong guess would misattribute a passage, which principle 7.10 treats as a
 * breach.
 */
const PRAYER_AUTHOR_NAMES: Readonly<Record<number, string>> = {
  1: 'The Báb',
  2: "Bahá'u'lláh",
  3: "'Abdu'l-Bahá",
}

function authorForPrayer(authorId: number): string {
  const name = PRAYER_AUTHOR_NAMES[authorId]
  if (name === undefined) {
    throw new Error(
      `Unknown prayer AuthorId ${String(authorId)}. See decision D3.5 before adding one: a ` +
        'wrong guess here misattributes a passage.',
    )
  }
  return name
}

/** Bahá'u'lláh alone wrote the Hidden Words, Gleanings, and Prayers and Meditations. */
const BAHAULLAH = "Bahá'u'lláh"

function passageId(sourceFeed: PassageRow['source_feed'], sourceId: string): string {
  return deterministicUuid(CORPUS_NAMESPACE, `${sourceFeed}:${sourceId}`)
}

export function normalisePrayer(record: RawPrayer): PassageRow {
  const lines = cleanLines(record.Text, 'plain')
  const text = joinLines(lines, 'plain')
  const line = firstSentence(text)
  const title = deriveTitle(line)
  const author = authorForPrayer(record.AuthorId)

  return {
    id: passageId('prayers', String(record.Id)),
    source_id: String(record.Id),
    source_feed: 'prayers',
    title,
    display_title: title,
    first_line: line,
    text,
    author,
    translator: null,
    text_type: 'prayer',
    // The compiled "Bahá'í Prayers" anthology draws on many separate tablets;
    // no single source_work names it. See the session's open questions.
    source_work: null,
    collection: 'prayers',
    language: 'en',
    word_count: wordCount(text),
    length_band: lengthBandFor(estimateSegmentCount(text)),
    segment_count: 0,
    visibility: 'global',
    created_by: null,
    search_vector: buildSearchVector([title, text, author]),
  }
}

export function normaliseHiddenWord(record: RawHiddenWord): PassageRow {
  const lines = cleanLines(record.Text, 'html')
  const text = joinLines(lines, 'html')
  const line = firstSentence(text)
  const title = deriveTitle(line)

  return {
    id: passageId('hidden-words', String(record.Id)),
    source_id: String(record.Id),
    source_feed: 'hidden-words',
    title,
    display_title: title,
    first_line: line,
    text,
    author: BAHAULLAH,
    translator: null,
    text_type: 'hidden-word',
    source_work: 'The Hidden Words',
    collection: 'hidden-words',
    language: 'en',
    word_count: wordCount(text),
    length_band: lengthBandFor(estimateSegmentCount(text)),
    segment_count: 0,
    visibility: 'global',
    created_by: null,
    search_vector: buildSearchVector([title, text, BAHAULLAH]),
  }
}

export function normaliseGleaning(record: RawGleaning): PassageRow {
  const lines = cleanLines(record.Text, 'html')
  const text = joinLines(lines, 'html')
  const line = firstSentence(text)
  const title = deriveTitle(line)

  return {
    id: passageId('gleanings', String(record.Id)),
    source_id: String(record.Id),
    source_feed: 'gleanings',
    title,
    display_title: title,
    first_line: line,
    text,
    author: BAHAULLAH,
    translator: null,
    text_type: 'gleaning',
    source_work: "Gleanings from the Writings of Bahá'u'lláh",
    collection: 'gleanings',
    language: 'en',
    word_count: wordCount(text),
    length_band: lengthBandFor(estimateSegmentCount(text)),
    segment_count: 0,
    visibility: 'global',
    created_by: null,
    search_vector: buildSearchVector([title, text, BAHAULLAH]),
  }
}

export function normalisePrayerAndMeditation(record: RawPrayerAndMeditation): PassageRow {
  const lines = cleanLines(record.Text, 'html')
  const text = joinLines(lines, 'html')
  const line = firstSentence(text)
  const title = deriveTitle(line)

  return {
    id: passageId('prayers-and-meditations', String(record.Id)),
    source_id: String(record.Id),
    source_feed: 'prayers-and-meditations',
    title,
    display_title: title,
    first_line: line,
    text,
    author: BAHAULLAH,
    translator: null,
    text_type: 'prayer',
    source_work: 'Prayers and Meditations',
    collection: 'prayers-and-meditations',
    language: 'en',
    word_count: wordCount(text),
    length_band: lengthBandFor(estimateSegmentCount(text)),
    segment_count: 0,
    visibility: 'global',
    created_by: null,
    search_vector: buildSearchVector([title, text, BAHAULLAH]),
  }
}

export function normaliseTag(record: RawTag): TagRow {
  return {
    id: deterministicUuid(CORPUS_NAMESPACE, `tag:${String(record.Id)}`),
    name: record.Name,
    source_tag_id: String(record.Id),
  }
}

/** The `passage_tags` links carried on a prayer record's own embedded `Tags` array. */
export function passageTagLinksForPrayer(record: RawPrayer): PassageTagRow[] {
  const thisPassageId = passageId('prayers', String(record.Id))
  return record.Tags.map((tag) => ({
    passage_id: thisPassageId,
    tag_id: deterministicUuid(CORPUS_NAMESPACE, `tag:${String(tag.Id)}`),
  }))
}
