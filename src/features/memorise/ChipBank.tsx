import { ChipBox, TOUCH_TARGET } from '../../components/Chips'
import { strings } from '../../strings'
import type { ClozeChip } from '../../quiz'

/**
 * **The word bank.** Scope 9.3: "Levels 2 to 4 present blanked words as a
 * tappable word bank. Distractors come free from other words in the same
 * passage."
 *
 * ## It is the chip of decision D7.4, at reading size
 *
 * The box, the border, the square corners and the letterpress are `ChipBox` in
 * `src/components/Chips.tsx`, unchanged, so a chip here and a sort control on
 * Bookmarks follow a palette change together and cannot drift apart.
 *
 * The one difference is the type role. A sort control says `TITLE` in the 8.5px
 * caps slot because it is a label. **A chip here says `Blessed` in the 19px body
 * slot, because it is a word of a prayer**, and setting scripture in 8.5px
 * capitals would be treating it as furniture. It costs no height: decision D7.8
 * separated the chip you tap from the chip you see, and the 44px target is
 * taller than either box.
 *
 * ## A spent chip stays where it is
 *
 * It fades and stops responding rather than disappearing. A bank that reflows
 * under the thumb after every tap moves the next chip somewhere else between one
 * tap and the next, which is how a reader ends up choosing a word they did not
 * mean.
 */
export function ChipBank({
  chips,
  spent,
  onTap,
}: {
  chips: readonly ClozeChip[]
  spent: ReadonlySet<string>
  onTap: (chip: ClozeChip) => void
}) {
  return (
    <div
      aria-label={strings.accessibility.chipBank}
      className="flex flex-wrap items-center"
      style={{ gap: 6 }}
    >
      {chips.map((chip) => {
        const used = spent.has(chip.id)
        return (
          <button
            key={chip.id}
            type="button"
            disabled={used}
            aria-label={used ? strings.review.chipUsed(chip.word) : undefined}
            onClick={() => {
              onTap(chip)
            }}
            className="flex items-center"
            style={{ minHeight: TOUCH_TARGET }}
          >
            <ChipBox filled={false} faded={used} role="settingsRowLabel">
              {chip.word}
            </ChipBox>
          </button>
        )
      })}
    </div>
  )
}
