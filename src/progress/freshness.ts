import {
  daysBetween,
  effectiveIntervalDays,
  type Day,
  type PassageProgress,
  type SegmentProgress,
  type UpkeepState,
} from '../scheduler'
import { FRESHNESS_FADING_REMAINDER } from '../config/defaults'
import {
  FRESHNESS_SEVERITY,
  FRESHNESS_STATES,
  type Freshness,
  type FreshnessCounts,
  type PassageFreshnessInput,
  type SegmentFreshnessInput,
} from './types'

/**
 * **Freshness, derived.** Design-tokens 4 and scope 11.3.
 *
 * Four states and nothing else, worked out from the columns `segment_progress`
 * and `user_prayers` already hold. Scope 11.3 is explicit that this needs no new
 * instrumentation, and it does not: everything here is arithmetic over a due
 * date, an interval and an upkeep state.
 *
 * ## Pure, and tested against synthetic state
 *
 * Nothing here reads the clock, touches Dexie or knows what a component is.
 * `today` is always an argument, exactly as it is in the scheduler next door,
 * which is what lets a test walk a line through a hundred days in a millisecond.
 * CLAUDE.md section 11 puts freshness derivation on the mandatory unit test
 * list for the same reason it puts the scheduler there: a silent bug is
 * invisible on screen and invalidates the data underneath it.
 *
 * ## Freshness is a reading, never an input
 *
 * SM-2 decides when a line comes round. This decides how to draw a star beside
 * it. Nothing in this file is ever fed back into `src/scheduler/`, so tuning
 * `FRESHNESS_FADING_REMAINDER` changes what the reader sees and nothing about
 * what the app asks them to do.
 *
 * ## The four states, in the order they are decided
 *
 * | State | When |
 * |---|---|
 * | Resting | The reader has put the passage at rest (scope 8.5). Decided first, and it never decays. |
 * | Needs review | The day the app asked for it has passed, or it has never been shown at all. |
 * | Fading | A quarter or less of its rest is left, including the day it falls due. |
 * | Strong | Anything else: settled, and not wanted for a while. |
 *
 * **Due today is Fading, not Needs review.** The app is asking for it now and
 * the reader has missed nothing; the star goes dim only once a day has actually
 * been let go. Principle 7.1 is the reason, and it costs one comparison.
 *
 * **A line never shown reads as Needs review**, which is the unlit star. It is
 * literally true - those lines are what the queue is about to serve - and it
 * makes the star fill in with gold as a passage settles, which is the only kind
 * of progress indicator principle 7.1 leaves room for. Safa's call, decision
 * D11.3.
 */

/** The rest a line is having, in days, as the scheduler itself measured it. */
function restDays(progress: SegmentProgress | PassageProgress, upkeepState: UpkeepState): number {
  const interval = 'intervalDays' in progress ? progress.intervalDays : progress.passageIntervalDays
  return effectiveIntervalDays(interval, upkeepState)
}

function dueDateOf(progress: SegmentProgress | PassageProgress): Day {
  return 'dueDate' in progress ? progress.dueDate : progress.passageDueDate
}

/**
 * Freshness of one scheduled thing - a line, or a promoted passage's card.
 *
 * The interval is put through `effectiveIntervalDays` rather than read raw,
 * because decision D1.1 keeps the upkeep multiplier out of the stored interval
 * and applies it when the date is chosen. Without that, a passage on occasional
 * upkeep would have a due date three times further out than the interval it is
 * compared against, and would read as Strong for its whole life.
 */
function scheduledFreshness(
  progress: SegmentProgress | PassageProgress,
  today: Day,
  upkeepState: UpkeepState,
  fadingRemainder: number,
): Freshness {
  const remaining = daysBetween(today, dueDateOf(progress))
  if (remaining < 0) return 'needsReview'

  const rest = restDays(progress, upkeepState)
  if (rest <= 0) return 'fading'
  return remaining / rest <= fadingRemainder ? 'fading' : 'strong'
}

