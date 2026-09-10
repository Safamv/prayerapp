import { beforeEach, describe, expect, it } from 'vitest'
import { putPassages } from './corpus'
import { resetDatabase } from './db'
import { makePassage, makeRuhiPassage } from './fixtures'
import type { PassageRow } from './types'
import { listPassageSegments } from './segmentation'
import { listUserPrayers } from './userPrayers'
import {
  addRuhiSectionToList,
  countRuhiQuotations,
  getRuhiPlace,
  getRuhiQuotation,
  listRuhiBookSummaries,
  listRuhiBooks,
  listRuhiQuotations,
  listRuhiSectionSummaries,
  listRuhiSections,
  listRuhiUnitSummaries,
  listRuhiUnits,
  putRuhiBooks,
  putRuhiQuotations,
  putRuhiSections,
  putRuhiUnits,
  searchRuhiQuotations,
} from './ruhi'

/**
 * The Ruhi route. Declared in session 2, filled in session 12.
 *
 * The first half of this file was written in session 2, when the four tables
 * held nothing: the whole point of decision D1.10 was that filling them later
 * would need no schema migration on a device already holding a tester's data,
 * and a schema nobody has ever written a row through is a schema nobody has
 * checked. That turned out to be true - session 12 added no version and no
 * column - so those tests are kept exactly as they were, with the one about the
 * tables being empty rewritten to say what it was actually protecting.
 *
 * The second half is the browse, the search and the bulk add of scope 5.4.
 */

beforeEach(async () => {
  await resetDatabase()
})

describe('the Ruhi tables before anything is loaded', () => {
  it('are empty and readable, rather than absent', async () => {
    expect(await listRuhiBooks()).toEqual([])
    expect(await countRuhiQuotations()).toBe(0)
    expect(await listRuhiBookSummaries()).toEqual([])
  })
})

describe('the Ruhi route, once session ten fills it', () => {
  it('reads the drill from book to unit to section in printed order', async () => {
    await putRuhiBooks([
      { id: 'book-2', number: 2, title: 'Arising to Serve', edition: '2017' },
      { id: 'book-1', number: 1, title: 'Reflections on the Life of the Spirit', edition: '2017' },
    ])
    await putRuhiUnits([
      { id: 'unit-2', book_id: 'book-1', number: 2, title: 'Prayer' },
      { id: 'unit-1', book_id: 'book-1', number: 1, title: 'Understanding the Writings' },
    ])
    await putRuhiSections([
      { id: 'section-2', unit_id: 'unit-1', number: 2, title: 'Section 2' },
      { id: 'section-1', unit_id: 'unit-1', number: 1, title: 'Section 1' },
    ])

    expect((await listRuhiBooks()).map((book) => book.number)).toEqual([1, 2])
    expect((await listRuhiUnits('book-1')).map((unit) => unit.number)).toEqual([1, 2])
    expect((await listRuhiSections('unit-1')).map((section) => section.number)).toEqual([1, 2])
  })

  it('returns a quotation with the passage that holds its text', async () => {
    const passage = makeRuhiPassage({ title: 'A quotation' })
    await putPassages([passage])
    await putRuhiQuotations([
      {
        id: 'quotation-1',
        section_id: 'section-1',
        passage_id: passage.id,
        order_index: 0,
        designation: 'memorise',
      },
    ])

    const found = await listRuhiQuotations('section-1')
    expect(found).toHaveLength(1)
    expect(found[0]?.passage.title).toBe('A quotation')
    expect(found[0]?.quotation.designation).toBe('memorise')
  })

  it('filters a section by designation, which is scope 5.4 To Memorise and Reflection', async () => {
    const first = makeRuhiPassage({ title: 'To memorise' })
    const second = makeRuhiPassage({ title: 'For reflection' })
    await putPassages([first, second])
    await putRuhiQuotations([
      {
        id: 'q1',
        section_id: 'section-1',
        passage_id: first.id,
        order_index: 0,
        designation: 'memorise',
      },
      {
        id: 'q2',
        section_id: 'section-1',
        passage_id: second.id,
        order_index: 1,
        designation: 'reflection',
      },
    ])

    expect((await listRuhiQuotations('section-1', 'memorise')).map((e) => e.passage.title)).toEqual(
      ['To memorise'],
    )
    expect(
      (await listRuhiQuotations('section-1', 'reflection')).map((e) => e.passage.title),
    ).toEqual(['For reflection'])
    expect(await listRuhiQuotations('section-1')).toHaveLength(2)
  })

  it('lets the same passage carry different designations in two books, per D1.9', async () => {
    const passage = makeRuhiPassage()
    await putPassages([passage])
    await putRuhiQuotations([
      {
        id: 'q1',
        section_id: 'book-1-section',
        passage_id: passage.id,
        order_index: 0,
        designation: 'memorise',
      },
      {
        id: 'q2',
        section_id: 'book-3-section',
        passage_id: passage.id,
        order_index: 0,
        designation: 'reflection',
      },
    ])

    expect((await listRuhiQuotations('book-1-section'))[0]?.quotation.designation).toBe('memorise')
    expect((await listRuhiQuotations('book-3-section'))[0]?.quotation.designation).toBe(
      'reflection',
    )
  })

  it('reads a section quotations in their printed order', async () => {
    const passages = [
      makeRuhiPassage({ title: 'first' }),
      makeRuhiPassage({ title: 'second' }),
      makeRuhiPassage({ title: 'third' }),
    ]
    await putPassages(passages)
    await putRuhiQuotations(
      [2, 0, 1].map((orderIndex, index) => ({
        id: `q${String(index)}`,
        section_id: 'section-1',
        passage_id: passages[index]?.id ?? '',
        order_index: orderIndex,
        designation: 'memorise' as const,
      })),
    )

    expect((await listRuhiQuotations('section-1')).map((e) => e.passage.title)).toEqual([
      'second',
      'third',
      'first',
    ])
  })
})

