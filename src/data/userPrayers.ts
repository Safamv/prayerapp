import { nowInstant } from './clock'
import { clearPassageSegments } from './corpus'
import { db } from './db'
import { newId } from './ids'
import type {
  PassageSegmentRow,
  ReviewLogRow,
  SegmentProgressRow,
  UserPrayerRow,
  UserPrayerStatus,
} from './types'

/**
 * `user_prayers`: what the user has taken on, and how it is going.
 *
 * **This is a memorisation table and it carries progress.** A row holds
 * `passage_due_date`, `upkeep_state`, `is_focus` and the whole-passage SM-2
 * fields, so anything that reads a row here can render exactly the chrome that
 * principle 7.6 forbids in Discover. Nothing under `src/features/discover/`
 * may import this module, enforced by `src/principles/discover-isolation.test.ts`.
 *
 * Discover's legitimate question, "is this already added", is answered by
 * `isOnList` in `passages.ts`, which returns a boolean and nothing else.
 *
 * The scheduling columns are `null` until session 8 promotes a passage on
 * milestone (scope 8.7). Before that, scheduling happens per segment in
 * `segment_progress`.
 */

export async function addToList(
  userId: string,
  passageId: string,
  startedAt: string = nowInstant(),
): Promise<UserPrayerRow> {
  const existing = await getUserPrayer(userId, passageId)
  if (existing !== undefined) return existing

  const row: UserPrayerRow = {
    id: newId(),
    user_id: userId,
    passage_id: passageId,
    status: 'list',
    upkeep_state: 'active',
    is_focus: false,
    focus_until: null,
    list_order: await nextListOrder(userId),
    started_at: startedAt,
    milestone_reached_at: null,
    passage_ease_factor: null,
    passage_interval_days: null,
    passage_repetitions: null,
    passage_due_date: null,
  }
  await db.user_prayers.put(row)
  return row
}

/**
 * `takeOffList` for a caller with nothing to undo with, which is the undo offered
 * in the moment of adding (decision D4.10). It throws the snapshot away rather
 * than doing anything different, so the two can never diverge in what they
 * destroy.
 */
export async function removeFromList(userId: string, passageId: string): Promise<void> {
  await takeOffList(userId, passageId)
}

/**
 * Everything a removal threw away, kept whole so it can be put back.
 *
 * Scope 6.5 makes removing permanent and frictionless, so there is no "are you
 * sure" in front of it. What stands behind it instead is the band of decision
 * D4.10 with an Undo in it, and an Undo is only honest if the thing it undoes
 * can actually be restored. A passage removed after three weeks has lines,
 * progress against every one of them and a review history, and all three are
 * gone the instant the row is. This is that, held in memory for as long as the
 * band is on screen and dropped with it.
 */
export interface RemovedFromList {
  readonly userPrayer: UserPrayerRow
  readonly segments: readonly PassageSegmentRow[]
  readonly progress: readonly SegmentProgressRow[]
  readonly reviews: readonly ReviewLogRow[]
}

/**
 * Removes the passage from the list and, with it, every trace of having worked
 * on it: the lines it was split into, the progress against them, and the review
 * history all go too. Leaving orphaned progress behind would resurrect a
 * half-learnt state if the passage were ever re-added, which is not what
 * "remove" means to the person tapping it.
 *
 * **The lines go with it** because segmentation happens at the moment of adding
 * (scope 8.4) and belongs to the add: the library ships unsegmented, and a
 * passage taken off the list is back to being a passage in the library. Session
 * 5 added that, when the undo of decision D4.10 became a way of undoing a
 * segmentation the user had just confirmed.
 *
 * **It hands back what it took**, so the list screen of scope 6.5 can offer an
 * Undo that genuinely puts the passage back where it was rather than adding a
 * fresh one with nothing learnt of it. `null` means there was nothing on the
 * list to remove, which is what a second tap on the same row would find.
 */
