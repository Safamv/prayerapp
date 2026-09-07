import type { ReactNode } from 'react'
import { typeStyle, type TypeRoleName } from '../theme'

/**
 * **A row of chips: one label, then a set of choices, one of them on.** The sort
 * and filter controls of scope 6.7.
 *
 * ## Why this is derived rather than invented
 *
 * Design-tokens 5 names seven construction patterns and none of them is a chip.
 * Scope 6.2 uses the word ("as a filter: an optional chip"), so the object is
 * sanctioned even though its drawing is not, and the safe way to draw a new
 * object in a system this tight is to build it out of one that already exists
 * rather than to reach for what chips look like in other apps.
 *
 * So a chip **is design-tokens 5.5's two buttons at chip size**. Selected takes
 * the primary: `field` fill, 1px `deep` border, the letterpress highlight, caps
 * label in `accent`. Unselected takes the secondary: transparent, 1px `rule-str`
 * border, caps label in `on-paper-60`. Square corners, because design-tokens 3
 * gives the whole product a radius of nought and a rounded chip would be the one
 * thing on screen that was not printed.
 *
 * The chips wrap rather than scroll sideways. A row that scrolls hides choices
 * behind an edge with nothing to say they are there, and at the largest text
 * size (scope 7.9) four chips do not fit a phone on one line however they are
 * drawn.
 *
 * ## The chip you see is smaller than the chip you tap
 *
 * A chip drawn 44px tall would be a button, and three rows of buttons above a
 * screen of prayers costs a quarter of a phone before the first bookmark. A chip
 * *tapped* at less than 44px is a control a thumb misses, which is the failure
 * that actually matters on a touch screen.
 *
 * So the two are separated. **The `<button>` is the target and measures 44px;
 * the bordered box inside it is the drawing and measures about 26px.** The extra
 * height is real and tappable and simply has no ink in it.
 *
 * The cost is paid for out of the row's own layout rather than out of the
 * screen: the rows no longer carry padding between them, because each one now
 * contains its own generous space, and the label sits in the same wrapping flow
 * as the chips rather than in a fixed column, which is worth about 74px of width
 * per row and takes a wrapped row off the screen. Measured in a browser at
 * 390px, the three rows together are within a few pixels of what they were when
 * the chips were 26px tall and the targets were too small.
 *
 * Note that the targets **must not overlap vertically**, which is why the height
 * is taken honestly rather than clawed back with a negative margin: a tap in an
 * overlap would land on whichever row happened to be drawn on top, and choosing
 * an author while aiming at a collection is worse than a row of tall chips.
 *
 * ## The drawing is separate from the control
 *
 * `ChipBox` below is the drawing on its own, and it is exported, because session
 * 8 needed a second kind of chip: the word bank of scope 9.3, where a chip is
 * one word of a prayer and tapping it spends it. That is a different control -
 * an action rather than one choice out of a set - and it must not be a second
 * drawing. Same box, same border, same square corners, same behaviour when a
 * palette changes.
 *
 * See decisions D7.4, D7.8 and D8.4.
 */

/** Design-tokens 5.3's production minimum, which is what a thumb needs. */
export const TOUCH_TARGET = 44

export interface ChipChoice<T> {
  readonly value: T
  readonly label: string
}

export function ChipRow<T>({
  label,
  ariaLabel,
  choices,
  selected,
  onSelect,
}: {
  label: string
  ariaLabel: string
  choices: readonly ChipChoice<T>[]
  selected: T
  onSelect: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex flex-wrap items-center"
      style={{ gap: 6 }}
    >
      {/* The same word the group is labelled with, so a screen reader is told it
          once rather than twice. It wraps with the chips rather than sitting in a
          column beside them; see the note on width above. */}
      <span
        aria-hidden="true"
        className="flex-none text-on-paper-40"
        style={{ ...typeStyle('rowAttribution'), marginRight: 6 }}
      >
        {label}
      </span>
      {choices.map((choice) => (
        <Chip
          key={String(choice.value)}
          label={choice.label}
          selected={choice.value === selected}
          onSelect={() => {
            onSelect(choice.value)
          }}
        />
      ))}
    </div>
  )
}

/**
 * `role="radio"` rather than a pressed button, for the reason the settings
 * choice rows give: these are one choice out of a set, so a screen reader should
 * say "2 of 4" rather than announcing four independent switches.
 */
function Chip({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex items-center"
      style={{ minHeight: TOUCH_TARGET }}
    >
      <ChipBox filled={selected}>{label}</ChipBox>
    </button>
  )
}

/**
 * **The chip itself, drawn.** Design-tokens 5.5's two buttons at chip size, and
 * nothing about what tapping it does.
 *
 * `filled` takes the primary: `field` fill, 1px `deep` border, the letterpress
 * highlight, label in `accent`. Otherwise the secondary: transparent, 1px
 * `rule-str` border, label in `on-paper-60`.
 *
 * `role` is the type role of the label, and it is the one thing the two kinds of
 * chip differ in. A sort control says `TITLE` in the 8.5px caps slot, because it
 * is a label. A word chip says `Blessed` in the 19px body slot, because it is a
 * word of a prayer and setting scripture in 8.5px capitals would be treating it
 * as furniture. Neither costs any height: the 44px touch target is taller than
 * both boxes (decision D7.8).
 */
export function ChipBox({
  filled,
  role = 'rowAttribution',
  faded = false,
  children,
}: {
  filled: boolean
  role?: TypeRoleName
  /** A chip that has been spent. Design-tokens 6: opacity, and nothing else. */
  faded?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={
        filled
          ? 'border border-deep bg-field text-accent'
          : 'border border-rule-str text-on-paper-60'
      }
      style={{
        ...typeStyle(role),
        padding: '6px 8px',
        opacity: faded ? 0.35 : undefined,
        boxShadow: filled ? 'inset 0 1px 0 var(--letterpress)' : undefined,
      }}
    >
      {children}
    </span>
  )
}