/**
 * The browse of scope 5.4: a book, its units, its sections, its quotations.
 *
 * One small curriculum, built once, so the counts and the categories can be
 * asserted against something a reader could hold in their head.
 */
async function seedCurriculum(): Promise<{
  memoriseOnly: string
  mixed: string
  passages: PassageRow[]
}> {
  await putRuhiBooks([
    { id: 'book-1', number: 1, title: 'Reflections', edition: '4.1.2.PE, May 2020' },
  ])
  await putRuhiUnits([
    { id: 'unit-1', book_id: 'book-1', number: 1, title: 'Understanding' },
    { id: 'unit-2', book_id: 'book-1', number: 2, title: 'Prayer' },
  ])
  await putRuhiSections([
    { id: 'sec-a', unit_id: 'unit-1', number: 1, title: 'Section 1' },
    { id: 'sec-b', unit_id: 'unit-1', number: 2, title: 'Section 2' },
    { id: 'sec-c', unit_id: 'unit-2', number: 101, title: 'Lesson 1' },
  ])

  const passages = [
    makeRuhiPassage({ title: 'Truthfulness', text: 'Truthfulness is the foundation.' }),
    makeRuhiPassage({ title: 'A kindly tongue', text: 'A kindly tongue is the lodestone.' }),
    makeRuhiPassage({
      title: 'Two lines',
      text: 'The first sentence stands alone. The second one follows it.',
    }),
  ]
  await putPassages(passages)

  await putRuhiQuotations([
    {
      id: 'q-a1',
      section_id: 'sec-a',
      passage_id: passages[0]?.id ?? '',
      order_index: 0,
      designation: 'memorise',
    },
    {
      id: 'q-a2',
      section_id: 'sec-a',
      passage_id: passages[2]?.id ?? '',
      order_index: 1,
      designation: 'memorise',
    },
    {
      id: 'q-b1',
      section_id: 'sec-b',
      passage_id: passages[1]?.id ?? '',
      order_index: 0,
      designation: 'reflection',
    },
    {
      id: 'q-b2',
      section_id: 'sec-b',
      passage_id: passages[0]?.id ?? '',
      order_index: 1,
      designation: 'memorise',
    },
    {
      id: 'q-c1',
      section_id: 'sec-c',
      passage_id: passages[0]?.id ?? '',
      order_index: 0,
      designation: 'memorise',
    },
  ])

  return { memoriseOnly: 'sec-a', mixed: 'sec-b', passages }
}

describe('the browse of scope 5.4', () => {
  it('counts every quotation in a book, however deep it sits', async () => {
    await seedCurriculum()
    expect(await listRuhiBookSummaries()).toEqual([
      { book: expect.objectContaining({ number: 1 }) as unknown, quotationCount: 5 },
    ])
  })

  it('counts a unit, and reads its units in printed order', async () => {
    await seedCurriculum()
    const units = await listRuhiUnitSummaries('book-1')
    expect(units.map((entry) => [entry.unit.number, entry.quotationCount])).toEqual([
      [1, 4],
      [2, 1],
    ])
  })

  it('says which categories a section holds, so a unit can name them', async () => {
    const { memoriseOnly, mixed } = await seedCurriculum()
    const sections = await listRuhiSectionSummaries('unit-1')
    const bySection = new Map(sections.map((entry) => [entry.section.id, entry]))
    expect(bySection.get(memoriseOnly)?.designations).toEqual(['memorise'])
    expect(bySection.get(mixed)?.designations).toEqual(['memorise', 'reflection'])
    expect(bySection.get(memoriseOnly)?.quotationCount).toBe(2)
  })

  it("orders Book 3's lessons after the numbered sections of their unit", async () => {
    await seedCurriculum()
    await putRuhiSections([{ id: 'sec-d', unit_id: 'unit-2', number: 20, title: 'Section 20' }])
    const sections = await listRuhiSectionSummaries('unit-2')
    expect(sections.map((entry) => entry.section.title)).toEqual(['Section 20', 'Lesson 1'])
  })

  it('says where a section sits, which is what every header below the first needs', async () => {
    await seedCurriculum()
    const place = await getRuhiPlace('sec-c')
    expect(place?.book.number).toBe(1)
    expect(place?.unit.number).toBe(2)
    expect(place?.section.title).toBe('Lesson 1')
    expect(await getRuhiPlace('not-a-section')).toBeUndefined()
  })

  it('gives one quotation everything a screen needs to show it', async () => {
    await seedCurriculum()
    const found = await getRuhiQuotation('q-c1')
    expect(found?.passage.title).toBe('Truthfulness')
    expect(found?.quotation.designation).toBe('memorise')
    expect(found?.place.section.title).toBe('Lesson 1')
    expect(await getRuhiQuotation('not-a-quotation')).toBeUndefined()
  })
})

