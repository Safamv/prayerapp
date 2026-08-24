import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase } from './db'
import { getOrCreateUserStats, NEW_USER_STATS, updateUserStats } from './userStats'

/**
 * `user_stats`. Session 9 owns the streak arithmetic; this only stores it.
 * Scope 11.5 calls the streak "Days in a row", and principle 7.6 keeps it in Log.
 */

const USER = 'user-1'

beforeEach(async () => {
  await resetDatabase()
})

describe('user stats', () => {
  it('starts a new user at zero with no active day', async () => {
    const stats = await getOrCreateUserStats(USER)

    expect(stats).toEqual({ user_id: USER, ...NEW_USER_STATS })
    expect(stats.last_active_date).toBeNull()
  })

  it('creates the row once and reads the same one afterwards', async () => {
    await updateUserStats(USER, { streak_current: 4 })

    expect((await getOrCreateUserStats(USER)).streak_current).toBe(4)
  })

  it('patches only the named columns', async () => {
    await updateUserStats(USER, { streak_current: 3, streak_longest: 9 })
    const stats = await updateUserStats(USER, { last_active_date: '2026-08-24' })

    expect(stats.streak_current).toBe(3)
    expect(stats.streak_longest).toBe(9)
    expect(stats.last_active_date).toBe('2026-08-24')
  })

  it('keys on the user id, so two users each have their own row', async () => {
    await updateUserStats(USER, { total_reviews: 12 })
    await updateUserStats('user-2', { total_reviews: 300 })

    expect((await getOrCreateUserStats(USER)).total_reviews).toBe(12)
    expect((await getOrCreateUserStats('user-2')).total_reviews).toBe(300)
  })
})
