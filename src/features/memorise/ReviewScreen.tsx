import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { MEMORISE_PATH } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { ScrollTail, SectionHeader } from '../../components/ListSurface'
import { CompactActionHeader } from '../../components/NavyHeader'
import {
  PinnedButtons,
  PinnedRow,
  PrimaryButton,
  SecondaryButton,
} from '../../components/PinnedButtons'
import { Screen } from '../../components/Screen'
import { Announcement } from '../../components/VisuallyHidden'
import { ChipBank } from './ChipBank'
import { ClozeLine, type PlacedWord } from './ClozeLine'
import { OrderedLines } from './OrderedLines'
import { today as todayOf } from '../../data/clock'
import { getPassageWork, type PassageWork } from '../../data/dailyQueue'
import { recordReview } from '../../data/review'
import type { SelfRating } from '../../data/types'
import {
  buildCloze,
  chipFills,
  misplacedLines,
  orderingGroup,
  servedLevel,
  shuffledOrdering,
  type Cloze,
  type ClozeChip,
  type QuizLevel,
  type QuizLine,
} from '../../quiz'
import { strings } from '../../strings'
import { passageAttribution, collectionLabel } from '../../strings/attribution'
import { bareWord } from '../../text/normalise'
import { typeStyle } from '../../theme'

/**
 * **One prayer's work for today, line by line.** Scope 9.1, 9.3, 9.4 and 9.6.
 *
 * ## Where it is reached from
 *
 * A row on the Memorise tab, and nowhere else. Decision D8.1, Safa's call: tap a
 * prayer and you work through its lines; when they are done you are back on
 * Memorise with that row gone, and when the last row goes the screen says you
 * are up to date. There is no "begin the day" button and no counter running down
 * across four prayers. **The shrinking list is the only progress there is.**
 *
 * That also makes the day resumable for nothing. Every rating is written the
 * moment it is given, so closing the app halfway through a prayer loses the
 * lines you have not reached and nothing else.
 *
 * ## The walk holds the day it started with
 *
 * The queue is read once, when the screen opens. A rating changes a line's due
 * date, so re-reading the queue after each one would take the next line away
 * mid-walk. This is the same reason `Reorderable` owns the order while a drag is
 * in flight (decision D5.6): a screen that re-reads under the user's hand
 * redraws what they are in the middle of doing.
 *
 * ## Which rung, and what each one is
 *
 * `servedLevel` in `src/quiz/level.ts` decides, from how many times the line has
 * been recalled in a row (decision D8.2). Three of the six are built here.
 *
 * | Level | What the reader meets | Reveal |
 * |---|---|---|
 * | 1 | The line, whole | nothing to reveal |
 * | 2 | About one word in seven taken out | immediate, per answer |
 * | 3 | About two words in five taken out | immediate, per answer |
 * | 4 | The lines to put back in order | the whole order, at the reveal |
 *
 * Levels 5 and 6 are session 9. Until then `HIGHEST_LEVEL_BUILT` holds a reader
 * who has climbed past level 4 at the ordering rung, rather than at a blank
 * screen, and nothing stored has to be undone when the ceiling lifts.
 *
 * ## What a finished line looks like, and a finished day
 *
 * Nothing. A rating advances to the next line with no interstitial, no tally and
 * no word of encouragement; the last one returns to Memorise. Principle 7.1
 * forbids the arcade, principle 7.5 forbids congratulation built out of
 * scripture, and scope 8.3 forbids a "study more" prompt by name. **The app
 * never says how many you got right, because it never worked it out** - scope
 * 9.6: nothing is auto-scored, and the reader's own rating is the only judgement
 * the app holds.
 *
 * ## Attribution
 *
 * The screen shows a passage, so it shows its attribution (principle 7.10,
 * design-tokens 7.1, which names quiz screens explicitly). The copyright line
 * belongs to the reading view alone.
 */

/** Design-tokens 5.3: the list surface is `0 26px` over paper. */
const SURFACE = { padding: '0 26px' }

/**
 * The reader's answer to the line in front of them.
 *
 * It is held here rather than inside each quiz because the controls live in the
 * pinned band at the foot of the screen (design-tokens 5.5) and the material
 * lives in the scrolling body above it, and one piece of state cannot sit inside
 * two siblings. It is keyed by segment id, so moving to the next line resets it
 * without an effect that could fire a frame late.
 */
type Answer =
  | { readonly kind: 'read' }
  | {
      readonly kind: 'cloze'
      readonly placed: readonly PlacedWord[]
      readonly spent: readonly string[]
    }
  | { readonly kind: 'order'; readonly attempt: readonly string[]; readonly revealed: boolean }

