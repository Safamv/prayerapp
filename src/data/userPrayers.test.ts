import { beforeEach, describe, expect, it } from 'vitest'
import { putPassageSegments, putPassages } from './corpus'
import { db, resetDatabase } from './db'
import { makePassage, makeSegment } from './fixtures'
import { appendReviewLog } from './reviewLog'
import { putSegmentProgress } from './segmentProgress'
import {
  addToList,
  getUserPrayer,
  listUserPrayers,
  listUserPrayersByStatus,
  removeFromList,
  reorderList,
  updateUserPrayer,
} from './userPrayers'

/**
 * `user_prayers`: what the user has taken on. Scope 14's "My list, ordered,
 * removable" is these functions, and scope 8.7's whole-passage scheduling
 * columns start null and stay null until session 8 promotes on milestone.
 */

const USER = 'user-1'

beforeEach(async () => {
  await resetDatabase()
})

describe('adding to the list', () => {
  it('starts a passage at the beginning of the ladder', async () => {
    const row = await addToList(USER, 'passage-1', '2026-08-24T06:00:00.000Z')

    expect(row.status).toBe('list')
    expect(row.upkeep_state).toBe('active')
    expect(row.is_focus).toBe(false)
    expect(row.focus_until).toBeNull()
    expect(row.started_at).toBe('2026-08-24T06:00:00.000Z')
    expect(row.milestone_reached_at).toBeNull()
  })

  it('leaves the whole-passage scheduling columns null until the milestone', async () => {
    const row = await addToList(USER, 'passage-1')

    expect(row.passage_ease_factor).toBeNull()
    expect(row.passage_interval_days).toBeNull()
    expect(row.passage_repetitions).toBeNull()
    expect(row.passage_due_date).toBeNull()
  })

  it('is idempotent, so adding twice does not restart it', async () => {
    const first = await addToList(USER, 'passage-1', '2026-08-20T00:00:00.000Z')
    const second = await addToList(USER, 'passage-1', '2026-08-24T00:00:00.000Z')

    expect(second).toEqual(first)
    expect(await listUserPrayers(USER)).toHaveLength(1)
  })

  it('appends each new passage to the end of the list', async () => {
    await addToList(USER, 'first')
    await addToList(USER, 'second')
    await addToList(USER, 'third')

    expect((await listUserPrayers(USER)).map((row) => row.list_order)).toEqual([0, 1, 2])
  })

  it('keeps one user list separate from another', async () => {
    await addToList(USER, 'passage-1')
    await addToList('user-2', 'passage-2')

    expect((await listUserPrayers(USER)).map((row) => row.passage_id)).toEqual(['passage-1'])
  })
})

describe('reading the list', () => {
  it('reads in list order rather than insertion order', async () => {
    const first = await addToList(USER, 'first')
    await addToList(USER, 'second')
    await updateUserPrayer(first.id, { list_order: 99 })

    expect((await listUserPrayers(USER)).map((row) => row.passage_id)).toEqual(['second', 'first'])
  })

  it('filters by status', async () => {
    const learning = await addToList(USER, 'learning-one')
    await addToList(USER, 'still-on-the-list')
    await updateUserPrayer(learning.id, { status: 'learning' })

    const found = await listUserPrayersByStatus(USER, 'learning')
    expect(found.map((row) => row.passage_id)).toEqual(['learning-one'])
  })

  it('returns undefined for a passage that was never added', async () => {
    expect(await getUserPrayer(USER, 'never')).toBeUndefined()
  })
})

describe('updating', () => {
  it('patches only the named columns', async () => {
    const row = await addToList(USER, 'passage-1')
    await updateUserPrayer(row.id, { upkeep_state: 'resting' })

    const stored = await getUserPrayer(USER, 'passage-1')
    expect(stored?.upkeep_state).toBe('resting')
    expect(stored?.status).toBe('list')
  })

  it('reorders the list to a given sequence', async () => {
    await addToList(USER, 'a')
    await addToList(USER, 'b')
    await addToList(USER, 'c')

    await reorderList(USER, ['c', 'a', 'b'])

    expect((await listUserPrayers(USER)).map((row) => row.passage_id)).toEqual(['c', 'a', 'b'])
  })

  it('leaves passages the reorder did not name behind, in their existing order', async () => {
    await addToList(USER, 'a')
    await addToList(USER, 'b')
    await addToList(USER, 'c')

    await reorderList(USER, ['c'])

    expect((await listUserPrayers(USER)).map((row) => row.passage_id)).toEqual(['c', 'a', 'b'])
  })
})

describe('removing from the list', () => {
  it('removes the row', async () => {
    await addToList(USER, 'passage-1')
    await removeFromList(USER, 'passage-1')

    expect(await getUserPrayer(USER, 'passage-1')).toBeUndefined()
  })

  it('takes the progress and the review history with it', async () => {
    const passage = makePassage()
    const segment = makeSegment(passage.id, 0)
    await putPassages([passage])
    await putPassageSegments([segment])
    await addToList(USER, passage.id)
    await putSegmentProgress(USER, segment.id, {
      ease_factor: 2.5,
      interval_days: 6,
      repetitions: 2,
      due_date: '2026-09-01',
      last_reviewed_at: '2026-08-26',
      lapses: 0,
    })
    await appendReviewLog(USER, {
      segmentId: segment.id,
      quizType: 'level3',
      selfRating: 'good',
    })

    await removeFromList(USER, passage.id)

    expect(await db.segment_progress.count()).toBe(0)
    expect(await db.review_log.count()).toBe(0)
  })

  it('leaves another user progress on the same passage alone', async () => {
    const passage = makePassage()
    const segment = makeSegment(passage.id, 0)
    await putPassages([passage])
    await putPassageSegments([segment])
    await addToList(USER, passage.id)
    await addToList('user-2', passage.id)
    await putSegmentProgress('user-2', segment.id, {
      ease_factor: 2.5,
      interval_days: 6,
      repetitions: 2,
      due_date: '2026-09-01',
      last_reviewed_at: '2026-08-26',
      lapses: 0,
    })

    await removeFromList(USER, passage.id)

    expect(await db.segment_progress.count()).toBe(1)
    expect(await getUserPrayer('user-2', passage.id)).toBeDefined()
  })
})
