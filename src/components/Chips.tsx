import { typeStyle } from '../theme'

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
 * **The padding is tighter than a button's for a reason.** These sit above a
 * screen of prayers, and three rows of them at button height cost a quarter of a
 * phone before the first bookmark. Design-tokens 5.3's 44px minimum is written
 * about list rows and is met by every row beneath these; scope 7.9 puts the full
 * touch-target audit at `[v1.0]`, and this is one of the things it should look
 * at with a real thumb.
 *
 * See decision D7.4.
 */

/**
 * Wide enough for COLLECTION, which is the longest of the three, so all the rows
 * align down one edge. Measured rather than guessed: at 8.5px caps with .16em
 * tracking the word draws 60px, and a column any wider than this is width taken
 * off the chips, which is what makes them wrap onto a second line.
 */
const LABEL_WIDTH = 62

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
    <div className="flex items-baseline" style={{ gap: 12, paddingBottom: 10 }}>
      <span
        className="flex-none text-on-paper-40"
        style={{ ...typeStyle('rowAttribution'), width: LABEL_WIDTH }}
      >
        {label}
      </span>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className="flex min-w-0 flex-1 flex-wrap"
        style={{ gap: 6 }}
      >
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
      className={
        selected
          ? 'border border-deep bg-field text-accent'
          : 'border border-rule-str text-on-paper-60'
      }
      style={{
        ...typeStyle('rowAttribution'),
        padding: '6px 8px',
        boxShadow: selected ? 'inset 0 1px 0 var(--letterpress)' : undefined,
      }}
    >
      {label}
    </button>
  )
}
