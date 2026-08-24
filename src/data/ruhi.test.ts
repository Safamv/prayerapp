import { beforeEach, describe, expect, it } from 'vitest'
import { putPassages } from './corpus'
import { resetDatabase } from './db'
import { makeRuhiPassage } from './fixtures'
import {
  countRuhiQuotations,
  listRuhiBooks,
  listRuhiQuotations,
  listRuhiSections,
  listRuhiUnits,
  putRuhiBooks,
  putRuhiQuotations,
  putRuhiSections,
  putRuhiUnits,
} from './ruhi'

/**
 * The Ruhi route, which is `[v0.1]` and ships in session 10.
 *
 * The tables are empty in V0. These tests exist anyway, because the whole point
 * of decision D1.10 is that session 10 needs no schema migration on a device
 * that already holds a tester's data - and a schema nobody has ever written a
 * row through is a schema nobody has checked.
 */

beforeEach(async () => {
  await resetDatabase()
})

describe('the Ruhi tables in V0', () => {
  it('are empty, because no session before ten loads them', async () => {
    expect(await listRuhiBooks()).toEqual([])
    expect(await countRuhiQuotations()).toBe(0)
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
