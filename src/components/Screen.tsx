import type { ReactNode } from 'react'

/**
 * A screen: a fixed header with the body scrolling beneath it.
 *
 * Design-tokens 5.1 ("Headers are fixed. Content scrolls beneath them.") and
 * 5.4 ("The body scrolls under the fixed header.").
 *
 * ## Why the scroll moved here from the shell
 *
 * Until this session `App.tsx` gave every route one scrolling `<main>`, which
 * was right while every screen was a title and a paragraph. It cannot express a
 * fixed header: a header inside a scrolling container scrolls with it. So the
 * shell now holds a non-scrolling box and each screen owns its own scrolling
 * body, which is also what lets the reading view keep its toolbar in view
 * through a long prayer.
 *
 * The paper grain lives on the scrolling body rather than on the shell, so the
 * grain is the paper and moves with it (design-tokens 5.3, 5.4).
 *
 * The optional footer is a band below the scrolling body and above the tab bar.
 * It holds the toast, and from session 5 the pinned buttons of design-tokens
 * 5.5. It is a sibling of the body rather than a layer over it, so nothing it
 * shows ever covers the last line of a prayer.
 *
 * ## The two grounds
 *
 * Every screen in the app is bone paper with a navy header above it, and one is
 * not. Scope 9.5 allows the milestone screen "the one place where the visual
 * treatment is allowed to be significant", and the significant thing available
 * inside design-tokens 3 - no rounded corners, no shadows, no animation - is the
 * inversion: navy cloth edge to edge, where every other screen is paper. It
 * reads as the cover of the book rather than a page of it. Decision D9.2,
 * Safa's call.
 *
 * It is a tone rather than a set of classes passed in, so the two grounds and
 * their two grains stay in one place and a third screen cannot invent a third
 * one by accident.
 */

/** The ground a screen is printed on. `navy` is the milestone screen alone. */
export type ScreenTone = 'paper' | 'navy'

const BODY: Readonly<Record<ScreenTone, string>> = {
  paper: 'paper-grain bg-paper',
  navy: 'cloth-grain bg-field',
}

export function Screen({
  header,
  footer,
  tone = 'paper',
  children,
}: {
  header?: ReactNode
  footer?: ReactNode
  tone?: ScreenTone
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col">
      {header}
      <div className={`${BODY[tone]} min-h-0 flex-1 overflow-y-auto`}>{children}</div>
      {footer}
    </div>
  )
}
