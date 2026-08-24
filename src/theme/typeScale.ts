import { opticalScalar, type TypeSlot, type Typeface } from './typefaces'

/**
 * The type scale. Design-tokens 2.2 and 2.4.
 *
 * ## The formula
 *
 * `computed = base × opticalScalar × userTextScale`, clamped per role.
 *
 * ## Where the clamp is applied, and why it matters
 *
 * The obvious reading of "clamp per role" is to bound the final pixel value.
 * That would be wrong, and quietly so. The optical scalar exists to make all
 * seven typefaces sit at the **same apparent size**; Tangerine's display scalar
 * of 1.5 is not the user asking for larger text, it is the face being visually
 * smaller at the same nominal size. A pixel clamp would undo that and make
 * Tangerine's titles smaller than everyone else's.
 *
 * So the clamp bounds the **user's** scale, per role, and the optical scalar is
 * always applied in full:
 *
 * ```
 * effective = clamp(userTextScale, role.minScale, role.maxScale)
 * computed  = base × opticalScalar × effective
 * ```
 *
 * Design-tokens 2.4 rule 3 then falls out of the numbers rather than out of a
 * special case: body roles carry the full range up to `TEXT_SCALE_MAX`, display
 * roles stop at `DISPLAY_MAX_SCALE`, so display type is clipped first and the
 * body text the accessibility requirement actually exists to serve is not.
 */

/**
 * Scope 7.9 requires a genuinely large maximum. 1.75 puts the 20px passage body
 * at 35px, which is roughly the largest iOS accessibility step, and the smallest
 * step is a mild reduction rather than a second accessibility feature.
 */
export const TEXT_SCALE_MIN = 0.9
export const TEXT_SCALE_MAX = 1.75
export const DEFAULT_TEXT_SCALE = 1

/** The steps the settings control offers. The stored value is the multiplier itself. */
export const TEXT_SCALE_STEPS: readonly number[] = Object.freeze([0.9, 1, 1.15, 1.3, 1.5, 1.75])

/** Display type is clipped first (design-tokens 2.4 rule 3). */
const DISPLAY_MAX_SCALE = 1.25
/** Caps sit between the two: they are labels, but they are also tracked wide. */
const CAPS_MAX_SCALE = 1.4

export interface TypeRole {
  /** The nominal size in pixels, before any scalar. Design-tokens 2.2. */
  readonly base: number
  readonly slot: TypeSlot
  /** A CSS `letter-spacing` value, or `null` where the table leaves it blank. */
  readonly tracking: string | null
  /** A unitless CSS `line-height`, or `null` where the table leaves it blank. */
  readonly lineHeight: number | null
  readonly italic?: true
}

/**
 * Design-tokens 2.2, transcribed. The keys are what a component asks for, so
 * `typeStyle('passageBody')` is checked by the compiler and a role that does not
 * exist is a build error rather than an unstyled paragraph.
 */
export const TYPE_ROLES = {
  screenTitle: { base: 42, slot: 'display', tracking: '.01em', lineHeight: 1.02 },
  readingTitle: { base: 40, slot: 'display', tracking: '.01em', lineHeight: 1.04 },
  settingsTitle: { base: 25, slot: 'display', tracking: '.01em', lineHeight: null },
  dropCap: { base: 64, slot: 'display', tracking: null, lineHeight: 0.82 },
  passageBody: { base: 20, slot: 'body', tracking: null, lineHeight: 1.58 },
  listRowTitle: { base: 20, slot: 'body', tracking: null, lineHeight: 1.25 },
  bylineItalic: { base: 16.5, slot: 'body', tracking: null, lineHeight: null, italic: true },
  searchPlaceholder: { base: 15.5, slot: 'body', tracking: null, lineHeight: null },
  settingsRowLabel: { base: 19, slot: 'body', tracking: null, lineHeight: null },
  eyebrowList: { base: 9.5, slot: 'caps', tracking: '.28em', lineHeight: null },
  eyebrowReading: { base: 9.5, slot: 'caps', tracking: '.3em', lineHeight: null },
  sectionHeader: { base: 9, slot: 'caps', tracking: '.26em', lineHeight: null },
  rowAttribution: { base: 8.5, slot: 'caps', tracking: '.16em', lineHeight: null },
  tabLabel: { base: 8.5, slot: 'caps', tracking: '.18em', lineHeight: null },
  attribution: { base: 8.5, slot: 'caps', tracking: '.16em', lineHeight: 1.9 },
  primaryButtonLabel: { base: 10.5, slot: 'caps', tracking: '.24em', lineHeight: null },
  secondaryButtonLabel: { base: 9.5, slot: 'caps', tracking: '.22em', lineHeight: null },
  settingsRowCaption: { base: 13, slot: 'body', tracking: null, lineHeight: null },
} as const satisfies Record<string, TypeRole>

export type TypeRoleName = keyof typeof TYPE_ROLES

export const TYPE_ROLE_NAMES = Object.keys(TYPE_ROLES) as TypeRoleName[]

/** The upper bound on the user's text scale for a slot. See the note above. */
function maxScaleFor(slot: TypeSlot): number {
  if (slot === 'display') return DISPLAY_MAX_SCALE
  if (slot === 'caps') return CAPS_MAX_SCALE
  return TEXT_SCALE_MAX
}

export function clampTextScale(scale: number): number {
  if (!Number.isFinite(scale)) return DEFAULT_TEXT_SCALE
  return Math.min(TEXT_SCALE_MAX, Math.max(TEXT_SCALE_MIN, scale))
}

/**
 * The computed pixel size for one role, rounded to two decimals so that the CSS
 * variable does not carry fifteen digits of floating point noise.
 */
export function roleFontSize(role: TypeRole, typeface: Typeface, userTextScale: number): number {
  const requested = clampTextScale(userTextScale)
  const effective = Math.min(maxScaleFor(role.slot), Math.max(TEXT_SCALE_MIN, requested))
  const computed = role.base * opticalScalar(typeface, role.slot) * effective
  return Math.round(computed * 100) / 100
}
