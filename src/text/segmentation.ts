/**
 * **Segmentation.** Scope 8.4: the app proposes, the user confirms, at the
 * moment a passage is added to the list.
 *
 * > The library ships unsegmented. Auto-splitting two thousand passages would
 * > produce two thousand sets of bad breaks in devotional language, at
 * > ingestion, invisibly. Running it on demand means the user is present to fix
 * > it. The app proposes splits on sentence and line boundaries. The user can
 * > merge or split before starting.
 *
 * This module is that proposal, and the joining and cutting on top of it. It
 * is pure: no database, no React, no clock. CLAUDE.md section 11 names
 * segmentation as mandatory-unit-tested for the same reason it names the
 * scheduler, and `segmentation.test.ts` puts all 975 committed passages through
 * it.
 *
 * ## The one invariant
 *
 * A passage is cut into **pieces** with a **boundary** between each pair, and
 * every boundary remembers the exact whitespace that was there. So the pieces
 * rejoined are the passage again, character for character. Whether a break
 * lands in a good place is a matter of taste and the user fixes it on screen;
 * a character lost between two lines is sacred text altered by a regular
 * expression, and nothing on screen would ever reveal it. The corpus test is
 * written against that invariant rather than against a count of lines.
 *
 * ## Five kinds of boundary, three of which are proposed
 *
 * | Kind | Where | Proposed |
 * |---|---|---|
 * | `paragraph` | a blank line | yes |
 * | `line` | a single line ending, which is how the corpus sets verse | yes |
 * | `sentence` | `.`, `!`, `?` or `…`, then a capital | yes |
 * | `clause` | `;` or `:` | no |
 * | `phrase` | `,` | no |
 *
 * Scope 8.4 proposes on sentence and line boundaries and nothing weaker, so the
 * last two are found and left closed. They are found at all because the confirm
 * screen draws a cut mark at every closed boundary, inside the line, for the
 * reader to tap. Devotional sentences run to fifty and two hundred words - a
 * single sentence of the Gleanings fills a phone screen - and a line that long
 * cannot be learnt as a line. Without the weaker two there would be nowhere to
 * put a mark on exactly the lines that most need one.
 *
 * ## Why a capital decides a full stop
 *
 * "Alas! for the poor" and "lo! they have turned away" are one sentence each,
 * and there are thirty five of them in the corpus. Breaking on every mark would
 * cut all thirty five in half. Requiring a capital after the mark tells them
 * apart, and it needs no list of abbreviations: the corpus contains none, which
 * was checked rather than assumed.
 */

/** What kind of gap a boundary is. See the table above. */
export type BoundaryKind = 'paragraph' | 'line' | 'sentence' | 'clause' | 'phrase'

export interface PassageBoundary {
  readonly kind: BoundaryKind
  /** The exact whitespace the passage had here, so rejoining is lossless. */
  readonly separator: string
}

/**
 * A passage cut into pieces at every boundary the splitter can see.
 *
 * `pieces.length === boundaries.length + 1`, except for a passage with no words
 * in it, where both are empty.
 */
export interface Segmentation {
  readonly pieces: readonly string[]
  readonly boundaries: readonly PassageBoundary[]
}

/** A line, as a run of pieces. Both ends inclusive. */
export interface LineRange {
  readonly from: number
  readonly to: number
}

/** Scope 8.4: sentence and line boundaries are proposed, and nothing weaker. */
const PROPOSED: Record<BoundaryKind, boolean> = {
  paragraph: true,
  line: true,
  sentence: true,
  clause: false,
  phrase: false,
}

/**
 * A sentence ends with one or more of these marks, plus any brackets or
 * quotation marks that close over them: `God.”` ends a sentence and the closing
 * mark belongs to it.
 */
