import { getPassage } from './corpus'
import { db } from './db'
import { listUserPrayers } from './userPrayers'
import { DEFAULT_FOCUS_DAYS, FOCUS_DAYS_RANGE, clampToRange } from '../config/defaults'
import { focusUntilDay, isFocusActive, isFocusExpired } from '../queue'
import type { Day, PassageRow, UpkeepState, UserPrayerRow } from './types'

/**
 * **How a passage comes round, and what the user is driving at.** Scope 8.5 and
 * 8.6, as writes against `user_prayers`.
 *
 * Three columns, and no others: `upkeep_state`, `is_focus` and `focus_until`.
 * Nothing here computes an interval or a due date. Scope 8.5's multiplier of
 * three lives in `src/scheduler/`, is applied when a date is chosen and is never
 * stored (decision D1.1), so changing a passage between active and occasional
 * writes one column and touches no SM-2 state at all. That is what makes moving
 * it back lose nothing.
 *
 * A memorisation module. Nothing under `src/features/discover/` may import it
 * (principle 7.6).
 */

/** A passage on the list, with the row that says how it is going. */
export interface ListedPassage {
  readonly passage: PassageRow
  readonly userPrayer: UserPrayerRow
}

/**
 * Everything on the user's list, in the order they arranged it.
 *
 * A row whose passage has left the committed corpus is dropped rather than
 * shown, because decision D5.9 already removes the list row when a record is
 * withdrawn and this is the belt to that brace.
 */
export async function listPassagesOnList(userId: string): Promise<ListedPassage[]> {
  const rows = await listUserPrayers(userId)
  const listed = await Promise.all(
    rows.map(async (userPrayer) => {
      const passage = await getPassage(userPrayer.passage_id)
      return passage === undefined ? null : { passage, userPrayer }
    }),
  )
  return listed.filter((entry): entry is ListedPassage => entry !== null)
}

export async function getListedPassage(
  userId: string,
  passageId: string,
): Promise<ListedPassage | undefined> {
  const [passage, userPrayer] = await Promise.all([
    getPassage(passageId),
    db.user_prayers.where('[user_id+passage_id]').equals([userId, passageId]).first(),
  ])
  if (passage === undefined || userPrayer === undefined) return undefined
  return { passage, userPrayer }
}

/** Scope 8.5. One column, and nothing else moves. */
export async function setUpkeepState(
  userId: string,
  passageId: string,
  upkeepState: UpkeepState,
): Promise<void> {
  const row = await db.user_prayers
    .where('[user_id+passage_id]')
    .equals([userId, passageId])
    .first()
  if (row === undefined) return
  await db.user_prayers.update(row.id, { upkeep_state: upkeepState })
}

/**
 * Scope 8.6. Turns focus on, with an end date.
 *
 * The count of days is clamped to the range in `src/config/defaults.ts`, and the
 * date is always computed from today rather than extended from an existing one,
 * so changing seven days to ten means ten days from now and not seventeen.
 */
export async function startFocus(
  userId: string,
  passageId: string,
  today: Day,
  days: number = DEFAULT_FOCUS_DAYS,
): Promise<void> {
  const row = await db.user_prayers
    .where('[user_id+passage_id]')
    .equals([userId, passageId])
    .first()
  if (row === undefined) return
  await db.user_prayers.update(row.id, {
    is_focus: true,
    focus_until: focusUntilDay(today, clampToRange(days, FOCUS_DAYS_RANGE)),
  })
}

/** Ends focus early. The user can always do this; scope 8.6's expiry is the floor, not the only way. */
export async function endFocus(userId: string, passageId: string): Promise<void> {
  const row = await db.user_prayers
    .where('[user_id+passage_id]')
    .equals([userId, passageId])
    .first()
  if (row === undefined) return
  await db.user_prayers.update(row.id, { is_focus: false, focus_until: null })
}

/**
 * Scope 8.6: "On expiry it releases automatically and tells the user."
 *
 * Called when the Memorise tab is opened. It clears every focus whose day has
 * come and **returns what it cleared**, which is the only reason it returns
 * anything: the screen has to be able to say so. An empty array is the ordinary
 * case and means there is nothing to tell.
 *
 * The queue does not depend on this having run. `isFocusActive` checks the date
 * on every build, so an app left closed for a month is not still suppressing a
 * list because nothing got round to writing a column.
 */
export async function releaseExpiredFocus(userId: string, today: Day): Promise<PassageRow[]> {
  const rows = await listUserPrayers(userId)
  const expired = rows.filter((row) =>
    isFocusExpired({ isFocus: row.is_focus, focusUntil: row.focus_until }, today),
  )
  if (expired.length === 0) return []

  await db.transaction('rw', db.user_prayers, async () => {
    for (const row of expired) {
      await db.user_prayers.update(row.id, { is_focus: false, focus_until: null })
    }
  })

  const passages = await Promise.all(expired.map((row) => getPassage(row.passage_id)))
  return passages.filter((passage): passage is PassageRow => passage !== undefined)
}

/**
 * The passages focus is in force on today, in list order. Empty when focus is
 * off, which is the ordinary case and the one where nothing is suppressed.
 */
export async function listFocusedPassages(userId: string, today: Day): Promise<ListedPassage[]> {
  const listed = await listPassagesOnList(userId)
  return listed.filter((entry) =>
    isFocusActive(
      { isFocus: entry.userPrayer.is_focus, focusUntil: entry.userPrayer.focus_until },
      today,
    ),
  )
}
