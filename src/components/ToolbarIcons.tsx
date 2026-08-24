import type { ReactNode } from 'react'
import { HEADER_ICON_SIZE } from './NavyHeader'

/**
 * The two reading-view toolbar icons. Scope 6.6.
 *
 * > Two distinct actions in the toolbar. **Bookmark:** "Find this again on
 * > Sunday." Devotional. **Add to my list:** "I intend to learn this." A
 * > commitment. Different icons, both one tap, neither nested in a menu. They
 * > are different intents and conflating them makes both worse.
 *
 * Design-tokens 8.3 defines six drawings for the whole app and neither of these
 * is among them, so they are drawn here in the same idiom as the tab icons and
 * are as open to being redrawn as those were (decision D2.10). Each is drawn
 * from the product:
 *
 * - **Bookmark** is a ribbon marker, the thing you actually put in a prayer book
 *   to find Sunday's place again.
 * - **Add to my list** is the Memorise tab's three ascending rules - cumulative
 *   line building, scope 8.1 - with a mark added beside them, because the list
 *   is the queue those lines are learnt from. Adding shows a plus, and a passage
 *   already added shows a tick.
 *
 * Deliberately not used: the nine-pointed star, which design-tokens 4 reserves
 * for freshness and which principle 7.6 bans from the reading view outright. A
 * starred-item metaphor here would read as the freshness star and would breach
 * the principle by looking like it, without importing a thing.
 *
 * ## Drawing rules
 *
 * Design-tokens 8.3: stroke 1.6, square caps, mitred joins, no fills, no
 * rounded corners, colour from `currentColor` so the button sets the token.
 *
 * **State is carried by colour and by the mark, never by a fill.** No-fills is
 * a drawing rule, so a bookmark cannot go solid to say it is set. The button
 * moves from `on-field-66` to `accent` instead, and the add icon changes its
 * mark from a plus to a tick, which is the louder of the two signals and is on
 * the action that cannot be undone from here.
 */

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width={HEADER_ICON_SIZE}
      height={HEADER_ICON_SIZE}
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

/** A ribbon marker, notched at the foot as a ribbon hangs. */
export function BookmarkIcon() {
  return (
    <Icon>
      <path d="M6 3.5 L18 3.5 L18 20.5 L12 14.8 L6 20.5 Z" />
    </Icon>
  )
}

/** Three ascending rules and a plus: this text, added to what you are learning. */
export function AddToListIcon() {
  return (
    <Icon>
      <path d="M3.5 6.5 L14 6.5" />
      <path d="M3.5 12 L11 12" />
      <path d="M3.5 17.5 L14 17.5" />
      <path d="M17.5 8.5 L17.5 15.5" />
      <path d="M14 12 L21 12" />
    </Icon>
  )
}

/** The same three rules with a tick: this text is already on the list. */
export function OnListIcon() {
  return (
    <Icon>
      <path d="M3.5 6.5 L14 6.5" />
      <path d="M3.5 12 L11 12" />
      <path d="M3.5 17.5 L14 17.5" />
      <path d="M14.5 12.4 L17 15 L21.5 8.5" />
    </Icon>
  )
}