export function segmentFreshness(
  input: SegmentFreshnessInput,
  today: Day,
  upkeepState: UpkeepState,
  fadingRemainder: number = FRESHNESS_FADING_REMAINDER,
): Freshness {
  // Scope 8.5: "A resting passage shows as deliberately at rest and never
  // decays into 'needs review'. The app does not guilt users for choices it
  // offered them." So this is answered before anything is measured.
  if (upkeepState === 'resting') return 'resting'

  const { progress } = input
  // A line with no row, and a row the app has recorded no review against, are
  // the same thing to a reader: it has not been shown to them yet.
  if (progress === null || progress.lastReviewedAt === null) return 'needsReview'

  return scheduledFreshness(progress, today, upkeepState, fadingRemainder)
}

/**
 * Freshness of a whole passage.
 *
 * **A promoted passage is read from its card.** Scope 8.7 promotes a passage to
 * a single whole-passage card scheduled on the slowest of its lines, and retains
 * the line state without surfacing it. The card is what the app actually asks
 * for, so it is what the star describes. Reading the lines instead would show a
 * memorised passage as Needs review the day after it was promoted, because none
 * of its lines has been reviewed since.
 *
 * **Everything else is its weakest line.** That is the same rule the promotion
 * itself uses (decision D1.3): a passage is only as settled as the line you are
 * most likely to lose. A passage with no lines at all - added but not yet
 * segmented - is Needs review, which is the unlit star and is true.
 */
export function passageFreshness(
  input: PassageFreshnessInput,
  today: Day,
  fadingRemainder: number = FRESHNESS_FADING_REMAINDER,
): Freshness {
  if (input.upkeepState === 'resting') return 'resting'

  if (input.passage !== null) {
    return scheduledFreshness(input.passage, today, input.upkeepState, fadingRemainder)
  }

  if (input.segments.length === 0) return 'needsReview'

  const found = new Set(
    input.segments.map((segment) =>
      segmentFreshness(segment, today, input.upkeepState, fadingRemainder),
    ),
  )
  return FRESHNESS_SEVERITY.find((state) => found.has(state)) ?? 'strong'
}

/**
 * **How many lines sit at each state.** Scope 11.3's last item.
 *
 * Every state is present in the result, including the ones at nought, so a
 * caller decides what to draw rather than discovering a key is missing. The
 * detail screen draws only the states with something in them.
 *
 * These are the lines' own states, so they are counted with the passage's upkeep
 * applied: a resting passage's lines are all Resting, because that is what the
 * reader chose for them and scope 8.5 says they never decay past it.
 */
export function freshnessCounts(
  input: PassageFreshnessInput,
  today: Day,
  fadingRemainder: number = FRESHNESS_FADING_REMAINDER,
): FreshnessCounts {
  const counts: Record<Freshness, number> = { strong: 0, fading: 0, needsReview: 0, resting: 0 }
  for (const segment of input.segments) {
    counts[segmentFreshness(segment, today, input.upkeepState, fadingRemainder)] += 1
  }
  return Object.freeze(counts)
}

/**
 * The longest interval any of a passage's lines has reached, in days, or `null`
 * when nothing has settled into an interval yet.
 *
 * Scope 11.3: "Longest interval reached, stated plainly". It is the largest
 * plain SM-2 interval among the lines, and the promoted card's own interval when
 * there is one, because a promoted passage's card carries the passage forward
 * from where its lines left off.
 *
 * **The plain interval, not the multiplied one.** An occasional passage comes
 * round three times less often by the reader's own instruction (scope 8.5), and
 * reporting that as an interval reached would credit the setting rather than the
 * reader. Moving a passage back to active would then shorten a number that is
 * meant to be a high-water mark.
 */
export function longestIntervalDays(input: PassageFreshnessInput): number | null {
  const intervals: number[] = []
  if (input.passage !== null) intervals.push(input.passage.passageIntervalDays)
  for (const segment of input.segments) {
    if (segment.progress !== null && segment.progress.lastReviewedAt !== null) {
      intervals.push(segment.progress.intervalDays)
    }
  }
  const longest = Math.max(0, ...intervals)
  return longest > 0 ? longest : null
}

/** Scope 11.3's lapse count: how many times a line has gone back to the start. */
export function lapseCount(input: PassageFreshnessInput): number {
  return input.segments.reduce((total, segment) => total + (segment.progress?.lapses ?? 0), 0)
}

export { FRESHNESS_STATES }
