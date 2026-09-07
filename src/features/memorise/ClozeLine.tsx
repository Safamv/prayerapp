import { Fragment } from 'react'
import { VisuallyHidden } from '../../components/VisuallyHidden'
import { strings } from '../../strings'
import { typeStyle } from '../../theme'
import type { ClozeBlank, ClozeToken } from '../../quiz'

/**
 * **A line of a prayer with words taken out of it.** Scope 9.3 and 9.4.
 *
 * ## The line is the passage, not a reconstruction of it
 *
 * A blank that has been answered is redrawn from **the line's own token**,
 * punctuation and capitals exactly as the corpus wrote them, never from the word
 * on the chip. So whatever the reader taps, what they end up looking at is the
 * text. That is principle 7.2's "the correct text is always shown after an
 * attempt" taken literally.
 *
 * ## What a wrong answer looks like
 *
 * The correct word takes its place, with a hairline rule beneath it. That is the
 * whole of it: no colour, no cross, no strike-through of what was chosen, no
 * sound. Principle 7.1 forbids the buzzer and principle 7.2 asks for deviations
 * to be highlighted, and a printed correction under a word is what that looks
 * like on paper. The rule is `accent-dk`, the same gold as the drop cap, because
 * the alternative is a colour that means "wrong", and this app has no such
 * colour and should not acquire one.
 *
 * A word the reader got right is drawn as though it had always been there. The
 * reward for knowing it is that the line is whole.
 *
 * ## The blank itself
 *
 * A gold rule about as wide as the word that is missing, sitting on the
 * baseline, which is what a blank looks like in a printed exercise. It is drawn
 * rather than written, so no typeface has to carry a character for it (the
 * question decision D4.7 kept running into). To a screen reader it is the word
 * "missing word", because a line read aloud with a silent gap in it is a
 * different line.
 */

export interface PlacedWord {
  readonly tokenIndex: number
  /** The word the reader chose, when it was not the one the line had. */
  readonly chosen: string | null
}

export function ClozeLine({
  tokens,
  blanks,
  placed,
}: {
  tokens: readonly ClozeToken[]
  blanks: readonly ClozeBlank[]
  placed: readonly PlacedWord[]
}) {
  const answeredAt = new Map(blanks.map((blank, index) => [blank.tokenIndex, index]))

  return (
    <p
      className="text-ink"
      aria-label={strings.accessibility.quizLine}
      style={{
        ...typeStyle('passageBody'),
        textShadow: '0 0 .5px var(--ink-shadow)',
        whiteSpace: 'pre-wrap',
        padding: '4px 0 8px',
      }}
    >
      {tokens.map((token, index) => {
        const blankIndex = answeredAt.get(index)
        const answer = blankIndex === undefined ? undefined : placed[blankIndex]

        return (
          <Fragment key={String(index)}>
            {token.before}
            {blankIndex === undefined ? (
              token.text
            ) : answer === undefined ? (
              <Blank width={token.text.length} />
            ) : (
              <Filled text={token.text} corrected={answer.chosen !== null} />
            )}
          </Fragment>
        )
      })}
    </p>
  )
}

/**
 * A word not yet answered. `ch` units, so the rule is about as wide as the word
 * that belongs there and the line does not reflow when it is filled in.
 */
function Blank({ width }: { width: number }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-block border-b border-accent-md align-baseline"
        style={{ width: `${String(Math.max(width, 2))}ch` }}
      />
      <VisuallyHidden>{strings.review.missingWord}</VisuallyHidden>
    </>
  )
}

/**
 * A word that has been answered. Drawn from the line's own text either way; the
 * hairline beneath says only that the reader chose a different word.
 */
function Filled({ text, corrected }: { text: string; corrected: boolean }) {
  if (!corrected) return text
  return (
    <span className="border-b" style={{ borderColor: 'var(--accent-dk)', paddingBottom: 1 }}>
      {text}
    </span>
  )
}
