import { useParams } from 'react-router'
import { MEMORISE_PATH, upkeepPath } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { ListRow, MINIMUM_ROW_HEIGHT, ScrollTail, SectionRule } from '../../components/ListSurface'
import { CompactActionHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { SettingsSection } from '../../components/SettingsRow'
import { today as todayOf } from '../../data/clock'
import { getPassageDetail, type PassageDetail } from '../../data/progress'
import { FRESHNESS_SEVERITY, type Freshness } from '../../progress'
import { strings } from '../../strings'
import { collectionLabel, passageAttribution } from '../../strings/attribution'
import { formatDay, formatInterval } from '../../strings/dates'
import { typeStyle } from '../../theme'
import { FreshnessStar } from './FreshnessStar'

/**
 * **The passage detail view.** Scope 11.3.
 *
 * > The honest answer to "how well do I know this, and am I done?"
 * >
 * > - Current freshness: Strong, Fading, Needs review, Resting
 * > - Longest interval reached, stated plainly
 * > - Lapse count
 * > - Milestone date, if reached
 * > - How many segments sit at each state
 * >
 * > All of it falls straight out of `segment_progress`. No new instrumentation.
 *
 * And it did. Nothing was added to the database for this screen: every figure on
 * it is read from columns that have existed since session 2, which is what
 * declaring the scope's columns early was for.
 *
 * ## What it deliberately does not have
 *
 * **No percentage of any kind**, scope 11.2. With nothing auto-graded a
 * percentage would be built from the reader's own self-ratings, 100% is
 * unreachable by design because SM-2 works by lengthening intervals until you
 * fail, and a reader protecting a number starts rating themselves generously,
 * which corrupts the only input the scheduler has.
 *
 * **No score, no level, no badge, no best-ever**, scope 11.2 and principles 7.4
 * and 7.8. **Nothing that congratulates**, principle 7.5.
 *
 * **No bar and no number that stands in for the star.** Design-tokens 4:
 * "Nothing else encodes freshness." The counts here are counts of lines, which
 * scope 11.3 asks for by name, and each one is drawn beside the star it belongs
 * to rather than in place of it.
 *
 * ## It reports and does not set
 *
 * Every control that changes how a passage comes round is on the upkeep screen
 * (scope 8.5, 8.6), and this screen carries a row down to it rather than a
 * second copy of it. So there is one place that answers "how am I going" and one
 * that answers "what should change", and neither has to know about the other.
 *
 * ## The one thing that is not shown for every passage
 *
 * **A promoted passage gets no line breakdown.** Scope 8.7 promotes a passage to
 * a single whole-passage card and keeps the line state "retained but not
 * surfaced"; none of those lines has been reviewed since the promotion, so the
 * breakdown would report every line of a passage the reader finished a fortnight
 * ago as needing review. The sentence saying it comes round whole stands in its
 * place. See decision D11.5.
 *
 * ## Attribution
 *
 * The screen names a passage, so it names its author (principle 7.10,
 * design-tokens 7). The copyright line belongs to the reading view alone.
 */

/** Design-tokens 5.3: the list surface is `0 26px` over paper. */
const SURFACE = { padding: '0 26px' }

export function PassageDetailScreen() {
  const { passageId = '' } = useParams()
  const userId = useUserId()
  const back = useBack(MEMORISE_PATH)
  const today = todayOf()

  const loaded = useAsyncValue<PassageDetail | null>(
    () => getPassageDetail(userId, passageId, today),
    `${userId}:${passageId}:${today}`,
  )

  return (
    <Screen
      header={
        <CompactActionHeader
          label={loaded == null ? '' : collectionLabel(loaded.passage.collection)}
          onBack={back}
        />
      }
    >
      {loaded != null && (
        <div style={SURFACE}>
          <header style={{ paddingTop: 26 }}>
            <h1 className="text-deep" style={typeStyle('settingsTitle')}>
              {loaded.passage.title}
            </h1>
            {/* Principle 7.10: every surface that names a passage names its author. */}
            <p
              className="text-on-paper-44"
              style={{ ...typeStyle('rowAttribution'), marginTop: 6 }}
            >
              {passageAttribution(loaded.passage)}
            </p>
          </header>

          {/* Scope 11.3's first item, and the only one drawn large: the star,
              with the state's own word beside it so the drawing is never the
              only thing carrying the meaning. */}
          <SettingsSection label={strings.progress.freshnessSection} />
          <div className="flex items-center" style={{ gap: 12, minHeight: MINIMUM_ROW_HEIGHT }}>
            <FreshnessStar freshness={loaded.freshness} size={22} />
            <span className="text-deep" style={typeStyle('settingsRowLabel')}>
              {strings.freshness[loaded.freshness]}
            </span>
          </div>

          {/* Scope 11.3's last item. Only the states with lines in them are
              drawn: a row reading nought is a figure about nothing. */}
          {!loaded.promoted && loaded.lineCount > 0 && (
            <>
              <SettingsSection label={strings.progress.linesSection} />
              <ul aria-label={strings.accessibility.lineStates}>
                {statesPresent(loaded).map((state) => (
                  <li key={state}>
                    <StateCount state={state} lines={loaded.counts[state]} />
                  </li>
                ))}
              </ul>
            </>
          )}

          <SettingsSection label={strings.progress.historySection} />
          <Fact
            text={
              loaded.longestIntervalDays === null
                ? strings.progress.noInterval
                : strings.progress.longestInterval(formatInterval(loaded.longestIntervalDays))
            }
          />
          <Fact
            text={
              loaded.lapses === 0
                ? strings.progress.noLapses
                : strings.progress.lapses(loaded.lapses)
            }
          />
          {/* Scope 11.3's "milestone date, if reached". A demotion keeps it, so
              a passage that has been back on its lines since still says when it
              happened, and then says where it is now (decision D9.5). */}
          {loaded.milestoneReachedAt !== null && (
            <>
              <Fact
                text={strings.progress.milestoneOn(formatDay(dayOf(loaded.milestoneReachedAt)))}
              />
              <Fact
                text={
                  loaded.promoted
                    ? strings.progress.comesRoundWhole
                    : strings.progress.backOnItsLines
                }
              />
            </>
          )}
          {/* A passage promoted without ever passing through the milestone
              screen is not reachable, but a promoted passage is still worth
              stating for a reader who has arrived here from a demotion. */}
          {loaded.milestoneReachedAt === null && loaded.promoted && (
            <Fact text={strings.progress.comesRoundWhole} />
          )}

          <SectionRule />
          <ListRow to={upkeepPath(loaded.passage.id)} title={strings.progress.upkeepRow} />

          <ScrollTail />
        </div>
      )}
    </Screen>
  )
}

/** The states with at least one line in them, worst first, as the star ladder runs. */
function statesPresent(detail: PassageDetail): Freshness[] {
  if (detail.userPrayer.upkeep_state === 'resting') return ['resting']
  return FRESHNESS_SEVERITY.filter((state) => detail.counts[state] > 0)
}

/**
 * How many lines sit at one state. Design-tokens 5.3's row, with the star as its
 * leading icon and the count where a row's trailing value goes.
 *
 * The accessible name carries the word and the count, because the star is
 * `aria-hidden` and the count alone would not say what of.
 */
function StateCount({ state, lines }: { state: Freshness; lines: number }) {
  const label = strings.freshness[state]
  const count = strings.memorise.lineCount(lines)
  return (
    <div
      className="flex items-center border-b border-rule last:border-b-0"
      style={{ gap: 13, padding: '11px 0', minHeight: MINIMUM_ROW_HEIGHT }}
      aria-label={strings.accessibility.linesAtState(label, count)}
    >
      <FreshnessStar freshness={state} />
      <span className="min-w-0 flex-1 text-deep" style={typeStyle('settingsRowLabel')}>
        {label}
      </span>
      <span className="flex-none text-on-paper-40" style={typeStyle('rowAttribution')}>
        {count}
      </span>
    </div>
  )
}

/**
 * One plain sentence about what has happened to this passage.
 *
 * A sentence rather than a labelled figure, because "LAPSES 3" is a statistic
 * and "3 times, a line has gone back to the beginning" is a fact about a
 * schedule. Scope 11.3 asks for the longest interval to be "stated plainly", and
 * the same reasoning covers the two beside it.
 */
function Fact({ text }: { text: string }) {
  return (
    <p
      className="text-on-paper-60"
      style={{ ...typeStyle('settingsRowCaption'), padding: '7px 0' }}
    >
      {text}
    </p>
  )
}

/**
 * The day a stored instant fell on, **in the reader's own timezone**.
 *
 * `milestone_reached_at` is a UTC instant. Slicing the first ten characters off
 * it would be the UTC day, and a milestone reached at nine in the morning in
 * Melbourne is stored as the previous evening in UTC - so the one date on this
 * screen the reader could check against their own memory would be a day out.
 * `today()` in `clock.ts` formats a `Date` in the device's zone and already
 * carries that reasoning; this is the same conversion the streak makes.
 */
function dayOf(instant: string): string {
  return todayOf(new Date(instant))
}