export async function takeOffList(
  userId: string,
  passageId: string,
): Promise<RemovedFromList | null> {
  return db.transaction(
    'rw',
    db.passages,
    db.user_prayers,
    db.passage_segments,
    db.segment_progress,
    db.review_log,
    async () => {
      const userPrayer = await db.user_prayers
        .where('[user_id+passage_id]')
        .equals([userId, passageId])
        .first()
      if (userPrayer === undefined) return null

      const segments = await db.passage_segments.where('passage_id').equals(passageId).toArray()
      const segmentIds = new Set(segments.map((segment) => segment.id))
      const progress = await db.segment_progress
        .where('user_id')
        .equals(userId)
        .filter((row) => segmentIds.has(row.segment_id))
        .toArray()
      const reviews = await db.review_log
        .where('user_id')
        .equals(userId)
        .filter((row) => segmentIds.has(row.segment_id))
        .toArray()

      await db.user_prayers.delete(userPrayer.id)
      await db.segment_progress.bulkDelete(progress.map((row) => row.id))
      await db.review_log.bulkDelete(reviews.map((row) => row.id))
      await clearPassageSegments(passageId)

      return { userPrayer, segments, progress, reviews }
    },
  )
}

/**
 * Puts back exactly what `takeOffList` took, with the same ids and the same
 * `list_order`, so the row lands where it was rather than at the end.
 *
 * One transaction, like the removal and like the add of decision D5.4: a passage
 * back on the list with no lines under it is a shape session 6's queue assumes
 * cannot happen.
 */
export async function putBackOnList(removed: RemovedFromList): Promise<void> {
  await db.transaction(
    'rw',
    db.passages,
    db.user_prayers,
    db.passage_segments,
    db.segment_progress,
    db.review_log,
    async () => {
      await db.passage_segments.bulkPut([...removed.segments])
      await db.passages.update(removed.userPrayer.passage_id, {
        segment_count: removed.segments.length,
      })
      await db.user_prayers.put(removed.userPrayer)
      await db.segment_progress.bulkPut([...removed.progress])
      await db.review_log.bulkPut([...removed.reviews])
    },
  )
}

export async function getUserPrayer(
  userId: string,
  passageId: string,
): Promise<UserPrayerRow | undefined> {
  return db.user_prayers.where('[user_id+passage_id]').equals([userId, passageId]).first()
}

/** In `list_order`, which is the order the user arranged them in (scope 14, "My list, ordered"). */
export async function listUserPrayers(userId: string): Promise<UserPrayerRow[]> {
  const rows = await db.user_prayers.where('user_id').equals(userId).toArray()
  return rows.sort((a, b) => a.list_order - b.list_order)
}

export async function listUserPrayersByStatus(
  userId: string,
  status: UserPrayerStatus,
): Promise<UserPrayerRow[]> {
  const rows = await db.user_prayers.where('[user_id+status]').equals([userId, status]).toArray()
  return rows.sort((a, b) => a.list_order - b.list_order)
}

/**
 * A partial update, keyed on the row's own id. `id`, `user_id` and `passage_id`
 * are not patchable: changing any of them would be creating a different record
 * while pretending to edit this one.
 */
export async function updateUserPrayer(
  id: string,
  patch: Partial<Omit<UserPrayerRow, 'id' | 'user_id' | 'passage_id'>>,
): Promise<void> {
  await db.user_prayers.update(id, patch)
}

/**
 * Rewrites `list_order` to match the given sequence. Passages the user owns but
 * did not name keep their relative order and follow on behind, so a reorder of
 * the visible page cannot silently shuffle the rest of the list.
 */
export async function reorderList(
  userId: string,
  orderedPassageIds: readonly string[],
): Promise<void> {
  const rows = await listUserPrayers(userId)
  const named = new Map(orderedPassageIds.map((passageId, index) => [passageId, index]))
  const rest = rows.filter((row) => !named.has(row.passage_id))

  await db.transaction('rw', db.user_prayers, async () => {
    for (const row of rows) {
      const index = named.get(row.passage_id)
      if (index !== undefined) {
        await db.user_prayers.update(row.id, { list_order: index })
      }
    }
    for (const [offset, row] of rest.entries()) {
      await db.user_prayers.update(row.id, { list_order: named.size + offset })
    }
  })
}

async function nextListOrder(userId: string): Promise<number> {
  const rows = await db.user_prayers.where('user_id').equals(userId).toArray()
  return rows.reduce((highest, row) => Math.max(highest, row.list_order + 1), 0)
}
