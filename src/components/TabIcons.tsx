/**
 * The three tab icons. Design-tokens 5.6 asks for a 15px icon above each label.
 *
 * ## Why these three, and how to change them
 *
 * Design-tokens 8.3 originally defined three inline SVGs for the whole app - the
 * nine-pointed star, the magnifier and the back chevron - and none of them was a
 * tab icon. Safa asked for icons and left the choice open, so these are a first
 * pass to be edited rather than a settled design (decision D2.10).
 *
 * Each one is drawn from the product rather than from an icon set:
 *
 * - **Discover** is an open book, because Discover is the library.
 * - **Memorise** is three lines of text growing downward, because that is
 *   literally the method: cumulative line building (scope 8.1).
 * - **Log** is a shelf of bound volumes, because Log is what you have taken in.
 *
 * Deliberately not used: the nine-pointed star, which design-tokens 4 reserves
 * for the freshness state and which would read as a rating if it appeared on a
 * tab; and a flame, which in every other app on the phone means a streak, and a
 * streak on a tab is exactly what principle 7.6 forbids.
 *
 * ## Drawing rules
 *
 * Line art in the same idiom as the back chevron: stroke 1.6, square caps,
 * mitred joins, no rounded corners, no fills, no shadows (design-tokens 3).
 * They take their colour from `currentColor`, so the tab bar sets `accent` when
 * active and `paper` at .42 opacity when not, per design-tokens 5.6, and no
 * colour appears in this file.
 */

import type { ReactNode } from 'react'

/** Design-tokens 5.6: a 15px icon above the label. */
export const TAB_ICON_SIZE = 15

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width={TAB_ICON_SIZE}
      height={TAB_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** An open book: two pages rising from a centre gutter. */
export function DiscoverIcon() {
  return (
    <Icon>
      <path d="M3.5 5.5 L11 7.4 L11 19 L3.5 17.1 Z" />
      <path d="M20.5 5.5 L13 7.4 L13 19 L20.5 17.1 Z" />
    </Icon>
  )
}

/** Three lines of text, each longer than the last: cumulative line building. */
export function MemoriseIcon() {
  return (
    <Icon>
      <path d="M4 7 L11 7" />
      <path d="M4 12 L16 12" />
      <path d="M4 17 L20 17" />
    </Icon>
  )
}

/** A shelf of bound volumes, one leaning as a shelf of read books does. */
export function LogIcon() {
  return (
    <Icon>
      <path d="M4.5 8 L8 8 L8 18.5 L4.5 18.5 Z" />
      <path d="M9.8 5.5 L13.3 5.5 L13.3 18.5 L9.8 18.5 Z" />
      <path d="M15.6 9.6 L19 8.7 L19 18.5 L15.6 18.5 Z" />
      <path d="M3 18.5 L21 18.5" />
    </Icon>
  )
}
