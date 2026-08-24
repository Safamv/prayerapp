import { DEFAULT_USER_SETTINGS } from '../config/defaults'
import { db } from './db'
import type { UserSettingsRow } from './types'

/**
 * `user_settings`: one row per user, keyed on the user id itself.
 *
 * This is where the theme registry's selection is kept, so that a palette or a
 * text size chosen on Tuesday is still there on Wednesday. The registry itself
 * knows nothing about this module: the provider reports a change, the app writes
 * it here. Keeping the two apart is what lets the theme be tested with no
 * database and the database be tested with no React.
 *
 * Not a memorisation table, but `daily_new_limit` and `daily_review_limit` are
 * queue caps, so Discover has no reason to read it either.
 */

export async function getOrCreateUserSettings(userId: string): Promise<UserSettingsRow> {
  const existing = await db.user_settings.get(userId)
  if (existing !== undefined) return existing

  const row: UserSettingsRow = { user_id: userId, ...DEFAULT_USER_SETTINGS }
  await db.user_settings.put(row)
  return row
}

export async function updateUserSettings(
  userId: string,
  patch: Partial<Omit<UserSettingsRow, 'user_id'>>,
): Promise<UserSettingsRow> {
  const current = await getOrCreateUserSettings(userId)
  const next: UserSettingsRow = { ...current, ...patch }
  await db.user_settings.put(next)
  return next
}
