import type { ReactNode } from 'react'
import { BackChevron } from './BackChevron'
import { typeStyle } from '../theme'

/**
 * The navy header. Design-tokens 5.1, all three variants, every measurement
 * transcribed from the table.
 *
 * **Headers are fixed and content scrolls beneath them.** That is the whole
 * reason these are components rather than markup repeated on three screens: the
 * fixed-over-scrolling relationship is a layout contract between the header and
 * the body, and `Screen` in `Screen.tsx` is the other half of it.
 *
 * The back chevron is 17px here rather than the component's 24px default,
 * because design-tokens 5.1 says 17px for both compact variants.
 */

/** Design-tokens 5.1: the compact variants both use a 17px chevron and 17px icons. */
export const HEADER_ICON_SIZE = 17

/** Design-tokens 5.1: flex row, gap 14px. */
const HEADER_GAP = 14

const CLOTH = 'cloth-grain flex-none bg-field'

/**
 * **Tall.** Padding `52px 26px 24px`. Eyebrow in `accent-90` with a 14px
 * margin-bottom, then the 42px display title in `accent`.
 *
 * The search field design-tokens 5.2 allows here is `[v1.0]` (scope 6.3) and is
 * deliberately absent. A library screen is the most natural place in the app to
 * put a search field, which is exactly why it is worth saying out loud that this
 * one has none.
 */
export function TallHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className={CLOTH} style={{ padding: '52px 26px 24px' }}>
      <p className="text-accent-90" style={{ ...typeStyle('eyebrowList'), marginBottom: 14 }}>
        {eyebrow}
      </p>
      <h1 className="text-accent" style={typeStyle('screenTitle')}>
        {title}
      </h1>
    </header>
  )
}

/**
 * **Compact with title.** Padding `46px 22px 22px`. Back chevron, then a 25px
 * display title in `accent`.
 */
export function CompactTitleHeader({ title, onBack }: { title: string; onBack: BackAction }) {
  return (
    <header className={CLOTH} style={{ padding: '46px 22px 22px' }}>
      <div className="flex items-center" style={{ gap: HEADER_GAP }}>
        <BackButton onBack={onBack} />
        <h1 className="min-w-0 text-accent" style={typeStyle('settingsTitle')}>
          {title}
        </h1>
      </div>
    </header>
  )
}

/**
 * **Compact with action.** Padding `46px 22px 15px`. Flex row, gap 14px: back
 * chevron, centred flex-1 caps label in `on-field-66`, then trailing icons.
 *
 * Design-tokens 5.1 describes one trailing icon; the reading view needs two,
 * because scope 6.6 gives the toolbar two distinct actions and says neither may
 * be nested in a menu. The scope owns behaviour and the tokens document owns
 * appearance, so where they meet the scope wins (CLAUDE.md section 2). Every
 * measurement the table gives is kept.
 */
export function CompactActionHeader({
  label,
  onBack,
  children,
}: {
  label: string
  onBack: BackAction
  children?: ReactNode
}) {
  return (
    <header className={CLOTH} style={{ padding: '46px 22px 15px' }}>
      <div className="flex items-center" style={{ gap: HEADER_GAP }}>
        <BackButton onBack={onBack} />
        <p
          className="min-w-0 flex-1 truncate text-center text-on-field-66"
          style={typeStyle('sectionHeader')}
        >
          {label}
        </p>
        {/* Pulled back by the same amount the chevron is, so the trailing mark
            lands 22px from the edge rather than its 44px touch target doing. */}
        <div className="-mr-3 flex flex-none items-center">{children}</div>
      </div>
    </header>
  )
}

export type BackAction = { readonly label: string; readonly onClick: () => void }

/**
 * The chevron, in a 44px touch target.
 *
 * Design-tokens 5.3 sets 44px as the production minimum for a row and calls the
 * reference's 43px a bug in the reference. A 17px chevron with nothing around it
 * would be a far smaller target than that, on the control every pushed screen
 * depends on, so the glyph keeps its 17px and the button grows around it with a
 * negative margin so the header's padding still measures 22px to the mark.
 */
function BackButton({ onBack }: { onBack: BackAction }) {
  return (
    <button
      type="button"
      onClick={onBack.onClick}
      aria-label={onBack.label}
      className="-my-3 -ml-3 flex flex-none items-center justify-center"
      style={{ width: 44, height: 44 }}
    >
      <BackChevron size={HEADER_ICON_SIZE} />
    </button>
  )
}
