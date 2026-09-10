/**
 * The typeface registry. Design-tokens 2.1.
 *
 * Every piece of text in this app sits in one of three slots: **display**,
 * **body** or **caps**. A typeface option supplies a family for each slot plus
 * three optical scalars, so that all seven options sit at the same apparent size
 * when given the same nominal size.
 *
 * **All seven are defined here**, per design-tokens 2.1 and scope 12.3. Session
 * 2 wrote all seven while only Italiana shipped, which is what made session 13's
 * picker a screen rather than a refactor: the six others needed their font files
 * fetched and `shipped` flipped, and not one line of this table changed.
 *
 * ## The families are named here and nowhere else
 *
 * CLAUDE.md rule 2 and design-tokens 8.4: a component never names a font family.
 * It uses `var(--family-display)`, `var(--family-body)` or `var(--family-caps)`,
 * and this registry decides what those resolve to.
 *
 * ## The font files follow this table, rather than sitting beside it
 *
 * `scripts/fetch-fonts.ts` derives the set of faces it fetches from the three
 * slots below plus the byline italic of design-tokens 2.2, and stops with the
 * face named if it cannot supply one (decision D1.8, design-tokens 8.1). So a
 * face appended here with no source is a failed script, never an option that
 * renders in Georgia on somebody's phone.
 *
 * `SYSTEM_SERIF` remains behind every stack all the same. It is what the browser
 * draws in the moment between the first paint and the woff2 arriving on a cold
 * first run, and both fallbacks are old-style serifs so the layout does not jump.
 */

/**
 * The fallback behind every stack. Georgia and Times are on effectively every
 * device the app will meet, and both are old-style serifs, so the layout does
 * not jump when the real face loads.
 */
const SYSTEM_SERIF = "Georgia, 'Times New Roman', Times, serif"

/**
 * **The coverage face**, which sits between the chosen family and the system
 * serif in every stack. Decision D13.1.
 *
 * Six of the ten families in design-tokens 8.1 were cut without the underdot
 * transliteration marks the writings use - ḥ, Ḥ, ṭ, Ṭ, ṣ, Ṣ, ẓ, ḍ - and without
 * the fleuron `❦` that closes every reading view. Subsetting cannot add a glyph
 * a font never had, so in Bodoni Moda, IM Fell English, Goudy Bookletter 1911,
 * Cinzel Decorative, Tangerine and Italiana those characters have nowhere to go.
 *
 * This is decision D4.7's bug for the third time, and the first time it could
 * not be fixed by widening the subset. Without a face named here, `Ḥusayn` would
 * be set in the app's typeface with one letter of it in Georgia, and the one
 * ornament in the app would be whatever the phone happened to have - which on
 * some Android builds is an empty box.
 *
 * Cormorant is the face because it is complete, it is already subset and
 * committed for the body slot of three options, and it is an old-style serif in
 * the same idiom as everything it stands in for. `scripts/fetch-fonts.ts` fails
 * the build if it ever stops being complete.
 */
const COVERAGE_FACE = 'Cormorant'

export interface TypefaceSlot {
  /** The family name, quoted if it contains a space. */
  readonly family: string
  readonly weight: number
  readonly style: 'normal' | 'italic'
}

export interface Typeface {
  readonly id: string
  /** Shown in the typeface picker, which is `[v0.1]` and not built. */
  readonly name: string
  readonly display: TypefaceSlot
  readonly body: TypefaceSlot
  readonly caps: TypefaceSlot
  /**
   * The three optical scalars of design-tokens 2.1. They exist so that a 42px
   * screen title looks the same size in Tangerine as it does in Italiana,
   * despite Tangerine's much smaller apparent size at the same nominal one.
   */
  readonly ds: number
  readonly bs: number
  readonly cs: number
  /**
   * **The size this face's sample is set at on the picker.** Design-tokens 5.8:
   * "each specimen is set at the size that makes that face read at a comparable
   * weight on the row".
   *
   * These are not the optical scalars and must not be confused with them. A
   * scalar corrects a face's apparent size across the whole app; this is one
   * number for one row, chosen by eye, and the two disagree on purpose:
   * Tangerine's scalar is 1.5 and its specimen is 38px, while Cinzel
   * Decorative's scalar is 0.62 and its specimen is 18px, because a specimen is
   * a sample of letterforms rather than a heading.
   */
  readonly specimenSize: number
  /** Design-tokens 5.8 gives two of the seven a line-height. `null` is `normal`. */
  readonly specimenLineHeight: number | null
  /**
   * Whether every face this option's three slots name is a committed font file.
   *
   * All seven are true from session 13, which fetched the other eight families.
   * The flag stays because it is the guard, not a record: the picker offers only
   * shipped options, so an eighth face appended to this table before its fonts
   * exist is invisible rather than an option that renders in Georgia.
   * `src/theme/fonts.test.ts` fails the build if a face claims `true` and
   * `fonts.css` does not carry a rule for all three of its slots.
   */
  readonly shipped: boolean
}

const slot = (family: string, weight = 400, style: 'normal' | 'italic' = 'normal'): TypefaceSlot =>
  Object.freeze({ family, weight, style })

