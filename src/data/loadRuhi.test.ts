import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetDatabase } from './db'
import { forgetCorpusLoad, loadCorpusIfNeeded } from './loadCorpus'
import { loadRuhiIfNeeded, RUHI_EDITIONS } from './loadRuhi'
import {
  addRuhiSectionToList,
  countRuhiQuotations,
  listRuhiBookSummaries,
  listRuhiQuotations,
  listRuhiSectionSummaries,
  listRuhiUnitSummaries,
  searchRuhiQuotations,
} from './ruhi'
import { listPassageSegments } from './segmentation'
import { listDevotionalPassagesByCollection } from './passages'
import { listUserPrayers } from './userPrayers'

/**
 * **The real mapping, through the real code.** Scope 5, decision D1.10.
 *
 * Everything else about this feature is checked against something small: the
 * parser against literal strings, the reads against five seeded quotations, the
 * screens against a curriculum of three sections. `ruhi-data.test.ts` checks the
 * file on disk. **None of that puts the actual 344 rows through the actual
 * loader and out through the actual reads**, and that is the gap decision D5.7's
 * bug lived in: the corpus file was correct, its shape was correct, and the load
 * was wrong.
 *
 * So this loads the committed mapping into a real IndexedDB and then browses it.
 */

beforeEach(async () => {
  await resetDatabase()
  forgetCorpusLoad()
  localStorage.removeItem('by-heart.ruhi-fingerprint')
  localStorage.removeItem('by-heart.corpus-fingerprint')
})

describe('loadRuhiIfNeeded, against the committed mapping', () => {
  it('loads three books, their units, their sections and all 344 quotations', async () => {
    await loadRuhiIfNeeded()

    expect(await db.ruhi_books.count()).toBe(3)
    expect(await db.ruhi_units.count()).toBeGreaterThan(0)
    expect(await db.ruhi_sections.count()).toBeGreaterThan(0)
    expect(await countRuhiQuotations()).toBe(344)
  })

  it('carries the Ruhi edition of each book, which scope 5.2 requires', async () => {
    await loadRuhiIfNeeded()
    for (const book of await db.ruhi_books.toArray()) {
      expect(book.edition).toBe(RUHI_EDITIONS[`Book ${String(book.number)}`])
    }
  })

  it('does not double the mapping when the route is opened a second time', async () => {
    await loadRuhiIfNeeded()
    const passages = await db.passages.count()

    await loadRuhiIfNeeded()

    expect(await countRuhiQuotations()).toBe(344)
    expect(await db.passages.count()).toBe(passages)
  })

  it('brings the library with it, because 32 quotations point into it', async () => {
    // Decision D12.1. Without this the Ruhi route drawn on a cold start would
    // be missing 32 quotations and would say nothing about it.
    await loadRuhiIfNeeded()
    const library = (await db.passages.toArray()).filter((row) => row.source_feed !== 'ruhi')
    expect(library.length).toBeGreaterThan(0)
  })

  it('leaves the library alone, and the library leaves it alone', async () => {
    // Both loads withdraw whatever their own dataset no longer carries, and
    // neither may reach across (decision D5.9's guards). Run in both orders,
    // because the reader could open either side of the app first.
    await loadRuhiIfNeeded()
    await loadCorpusIfNeeded()
    expect(await countRuhiQuotations()).toBe(344)
    const both = await db.passages.count()

    await resetDatabase()
    forgetCorpusLoad()
    localStorage.removeItem('by-heart.ruhi-fingerprint')
    localStorage.removeItem('by-heart.corpus-fingerprint')
    await loadCorpusIfNeeded()
    await loadRuhiIfNeeded()
    expect(await db.passages.count()).toBe(both)
    expect(await countRuhiQuotations()).toBe(344)
  })
})

