import { createHash } from 'node:crypto'
import { CORPUS_NAMESPACE, deterministicUuid } from './deterministicId.ts'
import { resolveCitation, type ResolvedCitation } from './ruhiCitation.ts'
import type { RuhiSourceBook, RuhiSourceEntry } from './ruhiSource.ts'
import {
  buildSearchVector,
  deriveTitle,
  estimateSegmentCount,
  firstLine,
  lengthBandFor,
  wordCount,
} from './textCleaning.ts'
import { normalise } from '../../src/text/normalise.ts'
import {
  RUHI_COLLECTION,
  type PassageRow,
  type RuhiBookRow,
  type RuhiQuotationRow,
  type RuhiSectionRow,
  type RuhiUnitRow,
} from '../../src/data/types.ts'

/**
 * **The mapping, turned into rows.** Scope 5.1, 5.3 and decision D1.10.
 *
 * Pure, like every other module under `scripts/lib/`: it is handed the three
 * parsed curation files and the committed devotional corpus, and it returns the
 * five tables `scripts/build-ruhi.ts` writes out. No filesystem, no network.
 *
 * ## One quotation is one passage, wherever it appears
 *
 * The same words appear in more than one place in the curriculum. Book 3
 * reprints its six lesson prayers with a second footnote number (D11.7);
 * "Truthfulness is the foundation of all human virtues" is Book 1 Unit 1 and
 * Book 3 Lesson 4; the Short Obligatory Prayer is in two books.
 *
 * They are deduplicated **on the normalised text** - the same fold the chip quiz
 * matches an answer with - so identical words become one passage carrying one
 * schedule and one star, with a `ruhi_quotations` row for each place in the
 * curriculum it appears. That is precisely what scope 5.3 says that table is
 * for, and why `designation` sits on the quotation rather than on the passage:
 * the same words can be one to memorise in one book and one to reflect on in
 * another.
 *
 * ## Linking to the devotional corpus, and where the line is
 *
 * A quotation whose words are **the whole of** a passage already in the corpus
 * links to that passage instead of becoming a second copy of it. An excerpt does
 * not, and this is the whole of the rule. See `matchInCorpus`.
 */

/** The five tables, plus the passages a quotation needs to point at. */
export interface RuhiDataset {
  readonly books: readonly RuhiBookRow[]
  readonly units: readonly RuhiUnitRow[]
  readonly sections: readonly RuhiSectionRow[]
  readonly quotations: readonly RuhiQuotationRow[]
  /** Only the quotations whose words are not already in the devotional corpus. */
  readonly passages: readonly PassageRow[]
  readonly counts: RuhiCounts
}

export interface RuhiCounts {
  readonly entries: number
  readonly distinctTexts: number
  /** Distinct texts that turned out to be a whole passage already in the corpus. */
  readonly linkedTexts: number
  /** Quotations pointing at one of those, which is more, because books repeat. */
  readonly linkedQuotations: number
  readonly ownPassages: number
  readonly memorise: number
  readonly reflection: number
}

/** The shape this module needs of a corpus passage. `PassageRow` satisfies it. */
export interface CorpusPassage {
  readonly id: string
  readonly text: string
  readonly collection: string
}

function id(name: string): string {
  return deterministicUuid(CORPUS_NAMESPACE, name)
}

/**
 * The four devotional feeds in the order the library lists them, which is also
 * the order this module prefers them in when a text exists in more than one.
 *
 * 104 passages are in the committed corpus twice, because the prayers feed and
 * the Prayers and Meditations feed both carry them. That is a fact about
 * bahaiprayers.net rather than about this feature, and it is not this session's
 * to fix; what it means here is that two Ruhi quotations would otherwise have
 * had a choice of two identical passages to link to.
 */
const FEED_PRECEDENCE: readonly string[] = [
  'prayers',
  'hidden-words',
  'gleanings',
  'prayers-and-meditations',
]

/**
 * **The match rule, and it is deliberately the strictest one available.**
 *
 * A quotation links to a corpus passage when the two are **the same words from
 * end to end**, compared through `normalise` - lowercased, unaccented, stripped
 * of punctuation, whitespace collapsed. Anything less than the whole passage is
 * not a match.
 *
 * The reason is not tidiness, it is what the user would end up memorising.
 * Linking a one sentence quotation to the Gleaning it was taken from would put
 * the whole Gleaning on their list: they asked to learn "Beware, O people of
 * Bahá, lest ye walk in the ways of them whose words differ from their deeds"
 * and the app would hand them nine hundred words. So an excerpt keeps its own
 * passage record, holding exactly the words the curriculum asks for.
 *
 * Where the same words are in the corpus twice, the earlier feed wins, so the
 * choice is the library's own order rather than whichever file was read first.
 */
export function matchInCorpus(
  text: string,
  byNormalisedText: ReadonlyMap<string, readonly CorpusPassage[]>,
): CorpusPassage | null {
  const candidates = byNormalisedText.get(normalise(text)) ?? []
  if (candidates.length === 0) return null
  const ranked = [...candidates].sort(
    (a, b) => precedenceOf(a.collection) - precedenceOf(b.collection),
  )
  return ranked[0] ?? null
}

function precedenceOf(collection: string): number {
  const at = FEED_PRECEDENCE.indexOf(collection)
  return at === -1 ? FEED_PRECEDENCE.length : at
}

export function indexCorpusByText(corpus: readonly CorpusPassage[]): Map<string, CorpusPassage[]> {
  const index = new Map<string, CorpusPassage[]>()
  for (const passage of corpus) {
    if (passage.collection === RUHI_COLLECTION) continue
    const key = normalise(passage.text)
    const existing = index.get(key)
    if (existing === undefined) index.set(key, [passage])
    else existing.push(passage)
  }
  return index
}

