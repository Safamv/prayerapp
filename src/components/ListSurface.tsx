import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { typeStyle } from '../theme'

/**
 * The list surface. Design-tokens 5.3, transcribed.
 *
 * Padding `0 26px` on paper. A section header row is a caps label, a 1px
 * `rule-md` rule filling the rest of the line, and a count. A row is a 20px body
 * title in `deep` with a secondary caps line 3px below it in `on-paper-44`.
 *
 * ## The 44px rule
 *
 * Design-tokens 5.3: "every row must measure at least 44px tall in production.
 * The reference measures roughly 43px. That is a bug in the reference, not a
 * spec." So the minimum is set here, once, where no screen can forget it.
 */

/** Design-tokens 5.3: the production minimum, not the reference's 43px. */
export const MINIMUM_ROW_HEIGHT = 44

export function ListSurface({ children }: { children: ReactNode }) {
  return <div style={{ padding: '0 26px' }}>{children}</div>
}

/**
 * A section header row. `display:flex; align-items:baseline; gap:10px;
 * padding:22px 0 12px`.
 *
 * The count is optional: a section whose length is already obvious from the
 * screen it is on does not need it repeated.
 */
export function SectionHeader({ label, count }: { label: string; count?: string | undefined }) {
  return (
    <div className="flex items-baseline" style={{ gap: 10, padding: '22px 0 12px' }}>
      <span className="text-label" style={typeStyle('sectionHeader')}>
        {label}
      </span>
      <span className="h-px flex-1 bg-rule-md" />
      {count !== undefined && (
        <span className="text-on-paper-40" style={typeStyle('sectionHeader')}>
          {count}
        </span>
      )}
    </div>
  )
}

/**
 * A row that opens something. `display:flex; align-items:center; gap:13px;
 * padding:11px 0`, a 1px `rule` bottom border, and no border on the last row of
 * a section.
 *
 * `title` is a string rather than a node so that a component cannot slip a
 * literal into it (principle 7.11), and `secondary` is the caps line beneath.
 */
export function ListRow({
  to,
  title,
  secondary,
}: {
  to: string
  title: string
  secondary: string
}) {
  return (
    <Link
      to={to}
      className="flex items-center border-b border-rule last:border-b-0"
      style={{ gap: 13, padding: '11px 0', minHeight: MINIMUM_ROW_HEIGHT }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-deep" style={typeStyle('listRowTitle')}>
          {title}
        </span>
        <span
          className="block text-on-paper-44"
          style={{ ...typeStyle('rowAttribution'), marginTop: 3 }}
        >
          {secondary}
        </span>
      </span>
    </Link>
  )
}

/**
 * Breathing room under the last row of a scrolling list.
 *
 * Design-tokens 5.3 gives the list surface no bottom padding, because the
 * reference screen is 844px tall and does not scroll. A production list does,
 * and without this the final row sits hard against the tab bar.
 */
export function ScrollTail() {
  return <div style={{ height: 34 }} />
}
