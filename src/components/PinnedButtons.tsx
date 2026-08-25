import type { ReactNode } from 'react'
import { typeStyle } from '../theme'

/**
 * The pinned buttons. Design-tokens 5.5, transcribed.
 *
 * > Fixed to the bottom, padding `0 32px 30px`, stacked in a column with gap
 * > 11px.
 *
 * They go in `Screen`'s footer slot, which is a band below the scrolling body
 * and above the tab bar rather than a layer over either. That is the whole
 * reason the slot exists (decision D4.11): a button floating over a prayer would
 * cover its last line, and the one screen that pins a button today is a screen
 * made of sacred text.
 *
 * Design-tokens 5.5 also describes a secondary variant, transparent with a
 * `rule-str` border. No screen needs one yet, so it is not written yet: an
 * unused component is a component nobody has ever seen rendered.
 *
 * ## The one shadow in the app
 *
 * Design-tokens 3 says shadows are none, with a single exception: the primary
 * button's letterpress highlight, a one pixel white line inside the top edge
 * that makes it read as a struck object rather than a rectangle. The colour is a
 * palette token, so it follows the palette like everything else.
 */

/** Design-tokens 5.5: padding `0 32px 30px`, column, gap 11px. */
const PINNED = { padding: '0 32px 30px', gap: 11 }

/** Design-tokens 5.3's production minimum, which the padding already exceeds. */
const MINIMUM_HEIGHT = 44

export function PinnedButtons({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col bg-paper" style={PINNED}>
      {children}
    </div>
  )
}

/**
 * **Primary.** Fill `field`, 1px border `deep`, the letterpress highlight,
 * padding 15px, centred caps label in `accent`.
 */
export function PrimaryButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="border border-deep bg-field text-center text-accent disabled:opacity-50"
      style={{
        ...typeStyle('primaryButtonLabel'),
        padding: 15,
        minHeight: MINIMUM_HEIGHT,
        boxShadow: 'inset 0 1px 0 var(--letterpress)',
      }}
    >
      {label}
    </button>
  )
}
