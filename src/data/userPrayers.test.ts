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
  putBackOnList,
  removeFromList,
  reorderList,
  takeOffList,
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

describe('taking a passage off the list, and putting it back', () => {
  /**
   * A passage three weeks in: lines, progress against them, a review history,
   * and a place in the middle of the list. This is what a mis-tap on the remove
   * control of scope 6.5 would destroy, and what the Undo beside it restores.
   */
  async function threeWeeksIn() {
    const passage = makePassage()
    const segments = [makeSegment(passage.id, 0), makeSegment(passage.id, 1)]
    await putPassages([passage])
    await putPassageSegments(segments)
    await db.passages.update(passage.id, { segment_count: segments.length })

    await addToList(USER, 'before-it')
    await addToList(USER, passage.id)
    await addToList(USER, 'after-it')

    for (const segment of segments) {
      await putSegmentProgress(USER, segment.id, {
        ease_factor: 2.6,
        interval_days: 21,
        repetitions: 7,
        due_date: '2026-09-28',
        last_reviewed_at: '2026-09-07',
        lapses: 1,
      })
      await appendReviewLog(USER, {
        segmentId: segment.id,
        quizType: 'level4',
        selfRating: 'good',
      })
    }
    return { passage, segments }
  }

  it('hands back everything it destroyed', async () => {
    const { passage, segments } = await threeWeeksIn()

    const removed = await takeOffList(USER, passage.id)

    expect(removed?.userPrayer.passage_id).toBe(passage.id)
    expect(removed?.segments).toHaveLength(segments.length)
    expect(removed?.progress).toHaveLength(2)
    expect(removed?.reviews).toHaveLength(2)
    // And the database is as empty of it as `removeFromList` would leave it.
    expect(await getUserPrayer(USER, passage.id)).toBeUndefined()
    expect(await db.passage_segments.where('passage_id').equals(passage.id).count()).toBe(0)
    expect(await db.segment_progress.count()).toBe(0)
    expect(await db.review_log.count()).toBe(0)
  })

  it('puts it back with its lines, its progress and its place in the list', async () => {
    const { passage, segments } = await threeWeeksIn()
    const before = await getUserPrayer(USER, passage.id)

    const removed = await takeOffList(USER, passage.id)
    if (removed === null) throw new Error('nothing was removed')
    await putBackOnList(removed)

    expect(await getUserPrayer(USER, passage.id)).toEqual(before)
    expect(await db.passage_segments.where('passage_id').equals(passage.id).count()).toBe(
      segments.length,
    )
    expect(await db.segment_progress.count()).toBe(2)
    expect(await db.review_log.count()).toBe(2)
    // Scope 8.4 and decision D5.4: the count on the passage and the lines under
    // it are one fact, and an undo that restored one without the other would
    // leave a passage claiming lines it did not have.
    expect((await db.passages.get(passage.id))?.segment_count).toBe(segments.length)
  })

  it('puts it back where it was rather than at the end', async () => {
    const { passage } = await threeWeeksIn()

    const removed = await takeOffList(USER, passage.id)
    if (removed === null) throw new Error('nothing was removed')
    await putBackOnList(removed)

    const order = (await listUserPrayers(USER)).map((row) => row.passage_id)
    expect(order).toEqual(['before-it', passage.id, 'after-it'])
  })

  it('returns null when there was nothing on the list to remove', async () => {
    expect(await takeOffList(USER, 'never-added')).toBeNull()
  })

  it('leaves the passage itself in the library, unsegmented', async () => {
    const { passage } = await threeWeeksIn()

    await takeOffList(USER, passage.id)

    // Scope 8.4: the library ships unsegmented, and a passage taken off the
    // list is back to being a passage in the library.
    const stored = await db.passages.get(passage.id)
    expect(stored).toBeDefined()
    expect(stored?.segment_count).toBe(0)
  })

  it('is what removeFromList does, so the two cannot destroy different things', async () => {
    const { passage } = await threeWeeksIn()

    await removeFromList(USER, passage.id)

    expect(await getUserPrayer(USER, passage.id)).toBeUndefined()
    expect(await db.segment_progress.count()).toBe(0)
    expect(await db.review_log.count()).toBe(0)
    expect(await db.passage_segments.where('passage_id').equals(passage.id).count()).toBe(0)
  })
})
