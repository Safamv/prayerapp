import { strings } from './index'

/**
 * **Attribution, composed.** Principle 7.10, scope 4.3, design-tokens 7.
 *
 * > Every surface that shows a passage shows its attribution. List rows,
 * > reading view, quiz screens, milestone screen, everywhere. No exceptions.
 *
 * Every one of those surfaces needs the same line built from the same columns,
 * and sessions 7 to 9 will need it on screens that do not exist yet. Building it
 * in one place is the same argument principle 7.11 makes about labels: an
 * attribution assembled slightly differently on the milestone screen is a
 * licence condition met slightly differently, which is not a thing that should
 * be possible.
 *
 * ## Why this lives in `src/strings/`
 *
 * The lines below are user-facing text. They are assembled rather than written
 * out, because a passage's author is data, but the separator, the copyright
 * notice, the collection names and the word "TRANSLATED BY" are all the app's
 * own words. Putting the assembly anywhere else would put those words there too.
 *
 * ## Why the case is folded here and not in CSS
 *
 * Design-tokens 2.3: caps-slot text is written as uppercase literal strings and
 * never produced with `text-transform`, because tracking on transformed text
 * renders inconsistently. A passage's author cannot be a literal, so the fold
 * happens here instead and real capitals reach the DOM. `attribution.test.ts`
 * holds the other half of that bargain: everything this module can produce must
 * have a glyph in the subset font (`scripts/lib/fontCharset.ts`).
 */

/** Design-tokens 5.4 and the reference reading surface: a spaced middle dot. */
const SEPARATOR = ' · '

/** The shape this module needs. Structural, so a `PassageRow` satisfies it as it is. */
export interface AttributedPassage {
  readonly author: string
  readonly translator: string | null
  readonly source_work: string | null
  readonly collection: string
  readonly text_type: string
  readonly word_count: number
}

/**
 * Folds a name to capitals for the caps slot. Named explicitly rather than
 * called inline, so every fold in the app is greppable and the test below can
 * check the same function the screens call.
 */
export function capsCase(value: string): string {
  return value.toLocaleUpperCase('en-AU')
}

/** `PRAYERS`, `THE HIDDEN WORDS`. Falls back to the raw value for an unknown feed. */
export function collectionLabel(collection: string): string {
  const known: Record<string, string> = strings.collections
  return known[collection] ?? capsCase(collection)
}

/** `PRAYER`, `HIDDEN WORD`. The reading-surface eyebrow of design-tokens 5.4. */
export function textTypeLabel(textType: string): string {
  const known: Record<string, string> = strings.textTypes
  return known[textType] ?? capsCase(textType)
}

/**
 * The first line of the reading view's attribution block, and the whole of the
 * attribution anywhere else.
 *
 * Author, then the translator where there is one, then the work it comes from.
 * Scope 4.3 asks for exactly those three. `source_work` is the more precise
 * answer where a passage has one (`FIRE TABLET` rather than `PRAYERS`), and the
 * collection stands in where it does not, so the line never ends at a name with
 * no source. Decision D3.4 explains why most prayers have no `source_work`.
 */
export function passageAttribution(passage: AttributedPassage): string {
  const parts = [capsCase(passage.author)]
  if (passage.translator !== null && passage.translator !== '') {
    parts.push(`${strings.reading.translatedBy} ${capsCase(passage.translator)}`)
  }
  parts.push(
    passage.source_work !== null && passage.source_work !== ''
      ? capsCase(passage.source_work)
      : collectionLabel(passage.collection),
  )
  return parts.join(SEPARATOR)
}

/**
 * The secondary line of a passage row. Scope 6.2: "Passage rows show: title or
 * opening phrase, author, and word count."
 *
 * The author rather than the full attribution, because a row is a list of
 * things by someone and a row repeating `THE HIDDEN WORDS` 153 times down one
 * screen tells the reader nothing. Principle 7.10 is still met: the author is
 * the attribution, and the work is one tap away in the reading view.
 */
export function passageRowAttribution(passage: AttributedPassage): string {
  return capsCase(passage.author) + SEPARATOR + strings.discover.wordCount(passage.word_count)
}
