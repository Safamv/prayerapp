/**
 * The typeface registry. Design-tokens 2.1.
 *
 * Every piece of text in this app sits in one of three slots: **display**,
 * **body** or **caps**. A typeface option supplies a family for each slot plus
 * three optical scalars, so that all seven options sit at the same apparent size
 * when given the same nominal size.
 *
 * **All seven are defined here from this session**, per design-tokens 2.1 and
 * scope 12.3. Only Italiana ships in V0; the picker UI and the six other font
 * loads are `[v0.1]`. Defining them now is what makes the picker a screen
 * rather than a refactor.
 *
 * ## The families are named here and nowhere else
 *
 * CLAUDE.md rule 2 and design-tokens 8.4: a component never names a font family.
 * It uses `var(--family-display)`, `var(--family-body)` or `var(--family-caps)`,
 * and this registry decides what those resolve to.
 *
 * ## Why the stacks already name fonts nobody has yet
 *
 * The real font files arrive in session 3, which fetches them from Google Fonts
 * and subsets them (decision D1.8, design-tokens 8.1). Until the `@font-face`
 * rules exist, a browser asked for "Italiana" simply falls through to the next
 * family in the stack, which is `SYSTEM_SERIF`. So the app renders in a system
 * serif today and in Italiana the moment session 3 lands, **with no code change
 * here at all**. That is the intended behaviour, not a placeholder to remember
 * to remove.
 */

/**
 * The fallback behind every stack. Georgia and Times are on effectively every
 * device the app will meet, and both are old-style serifs, so the layout does
 * not jump when the real face loads.
 */
const SYSTEM_SERIF = "Georgia, 'Times New Roman', Times, serif"

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
   * Whether the font files are in the repository yet. Only Italiana is true in
   * V0. Session 3 sets Cormorant's; the `[v0.1]` picker offers only the shipped
   * ones, so a user can never select a face that would render as a fallback.
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
    shipped: false,
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
    shipped: false,
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
    shipped: false,
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
    shipped: false,
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
    shipped: false,
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
    shipped: false,
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

/** The value of `--family-<slot>`: the chosen face, then the system serif behind it. */
export function fontStack(typeface: Typeface, name: TypeSlot): string {
  const family = typeface[name].family
  const quoted = family.includes(' ') ? `'${family}'` : family
  return `${quoted}, ${SYSTEM_SERIF}`
}

/** The optical scalar for a slot. Design-tokens 2.1's `ds`, `bs` and `cs`. */
export function opticalScalar(typeface: Typeface, name: TypeSlot): number {
  return name === 'display' ? typeface.ds : name === 'body' ? typeface.bs : typeface.cs
}
