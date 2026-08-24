import type { LengthBand } from '../../src/data/types.ts'

/**
 * Turning a raw feed record's text into the plain prose the app stores and
 * shows. Every rule here was found by fetching the real feeds and reading the
 * actual response, not by guessing (decision D3.4) — see `normalise.test.ts`,
 * which is written against real records that exercise each one.
 */

/**
 * A line beginning `#` or `*` is an editorial note embedded in the plain text
 * of the prayers feed, not revealed text: a work name ("##Fire Tablet"), an
 * audience note ("##For Women"), a recitation instruction, or, on the Tablet
 * of Ahmad alone, a bold title and an attributed quotation from a letter
 * written on behalf of Shoghi Effendi. It is dropped rather than stored,
 * because the schema has nowhere to put it and leaving it in would read as
 * part of the prayer.
 */
const EDITORIAL_LINE = /^[#*]/

/** A stray footnote back-link glyph, left over from the source HTML, with no plain-text meaning. */
const FOOTNOTE_BACKLINK = /↩/g

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/**
 * Cleans a feed record's raw text into plain prose, one line per array entry,
 * editorial notes and footnote-link artefacts removed.
 *
 * `format: 'html'` unwraps `<p>` paragraphs (Hidden Words, Gleanings, Prayers
 * and Meditations). `format: 'plain'` takes the prayers feed's `\n`-separated
 * text as it arrives (fetched with `html=false`), because that feed uses a
 * bare line break for two different things — a paragraph break and a poetic
 * line break inside one sentence, as "Blessed is the spot" does — and nothing
 * in the data distinguishes them, so the safest thing is to preserve every
 * line exactly as given.
 */
export function cleanLines(raw: string, format: 'html' | 'plain'): string[] {
  const unwrapped = format === 'html' ? raw.replace(/<\/?p>/gi, '\n') : raw
  return decodeEntities(unwrapped)
    .replace(FOOTNOTE_BACKLINK, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0 && !EDITORIAL_LINE.test(line))
}

/**
 * The cleaned lines rejoined for storage and display. HTML feeds join on a
 * blank line, because `<p>` genuinely marks a paragraph break. The prayers
 * feed joins on a single line break, preserving whatever line structure the
 * source used, poetic or not.
 */
export function joinLines(lines: readonly string[], format: 'html' | 'plain'): string {
  return lines.join(format === 'html' ? '\n\n' : '\n')
}

/**
 * The passage's first sentence, found by scanning the whole cleaned text
 * (every line break collapsed to a space) for the first `.`, `!` or `?`. A
 * one-sentence passage with line breaks purely for rhythm, like "Blessed is
 * the spot", has none until its very end, so this correctly returns the whole
 * thing rather than stopping at the first authored line break.
 */
export function firstSentence(text: string): string {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  const match = /^.*?[.!?]/.exec(collapsed)
  return match !== null ? match[0] : collapsed
}

/** Words in `text`, split on whitespace. Used for the row's `word_count` and for `length_band`. */
export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length
}

/**
 * A short label for a browse list, truncated from `firstLine` at a word
 * boundary. Verbatim if it already fits; an ellipsis marks a truncation, the
 * same convention printed prayer-book indexes use for a long opening line.
 *
 * Known limitation, recorded rather than silently fixed (see the session
 * handoff): about an eighth of the prayers feed opens with a bare invocation
 * such as "He is God." before the prayer proper, and this makes that
 * invocation the title verbatim, so several dozen titles read "He is God."
 * with nothing to tell them apart in a list. Fixing it means deciding what a
 * title should do instead, which is a product call for Safa, not a default.
 */
export function deriveTitle(firstLine: string, maxWords = 8): string {
  const words = firstLine.split(/\s+/).filter((word) => word.length > 0)
  if (words.length <= maxWords) return firstLine
  return `${words.slice(0, maxWords).join(' ')}…`
}

/**
 * A rough count of how many segments the passage would split into if
 * segmented right now, used only to bucket `length_band` at ingestion (scope
 * 6.2). Real segmentation is suggested-then-confirmed at add time (scope 8.4,
 * session 5) and is not run here; this estimate exists because scope 6.2
 * defines the bands in terms of segments and ingestion has to classify a
 * passage before any segment exists. Splits on sentence boundaries, since line
 * breaks in the source are not reliably paragraph breaks (see `cleanLines`).
 */
export function estimateSegmentCount(text: string): number {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  if (collapsed.length === 0) return 0
  const sentences = collapsed.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.length > 0)
  return sentences.length
}

/** Scope 6.2's four bands, applied to the estimate above. */
export function lengthBandFor(segmentEstimate: number): LengthBand {
  if (segmentEstimate <= 3) return 'short'
  if (segmentEstimate <= 8) return 'medium'
  if (segmentEstimate <= 20) return 'long'
  return 'extended'
}

/**
 * A simple, greppable search blob: the given fields, lowercased and joined.
 * `search_vector` is unused until search ships at v1.0 (scope 6.3), so this is
 * a placeholder good enough to search against later without re-ingesting,
 * not a real search index.
 */
export function buildSearchVector(fields: readonly (string | null)[]): string {
  return fields
    .filter((field): field is string => field !== null && field.length > 0)
    .join(' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}
