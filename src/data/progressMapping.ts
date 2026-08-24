import type { PassageProgress, SegmentProgress } from '../scheduler'
import type { SegmentProgressRow, UserPrayerRow } from './types'

/**
 * The one place the scheduler's names meet the database's names.
 *
 * The scheduler uses camelCase (`easeFactor`) because it is a pure module with
 * its own vocabulary. The database uses the scope's snake_case column names
 * (`ease_factor`) because that is what makes v1.0 sync additive. Both are right,
 * and this file is the entire cost of having both.
 *
 * `src/scheduler/types.ts` says of `SegmentProgress`: "the mapping in `src/data/`
 * is a rename and nothing more". This is that file, and it stays that way. If
 * anything here ever starts to compute rather than rename, it belongs in the
 * scheduler or in the caller, not here.
 */

export function toSchedulerSegmentProgress(row: SegmentProgressRow): SegmentProgress {
  return {
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    dueDate: row.due_date,
    lastReviewedAt: row.last_reviewed_at,
    lapses: row.lapses,
  }
}

export function fromSchedulerSegmentProgress(
  progress: SegmentProgress,
): Omit<SegmentProgressRow, 'id' | 'user_id' | 'segment_id'> {
  return {
    ease_factor: progress.easeFactor,
    interval_days: progress.intervalDays,
    repetitions: progress.repetitions,
    due_date: progress.dueDate,
    last_reviewed_at: progress.lastReviewedAt,
    lapses: progress.lapses,
  }
}

/**
 * A promoted passage's whole-passage card (scope 8.7). Returns `null` until the
 * milestone, because before promotion the four columns are `null` and there is
 * no card to schedule.
 */
export function toSchedulerPassageProgress(row: UserPrayerRow): PassageProgress | null {
  if (
    row.passage_ease_factor === null ||
    row.passage_interval_days === null ||
    row.passage_repetitions === null ||
    row.passage_due_date === null
  ) {
    return null
  }
  return {
    passageEaseFactor: row.passage_ease_factor,
    passageIntervalDays: row.passage_interval_days,
    passageRepetitions: row.passage_repetitions,
    passageDueDate: row.passage_due_date,
  }
}

export function fromSchedulerPassageProgress(
  progress: PassageProgress,
): Pick<
  UserPrayerRow,
  'passage_ease_factor' | 'passage_interval_days' | 'passage_repetitions' | 'passage_due_date'
> {
  return {
    passage_ease_factor: progress.passageEaseFactor,
    passage_interval_days: progress.passageIntervalDays,
    passage_repetitions: progress.passageRepetitions,
    passage_due_date: progress.passageDueDate,
  }
}