describe('search within the Ruhi route, scope 5.4', () => {
  it('finds a quotation by its words, grouped by where it sits', async () => {
    await seedCurriculum()
    const groups = await searchRuhiQuotations('lodestone')
    expect(groups).toHaveLength(1)
    expect(groups[0]?.place.section.title).toBe('Section 2')
    expect(groups[0]?.quotations.map((entry) => entry.passage.title)).toEqual(['A kindly tongue'])
  })

  it('returns every place the same words appear, in curriculum order', async () => {
    await seedCurriculum()
    const groups = await searchRuhiQuotations('truthfulness')
    expect(groups.map((group) => group.place.section.title)).toEqual([
      'Section 1',
      'Section 2',
      'Lesson 1',
    ])
  })

  it('ignores capitals, accents and punctuation, so nobody has to type them', async () => {
    await seedCurriculum()
    // The same fold the chip quiz compares an answer with (scope 9.7): typed in
    // capitals, with a stop that is not there, and without the accents.
    expect(await searchRuhiQuotations('TRUTHFULNESS IS THE FOUNDATION.')).not.toEqual([])
    expect(await searchRuhiQuotations('bahaullah')).not.toEqual([])
  })

  it('reads the mapping and not the passages table, so it can never return a prayer', async () => {
    await seedCurriculum()
    // A Ruhi passage nothing points at, and an ordinary prayer. Neither is in
    // the mapping, so neither is findable here (decision D1.10).
    await putPassages([
      makeRuhiPassage({ text: 'A quotation no section holds.' }),
      makePassage({ text: 'A prayer, which this search must never return.' }),
    ])
    expect(await searchRuhiQuotations('no section holds')).toEqual([])
    expect(await searchRuhiQuotations('must never return')).toEqual([])
  })

  it('finds nothing for an empty query rather than everything', async () => {
    await seedCurriculum()
    expect(await searchRuhiQuotations('   ')).toEqual([])
  })

  it('searches the author and the work as well as the words', async () => {
    await seedCurriculum()
    expect(await searchRuhiQuotations("baha'u'llah")).not.toEqual([])
  })
})

describe('adding a whole section in one action, scope 5.4', () => {
  const userId = 'user-1'

  it("puts every quotation on the list, segmented by the app's own proposal", async () => {
    const { memoriseOnly, passages } = await seedCurriculum()
    const result = await addRuhiSectionToList(userId, memoriseOnly)

    expect(result).toEqual({ added: 2, alreadyOnList: 0 })
    expect((await listUserPrayers(userId)).map((row) => row.passage_id).sort()).toEqual(
      [passages[0]?.id ?? '', passages[2]?.id ?? ''].sort(),
    )
    // Scope 8.4: the lines exist from the moment it is on the list, and they
    // are the proposal - two sentences become two lines.
    expect(await listPassageSegments(passages[2]?.id ?? '')).toHaveLength(2)
  })

  it('adds what the filter shows and not what it hides', async () => {
    const { mixed } = await seedCurriculum()
    const result = await addRuhiSectionToList(userId, mixed, 'reflection')
    expect(result.added).toBe(1)
    expect(await listUserPrayers(userId)).toHaveLength(1)
  })

  it('leaves a passage already on the list exactly as it was', async () => {
    const { memoriseOnly } = await seedCurriculum()
    await addRuhiSectionToList(userId, memoriseOnly)
    const before = await listUserPrayers(userId)

    const again = await addRuhiSectionToList(userId, memoriseOnly)
    expect(again).toEqual({ added: 0, alreadyOnList: 2 })
    expect(await listUserPrayers(userId)).toEqual(before)
  })

  it('adds a passage once even where the curriculum prints it twice', async () => {
    const { mixed } = await seedCurriculum()
    // `sec-b` holds two quotations and one of them is a passage `sec-a` also
    // holds, so adding both sections must not segment it twice.
    await addRuhiSectionToList(userId, mixed)
    expect(await listUserPrayers(userId)).toHaveLength(2)
    const result = await addRuhiSectionToList(userId, 'sec-a')
    expect(result.alreadyOnList).toBe(1)
    expect(await listUserPrayers(userId)).toHaveLength(3)
  })
})
