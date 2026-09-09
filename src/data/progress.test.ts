import { beforeEach, describe, expect, it } from 'vitest'
import { today as todayOf } from './clock'
import { putPassages } from './corpus'
import { resetDatabase } from './db'
import { makePassage } from './fixtures'
import { recordMilestone } from './milestone'
import { activeDaysFrom, getPassageDetail, getStreak, listPassageFreshness } from './progress'
import { appendReviewLog } from './reviewLog'
import { confirmSegmentation, listPassageSegments } from './segmentation'
import { putSegmentProgress } from './segmentProgress'
import { setUpkeepState } from './upkeep'
import { getOrCreateUserStats } from './userStats'
import { addDays } from '../scheduler'
import type { Day } from './types'

/**
 * **Scope 11, read out of the database.**
 *
 * The arithmetic belongs to `src/progress/`, which has its own tests over
 * synthetic state and asserts every boundary of the streak and of the four
 * freshness states. **Nothing is re-asserted here.** What this file owns is the
 * joining: that the right rows are gathered, that a UTC instant becomes the
 * reader's own day, that a promoted passage is read from its card, and that the
 * detail view's five facts come out of columns which already existed.
 */

const USER = 'user-1'

/**
 * **Today, from the real clock, not a date written down here.**
 *
 * Most of this file could use a fixed day and be clearer for it. One test
 * cannot: `recordMilestone` stamps its `review_log` row with `nowInstant()`,
 * which is right - the log records when something actually happened, and
 * flattening an instant onto a calendar day passed in for scheduling would
 * lose the time of day. So a fixed `TODAY` here agrees with the clock on the
 * day it is written and disagrees with it the next morning, and the streak
 * test quietly starts asserting nought.
 *
 * It did. This was pinned to 2026-09-08, passed on 8 September, and failed on
 * the 10th. Every day in this file is derived from the real one so that the
 * suite cannot rot by sitting still. `src/app/progress.test.tsx` does the same.
 */
const TODAY: Day = todayOf()

const passage = makePassage({ title: 'Remove not, O Lord' })
const other = makePassage({ title: 'Blessed is the spot' })

const LINES = ['Remove not, O Lord, the lamp,', 'nor the light of Thy guidance,', 'O my God.']

beforeEach(async () => {
  await resetDatabase()
  await putPassages([passage, other])
})

async function onList(row = passage, texts = LINES): Promise<string[]> {
  await confirmSegmentation(USER, row.id, texts)
  return (await listPassageSegments(row.id)).map((segment) => segment.id)
}

/** Gives one line a settled history: reviewed `reviewedAgo` days ago, resting `interval`. */
async function reviewed(
  segmentId: string,
  interval: number,
  reviewedAgo: number,
  lapses = 0,
): Promise<void> {
  await putSegmentProgress(USER, segmentId, {
    ease_factor: 2.5,
    interval_days: interval,
    repetitions: 3,
    due_date: addDays(TODAY, interval - reviewedAgo),
    last_reviewed_at: addDays(TODAY, -reviewedAgo),
    lapses,
  })
}

/** An instant on a given local day, at a time of day that is a different UTC day. */
function lateOn(day: Day): string {
  const local = new Date(`${day}T23:30:00`)
  return local.toISOString()
}

describe('activeDaysFrom', () => {
  it('reads an instant as the day the reader lived it, not as its UTC day', () => {
    // `review_log.created_at` is UTC. A review late in the evening in Melbourne
    // is stored as the following day in UTC, and counting off the stored string
    // would credit a day the reader was asleep for.
    const days = activeDaysFrom([lateOn('2026-09-08')])
    expect(days).toEqual(['2026-09-08'])
  })

  it('collapses a day that holds several reviews into one', () => {
    const day = new Date('2026-09-08T09:00:00')
    const later = new Date('2026-09-08T18:00:00')
    expect(activeDaysFrom([day.toISOString(), later.toISOString()])).toEqual([todayOf(day)])
  })
})

describe('getStreak', () => {
  /** Writes a review on the given local day, of the kind the ladder writes. */
  async function reviewOn(day: Day, segmentId = 'segment-1'): Promise<void> {
    await appendReviewLog(
      USER,
      { passageId: passage.id, segmentId, quizType: 'level2', selfRating: 'good' },
      lateOn(day),
    )
  }

  it('is nought for a reader with no history', async () => {
    expect((await getStreak(USER, TODAY)).current).toBe(0)
  })

  it('counts the days the reader reviewed on', async () => {
    await reviewOn(addDays(TODAY, -2))
    await reviewOn(addDays(TODAY, -1))
    await reviewOn(TODAY)
    expect((await getStreak(USER, TODAY)).current).toBe(3)
  })

  it('counts a day whose only entry was a whole-passage recital', async () => {
    // Decision D9.3 gave `review_log` somewhere to record a recital, precisely
    // so that a reader who has memorised everything on their list keeps a
    // streak. This is that promise, asserted end to end.
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 6, 0)
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)

    expect((await getStreak(USER, TODAY)).current).toBe(1)
  })

  it('is one reader at a time', async () => {
    await reviewOn(TODAY)
    expect((await getStreak('somebody-else', TODAY)).current).toBe(0)
  })

  it('writes what it derived into user_stats, and reads none of it back', async () => {
    // Scope section 10 gives `user_stats` four columns. A row saying nought
    // about a reader who has done ninety days is a row that lies, and it syncs
    // at v1.0. Decision D11.4.
    await reviewOn(addDays(TODAY, -1))
    await reviewOn(TODAY)
    const streak = await getStreak(USER, TODAY)

    const stats = await getOrCreateUserStats(USER)
    expect(stats.streak_current).toBe(2)
    expect(stats.streak_longest).toBe(2)
    expect(stats.last_active_date).toBe(TODAY)
    expect(stats.total_reviews).toBe(2)
    expect(streak.current).toBe(stats.streak_current)
  })

  it('corrects a stored streak that has gone wrong, because it derives', async () => {
    await reviewOn(TODAY)
    await getStreak(USER, TODAY)
    // Something writes nonsense into the stored row, as a missed write would.
    const { updateUserStats } = await import('./userStats')
    await updateUserStats(USER, { streak_current: 99 })

    expect((await getStreak(USER, TODAY)).current).toBe(1)
    expect((await getOrCreateUserStats(USER)).streak_current).toBe(1)
  })
})