describe('the browse, over the real curriculum', () => {
  beforeEach(async () => {
    await loadRuhiIfNeeded()
  })

  it('drills from a book to a unit to a section to its quotations', async () => {
    const books = await listRuhiBookSummaries()
    expect(books.map((entry) => entry.book.number)).toEqual([1, 2, 3])
    expect(books.reduce((total, entry) => total + entry.quotationCount, 0)).toBe(344)

    const units = await listRuhiUnitSummaries(books[0]?.book.id ?? '')
    expect(units.length).toBeGreaterThan(0)

    const sections = await listRuhiSectionSummaries(units[0]?.unit.id ?? '')
    expect(sections.length).toBeGreaterThan(0)

    const quotations = await listRuhiQuotations(sections[0]?.section.id ?? '')
    expect(quotations.length).toBeGreaterThan(0)
    // Principle 7.10: every one of them can be attributed.
    for (const entry of quotations) expect(entry.passage.author).not.toBe('')
  })

  it("puts Book 3's lessons after the numbered sections of their unit", async () => {
    const books = await listRuhiBookSummaries()
    const units = await listRuhiUnitSummaries(books[2]?.book.id ?? '')
    const sections = await listRuhiSectionSummaries(units[1]?.unit.id ?? '')
    const titles = sections.map((entry) => entry.section.title)

    expect(titles).toContain('Lesson 1')
    expect(titles).toContain('Lesson 24')
    expect(titles.indexOf('Lesson 1')).toBeGreaterThan(titles.lastIndexOf('Section 20'))
    expect(titles.at(-1)).toBe('Lesson 24')
  })

  it('finds a quotation every screen can point at, for all 344', async () => {
    const rows = await db.ruhi_quotations.toArray()
    const bySection = new Map<string, number>()
    for (const row of rows) bySection.set(row.section_id, (bySection.get(row.section_id) ?? 0) + 1)

    let found = 0
    for (const [sectionId, count] of bySection) {
      const quotations = await listRuhiQuotations(sectionId)
      // A quotation whose passage went missing is dropped silently by the read,
      // so this is the assertion that would catch it.
      expect(quotations, sectionId).toHaveLength(count)
      found += quotations.length
    }
    expect(found).toBe(344)
  })
})

describe('search and bulk add, over the real curriculum', () => {
  beforeEach(async () => {
    await loadRuhiIfNeeded()
  })

  it('finds a quotation everybody in a study circle knows', async () => {
    const groups = await searchRuhiQuotations('truthfulness is the foundation')
    expect(groups.length).toBeGreaterThan(0)
    expect(groups[0]?.place.book.number).toBe(1)
  })

  it('never returns a prayer, even with the library loaded beside it', async () => {
    await loadCorpusIfNeeded()
    // The opening of the Short Obligatory Prayer is in the library and is also
    // a Ruhi quotation, so it is findable; a prayer that is not in the mapping
    // is not, however plainly it is in the app.
    const groups = await searchRuhiQuotations('O thou by whose name the sea of joy')
    expect(groups).toEqual([])
  })

  it('adds a whole section, segmented, and the passages are ordinary passages', async () => {
    const books = await listRuhiBookSummaries()
    const units = await listRuhiUnitSummaries(books[0]?.book.id ?? '')
    const sections = await listRuhiSectionSummaries(units[0]?.unit.id ?? '')
    const section = sections[0]?.section.id ?? ''
    const expected = sections[0]?.quotationCount ?? 0

    const result = await addRuhiSectionToList('user-1', section)
    expect(result.added).toBe(expected)

    const onList = await listUserPrayers('user-1')
    expect(onList).toHaveLength(expected)
    for (const row of onList) {
      // Scope 8.4 and D1.10: it has lines like any other passage, and nothing
      // in the scheduler or the queue knows it is a Ruhi quotation.
      expect((await listPassageSegments(row.passage_id)).length).toBeGreaterThan(0)
    }
  })

  it('keeps every quotation out of the library, which is decision D1.10', async () => {
    await loadCorpusIfNeeded()
    for (const collection of [
      'prayers',
      'hidden-words',
      'gleanings',
      'prayers-and-meditations',
      'ruhi',
    ]) {
      const found = await listDevotionalPassagesByCollection(collection)
      expect(
        found.filter((row) => row.source_feed === 'ruhi'),
        collection,
      ).toEqual([])
    }
  })
})
