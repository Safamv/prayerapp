import { Fragment, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { DISCOVER_PATH, passagePath, RUHI_PATH } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { MINIMUM_ROW_HEIGHT, ScrollTail, SectionHeader } from '../../components/ListSurface'
import { CompactActionHeader } from '../../components/NavyHeader'
import { PinnedButtons, PrimaryButton } from '../../components/PinnedButtons'
import { Screen } from '../../components/Screen'
import { getPassage } from '../../data/corpus'
import { confirmSegmentation } from '../../data/segmentation'
import { RUHI_COLLECTION, type PassageRow } from '../../data/types'
import { getUserPrayer } from '../../data/userPrayers'
import { strings } from '../../strings'
import { collectionLabel, passageAttribution } from '../../strings/attribution'
import {
  joinLines,
  lineRanges,
  partsOfLine,
  proposedBreaks,
  segmentPassage,
  segmentsFrom,
  splitAt,
} from '../../text/segmentation'
import { typeStyle } from '../../theme'

/**
 * **The add moment.** Scope 8.4, and the screen that stands between the reading
 * view's list mark and a row in `user_prayers`.
 *
 * > The app proposes splits on sentence and line boundaries. The user can merge
 * > or split before starting.
 *
 * The proposal comes from `src/text/segmentation.ts`, which is pure and tested
 * against all 975 committed passages. This screen shows it, lets it be changed,
 * and writes the result.
 *
 * ## Why it is on the memorisation side of the app
 *
 * Principle 7.6 keeps memorisation out of Discover, and this is memorisation:
 * it is the first screen of learning something, and every line on it is a line
 * the quiz ladder will ask for. So it lives here, under `/memorise/add/`, and
 * the Memorise tab lights up while it is open. Discover's part is the tap that
 * opens it. Decision D5.1.
 *
 * ## What it states, and what it must never state
 *
 * Scope 6.2: "At the add moment: segment count and word count, stated plainly."
 * Both are in the rule above the lines, and they are all it says about the size
 * of the commitment. **No estimated time to learn**, which 6.2 forbids by name:
 * pace-based estimates are invented precision, and the moment of commitment is
 * the worst possible place to invent it.
 *
 * ## Attribution
 *
 * The screen shows a passage in full, so it shows its attribution (principle
 * 7.10, design-tokens 7). The copyright line belongs to the reading view alone.
 */

/** Design-tokens 5.3: the list surface is `0 26px` over paper. */
const SURFACE = { padding: '0 26px' }

interface Loaded {
  readonly passage: PassageRow | undefined
  readonly onList: boolean
}

export function ConfirmLinesScreen() {
  const { passageId = '' } = useParams()
  const userId = useUserId()
  const navigate = useNavigate()
  const location = useLocation()

  const loaded = useAsyncValue<Loaded>(async () => {
    const [passage, existing] = await Promise.all([
      getPassage(passageId),
      getUserPrayer(userId, passageId),
    ])
    return { passage, onList: existing !== undefined }
  }, passageId)

  const passage = loaded?.passage

  /**
   * Where this screen sends the reader back to, and where it sends them after
   * they confirm.
   *
   * For a prayer that is the reading view it was opened from. **For a Ruhi
   * quotation it cannot be**: the reading view is a Discover screen and decision
   * D1.10 forbids a quotation appearing there at all, so a passage in the `ruhi`
   * collection would be sent to a screen that correctly refuses to draw it and
   * would land in the library instead.
   *
   * The screen that opened it says where it came from, and the collection is the
   * fallback for a cold start, where router state is gone. The data decides,
   * which is D1.10's own arrangement: no screen has to remember a rule.
   */
  const cameFrom = returnPathIn(location.state)
  const destination =
    cameFrom ?? (passage?.collection === RUHI_COLLECTION ? RUHI_PATH : passagePath(passageId))

  // Only used on a cold start, when there is no history to step back through.
  const back = useBack(destination)

  const segmentation = useMemo(() => segmentPassage(passage?.text ?? ''), [passage?.text])

  // The proposal, until the user changes it. Held against the boundaries it was
  // made for, so the first render after a passage arrives draws the proposal
  // rather than one long line for a frame.
  const [chosen, setChosen] = useState<boolean[]>([])
  const breaks =
    chosen.length === segmentation.boundaries.length ? chosen : proposedBreaks(segmentation)

  useEffect(() => {
    setChosen(proposedBreaks(segmentation))
  }, [segmentation])

  /**
   * There is nothing to confirm for a passage already on the list, and no way to
   * reach this screen for one: the reading view's mark reads as already added
   * and stops responding. A typed URL or a restored tab can still arrive here,
   * and goes back to the passage rather than to a screen offering to add it
   * twice. A passage that does not exist goes back to the library.
   */
  useEffect(() => {
    if (loaded === undefined) return
    if (loaded.passage === undefined) {
      void navigate(DISCOVER_PATH, { replace: true })
      return
    }
    if (loaded.onList) void navigate(destination, { replace: true })
  }, [loaded, navigate, destination])

  const lines = segmentsFrom(segmentation, breaks)
  const ranges = lineRanges(segmentation, breaks)

  const confirm = () => {
    if (passage === undefined || lines.length === 0) return
    void confirmSegmentation(userId, passage.id, lines).then(
      () => {
        // Back to where it was opened from, with the band that says what
        // happened and offers the way out of it (decision D4.10). `replace`
        // because the screen just left has nothing to come back to: the passage
        // is on the list now.
        void navigate(destination, {
          replace: true,
          state: { addedPassageId: passage.id },
        })
      },
      (error: unknown) => {
        console.error('Failed to confirm the segmentation', error)
      },
    )
  }

  return (
    <Screen
      header={
        <CompactActionHeader
          label={passage === undefined ? '' : collectionLabel(passage.collection)}
          onBack={back}
        />
      }
      footer={
        passage === undefined ? undefined : (
          <PinnedButtons>
            <PrimaryButton
              label={strings.segmentation.confirm}
              onClick={confirm}
              disabled={lines.length === 0}
            />
          </PinnedButtons>
        )
      }
    >
      {passage !== undefined && (
        <div style={SURFACE}>
          <header style={{ paddingTop: 26 }}>
            <h1 className="text-deep" style={typeStyle('settingsTitle')}>
              {passage.title}
            </h1>
            {/* Principle 7.10: every surface that shows a passage shows this. */}
            <p
              className="text-on-paper-44"
              style={{ ...typeStyle('rowAttribution'), marginTop: 6 }}
            >
              {passageAttribution(passage)}
            </p>
            <p className="text-on-paper-50" style={{ ...typeStyle('bylineItalic'), marginTop: 14 }}>
              {strings.segmentation.note}
            </p>
          </header>

          {/* Scope 6.2's two counts, in design-tokens 5.3's section header row. */}
          <SectionHeader
            label={strings.segmentation.lineCount(lines.length)}
            count={strings.segmentation.wordCount(passage.word_count)}
          />

          <ol aria-label={strings.accessibility.lineList}>
            {lines.map((_line, index) => (
              <li key={String(index)}>
                {index > 0 && (
                  <JoinControl
                    position={index + 1}
                    onClick={() => {
                      setChosen(joinLines(segmentation, breaks, index))
                    }}
                  />
                )}
                <p
                  className="text-ink"
                  style={{
                    ...typeStyle('passageBody'),
                    whiteSpace: 'pre-line',
                    padding: '11px 0',
                    minHeight: MINIMUM_ROW_HEIGHT,
                  }}
                >
                  {partsOfLine(segmentation, ranges, index).map((part) => (
                    <Fragment key={String(part.cut)}>
                      {part.cut !== null && (
                        <CutMark
                          position={index + 1}
                          opening={openingWords(part.text)}
                          onClick={() => {
                            setChosen(splitAt(breaks, part.cut ?? 0))
                          }}
                        />
                      )}
                      {part.separator}
                      {part.text}
                    </Fragment>
                  ))}
                </p>
              </li>
            ))}
          </ol>
          <ScrollTail />
        </div>
      )}
    </Screen>
  )
}

/**
 * The path the screen that opened this one asked to be returned to.
 *
 * Read defensively because it is a router value and can be anything at all: a
 * restored tab, a hand-typed history entry, a future screen navigating here with
 * something else in it. Only an in-app absolute path is accepted.
 */
function returnPathIn(state: unknown): string | null {
  const from =
    typeof state === 'object' && state !== null && 'from' in state
      ? (state as { from?: unknown }).from
      : undefined
  return typeof from === 'string' && from.startsWith('/') ? from : null
}

/**
 * The seam between two lines, and the control that closes it.
 *
 * Built like design-tokens 5.3's section header row - a rule with a caps label
 * at the end of it - because that is what it is: a rule marking where one thing
 * stops and the next begins. The whole row is the target, so the rule is as
 * tappable as the word.
 */
function JoinControl({ position, onClick }: { position: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={strings.segmentation.joinLine(position)}
      className="flex w-full items-center text-on-paper-40"
      style={{ gap: 10, height: MINIMUM_ROW_HEIGHT }}
    >
      <span className="h-px flex-1 bg-rule-md" />
      <span style={typeStyle('sectionHeader')}>{strings.segmentation.join}</span>
    </button>
  )
}

/**
 * A place the line can be cut, drawn in the line itself, at the gap it would cut
 * at. Decision D5.8, Safa's call: pointing at the cut you want beats a control
 * that decides for you.
 *
 * **Drawn rather than written.** A hairline of gold in the gap between two
 * words, `0.9em` tall so it sits with the text rather than on top of it. It is
 * an element and not a character, which keeps it out of the subset font
 * question entirely (decision D4.7): the app draws it, so no face has to carry
 * it.
 *
 * **The target is bigger than the mark.** Ten pixels of padding above and below,
 * pulled back by the same amount in margin, so the tap area is about 24px tall
 * while the line box is exactly as tall as it would be without it. A line of
 * scripture cannot be opened up to fit a 44px control inside it, and
 * design-tokens 5.3's 44px minimum is written about rows. The full touch target
 * audit is scope 7.9, at v1.0.
 */
function CutMark({
  position,
  opening,
  onClick,
}: {
  position: number
  opening: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={strings.segmentation.splitLine(position, opening)}
      className="inline-flex items-center align-baseline"
      style={{ padding: '10px 4px', margin: '-10px 0' }}
    >
      <span
        aria-hidden="true"
        className="inline-block bg-accent-md"
        style={{ width: 1, height: '0.9em' }}
      />
    </button>
  )
}

/** Enough of what follows a cut for a screen reader to tell one mark from another. */
function openingWords(text: string): string {
  return text.split(/\s+/).slice(0, 4).join(' ')
}