describe('listPassageFreshness', () => {
  it('is empty for a reader with nothing on their list', async () => {
    expect(await listPassageFreshness(USER, TODAY)).toEqual([])
  })

  it('gives a passage just added the unlit star', async () => {
    await onList()
    const [entry] = await listPassageFreshness(USER, TODAY)
    expect(entry?.freshness).toBe('needsReview')
  })

  it('gives a passage whose lines are all settled the full star', async () => {
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 30, 0)
    const [entry] = await listPassageFreshness(USER, TODAY)
    expect(entry?.freshness).toBe('strong')
  })

  it('reads a passage down to its weakest line', async () => {
    const segmentIds = await onList()
    await reviewed(segmentIds[0] ?? '', 30, 0)
    await reviewed(segmentIds[1] ?? '', 30, 0)
    await reviewed(segmentIds[2] ?? '', 6, 5)
    const [entry] = await listPassageFreshness(USER, TODAY)
    expect(entry?.freshness).toBe('fading')
  })

  it('shows a resting passage at rest whatever its dates say', async () => {
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 6, 90)
    await setUpkeepState(USER, passage.id, 'resting')
    const [entry] = await listPassageFreshness(USER, TODAY)
    expect(entry?.freshness).toBe('resting')
  })

  it('reads a promoted passage from its card rather than from its lines', async () => {
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 30, 0)
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)

    // The lines have not been touched since, so a fortnight on they are all
    // overdue. The card is what the app asks for, so it is what the star says.
    const later = addDays(TODAY, 14)
    const [entry] = await listPassageFreshness(USER, later)
    expect(entry?.freshness).toBe('strong')
  })

  it('lists every passage on the list, including one with no work today', async () => {
    await onList()
    await onList(other, ['Blessed is the spot,', 'and the house.'])
    const entries = await listPassageFreshness(USER, TODAY)
    expect(entries.map((entry) => entry.passage.title)).toEqual([
      'Remove not, O Lord',
      'Blessed is the spot',
    ])
  })
})

describe('getPassageDetail', () => {
  it('is null for a passage that is not on the list', async () => {
    expect(await getPassageDetail(USER, passage.id, TODAY)).toBeNull()
  })

  it('answers scope 11.3s five questions about a passage part way through', async () => {
    const segmentIds = await onList()
    await reviewed(segmentIds[0] ?? '', 21, 0, 2)
    await reviewed(segmentIds[1] ?? '', 6, 5)
    // The third line has never been shown.

    const detail = await getPassageDetail(USER, passage.id, TODAY)
    expect(detail).not.toBeNull()
    expect(detail?.freshness).toBe('needsReview')
    expect(detail?.counts).toEqual({ strong: 1, fading: 1, needsReview: 1, resting: 0 })
    expect(detail?.lineCount).toBe(3)
    expect(detail?.longestIntervalDays).toBe(21)
    expect(detail?.lapses).toBe(2)
    expect(detail?.milestoneReachedAt).toBeNull()
    expect(detail?.promoted).toBe(false)
  })

  it('has nothing to report about a passage only just added', async () => {
    await onList()
    const detail = await getPassageDetail(USER, passage.id, TODAY)
    expect(detail?.longestIntervalDays).toBeNull()
    expect(detail?.lapses).toBe(0)
    expect(detail?.counts.needsReview).toBe(3)
  })

  it('carries the milestone date and says the passage comes round whole', async () => {
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 30, 0)
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)

    const detail = await getPassageDetail(USER, passage.id, TODAY)
    expect(detail?.promoted).toBe(true)
    expect(detail?.milestoneReachedAt).not.toBeNull()
  })

  it('keeps the milestone date after a demotion, and says it is back on its lines', async () => {
    // Decision D9.5: the four scheduling columns say whether a passage is
    // promoted now; the date is history, and history does not un-happen.
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 30, 0)
    await recordMilestone(USER, { passageId: passage.id, rating: 'good' }, TODAY)
    await recordMilestone(USER, { passageId: passage.id, rating: 'again' }, TODAY)

    const detail = await getPassageDetail(USER, passage.id, TODAY)
    expect(detail?.promoted).toBe(false)
    expect(detail?.milestoneReachedAt).not.toBeNull()
  })

  it('reports every line of a resting passage as resting', async () => {
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 6, 90)
    await setUpkeepState(USER, passage.id, 'resting')

    const detail = await getPassageDetail(USER, passage.id, TODAY)
    expect(detail?.freshness).toBe('resting')
    expect(detail?.counts.resting).toBe(3)
    expect(detail?.counts.needsReview).toBe(0)
  })
})
