/**
 * What a quiz is built from, as plain values.
 *
 * Nothing in `src/quiz/` reads a database, reads the clock or renders anything,
 * for the same reason nothing in `src/scheduler/` or `src/queue/` does: which
 * words are taken out of a line, and which rung of the ladder a line is served
 * at, are decisions that are expensive to get wrong and cheap to test without a
 * screen in the way.
 *
 * The screen in `src/features/memorise/ReviewScreen.tsx` reads the rows, hands
 * them over, and draws what comes back.
 */

/**
 * A rung of scope 9.1's ladder.
 *
 * | Level | Type | Input |
 * |---|---|---|
 * | 1 | Read and reveal | None |
 * | 2 | Light chip cloze, ~15% blanked | Tap |
 * | 3 | Heavy chip cloze, ~40% blanked | Tap |
 * | 4 | Order the segments | Tap or drag |
 * | 5 | First letters as scaffold | Recite, reveal, self-rate |
 * | 6 | Free recall | Recite, reveal, self-rate |
 *
 * A number rather than the `quiz_type` string of scope section 10, because a
 * ladder is climbed and `level3 > level2` is not an expression. The rename to
 * `'level3'` happens once, in `src/data/review.ts`, where the row is written.
 */
export type QuizLevel = 1 | 2 | 3 | 4 | 5 | 6

/** One line of a passage, as a quiz considers it. */
export interface QuizLine {
  readonly segmentId: string
  /** `passage_segments.order_index`: the order scope 8.1 learns them in. */
  readonly orderIndex: number
  readonly text: string
}
