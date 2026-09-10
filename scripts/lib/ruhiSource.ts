import type { RuhiDesignation } from '../../src/data/types.ts'

/**
 * **Reading the three curation files.** Scope 5.1, 5.2 and 5.3; decision D11.7.
 *
 * The mapping from a Ruhi book, unit and section to a passage of the Writings is
 * the one piece of content in this product that no API supplies (scope 5.1). It
 * was curated by hand into three markdown files, which are committed at
 * `scripts/ruhi-source/` and are the input to `scripts/build-ruhi.ts`.
 *
 * This module turns those files into rows. It is pure: no filesystem, no
 * network, no database. Everything that could be wrong about the extraction is
 * therefore checkable by a unit test against a literal string, which is the same
 * bargain `scripts/lib/normalise.ts` makes.
 *
 * ## The three files are not one format
 *
 * Books 1 and 3 carry the category inline, as `**[To Memorize]**` at the head of
 * the quotation. Book 2 carries it on a line of its own, `— Designation:
 * Quotation to Memorize`, and uses different words for the same two values. A
 * parser that assumed one shape would silently drop 107 categories and leave
 * scope 5.4's filter half true, which is exactly the state D11.7 was written to
 * get out of. So both shapes are read, and `designationFrom` fails by name on a
 * third.
 *
 * ## What is deliberately not read
 *
 * Scope 5.1 draws the boundary: "the app maps to Ruhi references and links
 * passages. It does not reproduce Ruhi book content, exercises or commentary,
 * which are the Institute's own materials." The files carry some of that
 * commentary as context for the curator - a section's introductory instruction,
 * the note explaining which lessons a prayer belongs to, the extraction notes at
 * the foot of each file. **None of it is extracted.** An entry yields four
 * things: the quotation between its quotation marks, its resolved citation, its
 * category, and where in the curriculum it sits.
 */

/** One quotation, as the markdown records it. */
export interface RuhiSourceEntry {
  /** The unit it appears in. Books number their units from 1. */
  readonly unitNumber: number
  readonly unitTitle: string
  /**
   * The section within the unit. `number` orders; `title` is what is printed.
   *
   * Book 3's twenty four lessons are not numbered sections of their unit - they
   * are a subsection of it, printed as "Lesson 1" - so they are ordered after
   * the numbered sections and keep their own name. See `LESSON_ORDER_BASE`.
   */
  readonly sectionNumber: number
  readonly sectionTitle: string
  /** The entry's own number in the file, unique within a unit. */
  readonly entryNumber: number
  /** The quotation itself, verbatim, paragraphs separated by a blank line. */
  readonly text: string
  /** The resolved citation, as the curation wrote it, Ibid. chains already followed. */
  readonly citation: string
  readonly designation: RuhiDesignation
}

/** One curation file: a book, its edition, and everything in it. */
export interface RuhiSourceBook {
  readonly number: number
  readonly title: string
  /** Scope 5.2: the mapping carries the Ruhi edition it was built against. */
  readonly edition: string
  readonly entries: readonly RuhiSourceEntry[]
}

/**
 * Where a lesson's ordering key starts.
 *
 * `ruhi_sections` has four columns and scope section 10 is not ours to change
 * (CLAUDE.md rule: the schema is finished for V0), so there is no column saying
 * "this one is a lesson rather than a section". The distinction lives in the two
 * columns there are: **`title` is what the reader sees and `number` is only what
 * orders**. Unit 2 of Book 3 prints sections 1 to 22 and then twenty four
 * lessons, so a lesson takes `100 + n` and lands after every section, whatever a
 * later edition renumbers.
 */
export const LESSON_ORDER_BASE = 100

