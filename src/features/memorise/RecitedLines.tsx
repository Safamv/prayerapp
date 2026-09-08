import { Fragment } from 'react'
import type { ScreenTone } from '../../components/Screen'
import { VisuallyHidden } from '../../components/VisuallyHidden'
import { firstLetters, openingWords, type QuizLine } from '../../quiz'
import { strings } from '../../strings'
import { typeStyle } from '../../theme'
import { splitDropCap } from '../discover/dropCap'

/**
 * **What is recited, and what is revealed.** Scope 9.1, 9.4 and 9.5.
 *
 * > Levels 6 and the milestone are **one component with two configurations**,
 * > differing only in scope (segment group versus whole passage) and trigger
 * > (served by the queue versus deliberately attempted).
 *
 * This is that component, and level 5 is a third configuration of it rather than
 * a fourth screen: first letters as a scaffold is the same act with a prompt
 * left standing.
 *
 * | | Lines | Before the reveal | Reveal |
 * |---|---|---|---|
 * | Level 5 | the cumulative group | the first letter of each word | one line at a time |
 * | Level 6 | the cumulative group | nothing | one line at a time |
 * | Milestone | the whole passage | the opening few words | all at once |
 *
 * The reveal is expressed as a **count of lines shown in full**, which is the
 * one number that says all three: `revealed` climbing by one is scope 9.4's
 * progressive reveal, and jumping straight to the length of the passage is its
 * all-at-once. There is no second mechanism for the milestone and nothing to
 * keep in step.
 *
 * ## Why the reveal is progressive at 5 and 6, and not at the milestone
 *
 * Scope 9.4, and its reason is worth keeping in front of whoever changes this:
 * "the milestone reveals in one movement because it is a single honest moment
 * and a staged reveal turns it into an exam."
 *
 * ## What is not here
 *
 * **Nothing is checked.** No input is taken, nothing is compared, nothing is
 * counted. Scope 9.2 removed typed input from V0 entirely and scope 9.6 makes
 * the reader's own rating after the reveal the only judgement in the product, so
 * there is no answer for this component to hold and no score for it to keep.
 *
 * **The dress is not here either.** The milestone's navy ground, its title and
 * its fleuron belong to `RecitalScreen`, which is the screen scope 9.5 permits
 * to be significant. This is the recital, and it is the same recital wherever it
 * is drawn.
 */

/** A hidden line is a rule where the words would be. Design-tokens 3: 1px, no radius. */
const HIDDEN_RULE_MARGIN = '11px 0 3px'

/** Between one line and the next. Enough that two lines never read as one. */
const LINE_GAP = 14

const TEXT: Readonly<Record<ScreenTone, string>> = {
  paper: 'text-ink',
  navy: 'text-paper',
}

/**
 * The scaffold is a prompt rather than the passage, so it is set a shade back
 * from the text it stands in for. Both are palette tokens (design-tokens 1.1).
 */
const SCAFFOLD: Readonly<Record<ScreenTone, string>> = {
  paper: 'text-on-paper-50',
  navy: 'text-on-field-66',
}

const RULE: Readonly<Record<ScreenTone, string>> = {
  paper: 'bg-hair',
  navy: 'bg-accent-34',
}

/** Design-tokens 5.4 sets the drop cap in `accent-dk`, which on navy is the gold. */
const CAP: Readonly<Record<ScreenTone, string>> = {
  paper: 'text-accent-dk',
  navy: 'text-accent',
}

export interface RecitedLinesProps {
  /** In `order_index` order, which is the order scope 8.1 learns them in. */
  readonly lines: readonly QuizLine[]
  /** How many lines are shown in full, counting from the first. */
  readonly revealed: number
  /** Level 5. The first letter of each word of a line not yet revealed. */
  readonly scaffold?: boolean
  /**
   * Scope 9.5: "First five words or so visible, so you know which passage you
   * are reciting." Words of the first line, and zero everywhere else.
   */
  readonly opening?: number
  /**
   * Design-tokens 5.4's floated drop cap, on the first character of the passage.
   * The milestone's dress, and the one part of it that has to reach in here,
   * because this is the only place the first character is drawn.
   */
  readonly dropCap?: boolean
  readonly tone?: ScreenTone
}

