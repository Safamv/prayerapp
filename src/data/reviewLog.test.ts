import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './db'
import { appendReviewLog, countReviews, listReviewLog, listReviewLogBetween } from './reviewLog'

/**
 * `review_log`. Append-only, and it records only the user's own rating of
 * themselves: scope 9.7 removed `auto_score` because nothing in this app grades
 * anybody (principle 7.2).
 */

const USER = 'user-1'

beforeEach(async () => {
  await resetDatabase()
})

describe('the review log', () => {
  it('records a review with the self-rating and nothing auto-scored', async () => {
    const row = await appendReviewLog(
      USER,
      { segmentId: 'segment-1', quizType: 'level4', selfRating: 'hard' },
      '2026-08-24T06:00:00.000Z',
    )

    expect(row.self_rating).toBe('hard')
    expect(row.quiz_type).toBe('level4')
    expect(Object.keys(row)).not.toContain('auto_score')
  })

  it('appends rather than replaces, so the same segment can be reviewed again', async () => {
    await appendReviewLog(USER, { segmentId: 's', quizType: 'level2', selfRating: 'again' })
    await appendReviewLog(USER, { segmentId: 's', quizType: 'level2', selfRating: 'good' })

    expect(await countReviews(USER)).toBe(2)
  })

  it('reads oldest first, because a history is read forwards', async () => {
    await appendReviewLog(
      USER,
      { segmentId: 'b', quizType: 'level2', selfRating: 'good' },
      '2026-08-22T00:00:00.000Z',
    )
    await appendReviewLog(
      USER,
      { segmentId: 'a', quizType: 'level2', selfRating: 'good' },
      '2026-08-20T00:00:00.000Z',
    )

    expect((await listReviewLog(USER)).map((row) => row.segment_id)).toEqual(['a', 'b'])
  })

  it('reads a window, inclusive at both ends', async () => {
    for (const day of ['19', '20', '21', '22']) {
      await appendReviewLog(
        USER,
        { segmentId: `s-${day}`, quizType: 'level2', selfRating: 'good' },
        `2026-08-${day}T00:00:00.000Z`,
      )
    }

    const window = await listReviewLogBetween(
      USER,
      '2026-08-20T00:00:00.000Z',
      '2026-08-21T00:00:00.000Z',
    )
    expect(window.map((row) => row.segment_id)).toEqual(['s-20', 's-21'])
  })

  it('keeps one user history out of another', async () => {
    await appendReviewLog(USER, { segmentId: 's', quizType: 'level2', selfRating: 'good' })
    await appendReviewLog('user-2', { segmentId: 's', quizType: 'level2', selfRating: 'good' })

    expect(await countReviews(USER)).toBe(1)
    expect(await countReviews('user-2')).toBe(1)
  })

  it('is empty for a user who has never reviewed anything', async () => {
    expect(await listReviewLog('nobody')).toEqual([])
    expect(await countReviews('nobody')).toBe(0)
  })
})
