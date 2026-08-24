import { db } from './db'
import { newId } from './ids'
import type { Day, SegmentProgressRow } from './types'

/**
 * `segment_progress`: the per-segment SM-2 state of scope 8.7.
 *
 * A memorisation table. Nothing under `src/features/discover/` may import it
 * (principle 7.6, enforced by `src/principles/discover-isolation.test.ts`).
 *
 * This module stores and retrieves. It does no scheduling arithmetic at all:
 * that belongs to `src/scheduler/`, which is sealed and pure, and the rename
 * between the two shapes lives in `progressMapping.ts`.
 */

export async function getSegmentProgress(
  userId: string,
  segmentId: string,
): Promise<SegmentProgressRow | undefined> {
  return db.segment_progress.where('[user_id+segment_id]').equals([userId, segmentId]).first()
}

/**
 * Writes the state for one segment, creating the row on first review and
 * replacing it afterwards. Keyed on the user and segment pair rather than on a
 * row id, because the caller has just finished a review and knows which segment
 * it was, not which row holds it.
 */
export async function putSegmentProgress(
  userId: string,
  segmentId: string,
  state: Omit<SegmentProgressRow, 'id' | 'user_id' | 'segment_id'>,
): Promise<SegmentProgressRow> {
  const existing = await getSegmentProgress(userId, segmentId)
  const row: SegmentProgressRow = {
    id: existing?.id ?? newId(),
    user_id: userId,
    segment_id: segmentId,
    ...state,
  }
  await db.segment_progress.put(row)
  return row
}

export async function listSegmentProgress(userId: string): Promise<SegmentProgressRow[]> {
  return db.segment_progress.where('user_id').equals(userId).toArray()
}

/**
 * Everything due on or before the given day. Overdue items are included, which
 * is what scope 7.3 requires: they roll forward silently, and the cap that
 * stops them becoming a backlog is applied by the queue in session 6, not here.
 */
export async function listDueSegmentProgress(
  userId: string,
  onOrBefore: Day,
): Promise<SegmentProgressRow[]> {
  const rows = await db.segment_progress
    .where('[user_id+due_date]')
    .between([userId, ''], [userId, onOrBefore], true, true)
    .toArray()
  return rows.sort((a, b) => a.due_date.localeCompare(b.due_date))
}

export async function deleteSegmentProgress(userId: string, segmentId: string): Promise<void> {
  await db.segment_progress.where('[user_id+segment_id]').equals([userId, segmentId]).delete()
}
