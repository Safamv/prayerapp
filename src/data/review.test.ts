import { beforeEach, describe, expect, it } from 'vitest'
import { putPassages } from './corpus'
import { db, resetDatabase } from './db'
import { makePassage } from './fixtures'
import { recordReview } from './review'
import { listReviewLog } from './reviewLog'
import { getSegmentProgress, putSegmentProgress } from './segmentProgress'
import { confirmSegmentation, listPassageSegments } from './segmentation'
import { setUpkeepState } from './upkeep'

/**
 * The write a finished line makes. Scope 9.6.
 *
 * This module is the only join between the quiz and the scheduler, and the
 * assertions here are all of the same shape: **the scheduler decided, and this
 * wrote down what it decided**. Nothing here recomputes an interval, so nothing
 * here asserts one that `src/scheduler/index.test.ts` does not already own.
 */

const USER = 'user-1'
const TODAY = '2026-09-08'

const passage = makePassage({ title: 'Blessed is the spot' })

async function lines(): Promise<string[]> {
  await confirmSegmentation(USER, passage.id, ['Blessed is the spot,', 'and the house,'])
  return (await listPassageSegments(passage.id)).map((segment) => segment.id)
}

beforeEach(async () => {
  await resetDatabase()
  await putPassages([passage])
})

describe('recordReview', () => {
  it('creates the progress for a line met for the first time', async () => {
    const [first] = await lines()

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 1, rating: 'good' },
      TODAY,
    )

    const progress = await getSegmentProgress(USER, first ?? '')
    expect(progress?.repetitions).toBe(1)
    expect(progress?.interval_days).toBe(1)
    expect(progress?.due_date).toBe('2026-09-09')
    expect(progress?.last_reviewed_at).toBe(TODAY)
  })

  it('carries a line that has been met before to its next date', async () => {
    const [first] = await lines()
    await putSegmentProgress(USER, first ?? '', {
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 1,
      due_date: TODAY,
      last_reviewed_at: '2026-09-07',
      lapses: 0,
    })

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 2, rating: 'good' },
      TODAY,
    )

    // Decision D1.4: the second successful review waits six days.
    const progress = await getSegmentProgress(USER, first ?? '')
    expect(progress?.repetitions).toBe(2)
    expect(progress?.interval_days).toBe(6)
    expect(progress?.due_date).toBe('2026-09-14')
  })

  it('puts a forgotten line back to tomorrow and counts the lapse', async () => {
    const [first] = await lines()
    await putSegmentProgress(USER, first ?? '', {
      ease_factor: 2.5,
      interval_days: 15,
      repetitions: 4,
      due_date: TODAY,
      last_reviewed_at: '2026-08-24',
      lapses: 0,
    })

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 4, rating: 'again' },
      TODAY,
    )

    // Decision D1.5, and the whole of what a lapse does to the ladder: the
    // count starts again, so the line is served at level 1 next time.
    const progress = await getSegmentProgress(USER, first ?? '')
    expect(progress?.repetitions).toBe(0)
    expect(progress?.lapses).toBe(1)
    expect(progress?.due_date).toBe('2026-09-09')
  })

  it('sends an occasional passage three times further out', async () => {
    // Scope 8.5, decision D1.1: the multiplier is applied to the date and never
    // stored in the interval, so moving the passage back to active loses nothing.
    const [first] = await lines()
    await setUpkeepState(USER, passage.id, 'occasional')

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 1, rating: 'good' },
      TODAY,
    )

    const progress = await getSegmentProgress(USER, first ?? '')
    expect(progress?.interval_days).toBe(1)
    expect(progress?.due_date).toBe('2026-09-11')
  })

  it('appends one row to the log, naming the rung it was served at', async () => {
    const [first] = await lines()

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 3, rating: 'hard' },
      TODAY,
    )

    const log = await listReviewLog(USER)
    expect(log).toHaveLength(1)
    expect(log[0]?.segment_id).toBe(first)
    expect(log[0]?.quiz_type).toBe('level3')
    expect(log[0]?.self_rating).toBe('hard')
  })

  it('keeps every review, because a history is the one thing a new scheduler cannot rebuild', async () => {
    const [first] = await lines()

    for (const rating of ['good', 'hard', 'again'] as const) {
      await recordReview(
        USER,
        { passageId: passage.id, segmentId: first ?? '', level: 2, rating },
        TODAY,
      )
    }

    expect(await listReviewLog(USER)).toHaveLength(3)
  })

  it('moves the passage from something you intend to learn to something you are learning', async () => {
    const [first] = await lines()
    const before = await db.user_prayers.where('passage_id').equals(passage.id).first()
    expect(before?.status).toBe('list')

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 1, rating: 'good' },
      TODAY,
    )

    const after = await db.user_prayers.where('passage_id').equals(passage.id).first()
    expect(after?.status).toBe('learning')
  })

  it('leaves a passage that has reached the milestone alone', async () => {
    // Session 9 sets `memorised`. Nothing here may undo it.
    const [first] = await lines()
    const row = await db.user_prayers.where('passage_id').equals(passage.id).first()
    await db.user_prayers.update(row?.id ?? '', { status: 'memorised' })

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 1, rating: 'good' },
      TODAY,
    )

    const after = await db.user_prayers.where('passage_id').equals(passage.id).first()
    expect(after?.status).toBe('memorised')
  })

  it('records a line whose passage has left the list without inventing an upkeep state', async () => {
    const [first] = await lines()
    await db.user_prayers.where('passage_id').equals(passage.id).delete()

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 1, rating: 'good' },
      TODAY,
    )

    const progress = await getSegmentProgress(USER, first ?? '')
    expect(progress?.due_date).toBe('2026-09-09')
    expect(await listReviewLog(USER)).toHaveLength(1)
  })

  it('keeps one user out of another user’s progress', async () => {
    const [first] = await lines()

    await recordReview(
      USER,
      { passageId: passage.id, segmentId: first ?? '', level: 1, rating: 'good' },
      TODAY,
    )

    expect(await getSegmentProgress('someone-else', first ?? '')).toBeUndefined()
    expect(await listReviewLog('someone-else')).toEqual([])
  })
})
