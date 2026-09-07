/**
 * Today's queue. Scope 8.3, 8.5 and 8.6, as one pure function over plain values.
 *
 * Three rules hold this module together, and they are the scheduler's rules one
 * layer up. It reads no database and renders nothing. It never reads the clock,
 * so today is always an argument. It holds no state, so the same input gives the
 * same queue on any device.
 *
 * The one rule of its own: **nothing here ever reports what the cap left out.**
 * See the header of `queue.ts`, and principle 7.3.
 *
 * It is memorisation, so nothing under `src/features/discover/` may import it
 * (principle 7.6, enforced by `src/principles/discover-isolation.test.ts` and by
 * `no-restricted-imports` in eslint.config.js).
 */

export { focusUntilDay, focusedPassages, isFocusActive, isFocusExpired } from './focus'
export type { Focusable } from './focus'
export { buildQueue } from './queue'
export type {
  QueueCandidatePassage,
  QueueCandidateSegment,
  QueueCaps,
  QueueInput,
  QueueItem,
  QueueItemKind,
} from './types'
