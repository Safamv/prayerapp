import { shuffled } from './random'
import type { QuizLevel } from './types'
import { bareWord, isSameWords, normalise } from '../text/normalise'

/**
 * **Chip cloze: a line with words taken out of it, and a bank of chips to put
 * them back.** Scope 9.3, levels 2 and 3.
 *
 * > Levels 2 to 4 present blanked words as a tappable word bank. Distractors
 * > come free from other words in the same passage.
 *
 * > Chip cloze into a passage you are actively reconstructing is assisted
 * > production, not multiple choice, and it inserts the missing recognition
 * > rung.
 *
 * ## The line is never rebuilt from the chips
 *
 * A chip carries a word with the punctuation taken off both ends, because
 * `Thee,` on a chip would give away where in the line it belongs. The blank it
 * fills is redrawn from **the line's own token**, comma and all. So the reader
 * always ends up looking at the passage exactly as the corpus wrote it, and the
 * chip is only ever a way of pointing at a word.
 *
 * That is also why matching is `isSameWords` and never `===`. The chip says
 * `Thee` and the line says `Thee,`, and a comparison of the two raw strings
 * would mark the right answer wrong. It would look exactly like correct
 * behaviour, which is why CLAUDE.md section 11 asks for a component test here
 * and nowhere else.
 *
 * ## Which words are taken out
 *
 * Two tiers, longer words first. A cloze that blanks `the`, `my` and `of`
 * teaches nothing and reads as a bad crossword, so words of four letters or more
 * are drawn on first and three-letter words are only reached when a short line
 * has nothing else to offer. Below three letters a word is never taken out.
 *
 * **Never two blanks side by side.** Two adjacent holes stop being a cloze: the
 * scaffolding either side of a missing word is the whole of what makes this
 * assisted production rather than the recall cliff scope 9.2 describes.
 *
 * **Never every word.** A line with nothing left standing is level 6 arriving
 * four rungs early.
 */

/** A word of the line, with the whitespace that came before it. */
export interface ClozeToken {
  readonly text: string
  /** Kept exactly, so a line broken across two rows is drawn as it was written. */
  readonly before: string
}

export interface ClozeBlank {
  /** Which token of the line is missing. */
  readonly tokenIndex: number
  /** That token, punctuation and all. What the blank fills in with. */
  readonly token: string
}

export interface ClozeChip {
  readonly id: string
  /** The word as it is drawn: no punctuation at either end. */
  readonly word: string
}

export interface Cloze {
  readonly tokens: readonly ClozeToken[]
  /** In the order they appear in the line. */
  readonly blanks: readonly ClozeBlank[]
  /** The answers and the distractors together, shuffled. */
  readonly chips: readonly ClozeChip[]
}

/** Scope 9.1: "~15% blanked" at level 2 and "~40%" at level 3. */
const BLANKED_FRACTION: Readonly<Record<number, number>> = Object.freeze({ 2: 0.15, 3: 0.4 })

/** A word of four letters or more is drawn on first; three is the floor. */
const PREFERRED_LETTERS = 4
const MINIMUM_LETTERS = 3

/** A line of one word has nowhere to hide anything. */
const MINIMUM_TOKENS = 2

/** Enough chips that the bank is not simply the answers in a different order. */
const MINIMUM_DISTRACTORS = 2
const MAXIMUM_DISTRACTORS = 5

/** The words of a line, with the whitespace between them kept. */
export function clozeTokens(line: string): readonly ClozeToken[] {
  const tokens: ClozeToken[] = []
  let before = ''

  for (const part of line.split(/(\s+)/)) {
    if (part === '') continue
    if (/^\s+$/.test(part)) {
      before += part
      continue
    }
    tokens.push({ text: part, before })
    before = ''
  }

  return tokens
}

/** How many letters a token has, once folded. `All-Merciful` counts eleven. */
function letterCount(token: string): number {
  return normalise(token).replace(/ /g, '').length
}

/**
 * Whether words can be taken out of this line at all.
 *
 * Read by `servedLevel`, which sends a line that cannot be clozed back to level
 * 1 rather than drawing an empty puzzle. A one-word line and a line of nothing
 * but a dash both land here.
 */
export function canCloze(line: string): boolean {
  const tokens = clozeTokens(line)
  if (tokens.length < MINIMUM_TOKENS) return false
  return tokens.some((token) => letterCount(token.text) >= MINIMUM_LETTERS)
}

