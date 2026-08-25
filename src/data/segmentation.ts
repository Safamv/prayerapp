import { clearPassageSegments, putPassageSegments } from './corpus'
import { db } from './db'
import { newId } from './ids'
import type { PassageSegmentRow } from './types'
import { addToList } from './userPrayers'

/**
 * **The write at the end of the confirm screen.** Scope 8.4.
 *
 * > Segmentation runs at the moment a user adds a passage to their list, not at
 * > ingestion.
 *
 * The screen that proposes the lines is `src/features/memorise/`. The splitting
 * itself is `src/text/segmentation.ts`, which is pure and knows nothing about a
 * database. This is the third piece: the moment the user says yes.
 *
 * ## Why it is one function rather than three calls
 *
 * Confirming writes three things: the lines into `passage_segments`, the number
 * of them onto the passage, and the `user_prayers` row that says the passage is
 * on the list. They are one act, so they are one transaction. Two of the three
 * landing would leave a passage on the list with no lines beneath it, and
 * session 6's queue would reach it and find nothing to show.
 *
 * ## A memorisation module
 *
 * Nothing under `src/features/discover/` may import this, for the same reason
 * nothing there may import `userPrayers.ts`: principle 7.6. Discover's part in
 * adding a passage is the tap that opens the confirm screen, and the screen is
 * on the memorisation side of the app.
 */

/**
 * Writes a confirmed segmentation and puts the passage on the list.
 *
 * The lines are written in the order given, which is the order they were shown
 * in and the order scope 8.1 builds them up in. Confirming a second time
 * replaces the first segmentation rather than adding to it.
 */
export async function confirmSegmentation(
  userId: string,
  passageId: string,
  lines: readonly string[],
): Promise<void> {
  if (lines.length === 0) {
    throw new Error(`Cannot add ${passageId} to the list with no lines in it`)
  }

  const rows: PassageSegmentRow[] = lines.map((text, index) => ({
    id: newId(),
    passage_id: passageId,
    order_index: index,
    text,
  }))

  await db.transaction('rw', db.passages, db.passage_segments, db.user_prayers, async () => {
    await clearPassageSegments(passageId)
    await putPassageSegments(rows)
    await db.passages.update(passageId, { segment_count: rows.length })
    await addToList(userId, passageId)
  })
}

/** A passage's lines, in the order they are learnt. */
export async function listPassageSegments(passageId: string): Promise<PassageSegmentRow[]> {
  return db.passage_segments
    .where('[passage_id+order_index]')
    .between([passageId, -Infinity], [passageId, Infinity])
    .toArray()
}
