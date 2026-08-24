/**
 * The character set a self-hosted font must cover (design-tokens 8.1): Latin,
 * plus the diacritics the corpus actually uses.
 *
 * Design-tokens 8.1 names a specific diacritic list, but checking it against
 * the real, fetched corpus text found it incomplete (decision D3.6): the
 * corpus also uses Á, Í, ḍ and Ṣ, none of which the document lists, plus
 * ordinary typographic punctuation (en and em dash, curly quotes, an
 * ellipsis, a non-breaking hyphen) that "Latin" implies without spelling out.
 * Subsetting to the document's literal list alone would leave those
 * characters with no glyph, so words containing them — which, for the curly
 * apostrophe in "Bahá'u'lláh", is a large fraction of the corpus — would
 * silently fall back to the system serif for that one character.
 *
 * So the actual subset `fetch-fonts.ts` cuts is the union of this base set
 * and whatever the committed corpus is found to contain when the script
 * runs: self-correcting if the corpus ever changes, rather than a
 * hand-maintained list that silently goes stale.
 */

/** Space through tilde: the printable ASCII range. */
const BASIC_LATIN = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) =>
  String.fromCharCode(0x20 + i),
).join('')

/** design-tokens 8.1's own list, verbatim: á í ú ḥ Ḥ ṭ Ṭ ṣ ẓ. */
const DECLARED_DIACRITICS = 'áíúḥḤṭṬṣẓ'

/**
 * The uppercase counterpart of every accented letter above, whether or not the
 * corpus happens to contain it in that case.
 *
 * The caps slot renders an author or a work's name in capitals (design-tokens
 * 2.3), and those names are data rather than literals, so the app uppercases
 * them at render time. `Súrih of the Pen` becomes `SÚRIH OF THE PEN`, and Ú
 * appears nowhere in the corpus in that case, so a subset built only from what
 * the corpus contains would have no glyph for it: one letter of one attribution
 * line silently falling back to the system serif. That is decision D3.6's bug
 * again, one case-fold further on, so the fix is the same one — widen the base
 * set rather than wait for the corpus to prove each character.
 *
 * `src/data/attribution.test.ts` holds the matching guarantee from the app's
 * side: nothing the app uppercases may fall outside this subset.
 */
const UPPERCASE_DIACRITICS = DECLARED_DIACRITICS.toLocaleUpperCase('en-AU')

/** Typographic punctuation "Latin" implies but design-tokens 8.1 does not spell out. */
const TYPOGRAPHIC_PUNCTUATION = '–—‘’“”…‑'

/**
 * Two marks the app writes itself and the corpus never contains.
 *
 * The middle dot separates an author from a work on every passage row and in
 * every attribution block (design-tokens 5.4), and the copyright sign opens the
 * notice principle 7.10 requires on every reading view. Neither is printable
 * ASCII and neither appears anywhere in the fetched text, so a subset built only
 * from the corpus has no glyph for either — and the symptom would have been the
 * two most-repeated characters in the app, on every screen, silently set in the
 * system serif. Found by `src/strings/attribution.test.ts`, which exists to
 * catch exactly this.
 */
const APP_PUNCTUATION = '·©'

/**
 * The fleuron, design-tokens 3: `❦` (U+2766), 15px, `accent-md`, centred. It
 * closes the passage on every reading view (design-tokens 5.4 step 6).
 *
 * Cormorant draws it, so it is subset in and set in the same face as the text
 * above it. Left out, the one ornament in the app would be whatever the phone
 * happened to have, which on some Android builds is nothing at all.
 */
const ORNAMENTS = '❦'

export const BASE_CHARSET =
  BASIC_LATIN +
  DECLARED_DIACRITICS +
  UPPERCASE_DIACRITICS +
  TYPOGRAPHIC_PUNCTUATION +
  APP_PUNCTUATION +
  ORNAMENTS

/** Every distinct character across the base set and the given strings, as one string. */
export function collectCharset(texts: readonly string[]): string {
  const seen = new Set<string>()
  for (const char of BASE_CHARSET) seen.add(char)
  for (const text of texts) {
    for (const char of text) seen.add(char)
  }
  return [...seen].join('')
}
