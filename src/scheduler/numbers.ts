/**
 * Rounding and guards.
 *
 * The guards exist because this module will one day be handed state that came
 * out of IndexedDB, and a corrupt row must fail loudly here rather than turn
 * into a due date of "Invalid Date" that the queue silently skips forever.
 */

/** Rounds to a fixed number of decimals, to keep ease factors legible. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function assertNumberAtLeast(name: string, value: number, minimum: number): number {
  if (!Number.isFinite(value) || value < minimum) {
    throw new RangeError(
      `${name} must be a finite number of at least ${minimum}. Received: ${String(value)}`,
    )
  }
  return value
}

export function assertWholeNumberAtLeast(name: string, value: number, minimum: number): number {
  if (!Number.isInteger(value) || value < minimum) {
    throw new RangeError(
      `${name} must be a whole number of at least ${minimum}. Received: ${String(value)}`,
    )
  }
  return value
}