export function ReviewScreen() {
  const { passageId = '' } = useParams()
  const userId = useUserId()
  const today = todayOf()
  const navigate = useNavigate()
  const back = useBack(MEMORISE_PATH)

  const work = useAsyncValue<PassageWork | null>(
    async () => (await getPassageWork(userId, passageId, today)) ?? null,
    `${userId}:${passageId}:${today}`,
  )

  const [position, setPosition] = useState(0)
  const [answered, setAnswered] = useState<{ segmentId: string; answer: Answer } | null>(null)

  const item = work?.items[position]
  const lineIndex =
    work == null || item === undefined
      ? -1
      : work.lines.findIndex((line) => line.segmentId === item.segmentId)
  const line = lineIndex === -1 ? undefined : work?.lines[lineIndex]

  const group = useMemo<readonly QuizLine[]>(
    () => (work == null || lineIndex === -1 ? [] : orderingGroup(work.lines, lineIndex)),
    [work, lineIndex],
  )

  const progress = item === undefined ? null : (work?.progress.get(item.segmentId) ?? null)
  const level: QuizLevel =
    line === undefined ? 1 : servedLevel(progress, { linesInGroup: group.length, line: line.text })

  const seed = `${item?.segmentId ?? ''}:${String(level)}`

  const cloze = useMemo<Cloze | null>(() => {
    if (work == null || line === undefined || (level !== 2 && level !== 3)) return null
    return buildCloze({
      line: line.text,
      otherLines: work.lines
        .filter((other) => other.segmentId !== line.segmentId)
        .map((other) => other.text),
      level,
      seed,
    })
  }, [work, line, level, seed])

  const shuffledGroup = useMemo(
    () => (level === 4 ? shuffledOrdering(group, seed) : group),
    [group, level, seed],
  )

  /** A line nobody has answered yet, in the shape the rung needs. */
  const blank: Answer =
    level === 4
      ? { kind: 'order', attempt: shuffledGroup.map((each) => each.segmentId), revealed: false }
      : level === 2 || level === 3
        ? { kind: 'cloze', placed: [], spent: [] }
        : { kind: 'read' }

  const answer =
    answered !== null && item !== undefined && answered.segmentId === item.segmentId
      ? answered.answer
      : blank

  const setAnswer = (next: Answer) => {
    if (item === undefined) return
    setAnswered({ segmentId: item.segmentId, answer: next })
  }

  /**
   * A prayer with nothing due today, or one that has left the corpus. Nobody
   * reaches this from the app - the row that opens it only exists while there is
   * work behind it - but a restored tab or a typed URL can, and it goes back to
   * the tab rather than to an empty screen.
   */
  useEffect(() => {
    if (work === undefined) return
    if (work === null || work.items.length === 0) void navigate(MEMORISE_PATH, { replace: true })
  }, [work, navigate])

  const rate = (rating: SelfRating) => {
    if (work == null || item === undefined) return
    const last = position + 1 >= work.items.length

    void recordReview(userId, { passageId, segmentId: item.segmentId, level, rating }, today).then(
      () => {
        // Back to Memorise with this prayer's row gone, or on to the next line.
        // Nothing is said in between: principle 7.1, and scope 8.3's "when the
        // queue is done, it is done".
        if (last) void navigate(MEMORISE_PATH, { replace: true })
        else setPosition((current) => current + 1)
      },
      (error: unknown) => {
        console.error('Failed to record a review', error)
      },
    )
  }

  /**
   * A chip goes into the next blank that has not been answered.
   *
   * Written against the state as it stands rather than as this render saw it.
   * Two taps inside one frame - a double tap, a stray second finger - would
   * otherwise both aim at the same blank, and the first answer would be quietly
   * overwritten. On a screen of 44px targets sitting above a tab bar, that is a
   * real thing to do with a thumb.
   */
  const tapChip = (chip: ClozeChip) => {
    if (cloze === null || item === undefined) return

    setAnswered((current) => {
      const held = current?.segmentId === item.segmentId ? current.answer : blank
      if (held.kind !== 'cloze') return current

      const target = cloze.blanks[held.placed.length]
      if (target === undefined) return current

      const spent = new Set(held.spent)
      spent.add(chip.id)

      const correct = chipFills(chip, target)
      if (!correct) {
        // The chip that was the answer has done its job, so it is spent too. A
        // chip still in the bank is a chip that could still be needed.
        const answerChip = cloze.chips.find(
          (each) => !spent.has(each.id) && chipFills(each, target),
        )
        if (answerChip !== undefined) spent.add(answerChip.id)
      }

      return {
        segmentId: item.segmentId,
        answer: {
          kind: 'cloze',
          placed: [
            ...held.placed,
            { tokenIndex: target.tokenIndex, chosen: correct ? null : chip.word },
          ],
          spent: [...spent],
        },
      }
    })
  }

  const clozeDone =
    cloze !== null && answer.kind === 'cloze' && answer.placed.length === cloze.blanks.length
  const orderDone = answer.kind === 'order' && answer.revealed
  const revealed = level === 1 || clozeDone || orderDone

  return (
    <Screen
      header={
        <CompactActionHeader
          label={work == null ? '' : collectionLabel(work.passage.collection)}
          onBack={back}
        />
      }
      footer={
        work == null || item === undefined ? undefined : (
          <PinnedButtons>
            {revealed ? (
              <PinnedRow
                label={strings.review.ratingSection}
                ariaLabel={strings.accessibility.selfRating}
              >
                <SecondaryButton
                  label={strings.review.ratingAgain}
                  onClick={() => {
                    rate('again')
                  }}
                  wide
                />
                <SecondaryButton
                  label={strings.review.ratingHard}
                  onClick={() => {
                    rate('hard')
                  }}
                  wide
                />
                <SecondaryButton
                  label={strings.review.ratingGood}
                  onClick={() => {
                    rate('good')
                  }}
                  wide
                />
                <SecondaryButton
                  label={strings.review.ratingEasy}
                  onClick={() => {
                    rate('easy')
                  }}
                  wide
                />
              </PinnedRow>
            ) : cloze !== null && answer.kind === 'cloze' ? (
              <ChipBank chips={cloze.chips} spent={new Set(answer.spent)} onTap={tapChip} />
            ) : (
              <PrimaryButton
                label={strings.review.showOrder}
                onClick={() => {
                  if (answer.kind === 'order') setAnswer({ ...answer, revealed: true })
                }}
              />
            )}
          </PinnedButtons>
        )
      }
    >
      {work != null && item !== undefined && line !== undefined && (
        <div style={SURFACE}>
          <header style={{ paddingTop: 26 }}>
            <h1 className="text-deep" style={typeStyle('settingsTitle')}>
              {work.passage.title}
            </h1>
            {/* Principle 7.10 and design-tokens 7.1, which names quiz screens. */}
            <p
              className="text-on-paper-44"
              style={{ ...typeStyle('rowAttribution'), marginTop: 6 }}
            >
              {passageAttribution(work.passage)}
            </p>
            <p className="text-on-paper-50" style={{ ...typeStyle('bylineItalic'), marginTop: 14 }}>
              {guidance(level, progress !== null, revealed)}
            </p>
          </header>

          {/* The only number on the screen, and it counts what today holds
              rather than what the cap left out (principle 7.3). */}
          <SectionHeader label={strings.review.lineOfDay(position + 1, work.items.length)} />

          {cloze !== null && answer.kind === 'cloze' ? (
            <ClozeLine tokens={cloze.tokens} blanks={cloze.blanks} placed={answer.placed} />
          ) : answer.kind === 'order' ? (
            <OrderedLines
              lines={answer.revealed ? group : linesInAttemptOrder(group, answer.attempt)}
              misplaced={answer.revealed ? misplacedLines(group, answer.attempt) : EMPTY}
              revealed={answer.revealed}
              announcement={announcement(cloze, answer)}
              onReorder={(orderedIds) => {
                setAnswer({ kind: 'order', attempt: orderedIds, revealed: false })
              }}
            />
          ) : (
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
              {line.text}
            </p>
          )}

          {/* One live region per screen. At level 4 it is the reordered list's
              own, which this screen speaks through rather than beside. */}
          {answer.kind !== 'order' && <Announcement>{announcement(cloze, answer)}</Announcement>}
          <ScrollTail />
        </div>
      )}
    </Screen>
  )
}

