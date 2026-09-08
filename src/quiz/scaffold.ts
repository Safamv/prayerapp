import { clozeTokens } from './cloze'

/**
 * **Level 5: first letters as a scaffold.** Scope 9.1.
 *
 * The oldest memorisation aid there is, and the reason it sits between the chip
 * cloze and free recall: at levels 2 and 3 most of the line is in front of you
 * and you fill the gaps; at level 6 nothing is. The first letter of each word is
 * the smallest possible thing that is still the line, and it is the rung that
 * turns recognition into production without a cliff between them.
 *
 * ## What it keeps, and why
 *
 * The first letter of each word, and the punctuation around that word exactly as
 * the passage wrote it.
 *
 * ```
 * Remove not, O Lord, the lamp of Thy loving-kindness
 * R n, O L, t l o T l
 * ```
 *
 * The punctuation is not decoration. It is the shape of the sentence: where it
 * breathes, where it stops, where it exclaims. A scaffold of bare letters would
 * throw away the half of the prompt that is free.
 *
 * A hyphenated compound keeps one letter, not two. `loving-kindness` is one word
 * of the passage and gets one letter, the same as every other word, because the
 * scaffold's whole usefulness is that its letters and the passage's words count
 * the same.
 *
 * A token with no letter or number in it at all - a lone dash between two
 * clauses - is kept whole. It is punctuation already.
 *
 * ## What it is not
 *
 * It is not a puzzle with an answer the app checks. Nothing at levels 5 and 6 is
 * tapped, typed or compared: scope 9.2 removed typed input from V0 entirely, and
 * scope 9.6 makes the reader's own rating after the reveal the only judgement
 * the app ever holds. The scaffold is drawn, the reader recites aloud or in
 * their head, and then the passage is shown.
 *
 * Pure, like everything else in `src/quiz/`. No database, no clock, no screen.
 */

/** A letter or a number, which is what "the first letter of the word" means. */
const LETTER = /[\p{L}\p{N}]/u

/**
 * One word, reduced to its first letter with its own punctuation kept.
 *
 * `Remove` becomes `R`, `not,` becomes `n,`, `"Lord!"` becomes `"L!"`, and a
 * token with nothing to reduce is returned as it stands.
 */
function scaffoldWord(word: string): string {
  const characters = [...word]
  const from = characters.findIndex((character) => LETTER.test(character))
  if (from === -1) return word

  let to = characters.length - 1
  while (to > from && !LETTER.test(characters[to] ?? '')) to -= 1

  const opening = characters.slice(0, from).join('')
  const closing = to > from ? characters.slice(to + 1).join('') : ''
  return `${opening}${characters[from] ?? ''}${closing}`
}

/**
 * The line as a first-letter scaffold, with its spacing kept exactly.
 *
 * The whitespace between words is the line's own, taken from `clozeTokens`, so a
 * line the corpus wrote across two rows is scaffolded across two rows. That
 * matters more here than anywhere else in the app: the shape on the page is part
 * of what a reciter is remembering.
 */
export function firstLetters(line: string): string {
  return clozeTokens(line)
    .map((token) => `${token.before}${scaffoldWord(token.text)}`)
    .join('')
}

/**
 * The opening few words of a passage, left visible so the reader knows which one
 * they are being asked for. Scope 9.5: "First five words or so visible."
 *
 * Returns the words and what is left, so the caller can draw one and hide the
 * other. The whitespace between the two goes with the hidden half, so nothing is
 * lost and nothing is drawn twice.
 */
export function openingWords(line: string, count: number): { shown: string; hidden: string } {
  const tokens = clozeTokens(line)
  const wanted = Math.max(0, Math.floor(count))
  if (wanted >= tokens.length) return { shown: line, hidden: '' }

  const shown = tokens
    .slice(0, wanted)
    .map((token) => `${token.before}${token.text}`)
    .join('')
  const hidden = tokens
    .slice(wanted)
    .map((token) => `${token.before}${token.text}`)
    .join('')

  return { shown, hidden }
}
