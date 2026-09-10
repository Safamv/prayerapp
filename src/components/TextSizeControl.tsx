import { strings } from '../strings'
import { TEXT_SCALE_STEPS, typeStyle } from '../theme'
import { FEWER_MARK, MORE_MARK, StepButton } from './Stepper'
import { Announcement } from './VisuallyHidden'

/**
 * **The text size control.** Scope 7.9, design-tokens 2.4.
 *
 * > Adjustable text size with a genuinely large maximum ships in V0.
 *
 * Six steps, from 0.9 to 1.75, which the theme registry holds in
 * `TEXT_SCALE_STEPS`. What the user moves is one multiplier; what it does to
 * each of the eighteen roles is the arithmetic of design-tokens 2.4, clamped
 * per role so that prayer text reaches the full range and headings stop sooner
 * (decision D2.6).
 *
 * ## The control has no words for its steps, on purpose
 *
 * Naming six steps means inventing six labels, and scope 11.5 defers vocabulary
 * for a reason. So the control is the same two marks the queue caps use with a
 * letter between them, and the letter is set in the app's own body role at the
 * chosen size. It therefore **is** the demonstration rather than a description
 * of one: tapping the plus grows the letter, the row's own label, the caption
 * beneath it and every prayer in the app, all at once and by the same rule.
 *
 * A screen reader gets the step position instead, because a letter that changes
 * size is not something it can convey.
 *
 * ## Why not a slider
 *
 * The same reason the queue caps are not one (see `Stepper.tsx`): a slider needs
 * a track, a thumb and a fill, none of which the design language has, and it
 * cannot be set exactly by hand on a phone.
 */

/** The nearest step to a stored value, so a scale from a newer build still lands. */
export function stepIndexFor(scale: number): number {
  let nearest = 0
  for (let index = 1; index < TEXT_SCALE_STEPS.length; index += 1) {
    const step = TEXT_SCALE_STEPS[index] ?? 0
    const best = TEXT_SCALE_STEPS[nearest] ?? 0
    if (Math.abs(step - scale) < Math.abs(best - scale)) nearest = index
  }
  return nearest
}

export function TextSizeControl({
  scale,
  onChange,
}: {
  scale: number
  onChange: (scale: number) => void
}) {
  const index = stepIndexFor(scale)
  const last = TEXT_SCALE_STEPS.length - 1
  const move = (to: number) => {
    onChange(TEXT_SCALE_STEPS[Math.min(last, Math.max(0, to))] ?? 1)
  }

  return (
    <div className="flex flex-none items-center" style={{ gap: 2 }}>
      <StepButton
        label={strings.settings.textSizeSmaller}
        disabled={index <= 0}
        onClick={() => {
          move(index - 1)
        }}
      >
        <path d={FEWER_MARK} />
      </StepButton>

      {/* The letter is the control's only readout, and it is a specimen rather
          than a word: it is drawn at the size the setting produces, in the same
          body role a list row title uses, so what it shows is what will happen. */}
      <span
        className="flex items-center justify-center text-center text-deep"
        style={{ ...typeStyle('settingsRowLabel'), minWidth: 34 }}
        aria-hidden="true"
      >
        {strings.settings.textSizeSpecimen}
      </span>
      <Announcement>
        {strings.settings.textSizeStep(index + 1, TEXT_SCALE_STEPS.length)}
      </Announcement>

      <StepButton
        label={strings.settings.textSizeLarger}
        disabled={index >= last}
        onClick={() => {
          move(index + 1)
        }}
      >
        <path d={MORE_MARK} />
      </StepButton>
    </div>
  )
}
