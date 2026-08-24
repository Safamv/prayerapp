/**
 * The drop cap, and what to do when the first character is not a letter.
 *
 * Design-tokens 8.2 names this as an open implementation question:
 *
 * > The drop cap takes the first character of the passage. Corpus text may open
 * > with a quotation mark, a diacritic, or a non-Latin character. The drop cap
 * > logic needs a defined fallback.
 *
 * ## The defined fallback: no drop cap
 *
 * If the passage does not open with a letter, it is set without one and the
 * text simply begins at body size. Two alternatives were rejected:
 *
 * - **Set the punctuation as the cap.** A 64px opening quotation mark floated
 *   into the margin reads as a mistake rather than as an ornament.
 * - **Skip the punctuation and cap the letter after it.** That silently moves a
 *   character of the text, and moving characters of sacred text to make a
 *   layout work is not a trade this app gets to make.
 *
 * Losing the ornament on a handful of passages costs nothing that matters. Every
 * one of the 976 passages committed today opens with a plain capital, so nothing
 * in the corpus takes the fallback - it is there for the personal library
 * (scope 4.4) and for whatever a later feed contains.
 *
 * ## A diacritic is a letter
 *
 * `Ḥ` is a letter and gets a drop cap like any other. The whole grapheme is
 * taken, so a base letter with a combining mark after it stays one character and
 * is never split down the middle.
 */

export interface DropCap {
  /** The first grapheme, to be set as the cap. */
  readonly cap: string
  /** Everything after it, to be set as the body. */
  readonly rest: string
}

/**
 * Splits the passage into a cap and the rest, or returns `null` when the text
 * does not open with a letter and should be set without one.
 */
export function splitDropCap(text: string): DropCap | null {
  const trimmed = text.replace(/^\s+/, '')
  if (trimmed === '') return null

  const cap = firstGrapheme(trimmed)
  if (!/^\p{L}/u.test(cap)) return null

  return { cap, rest: trimmed.slice(cap.length) }
}

/**
 * The first user-perceived character, so a letter carrying a combining mark
 * comes back whole.
 *
 * `Intl.Segmenter` is the correct tool and is in every browser the app targets;
 * the regex behind it is for a test runner or an older engine without it, and
 * covers the one case that actually matters here - a base character followed by
 * combining marks.
 */
function firstGrapheme(text: string): string {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('en-AU', { granularity: 'grapheme' })
    for (const { segment } of segmenter.segment(text)) return segment
  }
  return /^.\p{M}*/u.exec(text)?.[0] ?? text.slice(0, 1)
}
