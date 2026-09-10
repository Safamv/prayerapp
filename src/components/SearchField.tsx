import { typeStyle } from '../theme'

/**
 * **The search field.** Design-tokens 5.2, transcribed.
 *
 * > Padding `9px 12px`, fill `field-tint`, 1px border `accent-34`, gap 10px.
 * > 13px magnifier icon (stroke `accent-80`, width 1.7, circle r6.5 at
 * > 10.5/10.5, line 15.4,15.4 to 20.5,20.5), then placeholder text in
 * > `on-field-55`.
 *
 * ## Where it is allowed to be, and where it is not
 *
 * Design-tokens 5.2 puts it "inside a tall header", and the tall header is the
 * top of a tab. **The library's tall header deliberately has none**: full-text
 * search of the library is scope 6.3 and stays at `[v1.0]`, and a search field
 * on the most natural screen in the app for one would be a promise the build has
 * not made (see `TallHeader`).
 *
 * The one search the app does have is scope 5.4's, inside the Ruhi route, and
 * that route's first screen is pushed rather than a tab, so it carries the
 * compact header with a title instead. The scope owns behaviour and the tokens
 * document owns appearance; where they meet the scope wins (CLAUDE.md section
 * 2), so the field keeps every measurement 5.2 gives it and sits under a title
 * rather than under a 42px one. The 22px above it is the tall header's own
 * figure for the same gap.
 *
 * ## Why the icon is not in `ToolbarIcons`
 *
 * It is not a control. It is part of the field's drawing, it never receives a
 * tap, and it is `aria-hidden` because the field's own label already says what
 * the field is for.
 */

/** Design-tokens 5.2, exactly. */
const FIELD = { padding: '9px 12px', gap: 10 }
const ICON_SIZE = 13

/** Design-tokens 5.3's production minimum, which a 13px field does not reach on its own. */
const MINIMUM_HEIGHT = 44

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  /** Drawn inside the field. A string, so no component can put a literal here. */
  placeholder: string
  /** Heard. The field has no visible label, so it needs one of its own. */
  label: string
}) {
  return (
    <div
      className="flex items-center border border-accent-34 bg-field-tint"
      style={{ ...FIELD, minHeight: MINIMUM_HEIGHT }}
    >
      <MagnifierIcon />
      <input
        type="search"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={placeholder}
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-accent-90 outline-none placeholder:text-on-field-55"
        style={typeStyle('searchPlaceholder')}
      />
    </div>
  )
}

function MagnifierIcon() {
  return (
    <svg
      aria-hidden="true"
      className="flex-none"
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
    >
      <g className="text-accent-80">
        <circle cx={10.5} cy={10.5} r={6.5} />
        <line x1={15.4} y1={15.4} x2={20.5} y2={20.5} />
      </g>
    </svg>
  )
}
