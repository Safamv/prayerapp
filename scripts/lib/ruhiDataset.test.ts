import { describe, expect, it } from 'vitest'
import { buildRuhiDataset, matchInCorpus, indexCorpusByText } from './ruhiDataset.ts'
import type { RuhiSourceBook, RuhiSourceEntry } from './ruhiSource.ts'

/**
 * The rules that decide what ends up in the database, tested against a handful
 * of rows rather than against the real 344.
 *
 * The two that matter are the two a reader would feel: **what a quotation is
 * linked to**, which decides what they end up memorising, and **when two
 * appearances are one passage**, which decides whether the same words turn up on
 * their list twice with two stars.
 */

function entry(overrides: Partial<RuhiSourceEntry> = {}): RuhiSourceEntry {
  return {
    unitNumber: 1,
    unitTitle: 'A unit',
    sectionNumber: 1,
    sectionTitle: 'Section 1',
    entryNumber: 1,
    text: 'A quotation.',
    citation: '*The Hidden Words*, Arabic no. 1, p. 3.',
    designation: 'memorise',
    ...overrides,
  }
}

function book(entries: readonly RuhiSourceEntry[], number = 1): RuhiSourceBook {
  return { number, title: `Book ${String(number)}`, edition: '1.0.PE, May 2020', entries }
}

const GLEANING = {
  id: 'gleaning-1',
  collection: 'gleanings',
  text: 'Beware, O people of Bahá, lest ye walk in the ways of them whose words differ from their deeds. Many other sentences follow, because a Gleaning is long.',
}

describe('linking to a passage the corpus already has', () => {
  it('links when the quotation is the whole of it, punctuation and accents aside', () => {
    const built = buildRuhiDataset(
      [book([entry({ text: 'Blessed is the spot where mention of God hath been made!' })])],
      [
        {
          id: 'prayer-1',
          collection: 'prayers',
          text: 'Blessed is the spot, where mention of God hath been made.',
        },
      ],
    )
    expect(built.passages).toHaveLength(0)
    expect(built.quotations[0]?.passage_id).toBe('prayer-1')
  })

  it('does not link an excerpt, because that would put the whole passage on the list', () => {
    // The reader asked to learn one sentence. Linking would hand them a
    // Gleaning of several hundred words instead.
    const built = buildRuhiDataset(
      [
        book([
          entry({
            text: 'Beware, O people of Bahá, lest ye walk in the ways of them whose words differ from their deeds.',
            citation: "*Gleanings from the Writings of Bahá'u'lláh*, CXXXIX, par. 8, p. 345.",
          }),
        ]),
      ],
      [GLEANING],
    )
    expect(built.passages).toHaveLength(1)
    expect(built.passages[0]?.collection).toBe('ruhi')
    expect(built.passages[0]?.text).toContain('Beware, O people of Bahá')
    expect(built.passages[0]?.text).not.toContain('Many other sentences')
  })

  it('prefers the earlier feed where the same words are in the corpus twice', () => {
    const index = indexCorpusByText([
      { id: 'pm-1', collection: 'prayers-and-meditations', text: 'Thy name is my healing.' },
      { id: 'prayer-1', collection: 'prayers', text: 'Thy name is my healing.' },
    ])
    expect(matchInCorpus('Thy name is my healing.', index)?.id).toBe('prayer-1')
  })

  it('never links to a Ruhi passage, so a rebuild cannot chain onto its own output', () => {
    const index = indexCorpusByText([{ id: 'ruhi-1', collection: 'ruhi', text: 'A quotation.' }])
    expect(matchInCorpus('A quotation.', index)).toBeNull()
  })
})

describe('the same words in two places in the curriculum', () => {
  const twice = [
    book([entry({ text: 'Truthfulness is the foundation of all human virtues.' })]),
    book(
      [
        entry({
          text: 'Truthfulness is the foundation of all human virtues.',
          designation: 'reflection',
          sectionTitle: 'Lesson 4',
          sectionNumber: 104,
        }),
      ],
      3,
    ),
  ]

  it('is one passage with a quotation row for each place', () => {
    const built = buildRuhiDataset(twice, [])
    expect(built.passages).toHaveLength(1)
    expect(built.quotations).toHaveLength(2)
    expect(built.quotations[0]?.passage_id).toBe(built.quotations[1]?.passage_id)
  })

  it('keeps the category on the appearance, so the two can differ', () => {
    // Scope 5.3's own reason for putting `designation` on the quotation.
    const built = buildRuhiDataset(twice, [])
    expect(built.quotations.map((row) => row.designation)).toEqual(['memorise', 'reflection'])
  })

  it('stops if the same words are attributed to two different people', () => {
    expect(() =>
      buildRuhiDataset(
        [
          book([entry({ text: 'The same words.' })]),
          book(
            [
              entry({
                text: 'The same words.',
                citation: "'Abdu'l-Bahá, in *Bahá'í Prayers*, p. 28.",
              }),
            ],
            2,
          ),
        ],
        [],
      ),
    ).toThrow(/two authors/)
  })
})

describe('the rows a browse is built from', () => {
  const built = buildRuhiDataset(
    [
      book([
        entry({ entryNumber: 1, text: 'The first.' }),
        entry({ entryNumber: 2, text: 'The second.' }),
        entry({ entryNumber: 3, text: 'A lesson.', sectionNumber: 101, sectionTitle: 'Lesson 1' }),
      ]),
    ],
    [],
  )

  it('carries the Ruhi edition on the book, which scope 5.2 requires', () => {
    expect(built.books[0]?.edition).toBe('1.0.PE, May 2020')
  })

  it('makes one section per printed section, with the lesson keeping its own name', () => {
    expect(built.sections.map((row) => row.title)).toEqual(['Section 1', 'Lesson 1'])
    expect(built.sections.map((row) => row.number)).toEqual([1, 101])
  })

  it("numbers a section's quotations from nought, in printed order", () => {
    const inSection = built.quotations.filter((row) => row.section_id === built.sections[0]?.id)
    expect(inSection.map((row) => row.order_index)).toEqual([0, 1])
  })

  it('gives every Ruhi passage an author and a source work, because 7.10 admits none', () => {
    for (const passage of built.passages) {
      expect(passage.author).not.toBe('')
      expect(passage.source_work).not.toBeNull()
      expect(passage.collection).toBe('ruhi')
      expect(passage.source_feed).toBe('ruhi')
      // Scope 8.4: the library ships unsegmented, and so does the mapping.
      expect(passage.segment_count).toBe(0)
    }
  })

  it('gives the same quotation the same id on every rebuild', () => {
    const again = buildRuhiDataset(
      [
        book([
          entry({ entryNumber: 1, text: 'The first.' }),
          entry({ entryNumber: 2, text: 'The second.' }),
          entry({
            entryNumber: 3,
            text: 'A lesson.',
            sectionNumber: 101,
            sectionTitle: 'Lesson 1',
          }),
        ]),
      ],
      [],
    )
    expect(again.quotations.map((row) => row.id)).toEqual(built.quotations.map((row) => row.id))
    expect(again.passages.map((row) => row.id)).toEqual(built.passages.map((row) => row.id))
  })
})