const HEADING = /^#{1,6}\s/
const BOOK_TITLE = /^#\s+Ruhi Book\s+(\d+)\s*[—–-]\s*(.+?)\s*$/
const EDITION = /Edition\s+([\w.]+?),?\s+([A-Z][a-z]+\s+\d{4})/
const UNIT = /^##\s+Unit\s+(\d+)(?:\s*\([^)]*\))?:\s*(.+?)\s*$/
const SECTION = /^###\s+(Section|Lesson)\s+(\d+)\s*$/
const ENTRY = /^(\d+)\.\s+(.*)$/
const CATEGORY_TAG = /^\*\*\[([^\]]+)\]\*\*\s*/
const DESIGNATION_LINE = /^Designation:\s*(.*)$/
/** A trailing italic parenthetical is the curator's note, not the quotation. */
const TRAILING_NOTE = /\s*\*\([^*]*\)\*\s*$/
/** The curation writes citations with an em dash in front of them. */
const CITATION_MARK = '—'

/**
 * The two categories, in all four spellings the three files use.
 *
 * Books 1 and 3 write "To Memorize" and "Reflection"; Book 2 writes "Quotation
 * to Memorize" and "Reflection quote". They are the same two things, and the
 * scope's own column takes `memorise` or `reflection` (scope 5.3, D1.10).
 *
 * American spelling on the left because that is what the books print and what
 * the curation recorded. Australian spelling on the right because that is the
 * app (CLAUDE.md rule 15), and this is the line where one becomes the other.
 */
const DESIGNATIONS: Readonly<Record<string, RuhiDesignation>> = {
  'To Memorize': 'memorise',
  'Quotation to Memorize': 'memorise',
  Reflection: 'reflection',
  'Reflection quote': 'reflection',
}

export function designationFrom(written: string): RuhiDesignation {
  const known = DESIGNATIONS[written]
  if (known === undefined) {
    throw new Error(
      `The curation used a category this loader does not know: "${written}". ` +
        `Add it to DESIGNATIONS in scripts/lib/ruhiSource.ts, or correct the source file.`,
    )
  }
  return known
}

/**
 * The lines an entry owns: its own line, and every indented line after it up to
 * the next entry, heading or rule.
 *
 * A blank line inside an entry is a paragraph break rather than the end of it -
 * three of Book 3's prayers and several of Book 1's longer quotations run to a
 * second paragraph. What does end an entry is a line that starts hard against
 * the left margin, which is how the files write their own prose.
 */
function bodyOf(lines: readonly string[], from: number): { body: string[]; next: number } {
  const body: string[] = []
  let index = from
  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (HEADING.test(line) || line.startsWith('---')) break
    if (line.trim() === '') {
      body.push('')
      index += 1
      continue
    }
    if (/^\S/.test(line)) break
    body.push(line.trim())
    index += 1
  }
  while (body.length > 0 && body[body.length - 1] === '') body.pop()
  return { body, next: index }
}

/**
 * An entry's four parts, pulled out of its lines.
 *
 * The quotation is what lies **between the first quotation mark and the last**,
 * which is the rule that gets both of the shapes the files use around it right:
 * Book 3's six lesson prayers are introduced in the line itself ("Prayer for
 * Lessons 1 to 4.") and two of its entries close with an italic note explaining
 * which prayer they are the ending of. Both are the Institute's own words about
 * the quotation rather than the quotation, and scope 5.1 keeps them out.
 */
function partsOf(body: readonly string[]): {
  text: string
  citation: string
  designation: string
} {
  const quoted: string[] = []
  const citations: string[] = []
  let designation: string | null = null

  for (const line of body) {
    if (line.startsWith(CITATION_MARK)) {
      const rest = line.slice(CITATION_MARK.length).trim()
      const named = DESIGNATION_LINE.exec(rest)
      if (named?.[1] !== undefined) designation = named[1].trim()
      else citations.push(rest)
      continue
    }
    quoted.push(line)
  }

  let text = quoted
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  const tagged = CATEGORY_TAG.exec(text)
  if (tagged?.[1] !== undefined) {
    designation = tagged[1]
    text = text.slice(tagged[0].length)
  }
  text = text.replace(TRAILING_NOTE, '')

  const opening = text.indexOf('"')
  const closing = text.lastIndexOf('"')
  if (opening === -1 || closing <= opening) {
    throw new Error(`A Ruhi entry has no quotation in it: ${text.slice(0, 80)}`)
  }
  if (designation === null) {
    throw new Error(`A Ruhi entry carries no category: ${text.slice(0, 80)}`)
  }

  return {
    text: text.slice(opening + 1, closing).trim(),
    citation: citations.join(' ').trim(),
    designation,
  }
}

