import { canCloze } from './cloze'
import type { QuizLevel } from './types'
import { MINIMUM_LINES_TO_ORDER } from './ordering'
import type { SegmentProgress } from '../scheduler'

/**
 * **Which rung of the ladder a line is served at.** Scope 9.1: "quiz type is
 * selected by mastery level, not at random."
 *
 * The scope fixes the ladder and declines to fix the climb, so this is the
 * build's answer to it, and it is Safa's: **one rung per correct review.**
 * Decision D8.2.
 *
 * ## The count of correct answers is the whole of it
 *
 * `repetitions` is the number of times in a row the line has been recalled
 * without a lapse. It is the most direct reading of scope 9.1's "mastery level"
 * and it makes the ladder legible: the fourth time you meet a line, you meet it
 * at the fourth rung, on every line, on every passage, for ever.
 *
 * | Repetitions | Level | What the reader meets |
 * |---|---|---|
 * | 0 | 1 | The line, to read |
 * | 1 | 2 | About one word in seven taken out |
 * | 2 | 3 | About two words in five taken out |
 * | 3 | 4 | The lines to put back in order |
 * | 4 | 5 | First letters as a scaffold (session 9) |
 * | 5 or more | 6 | From memory (session 9) |
 *
 * ## Forgetting a line puts it back to reading it
 *
 * That falls out rather than being decided here. Decision D1.5: a self-rating of
 * *Again* sets `repetitions` back to nought, so the line's next appearance is at
 * level 1. It also keeps its ease penalty, so it climbs back with the same steps
 * but on a slower clock.
 *
 * This is the only shape the stored data allows. `segment_progress` holds ease,
 * interval, repetitions, due date, last reviewed and lapses (scope section 10),
 * and no rung. A "drop one rung" rule would have to know the rung before the
 * lapse, which is not written down anywhere, and adding a column to store it is
 * exactly what CLAUDE.md forbids without asking.
 *
 * ## Two rungs the material can refuse
 *
 * A rung is a rung of the ladder, not a promise about the line. A line of two
 * words has nowhere to hide a blank, and a passage's first two lines cannot be
 * put in an order. In both cases the reader drops to the rung below rather than
 * meeting an empty puzzle.
 */

/**
 * The highest rung that has been built. Session 8 stops at level 4; session 9
 * builds levels 5 and 6 and raises this to 6.
 *
 * A ceiling rather than a smaller ladder, so a tester who reaches repetition
 * five before session 9 lands keeps meeting the ordering rung instead of a blank
 * screen, and their stored progress needs nothing done to it afterwards.
 */
export const HIGHEST_LEVEL_BUILT: QuizLevel = 4

/** What the material can offer, which is the other half of the decision. */
export interface QuizMaterial {
  /** How many lines the ordering rung could draw on, this one included. */
  readonly linesInGroup: number
  /** The line itself, which decides whether words can be taken out of it. */
  readonly line: string
}

/** The rung the count of correct answers puts this line on. */
export function masteryLevel(progress: SegmentProgress | null): QuizLevel {
  if (progress === null) return 1
  const repetitions = Math.max(0, Math.floor(progress.repetitions))
  return Math.min(repetitions + 1, 6) as QuizLevel
}

/**
 * The rung the line is actually served at today: the ladder, then the ceiling of
 * what has been built, then what the material can carry.
 */
export function servedLevel(
  progress: SegmentProgress | null,
  material: QuizMaterial,
  highestBuilt: QuizLevel = HIGHEST_LEVEL_BUILT,
): QuizLevel {
  let level: QuizLevel = Math.min(masteryLevel(progress), highestBuilt) as QuizLevel

  // Two lines are a coin toss, and one line is not a question.
  if (level === 4 && material.linesInGroup < MINIMUM_LINES_TO_ORDER) level = 3

  // A line with nothing that can be taken out of it is a line you read.
  if ((level === 2 || level === 3) && !canCloze(material.line)) level = 1

  return level
}
