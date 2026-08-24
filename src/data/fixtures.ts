import { newId } from './ids'
import { RUHI_COLLECTION } from './types'
import type { PassageRow, PassageSegmentRow, TagRow } from './types'

/**
 * Row builders for the data tests.
 *
 * Not a `.test.ts` file, so Vitest does not collect it, and not shipped either:
 * nothing in the application imports it. Every field is filled with something
 * plausible so that a test only has to name the one or two columns it is
 * actually about, which keeps the assertions readable.
 */

export function makePassage(overrides: Partial<PassageRow> = {}): PassageRow {
  const title = overrides.title ?? 'Blessed is the spot'
  return {
    id: newId(),
    source_id: newId(),
    source_feed: 'prayers',
    title,
    display_title: title,
    first_line: 'Blessed is the spot, and the house',
    text:
      'Blessed is the spot, and the house, and the place, and the city, and the heart, and the ' +
      'mountain, and the refuge, and the cave, and the valley, and the land, and the sea, and the ' +
      'island, and the meadow where mention of God hath been made and His praise glorified.',
    author: "Bahá'u'lláh",
    translator: null,
    text_type: 'prayer',
    source_work: null,
    collection: 'prayers',
    language: 'en',
    word_count: 42,
    length_band: 'short',
    segment_count: 0,
    visibility: 'global',
    created_by: null,
    search_vector: '',
    ...overrides,
  }
}

/** A Ruhi quotation's passage record. D1.10: stored as an ordinary passage. */
export function makeRuhiPassage(overrides: Partial<PassageRow> = {}): PassageRow {
  return makePassage({ collection: RUHI_COLLECTION, source_feed: 'ruhi', ...overrides })
}

export function makeSegment(
  passageId: string,
  orderIndex: number,
  text = 'Blessed is the spot,',
): PassageSegmentRow {
  return { id: newId(), passage_id: passageId, order_index: orderIndex, text }
}

export function makeTag(name: string): TagRow {
  return { id: newId(), name, source_tag_id: newId() }
}
