import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { MEMORISE_PATH } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { CompactActionHeader } from '../../components/NavyHeader'
import {
  PinnedButtons,
  PinnedRow,
  PrimaryButton,
  SecondaryButton,
} from '../../components/PinnedButtons'
import { Screen } from '../../components/Screen'
import { Announcement } from '../../components/VisuallyHidden'
import { RecitedLines } from './RecitedLines'
import { today as todayOf } from '../../data/clock'
import { getPassageRecital, recordMilestone, type PassageRecital } from '../../data/milestone'
import type { SelfRating } from '../../data/types'
import { strings } from '../../strings'
import { collectionLabel, passageAttribution } from '../../strings/attribution'
import { FLEURON, FLEURON_SIZE, typeStyle } from '../../theme'

/**
 * **The milestone: the whole passage, from memory.** Scope 9.5.
 *
 * > First five words or so visible, so you know which passage you are reciting.
 * > Everything else hidden. Recite from memory. Reveal. Self-rate.
 *
 * ## Where it is reached from, and why it is two doors rather than one
 *
 * **Deliberately attempted**, from the FROM MEMORY section of the Memorise tab,
 * which shows a passage once the app has shown the reader every one of its lines
 * (decision D9.1, Safa's call). The invitation stands there until it is taken;
 * nothing prompts, nothing counts down, and declining is simply not tapping it.
 *
 * **Served by the queue**, once the passage has been promoted and its
 * whole-passage card comes round (scope 8.7). From that day the row in today's
 * work opens this screen instead of the line walk, because the passage's review
 * *is* the recital.
 *
 * They are scope 9.5's two triggers and they meet the same screen, which is the
 * point: the thing you attempted once is the thing that comes back.
 *
 * ## What the reveal does, and why it is one movement
 *
 * Scope 9.4 gives the milestone its own row in the table: **all at once**, after
 * the whole passage has been recited, because "it is a single honest moment and
 * a staged reveal turns it into an exam". Levels 5 and 6 reveal progressively;
 * this does not, and that difference is deliberate.
 *
 * ## The visual treatment
 *
 * Scope 9.5 calls the milestone "the one place where the visual treatment is
 * allowed to be significant", and design-tokens 3 leaves nothing to be
 * significant *with*: no rounded corners, no shadows, no animation, and a
 * palette of a navy, a gold, a bone paper and some greys.
 *
 * So the significance is an inversion, and it is Safa's choice (decision D9.2):
 * **navy cloth edge to edge, dressed as the reading surface dresses a passage.**
 * Every other screen in the app is paper with a navy header over it; this one is
 * navy all the way down, with the gold eyebrow, the 40px gold title, the twin
 * rules, the floated drop cap, the fleuron and the attribution of design-tokens
 * 5.4. It reads as the cover of the book rather than a page of it. No token was
 * invented and no rule was bent to build it.
 *
 * ## Nothing congratulates
 *
 * Not here and not on the way out. Principle 7.1 forbids the arcade, principle
 * 7.5 forbids encouragement built out of scripture, and scope 9.6 makes the
 * reader's own rating the only judgement the app holds. What is said on
 * returning to Memorise is a statement of what happened to the passage - it is
 * memorised, or it is back on its lines - because that changes what tomorrow
 * looks like and the reader should know. **The screen is the marking.**
 *
 * ## Attribution
 *
 * The screen shows a passage, so it shows its attribution: principle 7.10 and
 * design-tokens 7.1, which names the milestone screen by name. The copyright
 * line belongs to the reading view alone.
 */

/** Design-tokens 5.4: the reading surface is `34px 32px 0` on its ground. */
const SURFACE = { padding: '34px 32px 0' }

/** Scope 9.5: "First five words or so visible". */
const OPENING_WORDS = 5

