import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseRuhiSource } from './ruhiSource.ts'
import { isPassageRow } from './validateRow.ts'
import type {
  PassageRow,
  RuhiBookRow,
  RuhiQuotationRow,
  RuhiSectionRow,
  RuhiUnitRow,
} from '../../src/data/types.ts'

/**
 * **The committed mapping itself, not the code that produced it.**
 *
 * The same bargain `corpus-data.test.ts` makes about the corpus: this reads the
 * real `ruhi.json` on disk, the one that ships, and checks that every promise
 * the schema and the principles make about it actually holds for all 344 rows.
 * If it is failing, the fix is to change `scripts/build-ruhi.ts` or a curation
 * file and re-run `node scripts/build-ruhi.ts` (CLAUDE.md rule 12) - never
 * hand-edit the JSON.
 *
 * It is worth having beside the unit tests because those check the rules against
 * five rows of their own making, and this checks the rules against the material.
 * The 344 real citations are what found the one bug in this feature that would
 * have shipped: an author whose name ends in an accented letter.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(HERE, '..', '..', 'src', 'data', 'corpus-data')
const SOURCE_DIR = join(HERE, '..', 'ruhi-source')

interface RuhiFile {
  readonly books: RuhiBookRow[]
  readonly units: RuhiUnitRow[]
  readonly sections: RuhiSectionRow[]
  readonly quotations: RuhiQuotationRow[]
  readonly passages: PassageRow[]
}

const raw = readFileSync(join(DATA_DIR, 'ruhi.json'), 'utf8')
const data = JSON.parse(raw) as RuhiFile
const manifest = JSON.parse(readFileSync(join(DATA_DIR, 'ruhi-manifest.json'), 'utf8')) as {
  datasetVersion: string
  editions: Record<string, string>
  sourceFiles: string[]
  counts: Record<string, number>
  files: Record<string, { records: number; sha256: string }>
}

function corpus(): PassageRow[] {
  return [
    'prayers.json',
    'hidden-words.json',
    'gleanings.json',
    'prayers-and-meditations.json',
  ].flatMap((name) => JSON.parse(readFileSync(join(DATA_DIR, name), 'utf8')) as PassageRow[])
}

describe('the committed Ruhi mapping', () => {
  it('matches its manifest, so a hand-edit is a failing build', () => {
    const entry = manifest.files['ruhi.json']
    expect(entry?.sha256).toBe(createHash('sha256').update(raw).digest('hex'))
    expect(entry?.records).toBe(data.quotations.length)
  })

  it('holds every quotation the three curation files carry', () => {
    const inSource = readdirSync(SOURCE_DIR)
      .filter((name) => name.endsWith('.md'))
      .reduce(
        (total, name) =>
          total + parseRuhiSource(readFileSync(join(SOURCE_DIR, name), 'utf8')).entries.length,
        0,
      )
    expect(data.quotations).toHaveLength(inSource)
    expect(data.quotations).toHaveLength(344)
  })

  it('carries the Ruhi edition of each of the three books, which scope 5.2 requires', () => {
    expect(data.books).toHaveLength(3)
    for (const book of data.books) {
      expect(book.edition).toMatch(/^[\d.]+\.PE, [A-Z][a-z]+ \d{4}$/)
      expect(manifest.editions[`Book ${String(book.number)}`]).toBe(book.edition)
    }
  })

  it('is versioned independently of the app, which scope 5.2 also requires', () => {
    expect(manifest.datasetVersion).toMatch(/^\d+\.\d+\.\d+$/)
  })
})

describe('what every row promises', () => {
  it('gives every quotation a section that exists, in a unit, in a book', () => {
    const sections = new Map(data.sections.map((row) => [row.id, row]))
    const units = new Map(data.units.map((row) => [row.id, row]))
    const books = new Set(data.books.map((row) => row.id))

    for (const quotation of data.quotations) {
      const section = sections.get(quotation.section_id)
      expect(section, quotation.id).toBeDefined()
      const unit = units.get(section?.unit_id ?? '')
      expect(unit, section?.id).toBeDefined()
      expect(books.has(unit?.book_id ?? '')).toBe(true)
    }
  })

  it('gives every quotation a passage that exists, here or in the corpus', () => {
    const known = new Set([...data.passages, ...corpus()].map((row) => row.id))
    const missing = data.quotations.filter((row) => !known.has(row.passage_id))
    expect(missing).toEqual([])
  })

  it('carries a category on every one of them, so the filter is honest everywhere', () => {
    // Decision D11.7 closed Book 3's gap. This is the assertion that keeps it
    // closed: before it, 136 of the 344 had none.
    for (const quotation of data.quotations) {
      expect(['memorise', 'reflection']).toContain(quotation.designation)
    }
    const memorise = data.quotations.filter((row) => row.designation === 'memorise').length
    expect(memorise).toBe(manifest.counts.memorise)
    expect(memorise).toBeGreaterThan(0)
    expect(data.quotations.length - memorise).toBeGreaterThan(0)
  })

  it("numbers every section's quotations from nought without a gap", () => {
    const bySection = new Map<string, number[]>()
    for (const row of data.quotations) {
      const existing = bySection.get(row.section_id) ?? []
      existing.push(row.order_index)
      bySection.set(row.section_id, existing)
    }
    for (const [sectionId, indexes] of bySection) {
      expect(
        indexes.sort((a, b) => a - b),
        sectionId,
      ).toEqual(indexes.map((_, at) => at))
    }
  })

  it('is a valid passage row for every passage of its own', () => {
    for (const passage of data.passages) {
      expect(isPassageRow(passage), passage.id).toBe(true)
    }
  })
})

describe('principle 7.10 and decision D1.10, over the real material', () => {
  it('attributes every Ruhi passage to somebody, and to a source work', () => {
    for (const passage of data.passages) {
      expect(passage.author, passage.id).not.toBe('')
      expect(passage.source_work, passage.id).toBeTruthy()
    }
  })

  it("uses only the corpus's own spellings of the three central authors", () => {
    // Two spellings of Bahá'u'lláh in one list is the kind of thing nobody
    // notices until it is on every screen.
    const known = new Set([
      "Bahá'u'lláh",
      "'Abdu'l-Bahá",
      'The Báb',
      'Shoghi Effendi',
      'The Universal House of Justice',
    ])
    const unknown = [...new Set(data.passages.map((row) => row.author))].filter(
      (author) => !known.has(author),
    )
    expect(unknown).toEqual([])
  })

  it('puts every passage of its own in the ruhi collection and the ruhi feed', () => {
    for (const passage of data.passages) {
      expect(passage.collection).toBe('ruhi')
      expect(passage.source_feed).toBe('ruhi')
    }
  })

  it('links only to whole passages of the corpus, never to part of one', () => {
    const byId = new Map(corpus().map((row) => [row.id, row]))
    const own = new Set(data.passages.map((row) => row.id))
    const linked = data.quotations.map((row) => row.passage_id).filter((id) => !own.has(id))

    expect(linked.length).toBeGreaterThan(0)
    for (const id of new Set(linked)) {
      // Nothing to assert about the text here beyond that it is a real corpus
      // passage: the whole-text rule is what put it in this list, and
      // `ruhiDataset.test.ts` is where that rule is checked.
      expect(byId.get(id), id).toBeDefined()
      expect(byId.get(id)?.collection).not.toBe('ruhi')
    }
  })
})