const EMPTY: ReadonlySet<string> = new Set()

/** The group, arranged the way the reader has it. */
function linesInAttemptOrder(
  group: readonly QuizLine[],
  attempt: readonly string[],
): readonly QuizLine[] {
  const byId = new Map(group.map((line) => [line.segmentId, line]))
  return attempt.flatMap((id) => {
    const line = byId.get(id)
    return line === undefined ? [] : [line]
  })
}

/**
 * The one sentence of guidance above the line. It says what to do and stops:
 * there is no hint, no clue and no encouragement, because scope 9.6 makes the
 * reader's own rating the only judgement in the product and anything said here
 * would be a second one.
 */
function guidance(level: QuizLevel, met: boolean, revealed: boolean): string {
  if (level === 4) return revealed ? strings.review.orderRevealed : strings.review.putInOrder
  if (level === 2 || level === 3) return strings.review.fillBlanks
  return met ? strings.review.readAgain : strings.review.readNew
}

/**
 * What just happened, for anyone who cannot see it happen.
 *
 * Derived from the answer rather than stored beside it, so it can never fall out
 * of step with what is drawn. The two sentences it can produce are the same
 * shape on purpose: what happened to the text, never how the reader did.
 */
function announcement(cloze: Cloze | null, answer: Answer): string {
  if (answer.kind === 'order') return answer.revealed ? strings.review.orderRevealed : ''
  if (cloze === null || answer.kind !== 'cloze') return ''

  const last = answer.placed[answer.placed.length - 1]
  if (last === undefined) return ''

  const word = bareWord(cloze.tokens[last.tokenIndex]?.text ?? '')
  return last.chosen === null
    ? strings.review.wordPlaced(word)
    : strings.review.wordCorrected(last.chosen, word)
}
