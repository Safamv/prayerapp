import type { Freshness } from '../../progress'
import { STAR_POLYGON_POINTS } from '../../theme'

/**
 * **The freshness star.** Design-tokens 4, transcribed.
 *
 * > One nine-pointed star SVG, four states, expressed as fill plus opacity.
 * > **Nothing else encodes freshness.** No numbers, no bars, no percentages.
 *
 * | State | Fill | Opacity |
 * |---|---|---|
 * | Strong | `accent` | 1 |
 * | Fading | `accent-md` | .5 |
 * | Needs review | `field` | .3 |
 * | Resting | `field` | .16 |
 *
 * ## Why this file is here and not in `src/components/`
 *
 * **The star is memorisation chrome.** Design-tokens 4's second hard rule:
 * "The star never appears in Discover or in the reading view." Principle 7.6 is
 * the reason, and it is the principle that protects the devotional half of the
 * product: a prayer opened at a gathering must not be met with a state of
 * repair.
 *
 * `src/principles/discover-isolation.test.ts` enforces 7.6 by reading what the
 * Discover folder imports, and **a star in `src/components/` would slip
 * straight through it** - handed its state as a prop by whichever screen drew
 * it, importing nothing forbidden, and breaching 7.6 the first time a passage
 * row in the library used it. This session is the first to render memorisation
 * chrome at all, so it is the first session where that gap is reachable.
 *
 * So the component lives inside the Memorise feature, where the folder is the
 * wall, and `src/principles/one-star.test.ts` fails the build if anything
 * outside `src/features/memorise/` imports it.
 *
 * The **decorative** star in the tab bar and the **selection** star of
 * design-tokens 5.7 are the same glyph and are not freshness usages, which
 * design-tokens 4 says in as many words. They draw from `STAR_POLYGON_POINTS`
 * in `src/theme/ornaments.ts`, which is the one place the eighteen points live.
 *
 * ## It never names its own state
 *
 * The star is `aria-hidden`. Every screen that draws one prints the state's word
 * beside it, so a screen reader is given the word rather than a description of a
 * drawing, and nothing is announced twice.
 */

/** Design-tokens 4's table, as the two things a state actually is. */
const STATE: Readonly<Record<Freshness, { readonly className: string; readonly opacity: number }>> =
  {
    strong: { className: 'text-accent', opacity: 1 },
    fading: { className: 'text-accent-md', opacity: 0.5 },
    needsReview: { className: 'text-field', opacity: 0.3 },
    resting: { className: 'text-field', opacity: 0.16 },
  }

/**
 * Design-tokens 5.3 allows a list row a "15px leading icon", and 5.7 sets the
 * selection star at 14px. 15 is the row size; the detail view asks for its own.
 */
export const FRESHNESS_STAR_SIZE = 15

export function FreshnessStar({
  freshness,
  size = FRESHNESS_STAR_SIZE,
}: {
  freshness: Freshness
  size?: number
}) {
  const { className, opacity } = STATE[freshness]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`flex-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
      focusable="false"
    >
      <polygon fill="currentColor" points={STAR_POLYGON_POINTS} />
    </svg>
  )
}
