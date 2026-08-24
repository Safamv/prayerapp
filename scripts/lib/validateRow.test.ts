import { describe, expect, it } from 'vitest'
import { isPassageRow, isPassageTagRow, isTagRow } from './validateRow'

const VALID_PASSAGE = {
  id: 'a',
  source_id: '1',
  source_feed: 'prayers',
  title: 'O Lord!',
  display_title: 'O Lord!',
  first_line: 'O Lord!',
  text: 'O Lord! Bless this family.',
  author: "'Abdu'l-Bahá",
  translator: null,
  text_type: 'prayer',
  source_work: null,
  collection: 'prayers',
  language: 'en',
  word_count: 5,
  length_band: 'short',
  segment_count: 0,
  visibility: 'global',
  created_by: null,
  search_vector: "o lord! bless this family. 'abdu'l-bahá",
}

describe('isPassageRow', () => {
  it('accepts a well-formed row', () => {
    expect(isPassageRow(VALID_PASSAGE)).toBe(true)
  })

  it('accepts translator, source_work and created_by as null', () => {
    expect(isPassageRow(VALID_PASSAGE)).toBe(true)
  })

  it.each([
    ['id', ''],
    ['title', ''],
    ['source_feed', 'ruhi-quotations'],
    ['length_band', 'huge'],
    ['visibility', 'public'],
    ['word_count', -1],
    ['word_count', 'ninety'],
  ])('rejects an invalid %s of %j', (field, badValue) => {
    expect(isPassageRow({ ...VALID_PASSAGE, [field]: badValue })).toBe(false)
  })

  it('rejects a value that is not an object', () => {
    expect(isPassageRow('not a row')).toBe(false)
    expect(isPassageRow(null)).toBe(false)
    expect(isPassageRow(undefined)).toBe(false)
  })

  it('rejects a row missing a required field', () => {
    const { search_vector, ...missingField } = VALID_PASSAGE
    void search_vector
    expect(isPassageRow(missingField)).toBe(false)
  })
})

describe('isTagRow', () => {
  it('accepts a well-formed tag and rejects an empty name', () => {
    const tag = { id: 'a', name: 'Healing', source_tag_id: '1' }
    expect(isTagRow(tag)).toBe(true)
    expect(isTagRow({ ...tag, name: '' })).toBe(false)
  })
})

describe('isPassageTagRow', () => {
  it('accepts a well-formed link and rejects a missing tag_id', () => {
    const link = { passage_id: 'a', tag_id: 'b' }
    expect(isPassageTagRow(link)).toBe(true)
    expect(isPassageTagRow({ passage_id: 'a' })).toBe(false)
  })
})
