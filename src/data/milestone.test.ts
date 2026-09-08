import { beforeEach, describe, expect, it } from 'vitest'
import { putPassages } from './corpus'
import { db, resetDatabase } from './db'
import { makePassage } from './fixtures'
import { getPassageRecital, listRecitablePassages, recordMilestone } from './milestone'
import { listReviewLog } from './reviewLog'
import { confirmSegmentation, listPassageSegments } from './segmentation'
import { putSegmentProgress } from './segmentProgress'
import { setUpkeepState, startFocus } from './upkeep'
import { getUserPrayer, takeOffList } from './userPrayers'
import type { Day } from './types'

/**
 * **The milestone, the promotion, and the demotion.** Scope 8.7 and 9.5.
 *
 * Like `review.test.ts` next door, the assertions are all of one shape: **the
 * scheduler decided, and this wrote down what it decided.** Nothing here
 * recomputes an interval, so nothing here asserts one that
 * `src/scheduler/passage.test.ts` does not already own.
 *
 * What this file does own is the four states of scope 8.7 - not promoted, first
 * attempt, promoted, demoted - and the door of decision D9.1, which decides
 * which passages the reader is ever offered.
 */

const USER = 'user-1'
const TODAY: Day = '2026-09-08'

const passage = makePassage({ title: 'Remove not, O Lord' })
const other = makePassage({ title: 'Blessed is the spot' })

const LINES = ['Remove not, O Lord, the lamp,', 'nor the light of Thy guidance,', 'O my God.']

beforeEach(async () => {
  await resetDatabase()
  await putPassages([passage, other])
})

/** Puts the passage on the list, split into its lines, and returns their ids. */
async function onList(row = passage, texts = LINES): Promise<string[]> {
  await confirmSegmentation(USER, row.id, texts)
  return (await listPassageSegments(row.id)).map((segment) => segment.id)
}

/** Gives every one of those lines a review history, so the passage may be recited. */
async function met(segmentIds: readonly string[], intervalDays = 6): Promise<void> {
  for (const [index, segmentId] of segmentIds.entries()) {
    await putSegmentProgress(USER, segmentId, {
      ease_factor: 2.5,
      // The weakest line is the last one, so a promotion that reads the shortest
      // interval and one that reads the longest give visibly different answers.
      interval_days: intervalDays + (segmentIds.length - index) * 10,
      repetitions: 5,
      due_date: '2026-09-20',
      last_reviewed_at: '2026-09-01',
      lapses: 0,
    })
  }
}

describe('what a passage is offered for', () => {
  it('is offered once every one of its lines has been met', async () => {
    const segmentIds = await onList()
    await met(segmentIds)

    const offered = await listRecitablePassages(USER, TODAY)
    expect(offered.map((entry) => entry.passage.id)).toEqual([passage.id])
    expect(offered[0]?.lines.map((line) => line.text)).toEqual(LINES)
  })

  it('is not offered while one of its lines has never been met', async () => {
    const segmentIds = await onList()
    await met(segmentIds.slice(0, 2))

    expect(await listRecitablePassages(USER, TODAY)).toEqual([])
  })

  it('is not offered once it has been promoted, because its recital is a review now', async () => {
    const segmentIds = await onList()
    await met(segmentIds)
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)

    expect(await listRecitablePassages(USER, TODAY)).toEqual([])
  })

  it('is offered again once a rating of Again has demoted it', async () => {
    const segmentIds = await onList()
    await met(segmentIds)
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)
    await recordMilestone(USER, { passageId: passage.id, rating: 'again' }, TODAY)

    expect((await listRecitablePassages(USER, TODAY)).map((e) => e.passage.id)).toEqual([
      passage.id,
    ])
  })

  it('is not offered while it is resting', async () => {
    // Scope 8.5: a resting passage is never queued, and the app does not then
    // invite the reader to it either.
    const segmentIds = await onList()
    await met(segmentIds)
    await setUpkeepState(USER, passage.id, 'resting')

    expect(await listRecitablePassages(USER, TODAY)).toEqual([])
  })

  it('is not offered while focus is in force on something else', async () => {
    // Scope 8.6: "all non-focused material is suppressed, both new and due". A
    // tab that suppresses everything else and then offers it is not focused.
    await met(await onList())
    await met(await onList(other, ['Blessed is the spot,', 'and the house.']))
    await startFocus(USER, other.id, TODAY, 7)

    const offered = await listRecitablePassages(USER, TODAY)
    expect(offered.map((entry) => entry.passage.id)).toEqual([other.id])
  })

  it('is nothing at all for a reader with nothing on their list', async () => {
    expect(await listRecitablePassages(USER, TODAY)).toEqual([])
  })
})

