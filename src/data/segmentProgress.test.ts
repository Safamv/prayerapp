import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './db'
import {
  deleteSegmentProgress,
  getSegmentProgress,
  listDueSegmentProgress,
  listSegmentProgress,
  putSegmentProgress,
} from './segmentProgress'

/**
 * `segment_progress`. Storage only: the arithmetic belongs to `src/scheduler/`.
 *
 * The due query is the one that matters. Scope 7.3 requires overdue material to
 * roll forward silently, so "due" means on or before today rather than exactly
 * today, and the cap that stops it becoming a backlog is applied by the queue in
 * session 6 rather than here.
 */

const USER = 'user-1'

const state = (dueDate: string, overrides: Partial<{ interval_days: number }> = {}) => ({
  ease_factor: 2.5,
  interval_days: 6,
  repetitions: 2,
  due_date: dueDate,
  last_reviewed_at: '2026-08-24',
  lapses: 0,
  ...overrides,
})

beforeEach(async () => {
  await resetDatabase()
})

describe('segment progress', () => {
  it('writes a segment state and reads it back', async () => {
    await putSegmentProgress(USER, 'segment-1', state('2026-09-01'))

    const stored = await getSegmentProgress(USER, 'segment-1')
    expect(stored?.due_date).toBe('2026-09-01')
    expect(stored?.ease_factor).toBe(2.5)
  })

  it('replaces the state on the next review rather than adding a second row', async () => {
    const first = await putSegmentProgress(USER, 'segment-1', state('2026-09-01'))
    const second = await putSegmentProgress(USER, 'segment-1', state('2026-09-15'))

    expect(second.id).toBe(first.id)
    expect(await listSegmentProgress(USER)).toHaveLength(1)
    expect((await getSegmentProgress(USER, 'segment-1'))?.due_date).toBe('2026-09-15')
  })

  it('returns undefined for a segment never reviewed', async () => {
    expect(await getSegmentProgress(USER, 'never')).toBeUndefined()
  })

  it('keeps two users progress on the same segment apart', async () => {
    await putSegmentProgress(USER, 'segment-1', state('2026-09-01'))
    await putSegmentProgress('user-2', 'segment-1', state('2026-12-25'))

    expect((await getSegmentProgress(USER, 'segment-1'))?.due_date).toBe('2026-09-01')
    expect((await getSegmentProgress('user-2', 'segment-1'))?.due_date).toBe('2026-12-25')
  })

  it('deletes one', async () => {
    await putSegmentProgress(USER, 'segment-1', state('2026-09-01'))
    await deleteSegmentProgress(USER, 'segment-1')

    expect(await getSegmentProgress(USER, 'segment-1')).toBeUndefined()
  })
})

describe('what is due', () => {
  it('includes anything due today', async () => {
    await putSegmentProgress(USER, 'today', state('2026-08-24'))

    const due = await listDueSegmentProgress(USER, '2026-08-24')
    expect(due.map((row) => row.segment_id)).toEqual(['today'])
  })

  it('includes overdue material, which rolls forward silently per scope 7.3', async () => {
    await putSegmentProgress(USER, 'four-days-late', state('2026-08-20'))
    await putSegmentProgress(USER, 'today', state('2026-08-24'))

    const due = await listDueSegmentProgress(USER, '2026-08-24')
    expect(due.map((row) => row.segment_id)).toEqual(['four-days-late', 'today'])
  })

  it('excludes anything due tomorrow', async () => {
    await putSegmentProgress(USER, 'tomorrow', state('2026-08-25'))

    expect(await listDueSegmentProgress(USER, '2026-08-24')).toEqual([])
  })

  it('excludes another user due material', async () => {
    await putSegmentProgress('user-2', 'theirs', state('2026-08-01'))

    expect(await listDueSegmentProgress(USER, '2026-08-24')).toEqual([])
  })

  it('returns the most overdue first', async () => {
    await putSegmentProgress(USER, 'b', state('2026-08-22'))
    await putSegmentProgress(USER, 'a', state('2026-08-18'))
    await putSegmentProgress(USER, 'c', state('2026-08-24'))

    const due = await listDueSegmentProgress(USER, '2026-08-24')
    expect(due.map((row) => row.segment_id)).toEqual(['a', 'b', 'c'])
  })
})