export function RecitedLines({
  lines,
  revealed,
  scaffold = false,
  opening = 0,
  dropCap = false,
  tone = 'paper',
}: RecitedLinesProps) {
  return (
    <div aria-label={strings.accessibility.reciteLines}>
      {lines.map((line, index) => (
        <Fragment key={line.segmentId}>
          <RecitedLine
            text={line.text}
            revealed={index < revealed}
            scaffold={scaffold}
            opening={index === 0 ? opening : 0}
            dropCap={dropCap && index === 0}
            tone={tone}
          />
        </Fragment>
      ))}
    </div>
  )
}

function RecitedLine({
  text,
  revealed,
  scaffold,
  opening,
  dropCap,
  tone,
}: {
  text: string
  revealed: boolean
  scaffold: boolean
  opening: number
  dropCap: boolean
  tone: ScreenTone
}) {
  if (revealed) {
    return (
      <PassageLine tone={tone} dropCap={dropCap}>
        {text}
      </PassageLine>
    )
  }

  // The milestone's opening. The words that are shown are the passage's own, so
  // they are set as the passage, and the rest of the line goes under the rule
  // with everything after it.
  if (opening > 0) {
    const { shown, hidden } = openingWords(text, opening)
    return (
      <>
        <PassageLine tone={tone} dropCap={dropCap}>
          {shown}
        </PassageLine>
        {hidden !== '' && <HiddenLine tone={tone} label={strings.milestone.hidden} />}
      </>
    )
  }

  if (scaffold) {
    return (
      <p
        // The letters are drawn and not read. See decision D9.4: "R n, O L,"
        // spoken aloud is noise, so the region says what is on the screen and
        // the recital a screen reader is asked for is level 6's.
        aria-label={strings.accessibility.scaffoldLine}
        className={SCAFFOLD[tone]}
        style={{ ...typeStyle('passageBody'), whiteSpace: 'pre-wrap', paddingBottom: LINE_GAP }}
      >
        {firstLetters(text)}
      </p>
    )
  }

  return <HiddenLine tone={tone} label={strings.review.hiddenLine} />
}

/**
 * One line of the passage, set as the reading surface sets a passage:
 * design-tokens 5.4's 20px body at 1.58 with the ink bleed, and its floated drop
 * cap where the milestone asks for one.
 *
 * The ink bleed is a dark shadow half a pixel wide, which is what makes text
 * look printed rather than rendered. It is only applied on paper: on the navy
 * ground there is no ink to bleed, and the token would be a dark smudge under a
 * pale letter.
 */
function PassageLine({
  children,
  tone,
  dropCap,
}: {
  children: string
  tone: ScreenTone
  dropCap: boolean
}) {
  const split = dropCap ? splitDropCap(children) : null

  return (
    <p
      className={TEXT[tone]}
      style={{
        ...typeStyle('passageBody'),
        ...(tone === 'paper' ? { textShadow: '0 0 .5px var(--ink-shadow)' } : {}),
        whiteSpace: 'pre-wrap',
        paddingBottom: LINE_GAP,
      }}
    >
      {split === null ? (
        children
      ) : (
        <>
          <span
            className={CAP[tone]}
            style={{
              ...typeStyle('dropCap'),
              float: 'left',
              padding: '6px 10px 0 0',
              // The cap is the first character of the passage and the line reads
              // on from it, so it must not be announced as a word of its own.
              // `aria-hidden` would delete it; the text is whole in the flow.
            }}
            aria-hidden="true"
          >
            {split.cap}
          </span>
          <VisuallyHidden>{split.cap}</VisuallyHidden>
          {split.rest}
        </>
      )}
    </p>
  )
}

/**
 * A line that is still hidden: one hairline rule where the words would be.
 *
 * It is the same mark a blank in a chip cloze carries, which is deliberate - the
 * reader meets one idea for "something is missing here" across the whole ladder
 * rather than a new one at each rung. Stacked down a passage it also says how
 * many lines are still to come, which is the one thing a reciter genuinely needs
 * to know and the only thing this screen tells them.
 *
 * Full width rather than proportioned to the line it hides, because a rule that
 * traced the length of each line would be giving away the shape of the passage.
 */
function HiddenLine({ tone, label }: { tone: ScreenTone; label: string }) {
  return (
    <p style={{ margin: HIDDEN_RULE_MARGIN, paddingBottom: LINE_GAP }}>
      <VisuallyHidden>{label}</VisuallyHidden>
      <span aria-hidden="true" className={`block h-px ${RULE[tone]}`} />
    </p>
  )
}
