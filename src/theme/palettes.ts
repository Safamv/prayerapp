/**
 * The palettes. Design-tokens sections 1, 1.1 and 1.2.
 *
 * Decision D0.8: a palette is a typed object, and the active one is written onto
 * a single element as CSS custom properties. Components reference variable
 * names and never a colour, which is also enforced by lint (design-tokens 8.4).
 *
 * **Adding an eleventh palette is appending an object to `PALETTES`.** Nothing
 * else changes. And because `PaletteTokens` requires every key, a palette that
 * forgets a colour is a compile error naming the missing token, rather than a
 * screen that ships with an invisible label.
 *
 * The keys are the CSS custom property names with the leading `--` removed, so
 * `field` becomes `--field`. There is no rename table between this file and the
 * stylesheet, because a rename table is a second place for the two to disagree.
 */
export type PaletteTokens = {
  /** Navy or oxblood chrome: headers, primary button. */
  readonly field: string
  /** Tab bar background; list-title ink on paper. */
  readonly deep: string
  /** Old gold: display type on the cloth, active star, button label. */
  readonly accent: string
  /** Bone paper background; icon fill on the cloth. */
  readonly paper: string
  /** Drop cap, active section headers. */
  readonly 'accent-dk': string
  /** Fleuron, second freshness state. */
  readonly 'accent-md': string
  /** Passage body text. */
  readonly ink: string
  /** Byline italic. */
  readonly 'ink-soft': string
  /** Reading-surface eyebrow. */
  readonly label: string
  /** Attribution and copyright. */
  readonly faint: string
  readonly 'grain-a': string
  readonly 'grain-b': string
  readonly sheen: string
  readonly 'sheen-d': string
  /** Search field fill on the cloth. */
  readonly 'field-tint': string
  readonly 'accent-90': string
  readonly 'accent-80': string
  readonly 'accent-34': string
  /** Header label on the cloth. */
  readonly 'on-field-66': string
  /** Placeholder on the cloth. */
  readonly 'on-field-55': string
  /** Inactive tab label. */
  readonly 'on-field-45': string
  /** Row divider. */
  readonly rule: string
  /** Section rule. */
  readonly 'rule-md': string
  /** Secondary button border. */
  readonly 'rule-str': string
  readonly 'on-paper-72': string
  readonly 'on-paper-60': string
  readonly 'on-paper-50': string
  readonly 'on-paper-44': string
  readonly 'on-paper-42': string
  readonly 'on-paper-40': string
  readonly 'on-paper-36': string
  /** Twin rules on the reading surface. */
  readonly hair: string
  readonly 'hair-lt': string
  /** The 0.5px ink bleed on passage body, and nothing else. */
  readonly 'ink-shadow': string
}

export interface Palette {
  readonly id: string
  /** Shown in the palette picker. Not used anywhere in V0's UI yet. */
  readonly name: string
  readonly tokens: PaletteTokens
}

/**
 * Design-tokens 1.1. The gold is constant across both palettes; the cloth and
 * the paper are what change, which is why P2 below is written as a spread of
 * this one with the differences named.
 */
