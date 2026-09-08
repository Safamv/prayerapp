import type { ReactNode } from 'react'
import type { ScreenTone } from './Screen'
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
 * Design-tokens 5.5's secondary variant - transparent, a 1px `rule-str` border,
 * a caps label in `on-paper-60` - was described from session 5 and written in
 * session 8, when the four self-ratings of scope 9.6 became the first thing in
 * the app that needed four equal choices rather than one primary action.
 *
 * ## The one measurement that gives way
 *
 * Design-tokens 5.5 gives a button `padding: 15px` and the secondary `13px`, all
 * round. Four secondary buttons sharing one row on a 390px phone cannot each
 * carry 13px of horizontal padding around a tracked caps label and still fit, so
 * **the vertical measurement is kept exactly and the horizontal one gives way**,
 * with the four sharing the width equally. Height is what the 44px touch target
 * is made of (decision D7.8) and it is not negotiable; width never was.
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

/**
 * ## The band follows the ground it sits on
 *
 * The footer is a sibling of the scrolling body rather than a layer over it, so
 * on the navy milestone screen of decision D9.2 a paper band would draw a hard
 * bone edge across the bottom of a navy page. The tone is the same one `Screen`
 * takes, so the two cannot disagree about which screen this is.
 *
 * Design-tokens 1.1 supplies every colour used here. On navy a secondary button
 * takes the border the tokens give a bordered thing on navy (`accent-34`, the
 * search field's) and the label colour they give text on navy (`accent-90`, the
 * eyebrow's). No token was invented and no colour was written down.
 */
const BAND: Readonly<Record<ScreenTone, string>> = {
  paper: 'bg-paper',
  navy: 'bg-field',
}

const SECONDARY: Readonly<Record<ScreenTone, string>> = {
  paper: 'border-rule-str text-on-paper-60',
  navy: 'border-accent-34 text-accent-90',
}

const ROW_LABEL: Readonly<Record<ScreenTone, string>> = {
  paper: 'text-on-paper-40',
  navy: 'text-on-field-55',
}

export function PinnedButtons({
  tone = 'paper',
  children,
}: {
  tone?: ScreenTone
  children: ReactNode
}) {
  return (
    <div className={`flex shrink-0 flex-col ${BAND[tone]}`} style={PINNED}>
      {children}
    </div>
  )
}

/**
 * **Secondary.** Transparent, 1px border `rule-str`, padding 13px, centred caps
 * label in `on-paper-60`. Design-tokens 5.5.
 *
 * `wide` puts it in a row of equals rather than alone in the column: it takes an
 * equal share of the width and gives up its horizontal padding to do so. See the
 * note above.
 */
export function SecondaryButton({
  label,
  onClick,
  wide = false,
  tone = 'paper',
}: {
  label: string
  onClick: () => void
  wide?: boolean
  tone?: ScreenTone
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border text-center ${SECONDARY[tone]}${wide ? ' min-w-0 flex-1' : ''}`}
      style={{
        ...typeStyle('secondaryButtonLabel'),
        padding: wide ? '13px 2px' : 13,
        minHeight: MINIMUM_HEIGHT,
      }}
    >
      {label}
    </button>
  )
}

/**
 * A row of equal choices inside the pinned band, rather than the column
 * design-tokens 5.5 describes.
 *
 * The four self-ratings of scope 9.6 are one question with four answers, so they
 * belong on one line: stacked they would be 4 x 44px plus gaps, which is a fifth
 * of a phone given to a control that is answered in one tap. The gap is 8px
 * rather than the column's 11px for the same reason - four gaps in a row cost
 * four times what one gap in a column does.
 */
export function PinnedRow({
  label,
  ariaLabel,
  tone = 'paper',
  children,
}: {
  /** Drawn, so it is in the caps slot and written in capitals (design-tokens 2.3). */
  label: string
  /** Heard, so it is a sentence. The same pairing `ChipRow` uses. */
  ariaLabel: string
  tone?: ScreenTone
  children: ReactNode
}) {
  return (
    <div role="group" aria-label={ariaLabel}>
      {/* The question the row answers, drawn as well as read. Four bordered
          words with nothing above them are four words; with the question they
          are one question, and this is the most important control in the app. */}
      <p
        aria-hidden="true"
        className={`text-center ${ROW_LABEL[tone]}`}
        style={{ ...typeStyle('sectionHeader'), marginBottom: 11 }}
      >
        {label}
      </p>
      <div className="flex" style={{ gap: 8 }}>
        {children}
      </div>
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