/** A Ruhi quotation as a passage of its own, in the `ruhi` collection (D1.10). */
function ruhiPassage(text: string, citation: ResolvedCitation): PassageRow {
  const sourceId = createHash('sha256').update(normalise(text)).digest('hex').slice(0, 16)
  const line = firstLine(text)
  const title = deriveTitle(line)
  return {
    id: id(`ruhi:${sourceId}`),
    source_id: sourceId,
    source_feed: 'ruhi',
    title,
    display_title: title,
    first_line: line,
    text,
    author: citation.author,
    translator: null,
    text_type: 'ruhi-quotation',
    source_work: citation.sourceWork,
    collection: RUHI_COLLECTION,
    language: 'en',
    word_count: wordCount(text),
    length_band: lengthBandFor(estimateSegmentCount(text)),
    segment_count: 0,
    visibility: 'global',
    created_by: null,
    search_vector: buildSearchVector([title, text, citation.author, citation.sourceWork]),
  }
}

/**
 * Builds the five tables from the three parsed books and the committed corpus.
 *
 * The corpus is passed in rather than read here so that this stays pure and a
 * test can hand it four passages instead of 975.
 */
export function buildRuhiDataset(
  books: readonly RuhiSourceBook[],
  corpus: readonly CorpusPassage[],
): RuhiDataset {
  const byNormalisedText = indexCorpusByText(corpus)

  const bookRows: RuhiBookRow[] = []
  const unitRows: RuhiUnitRow[] = []
  const sectionRows: RuhiSectionRow[] = []
  const quotationRows: RuhiQuotationRow[] = []
  const passageRows = new Map<string, PassageRow>()

  const seenUnits = new Set<string>()
  const seenSections = new Set<string>()
  /** Normalised text to the passage id it resolved to, corpus or Ruhi. */
  const passageIdByText = new Map<string, string>()
  /** Normalised text to the author it was first attributed to. */
  const authorByText = new Map<string, string>()
  const linkedTexts = new Set<string>()
  let linkedQuotations = 0
  let memorise = 0

  for (const book of [...books].sort((a, b) => a.number - b.number)) {
    const bookId = id(`ruhi-book:${String(book.number)}`)
    bookRows.push({
      id: bookId,
      number: book.number,
      title: book.title,
      edition: book.edition,
    })

    let previous: ResolvedCitation | null = null
    const orderInSection = new Map<string, number>()

    for (const entry of book.entries) {
      const unitId = id(`ruhi-unit:${String(book.number)}:${String(entry.unitNumber)}`)
      if (!seenUnits.has(unitId)) {
        seenUnits.add(unitId)
        unitRows.push({
          id: unitId,
          book_id: bookId,
          number: entry.unitNumber,
          title: entry.unitTitle,
        })
      }

      const sectionId = id(`${unitId}:section:${String(entry.sectionNumber)}`)
      if (!seenSections.has(sectionId)) {
        seenSections.add(sectionId)
        sectionRows.push({
          id: sectionId,
          unit_id: unitId,
          number: entry.sectionNumber,
          title: entry.sectionTitle,
        })
      }

      const citation = resolveCitation(entry.citation, previous)
      previous = citation

      const key = normalise(entry.text)
      let passageId = passageIdByText.get(key)
      if (passageId === undefined) {
        const matched = matchInCorpus(entry.text, byNormalisedText)
        if (matched !== null) {
          passageId = matched.id
          linkedTexts.add(key)
        } else {
          const passage = ruhiPassage(entry.text, citation)
          passageRows.set(passage.id, passage)
          passageId = passage.id
        }
        passageIdByText.set(key, passageId)
        authorByText.set(key, citation.author)
      } else {
        // The same words again, somewhere else in the curriculum. The passage
        // stays one; the second appearance is a `ruhi_quotations` row, which is
        // the whole point of that table (scope 5.3).
        assertOneAuthor(entry, authorByText.get(key), citation.author)
      }
      if (linkedTexts.has(key)) linkedQuotations += 1

      const order = orderInSection.get(sectionId) ?? 0
      orderInSection.set(sectionId, order + 1)
      if (entry.designation === 'memorise') memorise += 1

      quotationRows.push({
        id: id(`${sectionId}:quotation:${String(entry.entryNumber)}`),
        section_id: sectionId,
        passage_id: passageId,
        order_index: order,
        designation: entry.designation,
      })
    }
  }

  return {
    books: bookRows,
    units: unitRows,
    sections: sectionRows,
    quotations: quotationRows,
    passages: [...passageRows.values()].sort((a, b) => a.source_id.localeCompare(b.source_id)),
    counts: {
      entries: quotationRows.length,
      distinctTexts: passageIdByText.size,
      linkedTexts: linkedTexts.size,
      linkedQuotations,
      ownPassages: passageRows.size,
      memorise,
      reflection: quotationRows.length - memorise,
    },
  }
}

/**
 * Two appearances of the same words must be attributed to the same person.
 *
 * Principle 7.10 is why this stops the build rather than picking one. If the
 * curriculum ever cites the same passage to two different authors, one of the
 * two citations is wrong and no loader should be choosing between them.
 */
function assertOneAuthor(entry: RuhiSourceEntry, first: string | undefined, second: string): void {
  if (first === undefined || first === second) return
  throw new Error(
    `The same quotation is attributed to two authors: "${first}" and "${second}".\n` +
      `  Unit ${String(entry.unitNumber)}, ${entry.sectionTitle}, entry ` +
      `${String(entry.entryNumber)}: ${entry.text.slice(0, 60)}...\n` +
      `Principle 7.10 admits no exception, so one of the two citations needs correcting.`,
  )
}