const SENTENCE_END = /[.!?…]+["'’”)\]]*$/

/** A clause ends with a colon or a semicolon, closing marks included. */
const CLAUSE_END = /[;:]["'’”)\]]*$/

/** A phrase ends with a comma. The weakest cut there is, and never proposed. */
const PHRASE_END = /,["'’”)\]]*$/

/**
 * A sentence opens with a capital or a numeral, after any opening quotation
 * mark or bracket. Sticky rather than anchored so it can be tested at a
 * position without slicing the rest of the passage. See `boundaryAt`.
 */
const OPENS_SENTENCE = /["'‘“([]*[\p{Lu}\p{N}]/uy

/** Enough of the text before a boundary to see the punctuation that ends it. */
const TAIL = 12

/**
 * Line endings are normalised and the ends are trimmed, so that a passage
 * written with `\r\n` cuts the same way as one written with `\n` and no line
 * ever carries whitespace it did not earn. Nothing else about the text is
 * touched: the words, the marks and the spacing inside the passage are what the
 * corpus holds.
 */
export function cleanPassageText(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim()
}

/** Cuts a passage at every boundary there is. The proposal is `proposedBreaks`. */
export function segmentPassage(text: string): Segmentation {
  const cleaned = cleanPassageText(text)
  if (cleaned === '') return { pieces: [], boundaries: [] }

  const pieces: string[] = []
  const boundaries: PassageBoundary[] = []
  const whitespace = /\s+/g
  let start = 0
  let match: RegExpExecArray | null

  while ((match = whitespace.exec(cleaned)) !== null) {
    const separator = match[0]
    const kind = boundaryAt(cleaned, match.index, separator)
    if (kind === null) continue

    pieces.push(cleaned.slice(start, match.index))
    boundaries.push({ kind, separator })
    start = match.index + separator.length
  }

  pieces.push(cleaned.slice(start))
  return { pieces, boundaries }
}

/** The app's proposal: every boundary except the clause boundaries. */
export function proposedBreaks(segmentation: Segmentation): boolean[] {
  return segmentation.boundaries.map((boundary) => PROPOSED[boundary.kind])
}

/** The proposal as text, which is what a caller with nothing to confirm wants. */
export function proposeLines(text: string): string[] {
  const segmentation = segmentPassage(text)
  return segmentsFrom(segmentation, proposedBreaks(segmentation))
}

/**
 * The lines a set of breaks produces. Pieces on either side of a closed
 * boundary are rejoined with the whitespace the passage had there, so a line
 * made of two verse lines still holds its line ending.
 */
export function segmentsFrom(segmentation: Segmentation, breaks: readonly boolean[]): string[] {
  const { pieces, boundaries } = segmentation
  if (pieces.length === 0) return []

  const lines: string[] = []
  let line = pieces[0] ?? ''

  for (const [index, boundary] of boundaries.entries()) {
    const piece = pieces[index + 1] ?? ''
    if (breaks[index] === true) {
      lines.push(line)
      line = piece
    } else {
      line += boundary.separator + piece
    }
  }

  lines.push(line)
  return lines
}

/** Which pieces belong to which line. One range per line, in order. */
export function lineRanges(segmentation: Segmentation, breaks: readonly boolean[]): LineRange[] {
  const { pieces, boundaries } = segmentation
  if (pieces.length === 0) return []

  const ranges: LineRange[] = []
  let from = 0

  for (const [index] of boundaries.entries()) {
    if (breaks[index] === true) {
      ranges.push({ from, to: index })
      from = index + 1
    }
  }

  ranges.push({ from, to: pieces.length - 1 })
  return ranges
}

/**
 * The boundary that separates a line from the one above it, or `null` for the
 * first line, which has nothing above it to join.
 */
export function breakBefore(ranges: readonly LineRange[], lineIndex: number): number | null {
  const range = ranges[lineIndex]
  if (range === undefined || range.from === 0) return null
  return range.from - 1
}

/**
 * A line, cut into the parts a reader can put a cut mark between.
 *
 * Each part after the first names the boundary that would cut the line before
 * it, and carries the whitespace that stood there, so a line drawn from these
 * parts is the line drawn whole: the spacing is the passage's own, and a mark
 * sits in the gaps rather than replacing them.
 */
export interface LinePart {
  readonly text: string
  /** The boundary a cut here would open, or `null` for the first part of a line. */
  readonly cut: number | null
  /** The whitespace that stands before this part. Empty for the first part. */
  readonly separator: string
}

export function partsOfLine(
  segmentation: Segmentation,
  ranges: readonly LineRange[],
  lineIndex: number,
): LinePart[] {
  const range = ranges[lineIndex]
  if (range === undefined) return []

  const parts: LinePart[] = []
  for (let index = range.from; index <= range.to; index++) {
    const text = segmentation.pieces[index]
    if (text === undefined) continue
    const boundary = index === range.from ? undefined : segmentation.boundaries[index - 1]
    parts.push({
      text,
      cut: boundary === undefined ? null : index - 1,
      separator: boundary?.separator ?? '',
    })
  }
  return parts
}

/** Joins a line with the one above it. Returns the breaks unchanged for line 0. */
export function joinLines(
  segmentation: Segmentation,
  breaks: readonly boolean[],
  lineIndex: number,
): boolean[] {
  const index = breakBefore(lineRanges(segmentation, breaks), lineIndex)
  return index === null ? [...breaks] : withBreak(breaks, index, false)
}

/** Cuts a line in two at one named boundary inside it. */
export function splitAt(breaks: readonly boolean[], boundaryIndex: number): boolean[] {
  return withBreak(breaks, boundaryIndex, true)
}

function withBreak(breaks: readonly boolean[], index: number, open: boolean): boolean[] {
  return breaks.map((existing, position) => (position === index ? open : existing))
}

/**
 * What kind of boundary, if any, the whitespace at `index` is.
 *
 * Only the last few characters before it and the first one after it are looked
 * at, rather than the text on either side, so a long passage costs no more per
 * word than a fifteen word prayer. Slicing the remainder at every space would be
 * quadratic, which is fine for the corpus as it stands and is not fine for
 * whatever the personal library of scope 4.4 will hold.
 */
function boundaryAt(text: string, index: number, separator: string): BoundaryKind | null {
  const newlines = countNewlines(separator)
  if (newlines >= 2) return 'paragraph'
  if (newlines === 1) return 'line'

  const before = text.slice(Math.max(0, index - TAIL), index)
  if (SENTENCE_END.test(before) && opensSentence(text, index + separator.length)) return 'sentence'
  if (CLAUSE_END.test(before)) return 'clause'
  if (PHRASE_END.test(before)) return 'phrase'
  return null
}

function opensSentence(text: string, position: number): boolean {
  OPENS_SENTENCE.lastIndex = position
  return OPENS_SENTENCE.test(text)
}

function countNewlines(separator: string): number {
  let count = 0
  for (const character of separator) if (character === '\n') count += 1
  return count
}
