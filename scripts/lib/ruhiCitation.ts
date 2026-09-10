/**
 * **Who wrote a quotation, and what it comes from.** Principle 7.10, scope 4.3.
 *
 * > Every text is attributed, always. Every surface that renders a passage
 * > renders its attribution.
 *
 * A quotation from the devotional corpus arrives with an author and a source
 * work already on it, because the feed supplies both. A Ruhi quotation arrives
 * as one line of prose written by a curator:
 *
 * ```
 * Bahá'u'lláh, cited by Shoghi Effendi, *The Advent of Divine Justice*
 * (Wilmette: Bahá'í Publishing Trust, 2006, 2018 printing), par. 39, pp. 36–37.
 * ```
 *
 * Somebody has to turn that into two columns, and it has to be right 344 times,
 * because principle 7.10 admits no exception and a wrongly attributed passage of
 * scripture is the worst thing this app could put on a screen.
 *
 * ## The rule: a table, and a build that fails rather than guesses
 *
 * The works are a closed set - thirty nine of them across the three books - so
 * they are listed below with the author each one carries, and a citation is
 * resolved by finding which of them it names. **Anything this module cannot
 * resolve stops the build with the citation printed**, in the same spirit as
 * `refuseBooks` in `scripts/fetch-corpus.ts`. A missing work is then a five
 * minute edit to a table rather than a passage quietly attributed to nobody.
 *
 * The alternative was a general-purpose citation parser. It would have been
 * shorter to write and impossible to trust: the three files use italics for a
 * title in Books 1 and 3 and plain text in Book 2, put the author before the
 * work in some citations and inside it in others, and cite fifteen compilations
 * whose author is not the compiler. A parser that got 340 of 344 right would
 * look exactly like one that got all of them right.
 *
 * ## Ibid.
 *
 * The curation resolved every "Ibid." chain and wrote the resolution into an
 * italic note (decision D11.7). Twenty nine citations still open with the word,
 * and each carries `*(Ibid. resolved to ...)*` after it. Those are read from the
 * note; where the note names a work but no author - two of them do - the entry
 * inherits the author from the entry above it, which is what Ibid. means.
 */

/**
 * The three authors the corpus already knows, spelled exactly as it spells them,
 * plus the two institutional voices the Ruhi books cite and the corpus does not.
 *
 * The spelling matters more than it looks: `passageAttribution` folds these to
 * capitals for every row and every screen, and two spellings of Bahá'u'lláh in
 * one list is the kind of thing nobody notices until it is everywhere.
 */
const BAHAULLAH = "Bahá'u'lláh"
const ABDUL_BAHA = "'Abdu'l-Bahá"
const THE_BAB = 'The Báb'
const SHOGHI_EFFENDI = 'Shoghi Effendi'
const THE_HOUSE = 'The Universal House of Justice'

/** The names a citation may open with, longest first so no prefix shadows another. */
const NAMED_AUTHORS: readonly string[] = [ABDUL_BAHA, BAHAULLAH, SHOGHI_EFFENDI, THE_BAB]

/**
 * Every work the three books cite, with the author of the words rather than the
 * compiler of the volume.
 *
 * **Order matters.** A citation is searched for the first of these it contains,
 * longest title first, so that "The Promulgation of Universal Peace: Talks
 * Delivered by..." and its short form both resolve to the same work, and so that
 * "Bahá'u'lláh and the New Era" is not swallowed by a shorter title inside it.
 *
 * `author: null` marks a compilation drawing on several authors - the
 * Compilation of Compilations, Bahá'í Prayers, Lights of Guidance and the rest.
 * Those citations always name their author themselves, and a `null` here is what
 * makes the build fail if one ever does not.
 */
interface KnownWork {
  /** The title as it should be shown, which is the title without its subtitle. */
  readonly title: string
  /** The author of the words. `null` where the volume is a compilation. */
  readonly author: string | null
  /** Extra spellings the three files use for the same work. */
  readonly alsoWritten?: readonly string[]
}

