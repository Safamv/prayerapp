import { useCallback, useRef, useState, type ReactNode } from 'react'
import { strings } from '../strings'
import { MINIMUM_ROW_HEIGHT } from './ListSurface'

/**
 * **A list you arrange by hand.** Scope 6.7's rule, which governs Bookmarks and
 * My list identically: "they are the same interaction on different material".
 *
 * It lives in `src/components/` for exactly that reason. Two screens, one
 * behaviour, and the scope is explicit that the behaviour may not differ between
 * them - so it is one component rather than two implementations that agree
 * today.
 *
 * ## Why the drag is written rather than installed
 *
 * CLAUDE.md rule 6 makes a dependency a decision, and every drag-and-drop
 * library in the ecosystem is larger than this file, ships its own motion
 * vocabulary that design-tokens 6 would have to be argued out of, and solves a
 * general problem - nested lists, multiple containers, cross-list transfer -
 * that this app does not have. What it does have is one flat list of rows on a
 * touch screen, which is a hundred lines. See decision D7.5.
 *
 * **Pointer events, not HTML5 drag-and-drop.** The native `dragstart` API does
 * not fire on touch at all, and this is a phone app first.
 *
 * ## How it moves
 *
 * The lifted row does not float. It takes the pressed wash of design-tokens 6 -
 * "a low-opacity `field` wash, no scale, no ripple, no bounce" - and the rows
 * swap places under the finger as it crosses their midpoints. That is the whole
 * animation, and it is deliberately the same treatment every other pressed thing
 * in the app gets. A row that lifted, tilted and cast a shadow would be the only
 * object in the product that behaves like software.
 *
 * ## How it moves without a finger
 *
 * The handle is a button, so it takes focus, and the up and down arrows move the
 * row it belongs to. A live region says where the row landed. This is the only
 * way to reorder anything without touch, so it is not an enhancement.
 *
 * ## Where the order lives
 *
 * While a drag is in flight the order is this component's; the moment it ends it
 * is the caller's again, and `onReorder` is what hands it over. That is the same
 * shape as `useMark` in the reading view and for the same reason (decision
 * D5.6): a screen that copied the arrangement into an effect could redraw a drag
 * and then quietly undo it when a slower read came back.
 */

export interface ReorderableRow {
  readonly id: string
  /** What a screen reader calls this row when it announces where it went. */
  readonly title: string
  readonly content: ReactNode
  /** A control at the trailing edge, before the handle. */
  readonly trailing?: ReactNode
}

export function ReorderableList({
  label,
  rows,
  canReorder,
  onReorder,
}: {
  label: string
  rows: readonly ReorderableRow[]
  /**
   * Scope 6.7: the hand order is one of the sorts, and choosing another is a
   * view over the same material rather than a rewrite of it. So the handles are
   * simply absent under any other sort, and there is no arrangement to destroy.
   */
  canReorder: boolean
  onReorder: (orderedIds: readonly string[]) => void
}) {
  const listRef = useRef<HTMLUListElement>(null)
  const [dragging, setDragging] = useState<{ id: string; order: readonly string[] } | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const byId = new Map(rows.map((row) => [row.id, row]))
  const shown =
    dragging === null
      ? rows
      : dragging.order.flatMap((id) => {
          const row = byId.get(id)
          return row === undefined ? [] : [row]
        })

  const announce = useCallback((title: string, index: number, total: number) => {
    setAnnouncement(strings.reorder.movedTo(title, index + 1, total))
  }, [])

  const move = useCallback(
    (row: ReorderableRow, to: number) => {
      const order = rows.map((each) => each.id)
      const from = order.indexOf(row.id)
      if (from === -1) return
      const next = moved(order, from, clamp(to, order.length))
      onReorder(next)
      announce(row.title, next.indexOf(row.id), next.length)
    },
    [rows, onReorder, announce],
  )

  const onPointerDown = (event: React.PointerEvent, id: string) => {
    if (!canReorder) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging({ id, order: rows.map((row) => row.id) })
  }

  const onPointerMove = (event: React.PointerEvent, id: string) => {
    if (dragging === null || dragging.id !== id) return
    const target = indexUnder(listRef.current, event.clientY)
    if (target === null) return
    const from = dragging.order.indexOf(id)
    if (from === -1 || from === target) return
    setDragging({ id, order: moved(dragging.order, from, target) })
  }

  const onPointerUp = (id: string) => {
    if (dragging === null || dragging.id !== id) return
    const order = dragging.order
    setDragging(null)
    onReorder(order)
    const row = byId.get(id)
    if (row !== undefined) announce(row.title, order.indexOf(id), order.length)
  }

  return (
    <>
      <ul ref={listRef} aria-label={label}>
        {shown.map((row, index) => (
          <li
            key={row.id}
            className="flex items-center border-b border-rule last:border-b-0"
            style={{
              gap: 13,
              padding: '11px 0',
              minHeight: MINIMUM_ROW_HEIGHT,
              // Design-tokens 6: the pressed wash, and nothing else.
              backgroundColor: dragging?.id === row.id ? 'var(--field-tint)' : undefined,
            }}
          >
            <span className="min-w-0 flex-1">{row.content}</span>
            {row.trailing}
            {canReorder && (
              <button
                type="button"
                aria-label={strings.reorder.handle(row.title)}
                className="-my-3 flex flex-none items-center justify-center text-on-paper-40"
                style={{ width: 44, height: 44, touchAction: 'none', cursor: 'grab' }}
                onPointerDown={(event) => {
                  onPointerDown(event, row.id)
                }}
                onPointerMove={(event) => {
                  onPointerMove(event, row.id)
                }}
                onPointerUp={() => {
                  onPointerUp(row.id)
                }}
                onPointerCancel={() => {
                  onPointerUp(row.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    move(row, index - 1)
                  }
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    move(row, index + 1)
                  }
                }}
              >
                <GripIcon />
              </button>
            )}
          </li>
        ))}
      </ul>
      {/* Where a row landed, for anyone who cannot see it land. */}
      <span role="status" aria-live="polite" className="sr-only" style={SR_ONLY}>
        {announcement}
      </span>
    </>
  )
}

/**
 * The grip. Design-tokens 8.3 defines no such mark, so it is drawn here in the
 * same idiom as every other icon in the app (decision D2.10): stroke 1.6, square
 * caps, no fill, colour from `currentColor`.
 *
 * Two short rules stacked, which is what a grip is in every app on the phone.
 * Being conventional is the point: it is the one mark in the product whose whole
 * job is to be recognised without being read.
 */
function GripIcon() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 9.5 L18 9.5" />
      <path d="M6 14.5 L18 14.5" />
    </svg>
  )
}

/** Which row the pointer is over, by the midpoints of the rows as drawn. */
function indexUnder(list: HTMLUListElement | null, y: number): number | null {
  if (list === null) return null
  const items = [...list.children]
  if (items.length === 0) return null

  for (const [index, item] of items.entries()) {
    const box = item.getBoundingClientRect()
    if (y < box.top + box.height / 2) return index
  }
  return items.length - 1
}

function moved(order: readonly string[], from: number, to: number): string[] {
  const next = [...order]
  const [row] = next.splice(from, 1)
  if (row !== undefined) next.splice(to, 0, row)
  return next
}

function clamp(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length - 1)
}

/**
 * Read but never drawn. Tailwind's own `sr-only` is a utility class, and this
 * component sets the same rule inline so the announcement cannot be lost to a
 * purge of a class that appears nowhere else in the app.
 */
const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const
