import { ReorderableList, type ReorderableRow } from '../../components/Reorderable'
import { strings } from '../../strings'
import { typeStyle } from '../../theme'
import type { QuizLine } from '../../quiz'

/**
 * **Level 4: the lines of the group put back in order.** Scope 9.1, "order the
 * segments, tap or drag".
 *
 * ## The drag is session 7's, reused rather than rebuilt
 *
 * `src/components/Reorderable.tsx` already moves a flat list of rows with
 * pointer events, takes the pressed wash of design-tokens 6 instead of a
 * floating card, and moves a row with the arrow keys for anyone not using touch
 * (decision D7.5). All of that is exactly what this rung needs, so this file
 * hands it rows and draws what comes back. **Nothing inside the component
 * changed.** Decision D8.3 says what was considered and why.
 *
 * Two things are settled here rather than there, because they are about
 * scripture rather than about dragging.
 *
 * **What a screen reader is told a row is.** `Reorderable` announces a row by
 * its title when it lands. A title of forty words of the Gleanings would be read
 * out in full every time a row moved, so the title is the line's opening words
 * and the row's own text is what is drawn.
 *
 * **The handles go away at the reveal.** `canReorder` is false once the order is
 * shown, which is the same mechanism scope 6.7 uses to make a sorted view of
 * Bookmarks visibly a view: you can see it is finished because you cannot move
 * it any more.
 *
 * **The reveal is announced through the list's own live region.** That is the
 * one change session 8 made inside `Reorderable`, and it is there because two
 * polite live regions on one screen are two queues a screen reader orders as it
 * likes. Decision D8.3.
 *
 * ## What the reveal looks like
 *
 * The lines are redrawn **in the order they run**, and any line the reader had
 * somewhere else carries the same hairline rule a corrected word carries in a
 * chip cloze. Principle 7.2: the correct text is always shown after an attempt,
 * with deviations highlighted. Nothing counts them.
 *
 * **The rule hugs the words rather than spanning the row.** Drawn full width it
 * lands a few pixels above the row's own `rule` divider, and two hairlines that
 * close together read as a drawing error rather than as a mark. Underlining the
 * text is also what the same mark does inside a chip cloze, so the reader meets
 * one idea and not two.
 */

/** Enough of a line for a screen reader to tell one row from another. */
function opening(text: string): string {
  return text.split(/\s+/).slice(0, 5).join(' ')
}

export function OrderedLines({
  lines,
  misplaced,
  revealed,
  announcement,
  onReorder,
}: {
  /** In the order they are currently drawn: the reader's, then the true one. */
  lines: readonly QuizLine[]
  /** Empty until the reveal. The lines that were somewhere else. */
  misplaced: ReadonlySet<string>
  revealed: boolean
  /** Said in the list's live region, so the screen has only one. */
  announcement: string
  onReorder: (orderedIds: readonly string[]) => void
}) {
  const rows: ReorderableRow[] = lines.map((line) => ({
    id: line.segmentId,
    title: opening(line.text),
    content: (
      <span
        className="text-ink"
        style={{
          ...typeStyle('passageBody'),
          textShadow: '0 0 .5px var(--ink-shadow)',
          whiteSpace: 'pre-wrap',
          // The deviation of principle 7.2, drawn exactly as a corrected word
          // is drawn in a chip cloze: a hairline under the words themselves.
          borderBottom: misplaced.has(line.segmentId) ? '1px solid var(--accent-dk)' : undefined,
        }}
      >
        {line.text}
      </span>
    ),
  }))

  return (
    <ReorderableList
      label={strings.accessibility.orderLines}
      rows={rows}
      canReorder={!revealed}
      onReorder={onReorder}
      announcement={announcement}
    />
  )
}