describe('the first attempt', () => {
  it('promotes the passage and fills the columns that have been null since session 2', async () => {
    await met(await onList())

    expect(await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)).toBe(
      'promoted',
    )

    const row = await getUserPrayer(USER, passage.id)
    expect(row?.status).toBe('memorised')
    expect(row?.milestone_reached_at).not.toBeNull()
    expect(row?.passage_due_date).not.toBeNull()
    expect(row?.passage_ease_factor).not.toBeNull()
    expect(row?.passage_repetitions).not.toBeNull()
  })

  it('schedules the whole passage on its weakest line, which is D1.3 and D2.11', async () => {
    // `met` gives the last line the shortest interval. The promoted card takes
    // that one, so a passage with one shaky line keeps coming round until it is
    // solid rather than disappearing on the strength of the others.
    const segmentIds = await onList()
    await met(segmentIds)

    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)

    const row = await getUserPrayer(USER, passage.id)
    // The shortest of 36, 26 and 16 days.
    expect(row?.passage_interval_days).toBe(16)
    expect(row?.passage_due_date).toBe('2026-09-24')
  })

  it('changes nothing when the reader rates it Again', async () => {
    // The reader is saying it was not there yet. Promoting a passage and then
    // demoting it in one act would be true of the columns and false of the
    // morning.
    await met(await onList())

    expect(await recordMilestone(USER, { passageId: passage.id, rating: 'again' }, TODAY)).toBe(
      'unchanged',
    )

    const row = await getUserPrayer(USER, passage.id)
    expect(row?.passage_due_date).toBeNull()
    expect(row?.milestone_reached_at).toBeNull()
    expect(row?.status).not.toBe('memorised')
  })

  it('records the rating all the same, because it is a rating', async () => {
    await met(await onList())
    await recordMilestone(USER, { passageId: passage.id, rating: 'again' }, TODAY)

    const log = await listReviewLog(USER)
    expect(log).toHaveLength(1)
    expect(log[0]?.self_rating).toBe('again')
  })

  it('refuses to promote a passage the reader has not met the whole of', async () => {
    // Reachable only by a typed URL. The card is scheduled on the weakest line
    // and a line never met has no interval to be the weakest, so promoting here
    // would schedule the whole passage off whichever lines happened to exist.
    const segmentIds = await onList()
    await met(segmentIds.slice(0, 1))

    expect(await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)).toBe(
      'unchanged',
    )
    expect((await getUserPrayer(USER, passage.id))?.passage_due_date).toBeNull()
  })

  it('does nothing for a passage that is not on the list at all', async () => {
    expect(await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)).toBe(
      'unchanged',
    )
    expect(await listReviewLog(USER)).toEqual([])
  })
})

describe('the promoted card, come round again', () => {
  async function promoted(): Promise<void> {
    await met(await onList())
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)
  }

  it('is rescheduled, and stays promoted', async () => {
    await promoted()
    const before = (await getUserPrayer(USER, passage.id))?.passage_due_date

    expect(await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)).toBe(
      'scheduled',
    )

    const row = await getUserPrayer(USER, passage.id)
    expect(row?.status).toBe('memorised')
    expect(row?.passage_due_date).not.toBe(before)
    expect(row?.passage_due_date).not.toBeNull()
  })

  it('is demoted back to segment review by a rating of Again', async () => {
    await promoted()

    expect(await recordMilestone(USER, { passageId: passage.id, rating: 'again' }, TODAY)).toBe(
      'demoted',
    )

    const row = await getUserPrayer(USER, passage.id)
    expect(row?.status).toBe('learning')
    expect(row?.passage_due_date).toBeNull()
    expect(row?.passage_ease_factor).toBeNull()
    expect(row?.passage_interval_days).toBeNull()
    expect(row?.passage_repetitions).toBeNull()
  })

  it('keeps the date the milestone was reached through a demotion', async () => {
    // Scope 11.3 shows "milestone date, if reached" on the passage detail view.
    // It was reached. The four scheduling columns say whether it is promoted
    // now; the date is history, and history does not un-happen.
    await promoted()
    const reached = (await getUserPrayer(USER, passage.id))?.milestone_reached_at

    await recordMilestone(USER, { passageId: passage.id, rating: 'again' }, TODAY)

    expect((await getUserPrayer(USER, passage.id))?.milestone_reached_at).toBe(reached)
  })

  it('leaves every line exactly as it was, so a demotion resumes rather than restarts', async () => {
    const segmentIds = await onList()
    await met(segmentIds)
    const before = await db.segment_progress.where('user_id').equals(USER).toArray()

    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)
    await recordMilestone(USER, { passageId: passage.id, rating: 'again' }, TODAY)

    const after = await db.segment_progress.where('user_id').equals(USER).toArray()
    expect(after).toEqual(before)
  })
})

describe('what the log records', () => {
  it('names the passage and no line, because a recital is not a review of one', async () => {
    await met(await onList())
    await recordMilestone(USER, { passageId: passage.id, rating: 'easy' }, TODAY)

    const log = await listReviewLog(USER)
    expect(log).toHaveLength(1)
    expect(log[0]?.passage_id).toBe(passage.id)
    expect(log[0]?.segment_id).toBeNull()
    expect(log[0]?.quiz_type).toBe('milestone')
    expect(log[0]?.self_rating).toBe('easy')
  })

  it('appends, so a passage recited every week has a week of history', async () => {
    await met(await onList())
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)
    await recordMilestone(USER, { passageId: passage.id, rating: 'hard' }, TODAY)
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)

    expect(await listReviewLog(USER)).toHaveLength(3)
  })

  it('goes with the passage when it is taken off the list', async () => {
    // Scope 6.5 makes a removal permanent and total. A recital left behind would
    // be a review of a passage the reader no longer has.
    await met(await onList())
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)

    await takeOffList(USER, passage.id)

    expect(await listReviewLog(USER)).toEqual([])
  })
})

describe('the recital screen reads', () => {
  it('gives the passage, its lines in order, and whether it is promoted', async () => {
    await met(await onList())

    const before = await getPassageRecital(USER, passage.id)
    expect(before?.passage.id).toBe(passage.id)
    expect(before?.lines.map((line) => line.text)).toEqual(LINES)
    expect(before?.promoted).toBe(false)

    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)
    expect((await getPassageRecital(USER, passage.id))?.promoted).toBe(true)
  })

  it('is nothing for a passage that is not on the list', async () => {
    expect(await getPassageRecital(USER, passage.id)).toBeNull()
  })
})
