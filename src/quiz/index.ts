/**
 * **The quiz ladder, as pure functions over plain values.** Scope 9.1, 9.3, 9.4.
 *
 * The same three rules that hold `src/scheduler/` and `src/queue/` together hold
 * this. It reads no database and renders nothing. It never reads the clock. It
 * holds no state, and its randomness is seeded, so the same line gives the same
 * puzzle on any device and on any re-render.
 *
 * Two things live here that would otherwise be scattered through a screen and
 * quietly untestable: **which rung a line is served at** (`level.ts`, decision
 * D8.2) and **which words are taken out of it** (`cloze.ts`). Both are decisions
 * a reader meets every morning, and both are the kind of thing that looks
 * correct on the one line somebody tried it on.
 *
 * It is memorisation, so nothing under `src/features/discover/` may import it
 * (principle 7.6, enforced by `src/principles/discover-isolation.test.ts` and by
 * `no-restricted-imports` in eslint.config.js).
 */

export { buildCloze, canCloze, chipFills, clozeTokens } from './cloze'
export type { Cloze, ClozeBlank, ClozeChip, ClozeToken } from './cloze'
export { HIGHEST_LEVEL_BUILT, masteryLevel, servedLevel } from './level'
export type { QuizMaterial } from './level'
export {
  MAXIMUM_LINES_TO_ORDER,
  MINIMUM_LINES_TO_ORDER,
  misplacedLines,
  orderingGroup,
  shuffledOrdering,
} from './ordering'
export { shuffled } from './random'
export type { QuizLevel, QuizLine } from './types'
