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

/** Typographic punctuation "Latin" implies but design-tokens 8.1 does not spell out. */
const TYPOGRAPHIC_PUNCTUATION = '–—‘’“”…‑'

export const BASE_CHARSET = BASIC_LATIN + DECLARED_DIACRITICS + TYPOGRAPHIC_PUNCTUATION

/** Every distinct character across the base set and the given strings, as one string. */
export function collectCharset(texts: readonly string[]): string {
  const seen = new Set<string>()
  for (const char of BASE_CHARSET) seen.add(char)
  for (const text of texts) {
    for (const char of text) seen.add(char)
  }
  return [...seen].join('')
}