const KNOWN_WORKS: readonly KnownWork[] = [
  { title: 'Gleanings from the Writings of Bahá’u’lláh', author: BAHAULLAH },
  { title: "Gleanings from the Writings of Bahá'u'lláh", author: BAHAULLAH },
  { title: "Tablets of Bahá'u'lláh Revealed after the Kitáb-i-Aqdas", author: BAHAULLAH },
  { title: "Selections from the Writings of 'Abdu'l-Bahá", author: ABDUL_BAHA },
  { title: 'The Call of the Divine Beloved', author: BAHAULLAH },
  { title: 'The Summons of the Lord of Hosts', author: BAHAULLAH },
  { title: 'Epistle to the Son of the Wolf', author: BAHAULLAH },
  { title: 'The Kitáb-i-Íqán', author: BAHAULLAH },
  { title: 'The Kitáb-i-Aqdas', author: BAHAULLAH },
  { title: 'The Hidden Words', author: BAHAULLAH },
  { title: 'The Promulgation of Universal Peace', author: ABDUL_BAHA },
  { title: 'Paris Talks', author: ABDUL_BAHA },
  { title: 'Some Answered Questions', author: ABDUL_BAHA },
  { title: 'The Secret of Divine Civilization', author: ABDUL_BAHA },
  { title: 'Tablets of the Divine Plan', author: ABDUL_BAHA },
  { title: 'Tablets of Abdul-Baha Abbas', author: ABDUL_BAHA },
  { title: 'Abdul Baha on Divine Philosophy', author: ABDUL_BAHA },
  { title: "Will and Testament of 'Abdu'l-Bahá", author: ABDUL_BAHA },
  { title: 'The Tabernacle of Unity', author: BAHAULLAH },
  { title: 'Days of Remembrance', author: BAHAULLAH },
  { title: 'The Advent of Divine Justice', author: SHOGHI_EFFENDI },
  { title: 'The Promised Day Is Come', author: SHOGHI_EFFENDI },
  { title: "The World Order of Bahá'u'lláh", author: SHOGHI_EFFENDI },
  { title: 'Messages from the Universal House of Justice', author: THE_HOUSE },
  { title: 'Framework for Action', author: THE_HOUSE },
  // Compilations. Each of these draws on more than one author, so the citation
  // has to name one and the build fails if it does not.
  { title: "Bahá'í Prayers and Tablets for Children", author: null },
  { title: "Bahá'í Prayers", author: null },
  { title: "Bahá'í Meetings", author: null },
  { title: "Bahá'í News", author: null },
  { title: "The Bahá'í World", author: null },
  { title: 'Prayer and Devotional Life', author: null },
  { title: 'The Compilation of Compilations', author: null },
  { title: 'Lights of Guidance', author: null },
  { title: 'Star of the West', author: null },
  { title: 'Social Action', author: null },
  { title: 'Excellence in All Things', author: null },
  { title: 'Trustworthiness', author: null },
  { title: "Ḥuqúqu'lláh", author: null },
  { title: 'Women: Extracts from the Writings', author: null, alsoWritten: ['*Women*'] },
  { title: "Bahá'u'lláh and the New Era", author: null },
]

/**
 * Where a quotation comes from when it was never published in a book.
 *
 * Five citations name a document rather than a volume: a Tablet, a letter
 * written on behalf of Shoghi Effendi or of the House of Justice. Principle 7.10
 * still wants a source beside the author, so the kind of document stands in for
 * the work. `'ABDU'L-BAHÁ · TABLET` is true, short, and better than the
 * collection name the attribution would otherwise fall back to.
 */
const DOCUMENT_KINDS: readonly { readonly pattern: RegExp; readonly work: string }[] = [
  { pattern: /^From a Tablet of/i, work: 'Tablet' },
  { pattern: /^From a letter/i, work: 'Letter' },
  { pattern: /^From a message/i, work: 'Message' },
  { pattern: /^From a talk/i, work: 'Talk' },
]

export interface ResolvedCitation {
  readonly author: string
  readonly sourceWork: string
}

