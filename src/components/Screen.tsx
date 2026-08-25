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
 */
export function Screen({
  header,
  footer,
  children,
}: {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex h-full flex-col">
      {header}
      <div className="paper-grain min-h-0 flex-1 overflow-y-auto bg-paper">{children}</div>
      {footer}
    </div>
  )
}
