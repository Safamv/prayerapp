import { describe, expect, it } from 'vitest'
import { newSegmentProgress, reviewSegment } from '../scheduler'
import {
  fromSchedulerPassageProgress,
  fromSchedulerSegmentProgress,
  toSchedulerPassageProgress,
  toSchedulerSegmentProgress,
} from './progressMapping'
import type { SegmentProgressRow, UserPrayerRow } from './types'

/**
 * The seam between the scheduler's camelCase and the database's snake_case.
 *
 * The round trip is the point. If a field were dropped in one direction the app
 * would keep working and quietly reset that segment's history, which is exactly
 * the class of bug that only shows up as "my intervals went strange" a fortnight
 * into a tester's use.
 */

const ROW: SegmentProgressRow = {
  id: 'row-1',
  user_id: 'user-1',
  segment_id: 'segment-1',
  ease_factor: 2.36,
  interval_days: 17,
  repetitions: 4,
  due_date: '2026-09-10',
  last_reviewed_at: '2026-08-24',
  lapses: 2,
}

const PRAYER: UserPrayerRow = {
  id: 'prayer-1',
  user_id: 'user-1',
  passage_id: 'passage-1',
  status: 'memorised',
  upkeep_state: 'active',
  is_focus: false,
  focus_until: null,
  list_order: 0,
  started_at: '2026-08-01T00:00:00.000Z',
  milestone_reached_at: '2026-08-20T00:00:00.000Z',
  passage_ease_factor: 2.5,
  passage_interval_days: 21,
  passage_repetitions: 3,
  passage_due_date: '2026-09-14',
}

describe('segment progress', () => {
  it('renames every column into the scheduler shape', () => {
    expect(toSchedulerSegmentProgress(ROW)).toEqual({
      easeFactor: 2.36,
      intervalDays: 17,
      repetitions: 4,
      dueDate: '2026-09-10',
      lastReviewedAt: '2026-08-24',
      lapses: 2,
    })
  })

  it('round-trips without losing a field', () => {
    const back = fromSchedulerSegmentProgress(toSchedulerSegmentProgress(ROW))

    expect({ id: ROW.id, user_id: ROW.user_id, segment_id: ROW.segment_id, ...back }).toEqual(ROW)
  })

  it('carries a null last review, which is what a segment never reviewed looks like', () => {
    const fresh = { ...ROW, last_reviewed_at: null }
    expect(toSchedulerSegmentProgress(fresh).lastReviewedAt).toBeNull()
    expect(
      fromSchedulerSegmentProgress(toSchedulerSegmentProgress(fresh)).last_reviewed_at,
    ).toBeNull()
  })

  it('stores what the sealed scheduler actually returns', () => {
    // The scheduler is a real module here, not a fixture: this is the only test
    // in the app that proves the two shapes fit each other.
    const reviewed = reviewSegment(newSegmentProgress('2026-08-24'), 'good', '2026-08-24')
    const stored = fromSchedulerSegmentProgress(reviewed)

    expect(stored.due_date).toBe(reviewed.dueDate)
    expect(stored.ease_factor).toBe(reviewed.easeFactor)
    expect(stored.interval_days).toBe(reviewed.intervalDays)
    expect(stored.repetitions).toBe(reviewed.repetitions)
    expect(stored.lapses).toBe(reviewed.lapses)
    expect(toSchedulerSegmentProgress({ ...ROW, ...stored })).toEqual(reviewed)
  })
})

describe('passage progress', () => {
  it('renames the whole-passage columns', () => {
    expect(toSchedulerPassageProgress(PRAYER)).toEqual({
      passageEaseFactor: 2.5,
      passageIntervalDays: 21,
      passageRepetitions: 3,
      passageDueDate: '2026-09-14',
    })
  })

  it('round-trips without losing a field', () => {
    const progress = toSchedulerPassageProgress(PRAYER)
    expect(progress).not.toBeNull()
    expect(fromSchedulerPassageProgress(progress!)).toEqual({
      passage_ease_factor: 2.5,
      passage_interval_days: 21,
      passage_repetitions: 3,
      passage_due_date: '2026-09-14',
    })
  })

  it('is null before the milestone, because there is no whole-passage card yet', () => {
    expect(
      toSchedulerPassageProgress({
        ...PRAYER,
        status: 'learning',
        milestone_reached_at: null,
        passage_ease_factor: null,
        passage_interval_days: null,
        passage_repetitions: null,
        passage_due_date: null,
      }),
    ).toBeNull()
  })

  it('is null if any one of the four columns is missing, rather than half a card', () => {
    expect(toSchedulerPassageProgress({ ...PRAYER, passage_due_date: null })).toBeNull()
    expect(toSchedulerPassageProgress({ ...PRAYER, passage_repetitions: null })).toBeNull()
  })
})
