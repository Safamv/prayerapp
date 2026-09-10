import { clearPassageSegments, putPassageSegments } from './corpus'
import { db } from './db'
import { newId } from './ids'
import { proposeLines } from '../text/segmentation'
import type { PassageSegmentRow } from './types'
import { addToList, getUserPrayer } from './userPrayers'

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

/**
 * **Adding several passages at once, taking the app's own proposal for each.**
 * Scope 5.4's "add a whole section to the list in one action", scope 8.4.
 *
 * ## How this and scope 8.4's confirmation meet
 *
 * Scope 8.4 is "suggested then confirmed, at add time", and the confirm screen
 * is where a reader merges or splits a line before starting. A section holds two
 * quotations at the median and sixteen at the worst, so putting one confirm
 * screen in front of each would not be one action, it would be sixteen.
 *
 * So the two doors are different and they say so. **Adding one quotation goes
 * through the confirm screen exactly as before**; adding a whole section takes
 * the proposal for every quotation in it and states, on the button, how many
 * lines that is. Nothing is hidden: the count of lines is the same number the
 * confirm screen puts above its own list.
 *
 * What is given up is moving a break before starting, and for this material that
 * is a smaller thing than it sounds: 137 of the 290 Ruhi passages are a single
 * line, so for nearly half of them the confirm screen has nothing to confirm.
 * A quotation whose lines a reader does want to arrange differently can be taken
 * off My list and added on its own, which walks through the confirm screen.
 *
 * A passage already on the list is left exactly as it is - its lines, its
 * schedule and its history are untouched - and is not counted as added.
 */
export async function addProposedSegmentation(
  userId: string,
  passages: readonly { readonly id: string; readonly text: string }[],
): Promise<{ readonly added: readonly string[]; readonly alreadyOnList: number }> {
  const added: string[] = []
  let alreadyOnList = 0

  for (const passage of passages) {
    if ((await getUserPrayer(userId, passage.id)) !== undefined) {
      alreadyOnList += 1
      continue
    }
    const lines = proposeLines(passage.text)
    if (lines.length === 0) continue
    await confirmSegmentation(userId, passage.id, lines)
    added.push(passage.id)
  }

  return { added, alreadyOnList }
}

/** A passage's lines, in the order they are learnt. */
export async function listPassageSegments(passageId: string): Promise<PassageSegmentRow[]> {
  return db.passage_segments
    .where('[passage_id+order_index]')
    .between([passageId, -Infinity], [passageId, Infinity])
    .toArray()
}
