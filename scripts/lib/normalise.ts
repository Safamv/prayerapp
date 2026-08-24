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
  firstLine,
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

/**
 * The prayers feed's `Id` for every prayer that is itself a distinctly named
 * tablet, rather than an ordinary prayer, mapped to that tablet's name
 * (decision D3.8, Safa, 25 August 2026). Found by reading every embedded
 * editorial line in the feed (see `textCleaning.ts`'s `EDITORIAL_LINE`), which
 * turned out to carry each tablet's English name — sometimes alongside its
 * Arabic or Persian one, kept here in the form a reader would recognise.
 *
 * A prayer in this list gets its tablet's name as its title and its
 * `source_work`, in place of an opening line, and is linked to the "Special
 * Tablets" tag below in addition to whatever topic tags the feed already
 * gives it. "Tablet of Visitation" (389, 390) is deliberately not unique: two
 * different tablets share that name in the real, published corpus, one read
 * at Bahá'u'lláh's Shrine and one at 'Abdu'l-Bahá's.
 */
const NAMED_TABLETS: Readonly<Record<number, string>> = {
  386: 'Tablet of Aḥmad',
  387: 'Fire Tablet',
  388: 'Tablet of the Holy Mariner',
  389: 'Tablet of Visitation',
  390: 'Tablet of Visitation',
  8242: 'Tablet of the Wondrous Maiden',
  8249: 'Tablet of the Lover and the Beloved',
  8251: 'Súrih of the Pen',
  8254: 'Tablet of the Bell',
  8255: 'Tablet of the Immortal Youth',
  8257: 'Tablet of the Branch',
  8258: 'Tablet to Rasúl',
  8259: 'Tablet to Maryam',
  8260: 'Book of the Covenant',
  8262: 'Súrih of Counsel',
  8263: 'Súrih of the Kings',
  8264: 'Tablet to Salmán I',
  8265: 'Súrih of Remembrance',
  8266: 'Súrih of Sorrows',
  8269: 'Tablet of the Birth',
  13691: 'Epistle to the Son of the Wolf',
}

/**
 * The three daily Obligatory Prayers (scope glossary: prayers a believer must
 * choose one of each day), each carrying its own name and, in the Short
 * Obligatory Prayer's case, inconsistent casing in the embedded marker
 * ("Short obligatory prayer") — the feed's own topic tag is used instead,
 * which is already correctly cased for all three (decision D3.10, Safa, 25
 * August 2026).
 */
const NAMED_OBLIGATORY_PRAYERS: Readonly<Record<number, string>> = {
  391: 'Short Obligatory Prayer',
  392: 'Medium Obligatory Prayer',
  393: 'Long Obligatory Prayer',
}

/**
 * A category that exists only in this app, not in the feed: every prayer in
 * `NAMED_TABLETS` gathered in one place (decision D3.8). Its id is
 * deterministic like every other corpus id (decision D3.3), so re-running the
 * fetch script never duplicates it; `source_tag_id` is a word rather than a
 * feed-issued number because nothing issued this tag.
 */
export const SPECIAL_TABLETS_TAG: TagRow = {
  id: deterministicUuid(CORPUS_NAMESPACE, 'synthetic-tag:special-tablets'),
  name: 'Special Tablets',
  source_tag_id: 'special-tablets',
}

/** The three prayers in `NAMED_OBLIGATORY_PRAYERS`, gathered the same way (decision D3.10). */
export const OBLIGATORY_PRAYERS_TAG: TagRow = {
  id: deterministicUuid(CORPUS_NAMESPACE, 'synthetic-tag:obligatory-prayers'),
  name: 'Obligatory Prayers',
  source_tag_id: 'obligatory-prayers',
}

/** A prayer's tablet or Obligatory Prayer name, if it is one, in place of a derived title. */
function namedPrayerTitle(id: number): string | undefined {
  return NAMED_TABLETS[id] ?? NAMED_OBLIGATORY_PRAYERS[id]
}

export function normalisePrayer(record: RawPrayer): PassageRow {
  const lines = cleanLines(record.Text, 'plain')
  const text = joinLines(lines, 'plain')
  const line = firstLine(text)
  const author = authorForPrayer(record.AuthorId)
  const namedTitle = namedPrayerTitle(record.Id)
  const title = namedTitle ?? deriveTitle(line)

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
    // A named tablet or Obligatory Prayer's source_work is its own name.
    // Otherwise, the compiled "Bahá'í Prayers" anthology draws on many
    // separate tablets and no single source_work names it.
    source_work: namedTitle ?? null,
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
  const line = firstLine(text)
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
  const line = firstLine(text)
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
  const line = firstLine(text)
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

/**
 * The `passage_tags` links carried on a prayer record's own embedded `Tags`
 * array, plus a link to `SPECIAL_TABLETS_TAG` when the prayer is a named
 * tablet (decision D3.8) or to `OBLIGATORY_PRAYERS_TAG` when it is one of the
 * three Obligatory Prayers (decision D3.10) — on top of, not instead of, its
 * ordinary tags.
 */
export function passageTagLinksForPrayer(record: RawPrayer): PassageTagRow[] {
  const thisPassageId = passageId('prayers', String(record.Id))
  const links = record.Tags.map((tag) => ({
    passage_id: thisPassageId,
    tag_id: deterministicUuid(CORPUS_NAMESPACE, `tag:${String(tag.Id)}`),
  }))
  if (record.Id in NAMED_TABLETS) {
    links.push({ passage_id: thisPassageId, tag_id: SPECIAL_TABLETS_TAG.id })
  }
  if (record.Id in NAMED_OBLIGATORY_PRAYERS) {
    links.push({ passage_id: thisPassageId, tag_id: OBLIGATORY_PRAYERS_TAG.id })
  }
  return links
}
