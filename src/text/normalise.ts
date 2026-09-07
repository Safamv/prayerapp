/**
 * **Normalisation.** Scope 9.7.
 *
 * > Lowercase, punctuation stripped, whitespace collapsed, diacritics folded.
 * > Retained because search requires it (6.3) and chip matching uses it.
 *
 * One pure function, no database, no React, no clock. CLAUDE.md section 11
 * names normalisation as mandatory-unit-tested beside the scheduler and
 * segmentation, for the same reason: a silent bug here does not announce itself,
 * it just marks a right answer wrong once in a while.
 *
 * It was deferred twice, in sessions 3 and 5, and decision D5.5 says why: it had
 * no caller, and a tested pure function with no caller is tested against
 * guesses. It has one now. `src/quiz/cloze.ts` decides whether the word you
 * tapped is the word that was taken out, and that comparison is this file.
 *
 * ## The two marks the corpus decides, rather than taste
 *
 * The scope's four words leave one real question: what a hyphen and an
 * apostrophe each become. The committed corpus answers it. Counted across all
 * 975 passages there are **2,266 hyphens inside a word** - `All-Merciful`,
 * `loving-kindness`, `glad-tidings` - against 21 used as dashes, and **432
 * apostrophes, every one of them inside a word**: `God's`, `Bahá’u’lláh`,
 * `‘Abdu’l-Bahá`.
 *
 * So the two are treated differently, and they have to be.
 *
 * | Mark | Becomes | Because |
 * |---|---|---|
 * | apostrophe | nothing | `Bahá’í` folds to `bahai`, which is the only spelling a search box will ever be given |
 * | everything else | a space | `All-Merciful` folds to `all merciful`, findable as one word or two |
 *
 * Stripping both to nothing would give `allmerciful`, which nobody types.
 * Turning both into spaces would give `baha i`, which nobody types either.
 *
 * The one known cost: `all-glorious` and `allglorious` are not the same string
 * here. No passage writes the second, so nothing in V0 meets it.
 *
 * ## Diacritics
 *
 * Folded by decomposing to NFD and deleting the combining marks. That covers
 * `á í ú ṭ ḥ ṣ ḍ ẓ` and everything else the transliteration uses, without a
 * lookup table anybody has to keep complete. Format characters go the same way:
 * the corpus carries one stray left-to-right mark, which is invisible on screen
 * and would otherwise be a character inside a word.
 *
 * ## What this is not
 *
 * It is not search. Scope 6.3 is `[v1.0]`, and this file exists in the shape
 * search will need rather than in the shape only chip matching would have
 * needed, because writing it twice is how the two come to disagree about whether
 * `Bahá’í` and `Bahai` are the same word.
 */

/**
 * NFD splits a letter from its accents, so the accents are a category of their
 * own and can simply be deleted. `\p{Cf}` are the invisible format characters.
 */
const MARKS = /[\p{M}\p{Cf}]/gu

/**
 * Every apostrophe the corpus uses, plus the two Unicode letter-modifier forms
 * that a pasted transliteration can arrive as. The last two are letters as far
 * as Unicode is concerned, so the rule below would keep them.
 */
const APOSTROPHES = /['‘’ʻʼ`´]/gu

/** Anything that is not a letter or a number, in runs, which collapses whitespace too. */
const NOT_WORD = /[^\p{L}\p{N}]+/gu

/**
 * The normalised form of a piece of text: lowercase, unaccented, stripped of
 * punctuation, single-spaced, with no space at either end.
 *
 * Applying it twice gives the same answer as applying it once, which is what
 * makes it safe to normalise something already normalised.
 */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(MARKS, '')
    .replace(APOSTROPHES, '')
    .replace(NOT_WORD, ' ')
    .trim()
    .toLowerCase()
}

/** The words of a piece of text, normalised. Empty for text with no words in it. */
export function normalisedWords(text: string): readonly string[] {
  const normalised = normalise(text)
  return normalised === '' ? [] : normalised.split(' ')
}

/**
 * Whether two pieces of text are the same words.
 *
 * **This is the comparison chip matching is built on**, and the reason it is a
 * named function rather than two calls and an `===` at the call site: the chip
 * you tap reads `Thee` and the word taken out of the line was `Thee,` with its
 * comma, and one careless comparison of the raw strings looks exactly like
 * correct behaviour until the day it does not.
 *
 * Two pieces of text with no words in them are not the same word. A chip that
 * normalises to nothing has nothing to match.
 */
export function isSameWords(a: string, b: string): boolean {
  const left = normalise(a)
  return left !== '' && left === normalise(b)
}

/**
 * A word with its leading and trailing punctuation taken off, and everything
 * inside it left exactly as it was.
 *
 * This is what a chip carries. `Thee,` becomes `Thee`, `“Lord!”` becomes `Lord`,
 * and `All-Merciful.` becomes `All-Merciful` with its hyphen and its capitals
 * intact, because a chip is a word of scripture and not a normalised token. The
 * blank it fills is redrawn from the line's own text, punctuation and all, so
 * nothing the reader ends up looking at has been through this function.
 */
export function bareWord(word: string): string {
  const from = [...word].findIndex((character) => /[\p{L}\p{N}]/u.test(character))
  if (from === -1) return ''
  const characters = [...word]
  let to = characters.length - 1
  while (to > from && !/[\p{L}\p{N}]/u.test(characters[to] ?? '')) to -= 1
  return characters.slice(from, to + 1).join('')
}