export function RecitalScreen() {
  const { passageId = '' } = useParams()
  const userId = useUserId()
  const today = todayOf()
  const navigate = useNavigate()
  const back = useBack(MEMORISE_PATH)

  const recital = useAsyncValue<PassageRecital | null>(
    async () => getPassageRecital(userId, passageId),
    `${userId}:${passageId}`,
  )

  const [revealed, setRevealed] = useState(false)

  /**
   * A passage that is not on the list, or has no lines under it yet. Nobody
   * reaches this from the app, but a typed URL and a restored tab both can, and
   * they go back to the tab rather than to an empty navy screen.
   */
  useEffect(() => {
    if (recital === undefined) return
    if (recital === null) void navigate(MEMORISE_PATH, { replace: true })
  }, [recital, navigate])

  const rate = (rating: SelfRating) => {
    if (recital == null) return
    void recordMilestone(userId, { passageId, rating }, today).then(
      (outcome) => {
        // Back to the tab, carrying what happened. The sentence is said there
        // rather than here because it is about what tomorrow holds, and because
        // a screen that answers a rating with a line of praise is the arcade
        // principle 7.1 keeps out of the rest of the product.
        void navigate(MEMORISE_PATH, { replace: true, state: { milestone: outcome } })
      },
      (error: unknown) => {
        console.error('Failed to record a recital', error)
      },
    )
  }

  return (
    <Screen
      tone="navy"
      header={
        <CompactActionHeader
          label={recital == null ? '' : collectionLabel(recital.passage.collection)}
          onBack={back}
        />
      }
      footer={
        recital == null ? undefined : (
          <PinnedButtons tone="navy">
            {revealed ? (
              <PinnedRow
                tone="navy"
                label={strings.review.ratingSection}
                ariaLabel={strings.accessibility.selfRating}
              >
                <SecondaryButton
                  tone="navy"
                  label={strings.review.ratingAgain}
                  onClick={() => {
                    rate('again')
                  }}
                  wide
                />
                <SecondaryButton
                  tone="navy"
                  label={strings.review.ratingHard}
                  onClick={() => {
                    rate('hard')
                  }}
                  wide
                />
                <SecondaryButton
                  tone="navy"
                  label={strings.review.ratingGood}
                  onClick={() => {
                    rate('good')
                  }}
                  wide
                />
                <SecondaryButton
                  tone="navy"
                  label={strings.review.ratingEasy}
                  onClick={() => {
                    rate('easy')
                  }}
                  wide
                />
              </PinnedRow>
            ) : (
              /* One tap, one movement. Scope 9.4. */
              <PrimaryButton
                label={strings.milestone.reveal}
                onClick={() => {
                  setRevealed(true)
                }}
              />
            )}
          </PinnedButtons>
        )
      }
    >
      {recital != null && (
        <article style={SURFACE}>
          {/* Design-tokens 5.4 in order, on navy. 1. The caps eyebrow, which on
              this ground takes the gold the tokens give an eyebrow on navy. */}
          <p
            className="text-accent-90"
            style={{ ...typeStyle('eyebrowReading'), marginBottom: 16 }}
          >
            {strings.memorise.reciteSection}
          </p>

          {/* 2. The 40px display title, in the gold design-tokens 1.1 names for
              display type on navy. */}
          <h1 className="text-accent" style={typeStyle('readingTitle')}>
            {recital.passage.title}
          </h1>

          {/* 3. The byline. */}
          <p className="text-on-field-66" style={{ ...typeStyle('bylineItalic'), marginTop: 10 }}>
            {recital.passage.author}
          </p>

          {/* 4. The twin rules. On paper these are two ink alphas; on navy they
              are the two the tokens give a line on navy. */}
          <div className="h-px bg-accent-34" style={{ margin: '22px 0 3px' }} />
          <div className="h-px bg-on-field-45" style={{ marginBottom: 24 }} />

          {/* 5. The passage itself: the opening words, then everything hidden,
              and after the reveal the whole of it. */}
          <p
            className="text-on-field-55"
            style={{ ...typeStyle('bylineItalic'), marginBottom: 22 }}
          >
            {revealed ? strings.milestone.revealed : strings.milestone.recite}
          </p>

          <RecitedLines
            tone="navy"
            lines={recital.lines}
            revealed={revealed ? recital.lines.length : 0}
            opening={OPENING_WORDS}
            dropCap
          />

          {/* 6. The fleuron. */}
          <p
            aria-hidden="true"
            className="text-accent-md"
            style={{ clear: 'both', textAlign: 'center', fontSize: FLEURON_SIZE, margin: '26px 0' }}
          >
            {FLEURON}
          </p>

          {/* 7. The attribution. Mandatory: principle 7.10, design-tokens 7. */}
          <p className="text-on-field-45" style={typeStyle('attribution')}>
            {passageAttribution(recital.passage)}
          </p>

          <Announcement>{revealed ? strings.milestone.revealed : ''}</Announcement>

          <div style={{ height: 34 }} />
        </article>
      )}
    </Screen>
  )
}