const PARIS_NAVY_TOKENS: PaletteTokens = {
  field: '#1F3A63',
  deep: '#14243D',
  accent: '#C9A961',
  paper: '#F2EAD8',
  'accent-dk': '#8A6B2F',
  'accent-md': '#A8873F',
  ink: '#2A2419',
  'ink-soft': '#7A6A4F',
  label: '#8C7A4E',
  faint: '#A0906C',
  'grain-a': 'rgba(90,70,40,.055)',
  'grain-b': 'rgba(90,70,40,.04)',
  sheen: 'rgba(255,255,255,.035)',
  'sheen-d': 'rgba(0,0,0,.05)',
  'field-tint': 'rgba(242,234,216,.07)',
  'accent-90': 'rgba(201,169,97,.9)',
  'accent-80': 'rgba(201,169,97,.8)',
  'accent-34': 'rgba(201,169,97,.34)',
  'on-field-66': 'rgba(242,234,216,.66)',
  'on-field-55': 'rgba(242,234,216,.55)',
  'on-field-45': 'rgba(242,234,216,.45)',
  rule: 'rgba(31,58,99,.13)',
  'rule-md': 'rgba(31,58,99,.18)',
  'rule-str': 'rgba(31,58,99,.28)',
  'on-paper-72': 'rgba(20,36,61,.72)',
  'on-paper-60': 'rgba(20,36,61,.6)',
  'on-paper-50': 'rgba(20,36,61,.5)',
  'on-paper-44': 'rgba(20,36,61,.44)',
  'on-paper-42': 'rgba(20,36,61,.42)',
  'on-paper-40': 'rgba(20,36,61,.4)',
  'on-paper-36': 'rgba(20,36,61,.36)',
  hair: 'rgba(42,36,25,.26)',
  'hair-lt': 'rgba(42,36,25,.16)',
  'ink-shadow': 'rgba(42,36,25,.35)',
}

/**
 * Design-tokens 1.2. Only the tokens the document lists as differing are
 * overridden. `accent`, `accent-dk`, `accent-md`, `accent-90` and `accent-80`
 * are deliberately absent from this list: the gold is the same in both.
 */
const OXBLOOD_CLOTH_TOKENS: PaletteTokens = {
  ...PARIS_NAVY_TOKENS,
  field: '#5A1F22',
  deep: '#3A1214',
  paper: '#F5EFE2',
  ink: '#2A1B18',
  'ink-soft': '#7A5A50',
  label: '#8C6A56',
  faint: '#A08878',
  'grain-a': 'rgba(105,60,55,.05)',
  'grain-b': 'rgba(105,60,55,.035)',
  sheen: 'rgba(255,255,255,.04)',
  'sheen-d': 'rgba(0,0,0,.06)',
  'field-tint': 'rgba(245,239,226,.08)',
  'accent-34': 'rgba(201,169,97,.36)',
  'on-field-66': 'rgba(245,239,226,.66)',
  'on-field-55': 'rgba(245,239,226,.55)',
  'on-field-45': 'rgba(245,239,226,.45)',
  rule: 'rgba(90,31,34,.15)',
  'rule-md': 'rgba(90,31,34,.2)',
  'rule-str': 'rgba(90,31,34,.3)',
  'on-paper-72': 'rgba(58,18,20,.72)',
  'on-paper-60': 'rgba(58,18,20,.6)',
  'on-paper-50': 'rgba(58,18,20,.5)',
  'on-paper-44': 'rgba(58,18,20,.44)',
  'on-paper-42': 'rgba(58,18,20,.42)',
  'on-paper-40': 'rgba(58,18,20,.4)',
  'on-paper-36': 'rgba(58,18,20,.36)',
  hair: 'rgba(42,27,24,.26)',
  'hair-lt': 'rgba(42,27,24,.16)',
  'ink-shadow': 'rgba(42,27,24,.35)',
}

export const PALETTES: readonly Palette[] = Object.freeze([
  Object.freeze({ id: 'paris-navy', name: 'Paris Navy', tokens: PARIS_NAVY_TOKENS }),
  Object.freeze({ id: 'oxblood-cloth', name: 'Oxblood Cloth', tokens: OXBLOOD_CLOTH_TOKENS }),
])

/** Design-tokens 1.1 names Paris Navy the default. */
export const DEFAULT_PALETTE_ID = 'paris-navy'

export function getPalette(id: string): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? defaultPalette()
}

export function defaultPalette(): Palette {
  const palette = PALETTES.find((entry) => entry.id === DEFAULT_PALETTE_ID)
  if (palette === undefined) throw new Error(`Default palette ${DEFAULT_PALETTE_ID} is missing`)
  return palette
}