export const TYPEFACES: readonly Typeface[] = Object.freeze([
  Object.freeze({
    id: 'italiana',
    name: 'Italiana',
    display: slot('Italiana'),
    body: slot('Cormorant'),
    caps: slot('Italiana'),
    ds: 1.0,
    bs: 1.0,
    cs: 1.0,
    specimenSize: 25,
    specimenLineHeight: null,
    shipped: true,
  }),
  Object.freeze({
    id: 'tangerine',
    name: 'Tangerine',
    display: slot('Tangerine', 700),
    body: slot('EB Garamond'),
    caps: slot('EB Garamond'),
    ds: 1.5,
    bs: 0.92,
    cs: 1.05,
    specimenSize: 38,
    specimenLineHeight: 0.9,
    shipped: true,
  }),
  Object.freeze({
    id: 'cormorant-unicase',
    name: 'Cormorant Unicase',
    display: slot('Cormorant Unicase', 600),
    body: slot('Cormorant'),
    caps: slot('Cormorant Unicase'),
    ds: 0.68,
    bs: 1.0,
    cs: 1.05,
    specimenSize: 22,
    specimenLineHeight: null,
    shipped: true,
  }),
  Object.freeze({
    id: 'cormorant-italic',
    name: 'Cormorant italic',
    display: slot('Cormorant', 400, 'italic'),
    body: slot('Cormorant'),
    caps: slot('Cormorant'),
    ds: 1.1,
    bs: 1.0,
    cs: 1.05,
    specimenSize: 30,
    specimenLineHeight: null,
    shipped: true,
  }),
  Object.freeze({
    id: 'im-fell-english',
    name: 'IM Fell English',
    display: slot('IM Fell English'),
    body: slot('IM Fell English'),
    caps: slot('IM Fell English SC'),
    ds: 0.8,
    bs: 0.92,
    cs: 1.12,
    specimenSize: 26,
    specimenLineHeight: null,
    shipped: true,
  }),
  Object.freeze({
    id: 'goudy-1911',
    name: 'Goudy 1911',
    display: slot('Cinzel Decorative'),
    body: slot('Goudy Bookletter 1911'),
    caps: slot('Cinzel Decorative'),
    ds: 0.62,
    bs: 0.95,
    cs: 0.88,
    specimenSize: 18,
    specimenLineHeight: 1.3,
    shipped: true,
  }),
  Object.freeze({
    id: 'bodoni-moda',
    name: 'Bodoni Moda',
    display: slot('Bodoni Moda'),
    body: slot('Bodoni Moda'),
    caps: slot('Bodoni Moda'),
    ds: 0.74,
    bs: 0.9,
    cs: 0.95,
    specimenSize: 23,
    specimenLineHeight: null,
    shipped: true,
  }),
])

/** Design-tokens 2.1 and scope 12.3: V0 ships Italiana only. */
export const DEFAULT_TYPEFACE_ID = 'italiana'

/** The three slot names, which are the only font vocabulary a component knows. */
export const TYPE_SLOTS = ['display', 'body', 'caps'] as const
export type TypeSlot = (typeof TYPE_SLOTS)[number]

export function getTypeface(id: string): Typeface {
  return TYPEFACES.find((typeface) => typeface.id === id) ?? defaultTypeface()
}

export function defaultTypeface(): Typeface {
  const typeface = TYPEFACES.find((entry) => entry.id === DEFAULT_TYPEFACE_ID)
  if (typeface === undefined) throw new Error(`Default typeface ${DEFAULT_TYPEFACE_ID} is missing`)
  return typeface
}

const quote = (family: string): string => (family.includes(' ') ? `'${family}'` : family)

/**
 * The value of `--family-<slot>`: the chosen face, then the coverage face for
 * the handful of characters it may not carry, then the system serif.
 *
 * A browser resolves a font stack **per character**, not per element, so the
 * middle entry costs nothing on any character the chosen face can draw. It is
 * only reached by a ḥ, a ṣ or a fleuron in a face that has none.
 */
export function fontStack(typeface: Typeface, name: TypeSlot): string {
  const family = typeface[name].family
  const stack = family === COVERAGE_FACE ? [quote(family)] : [quote(family), quote(COVERAGE_FACE)]
  return `${stack.join(', ')}, ${SYSTEM_SERIF}`
}

/** The optical scalar for a slot. Design-tokens 2.1's `ds`, `bs` and `cs`. */
export function opticalScalar(typeface: Typeface, name: TypeSlot): number {
  return name === 'display' ? typeface.ds : name === 'body' ? typeface.bs : typeface.cs
}

/**
 * The options the picker may offer: those whose font files are committed.
 *
 * The picker reads this rather than `TYPEFACES`, so an option defined ahead of
 * its fonts - which is exactly what all seven of these were between session 2
 * and session 13 - is simply not on the screen. Design-tokens 8.1's rule that
 * fonts are self-hosted is only kept if there is no way to select a face that
 * has no file.
 */
export function shippedTypefaces(): readonly Typeface[] {
  return TYPEFACES.filter((typeface) => typeface.shipped)
}
