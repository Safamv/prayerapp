import type { ReactNode } from 'react'

/**
 * Text that is read and never drawn.
 *
 * Tailwind ships an `sr-only` utility and this sets the same rule inline
 * instead, so an announcement cannot be lost to a purge of a class that appears
 * in only two files. `Reorderable.tsx` carried its own copy of this from session
 * 7; session 8 needs three more of them, so it moved here rather than becoming
 * four.
 *
 * ## Where it is used, and why each one needs it
 *
 * **The live region** on the review screen and on a reordered list, which says
 * what just happened to anyone who cannot see it happen.
 *
 * **A blank in a chip cloze**, which is a hairline rule on screen and has to be
 * a word to a screen reader, or the line is simply read with a gap in it.
 */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span style={STYLE}>{children}</span>
}

/**
 * A live region: what changed, for anyone who cannot see it change.
 *
 * `polite` rather than `assertive` everywhere in this app. An assertive region
 * interrupts, and principle 7.1 keeps the whole product on the calm side of
 * that line.
 */
export function Announcement({ children }: { children: ReactNode }) {
  return (
    <span role="status" aria-live="polite" style={STYLE}>
      {children}
    </span>
  )
}

const STYLE = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const
