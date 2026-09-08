import type { ReactNode } from 'react'
import { STAR_POLYGON_POINTS, typeStyle } from '../theme'

/**
 * The settings row. Design-tokens 5.7, transcribed.
 *
 * > Padding `13px 0`, 1px `rule` divider, `display:flex; align-items:center;
 * > gap:14px`. The selection star sits right at 14px `accent`, and is **hidden
 * > rather than removed** when unselected so the row does not reflow.
 *
 * It is a component rather than markup on two screens because three screens want
 * it now - Settings for the two queue caps, and the upkeep screen for the three
 * upkeep states and for focus - and because the "hidden rather than removed"
 * rule is exactly the sort of detail that survives in one file and nowhere else.
 *
 * ## The section header inside a settings list is not the list surface's one
 *
 * Design-tokens 5.7 gives it `padding:18px 0 8px` and `on-paper-42`, against
 * 5.3's `22px 0 12px` and `label`. Two different rules for two different
 * surfaces, so this file carries its own rather than reaching for `ListSurface`.
 */

/** Design-tokens 5.3's production minimum, which every row here must also meet. */
const MINIMUM_ROW_HEIGHT = 44

/** Design-tokens 5.7: `padding:13px 0`, flex row, gap 14px, 1px `rule` divider. */
const ROW = { padding: '13px 0', gap: 14, minHeight: MINIMUM_ROW_HEIGHT }

export function SettingsSection({ label }: { label: string }) {
  return (
    <div className="flex items-baseline" style={{ gap: 10, padding: '18px 0 8px' }}>
      <span className="text-on-paper-42" style={typeStyle('sectionHeader')}>
        {label}
      </span>
      <span className="h-px flex-1 bg-rule-md" />
    </div>
  )
}

/**
 * A row that states something and carries a control. The label is a string
 * rather than a node so a literal cannot slip into it (principle 7.11).
 */
export function SettingsRow({
  label,
  caption,
  children,
}: {
  label: string
  caption?: string | undefined
  children?: ReactNode
}) {
  return (
    <div className="flex items-center border-b border-rule last:border-b-0" style={ROW}>
      <span className="min-w-0 flex-1">
        <span className="block text-deep" style={typeStyle('settingsRowLabel')}>
          {label}
        </span>
        {caption !== undefined && (
          <span
            className="block text-on-paper-50"
            style={{ ...typeStyle('settingsRowCaption'), marginTop: 2 }}
          >
            {caption}
          </span>
        )}
      </span>
      {children}
    </div>
  )
}

/**
 * A row that is one of a set of choices, with the selection star at its right.
 *
 * `role="radio"` rather than a pressed button, because these are one choice and
 * not several switches: a screen reader announces "2 of 3" and moving between
 * them with the arrow keys works without anything else being written.
 */
export function SettingsChoiceRow({
  label,
  caption,
  selected,
  onSelect,
}: {
  label: string
  caption: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className="flex w-full items-center border-b border-rule text-left last:border-b-0"
      style={ROW}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-deep" style={typeStyle('settingsRowLabel')}>
          {label}
        </span>
        <span
          className="block text-on-paper-50"
          style={{ ...typeStyle('settingsRowCaption'), marginTop: 2 }}
        >
          {caption}
        </span>
      </span>
      <SelectionStar selected={selected} />
    </button>
  )
}

/**
 * The selection star of design-tokens 5.7: the app's nine-pointed star, 14px, in
 * `accent`.
 *
 * **Hidden rather than removed** when unselected, so choosing a different option
 * does not make the rows above it jump. Design-tokens 5.7 says so explicitly and
 * it is the sort of thing only felt when it is wrong.
 *
 * The same glyph carries the freshness states of design-tokens 4, which session
 * 11 renders on the Memorise tab. It is used here as a selection mark because
 * 5.7 prescribes exactly that, on exactly this row, and that is not a freshness
 * usage any more than the decorative star in the tab bar is.
 *
 * **The points come from `src/theme/ornaments.ts`**, which is where session 10
 * put them so that the home screen icon and the freshness star would be one
 * drawing. This row had its own copy until session 11 and now does not.
 */
export function SelectionStar({ selected }: { selected: boolean }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      className="flex-none text-accent"
      style={{ visibility: selected ? 'visible' : 'hidden' }}
      aria-hidden="true"
      focusable="false"
    >
      <polygon fill="currentColor" points={STAR_POLYGON_POINTS} />
    </svg>
  )
}
