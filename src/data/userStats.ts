import { db } from './db'
import type { UserStatsRow } from './types'

/**
 * `user_stats`: streak and lifetime totals. One row per user, keyed on the user
 * id itself, so scope section 10 gives it no separate `id`.
 *
 * A memorisation table. Principle 7.6 puts the streak in Log and nowhere else,
 * so nothing under `src/features/discover/` may import this.
 *
 * Session 9 owns the streak arithmetic. This module only stores what it works out.
 */

export const NEW_USER_STATS: Omit<UserStatsRow, 'user_id'> = Object.freeze({
  streak_current: 0,
  streak_longest: 0,
  last_active_date: null,
  total_reviews: 0,
})

/** Reads the row, creating it from `NEW_USER_STATS` if this is a first run. */
export async function getOrCreateUserStats(userId: string): Promise<UserStatsRow> {
  const existing = await db.user_stats.get(userId)
  if (existing !== undefined) return existing

  const row: UserStatsRow = { user_id: userId, ...NEW_USER_STATS }
  await db.user_stats.put(row)
  return row
}

export async function updateUserStats(
  userId: string,
  patch: Partial<Omit<UserStatsRow, 'user_id'>>,
): Promise<UserStatsRow> {
  const current = await getOrCreateUserStats(userId)
  const next: UserStatsRow = { ...current, ...patch }
  await db.user_stats.put(next)
  return next
}