/**
 * Reads one curation file.
 *
 * Everything outside a unit is ignored, which is what keeps the notes at the
 * foot of each file out: they sit under their own `##` heading, and a `##`
 * heading that is not a unit closes the one before it. Book 3's flagged list of
 * alternate phrasings for "memorize" is a numbered list, so without that rule it
 * would arrive as four more quotations.
 */
export function parseRuhiSource(markdown: string): RuhiSourceBook {
  const lines = markdown.split('\n')

  const heading = lines.find((line) => BOOK_TITLE.test(line))
  const book = heading === undefined ? null : BOOK_TITLE.exec(heading)
  if (book?.[1] === undefined || book[2] === undefined) {
    throw new Error('A Ruhi curation file has no "# Ruhi Book N — Title" heading.')
  }

  const editionLine = lines.find((line) => EDITION.test(line))
  const edition = editionLine === undefined ? null : EDITION.exec(editionLine)
  if (edition?.[1] === undefined || edition[2] === undefined) {
    throw new Error(
      `Ruhi Book ${book[1]} names no edition. Scope 5.2 requires the mapping to carry ` +
        `the Ruhi edition it was built against, and it is read from the file's Source line.`,
    )
  }

  const entries: RuhiSourceEntry[] = []
  let unit: { number: number; title: string } | null = null
  let section: { number: number; title: string } | null = null
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''

    if (HEADING.test(line)) {
      const unitHeading = UNIT.exec(line)
      const sectionHeading = SECTION.exec(line)
      if (unitHeading?.[1] !== undefined && unitHeading[2] !== undefined) {
        // Book 3's second unit is headed "Lessons for Children's Classes,
        // Grade 1 (preliminary sections only)", which was true of v1.0 of that
        // file and is not true of v2.0: the twenty four lessons are in it now
        // (D11.7). The parenthetical is the curator writing about the extraction
        // rather than the book's own title, so it does not reach a screen.
        unit = {
          number: Number(unitHeading[1]),
          title: unitHeading[2].replace(/\s*\([^)]*\)$/, ''),
        }
        section = null
      } else if (line.startsWith('## ')) {
        // Any other second-level heading closes the unit above it. The notes at
        // the foot of each file live under one.
        unit = null
        section = null
      } else if (sectionHeading?.[1] !== undefined && sectionHeading[2] !== undefined) {
        const number = Number(sectionHeading[2])
        const lesson = sectionHeading[1] === 'Lesson'
        section = {
          number: lesson ? LESSON_ORDER_BASE + number : number,
          title: `${sectionHeading[1]} ${String(number)}`,
        }
      }
      index += 1
      continue
    }

    const entry = ENTRY.exec(line)
    if (entry?.[1] !== undefined && entry[2] !== undefined && unit !== null && section !== null) {
      const { body, next } = bodyOf(lines, index + 1)
      const parts = partsOf([entry[2], ...body])
      entries.push({
        unitNumber: unit.number,
        unitTitle: unit.title,
        sectionNumber: section.number,
        sectionTitle: section.title,
        entryNumber: Number(entry[1]),
        text: parts.text,
        citation: parts.citation,
        designation: designationFrom(parts.designation),
      })
      index = next
      continue
    }

    index += 1
  }

  return {
    number: Number(book[1]),
    title: book[2],
    edition: `${edition[1]}, ${edition[2]}`,
    entries,
  }
}