/** Strips the curator's own bracketed notes, which are about the citation, not in it. */
function withoutNotes(citation: string): string {
  return citation
    .replace(/\*\([^*]*\)\*/g, ' ')
    .replace(/\(same source as above[^)]*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * What the curation resolved an `Ibid.` to, or `null` where the citation carries
 * no such note.
 *
 * The note is looked for anywhere in the citation rather than only after a
 * leading "Ibid.", because one entry writes the author first and the word after
 * it: `'Abdu'l-Bahá, ibid., p. 29. *(ibid. resolved to Bahá'í Prayers.)*`.
 *
 * A citation that opens with the word and carries no note stops the build. A
 * silently unresolved Ibid. is a passage attributed to whatever happened to sit
 * above it in a file, which is the one failure that would look like success.
 */
function resolutionNote(citation: string): string | null {
  const note = /\*\(\s*ibid\.?\s*resolved to:?\s*([^*]*?)\)\*/i.exec(citation)
  if (note?.[1] !== undefined) return note[1].trim()
  if (/^Ibid/i.test(citation.trim())) {
    throw new Error(
      `A Ruhi citation is an unresolved "Ibid." with no resolution note: ${citation}. ` +
        `The curation resolves every Ibid. chain (D11.7); this one needs correcting at source.`,
    )
  }
  return null
}

function workIn(citation: string): KnownWork | null {
  let found: KnownWork | null = null
  let at = Number.POSITIVE_INFINITY
  for (const work of KNOWN_WORKS) {
    for (const spelling of [work.title, ...(work.alsoWritten ?? [])]) {
      const index = citation.indexOf(spelling)
      if (index !== -1 && index < at) {
        found = work
        at = index
      }
    }
  }
  return found
}

/**
 * The author a citation names outright, or `null` where it names none and the
 * work has to supply one.
 *
 * The shapes the three files use, in the order they have to be tried: a letter
 * or message written on behalf of somebody, a message of the House of Justice,
 * and a name at the head of the citation with or without one of four openers in
 * front of it.
 */
function authorIn(citation: string): string | null {
  const onBehalf = /written on behalf of (?:the )?(Universal House of Justice|[^,.]+)/i.exec(
    citation,
  )
  if (onBehalf?.[1] !== undefined) {
    const named = onBehalf[1].trim()
    if (/Universal House of Justice/i.test(named)) return THE_HOUSE
    const known = NAMED_AUTHORS.find((author) => named.startsWith(author))
    if (known !== undefined) return known
  }
  if (/^From a message of the Universal House of Justice/i.test(citation)) return THE_HOUSE

  for (const author of NAMED_AUTHORS) {
    // A lookahead rather than `\b`: the boundary escape is ASCII-only, and
    // `'Abdu'l-Bahá` ends in a letter JavaScript does not count as a word
    // character, so `\b` never matched the one name that needed it most.
    if (new RegExp(`^${OPENERS}${escaped(author)}(?![\\p{L}])`, 'u').test(citation)) {
      return author
    }
  }
  return null
}

/** The four ways a citation introduces the author before naming them. */
const OPENERS = '(?:Words of |From a Tablet of |From a Tablet revealed by |From a talk given by )?'

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Resolves one citation into an author and a source work.
 *
 * The citation is read first, then its resolution note, then the work's own
 * author, then the entry above. `previous` is that entry - the one before this
 * one in the same file - and is used only to carry an author or a work across an
 * `Ibid.` whose note supplies one and not the other. Pass `null` for the first
 * entry of a file.
 */
export function resolveCitation(
  citation: string,
  previous: ResolvedCitation | null,
): ResolvedCitation {
  const note = resolutionNote(citation)
  const stated = withoutNotes(citation)

  const work = workIn(stated) ?? (note === null ? null : workIn(note))
  const author =
    authorIn(stated) ??
    (note === null ? null : authorIn(note)) ??
    work?.author ??
    (note === null ? null : (previous?.author ?? null))

  if (author === null) {
    throw new Error(
      `A Ruhi citation names no author this loader can resolve: ${citation}\n` +
        `Principle 7.10 admits no exception, so the build stops here. Add the work to ` +
        `KNOWN_WORKS in scripts/lib/ruhiCitation.ts, or give it a named author.`,
    )
  }

  if (work !== null) return { author, sourceWork: work.title }

  const kind = DOCUMENT_KINDS.find((candidate) => candidate.pattern.test(stated))
  if (kind !== undefined) return { author, sourceWork: kind.work }

  if (note !== null && previous !== null) return { author, sourceWork: previous.sourceWork }

  throw new Error(
    `A Ruhi citation names no source work this loader knows: ${citation}\n` +
      `Add it to KNOWN_WORKS in scripts/lib/ruhiCitation.ts.`,
  )
}

/** Every work the table knows, for the test that keeps the two in step. */
export const KNOWN_WORK_TITLES: readonly string[] = KNOWN_WORKS.map((work) => work.title)
