import { DEFAULT_SCHEDULER_CONFIG, type SchedulerConfig } from './config'
import type { UpkeepState } from './types'

/**
 * Scope 8.5. Resting is the one state that is not a slower interval. It is an
 * absence of one, which is why it is a separate question from how long the
 * interval is, and why a resting passage never decays into "needs review".
 */
export function isQueueable(
  upkeepState: UpkeepState,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): boolean {
  return config.upkeepIntervalMultipliers[upkeepState] !== null
}

/**
 * The number of days to actually wait, given a plain SM-2 interval.
 *
 * The upkeep multiplier is applied here, at the point of choosing a due date,
 * and never written back into `intervalDays`. If it were written back, the next
 * review would compute its interval from an already tripled number and triple
 * it again, so three months on occasional upkeep would quietly become nine.
 * Keeping `intervalDays` as the plain SM-2 value also means moving a passage
 * between upkeep states loses nothing.
 *
 * A resting passage still gets a coherent date, computed as though it were
 * active, so that switching it back to active surfaces whatever is genuinely
 * overdue rather than pushing it further away.
 */
export function effectiveIntervalDays(
  intervalDays: number,
  upkeepState: UpkeepState,
  config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG,
): number {
  const multiplier = config.upkeepIntervalMultipliers[upkeepState] ?? 1
  const multiplied = Math.round(intervalDays * multiplier)
  return Math.min(Math.max(multiplied, 1), config.maximumIntervalDays)
}
