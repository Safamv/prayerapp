import type { PassageProgress, SegmentProgress, UpkeepState } from '../scheduler'

/**
 * **Design-tokens 4's four freshness states**, and the shapes they are read from.
 *
 * > One nine-pointed star SVG, four states, expressed as fill plus opacity.
 * > **Nothing else encodes freshness.** No numbers, no bars, no percentages.
 *
 * The token labels here are the tokens document's own, exactly: `strong`,
 * `fading`, `needsReview`, `resting`. **The third is never "lapsed"** - scope
 * 11.5 deletes that word for its resonance in a religious context and because it
 * judges the user, which principle 7.1 forbids. The word is deleted from the
 * type as well as from the strings file, so a later session cannot reach for it
 * without inventing it again from nothing.
 */
export type Freshness = 'strong' | 'fading' | 'needsReview' | 'resting'

/**
 * The order the states are worst-first in, which is the order a passage's own
 * freshness is decided in: the weakest line sets the pace, exactly as it sets
 * the pace of a promoted passage's card (decision D1.3).
 *
 * `resting` is deliberately absent. It is not a rung on this ladder: it is the
 * reader's own choice about the passage (scope 8.5) and it answers before any
 * line is looked at.
 */
export const FRESHNESS_SEVERITY: readonly Exclude<Freshness, 'resting'>[] = Object.freeze([
  'needsReview',
  'fading',
  'strong',
])

/** Every state, in the order design-tokens 4's table gives them. */
export const FRESHNESS_STATES: readonly Freshness[] = Object.freeze([
  'strong',
  'fading',
  'needsReview',
  'resting',
])

/**
 * One line of a passage, as freshness reads it.
 *
 * `progress` is `null` for a line the app has not shown the reader yet, which
 * has no `segment_progress` row at all.
 */
export interface SegmentFreshnessInput {
  readonly progress: SegmentProgress | null
}

/**
 * One passage, as freshness reads it.
 *
 * `passage` is the promoted whole-passage card of scope 8.7, or `null` before
 * the milestone. When it is present it is what the app actually schedules, so it
 * is what freshness describes; the lines are retained but not surfaced.
 */
export interface PassageFreshnessInput {
  readonly upkeepState: UpkeepState
  readonly passage: PassageProgress | null
  readonly segments: readonly SegmentFreshnessInput[]
}

/** How many lines of a passage sit at each state. Scope 11.3. */
export type FreshnessCounts = Readonly<Record<Freshness, number>>
