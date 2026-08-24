import type { UserSettingsRow } from '../data/types'
import { DEFAULT_PALETTE_ID, DEFAULT_TEXT_SCALE, DEFAULT_TYPEFACE_ID } from '../theme'

/**
 * The tuneable constants the scope names, in one place (CLAUDE.md section 9).
 *
 * The scheduler's own numbers are deliberately not here. It may import nothing,
 * so it carries its own defaults and takes overrides as an argument
 * (decision D1.7). Everything in this file is a number a user or a later session
 * can change without the scheduler knowing.
 */

/** Scope 8.3: "Default 15 reviews and 2 new segments per day, user-adjustable." */
export const DEFAULT_DAILY_REVIEW_LIMIT = 15
export const DEFAULT_DAILY_NEW_LIMIT = 2

/**
 * The row written for a user on first run. Scope 7.9's text size and scope
 * 12.3's palette and typeface come from the theme registry, so there is one
 * definition of "Paris Navy is the default" and not two that can drift.
 *
 * `high_contrast` is `[v1.0]` (scope 7.9). The column exists now and is false.
 */
export const DEFAULT_USER_SETTINGS: Omit<UserSettingsRow, 'user_id'> = Object.freeze({
  daily_new_limit: DEFAULT_DAILY_NEW_LIMIT,
  daily_review_limit: DEFAULT_DAILY_REVIEW_LIMIT,
  text_size: DEFAULT_TEXT_SCALE,
  high_contrast: false,
  typeface: DEFAULT_TYPEFACE_ID,
  palette: DEFAULT_PALETTE_ID,
})
