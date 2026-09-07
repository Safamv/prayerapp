import type { ReactNode } from 'react'
import { strings } from '../strings'
import { typeStyle } from '../theme'

/**
 * A number the user moves up and down: the two queue caps of scope 8.3, and the
 * count of days a focus runs for (scope 8.6).
 *
 * ## Why a stepper rather than a slider or a field
 *
 * A slider needs a track, a thumb and a fill, none of which the design language
 * has, and it cannot be set exactly by hand on a phone. A number field opens a
 * keyboard over the screen to change 15 to 20. A stepper is two taps and no
 * chrome, and its range is the only thing that has to be decided.
 *
 * ## Drawn rather than written
 *
 * The two marks are line art in the idiom of the back chevron and the tab icons
 * (design-tokens 8.3: "every mark in the app is an inline SVG"), so neither is a
 * character and neither has to be carried by the subset font (decision D4.7).
 * They take their colour from `currentColor`.
 *
 * The whole control meets the 44px touch minimum on each mark, which is the same
 * bargain `NavyHeader`'s back button strikes: the glyph stays small and the
 * button grows around it.
 */

/** Design-tokens 5.3's production minimum, on both marks. */
const TARGET = 44
const MARK = 13

function Mark({ children }: { children: ReactNode }) {
  return (
    <svg
      width={MARK}
      height={MARK}
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

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="-my-3 flex flex-none items-center justify-center text-deep disabled:opacity-30"
      style={{ width: TARGET, height: TARGET }}
    >
      <Mark>{children}</Mark>
    </button>
  )
}

export interface StepperRange {
  readonly minimum: number
  readonly maximum: number
  readonly step: number
}

/**
 * `label` is what the row is called, and is used only to tell a screen reader
 * which control the two marks belong to. The number itself is drawn between
 * them in the settings row label's own size, so the row reads as one line.
 */
export function Stepper({
  label,
  value,
  range,
  onChange,
}: {
  label: string
  value: number
  range: StepperRange
  onChange: (value: number) => void
}) {
  return (
    <div className="flex flex-none items-center" style={{ gap: 2 }}>
      <StepButton
        label={strings.upkeep.fewer(label)}
        disabled={value <= range.minimum}
        onClick={() => {
          onChange(Math.max(value - range.step, range.minimum))
        }}
      >
        <path d="M5 12 H19" />
      </StepButton>
      <span
        className="text-center text-deep tabular-nums"
        style={{ ...typeStyle('settingsRowLabel'), minWidth: 34 }}
      >
        {String(value)}
      </span>
      <StepButton
        label={strings.upkeep.more(label)}
        disabled={value >= range.maximum}
        onClick={() => {
          onChange(Math.min(value + range.step, range.maximum))
        }}
      >
        <path d="M12 5 V19 M5 12 H19" />
      </StepButton>
    </div>
  )
}