/** How many words this level would take out of a line of this many words. */
function blankCount(tokenCount: number, level: QuizLevel): number {
  const fraction = BLANKED_FRACTION[level] ?? 0
  const wanted = Math.max(1, Math.round(tokenCount * fraction))
  // Never every word: something has to be left standing to reconstruct against.
  return Math.min(wanted, tokenCount - 1)
}

/**
 * The token indices to blank: longer words first, never two side by side, and
 * always in the order they appear in the line once chosen.
 */
function chooseBlanks(
  tokens: readonly ClozeToken[],
  level: QuizLevel,
  seed: string,
): readonly number[] {
  const wanted = blankCount(tokens.length, level)
  if (wanted <= 0) return []

  const indices = tokens.map((_token, index) => index)
  const preferred = indices.filter(
    (index) => letterCount(tokens[index]?.text ?? '') >= PREFERRED_LETTERS,
  )
  const short = indices.filter((index) => {
    const letters = letterCount(tokens[index]?.text ?? '')
    return letters >= MINIMUM_LETTERS && letters < PREFERRED_LETTERS
  })

  const chosen = new Set<number>()
  for (const index of [
    ...shuffled(preferred, `${seed}:long`),
    ...shuffled(short, `${seed}:short`),
  ]) {
    if (chosen.size >= wanted) break
    if (chosen.has(index - 1) || chosen.has(index + 1)) continue
    chosen.add(index)
  }

  return [...chosen].sort((a, b) => a - b)
}

/**
 * The distractors: words from elsewhere in the same passage that are not among
 * the answers. Scope 9.3 - "distractors come free from other words in the same
 * passage" - so nothing is invented and nothing is fetched.
 *
 * A single-line passage has no elsewhere, so it falls back to the words of the
 * line that were left standing. A passage with neither gets a bank of answers
 * alone, which is honest: there is nothing else in the text to offer.
 */
function chooseDistractors(
  answers: readonly string[],
  standing: readonly string[],
  otherLines: readonly string[],
  seed: string,
): readonly string[] {
  const wanted = Math.min(
    MAXIMUM_DISTRACTORS,
    Math.max(MINIMUM_DISTRACTORS, Math.ceil(answers.length / 2)),
  )

  const taken = new Set(answers.map((word) => normalise(word)))
  const pool: string[] = []

  const consider = (source: readonly string[]) => {
    for (const line of source) {
      for (const token of clozeTokens(line)) {
        const word = bareWord(token.text)
        const folded = normalise(word)
        if (folded === '' || folded.replace(/ /g, '').length < MINIMUM_LETTERS) continue
        if (taken.has(folded)) continue
        taken.add(folded)
        pool.push(word)
      }
    }
  }

  consider(otherLines)
  if (pool.length === 0) consider([standing.join(' ')])

  return shuffled(pool, `${seed}:distractors`).slice(0, wanted)
}

/**
 * Builds one chip cloze. Pure: the same line at the same level with the same
 * seed gives the same puzzle, on any device, on any render.
 */
export function buildCloze(input: {
  readonly line: string
  /** The other lines of the same passage, for the distractors. */
  readonly otherLines: readonly string[]
  readonly level: QuizLevel
  /** Usually the segment id and the level, so no two lines share a puzzle. */
  readonly seed: string
}): Cloze {
  const tokens = clozeTokens(input.line)
  const blanked = chooseBlanks(tokens, input.level, input.seed)

  const blanks: ClozeBlank[] = blanked.map((tokenIndex) => ({
    tokenIndex,
    token: tokens[tokenIndex]?.text ?? '',
  }))

  const answers = blanks.map((blank) => bareWord(blank.token)).filter((word) => word !== '')
  const standing = tokens
    .filter((_token, index) => !blanked.includes(index))
    .map((token) => bareWord(token.text))
    .filter((word) => word !== '')

  const distractors = chooseDistractors(answers, standing, input.otherLines, input.seed)

  const chips = shuffled([...answers, ...distractors], `${input.seed}:bank`).map((word, index) => ({
    id: `chip-${String(index)}`,
    word,
  }))

  return { tokens, blanks, chips }
}

/**
 * Whether this chip is the word this blank is missing.
 *
 * **The one comparison this whole session turns on.** It is normalised on both
 * sides, so `Thee` fills `Thee,`, `lord` fills `“Lord!”` and `Bahai` fills
 * `Bahá’í`. See `src/text/normalise.ts`.
 */
export function chipFills(chip: ClozeChip, blank: ClozeBlank): boolean {
  return isSameWords(chip.word, blank.token)
}
