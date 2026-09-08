import { useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  MY_LIST_PATH,
  SETTINGS_PATH,
  passageDetailPath,
  recitePath,
  reviewPath,
} from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useUserId } from '../../app/userContext'
import {
  ListRow,
  MINIMUM_ROW_HEIGHT,
  ScrollTail,
  SectionHeader,
  SectionRule,
} from '../../components/ListSurface'
import { TallHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { Toast, useToast } from '../../components/Toast'
import { today as todayOf } from '../../data/clock'
import { getTodaysQueue, type TodaysQueue } from '../../data/dailyQueue'
import { listRecitablePassages, type RecitablePassage } from '../../data/milestone'
import {
  getStreak,
  listPassageFreshness,
  type PassageWithFreshness,
  type Streak,
} from '../../data/progress'
import { listPassagesOnList, releaseExpiredFocus, type ListedPassage } from '../../data/upkeep'
import { isFocusActive } from '../../queue'
import { strings } from '../../strings'
import { capsCase, passageAttribution, passageStateAttribution } from '../../strings/attribution'
import { formatDay } from '../../strings/dates'
import { typeStyle } from '../../theme'
import { FreshnessStar } from './FreshnessStar'

/**
 * **Memorise: today's queue.** Scope 8.2, 8.3, 8.5 and 8.6.
 *
 * > The user sees today's queue. Underneath, SM-2 decides what is due.
 *
 * ## What it shows, and what it must never show
 *
 * A section for today, holding one row per passage the day touches with the
 * number of its lines under it, and then two doors: My list, and Settings.
 * Nothing anywhere counts what the cap left out: principle 7.3 calls the capped
 * queue the single most important requirement in the document, and the count of
 * the overflow is not merely unrendered, it is never computed. See the header of
 * `src/queue/queue.ts`.
 *
 * ## This tab is the whole activity side of the app now
 *
 * Log was a third tab holding one row. Decision D7.1 folds it in: the streak,
 * the freshness states and the passage detail of scope 11 belong on the same
 * screen as today's work rather than a tab away from it. Session 11 built them,
 * and the screen now reads down in the order a morning happens: **the streak**,
 * one line and no more; **today's work**; **what can be recited whole**; and
 * **what you know**, which is every passage on the list with its star. Settings
 * came across with the Log tab too, which is Safa answering the question
 * decision D2.4 left open.
 *
 * ## Why WHAT YOU KNOW is not the roll call coming back
 *
 * Session 6 listed every passage here purely as a door to the upkeep screen, and
 * decision D7.3 removed it because My list carried the same rows one tap away.
 * This section is not that (decision D11.1, Safa's call). It is the only place a
 * passage with nothing due today appears at all, which is what makes a gold star
 * reachable: today's queue holds the lines that are slipping, so a star drawn
 * only there would never be anything but dim. My list keeps arranging, removing
 * and the door to upkeep; this answers how each passage is going, and its rows
 * open scope 11.3's detail view.
 *
 * ## The roll call is gone, and where it went
 *
 * Session 6 listed every passage on the list here, with the state it was in,
 * purely as a door to the upkeep screen (decision D6.3). My list absorbed it
 * (decision D7.3): it carries the same word beside every row and the same door
 * behind it, and this tab carries one row that opens it. Two screens listing the
 * same passages one tap apart was the thing worth removing.
 *
 * **The secondary line is the attribution and nothing else.** Scope 6.2 puts a
 * word count on a passage row in Discover, where the question is how long a
 * thing is before you read it. Here the question has already been answered, and
 * the only number on the screen is how many lines today holds.
 *
 * **Why a row is a passage rather than a line.** A line's own text is the thing
 * the quiz is about to ask for, so a list of lines would give the answers away
 * before the ladder had asked anything; and three rows carrying the same prayer
 * name tell the reader nothing at all.
 *
 * **Tapping a row opens that prayer's lines for today**, and that is the only
 * door into the quiz ladder (decision D8.1). There is no button that begins the
 * whole day. You take on one prayer, work through its lines, and are back here
 * with that row gone; when the last row goes the section says you are up to
 * date. The shrinking list is the only progress the app ever shows, which is
 * also the only kind principle 7.1 leaves room for.
 *
 * ## The door to the milestone
 *
 * Scope 9.5 says the milestone is "deliberately attempted" rather than served by
 * the queue, and does not say from where. **Here, in a section that exists only
 * when there is something to attempt** (decision D9.1, Safa's call). A passage
 * appears in it once the app has shown the reader every one of its lines, and
 * stays until it is recited right through.
 *
 * That keeps decision D8.1's promise about this screen. On every ordinary
 * morning the tab holds exactly what it held before - today's work and two doors
 * - because the section is not drawn when it is empty. When it is drawn, it is
 * because a reader has got a whole passage into their head, which is not an
 * ordinary morning.
 *
 * It is a standing invitation and never a prompt. Nothing asks at the end of a
 * session, nothing counts down, and declining is not tapping it. An attempt the
 * app chose the moment for would not be a deliberate one.
 *
 * **A promoted passage is not in that section.** Its recital is a review now
 * (scope 8.7), so it arrives in TODAY like any other work, as one row that opens
 * the same screen. It only returns to FROM MEMORY if a rating of Again ever
 * demotes it.
 *
 * ## The finished day
 *
 * Scope 8.3: "When the queue is done, it is done. No study more prompt." So the
 * empty state is one calm sentence with nothing offered after it. A user with
 * nothing on their list at all gets a different sentence, because "you are up to
 * date" is not true of a list that does not exist.
 */

/** Design-tokens 5.3: the list surface is `0 26px` over paper. */
const SURFACE = { padding: '0 26px' }

interface Loaded {
  readonly queue: TodaysQueue
  readonly listed: readonly ListedPassage[]
  readonly recitable: readonly RecitablePassage[]
  readonly released: readonly string[]
  /** Scope 11.4. Derived from `review_log` on every read (decision D11.2). */
  readonly streak: Streak
  /** Scope 11.1's progress per passage, one star each (decision D11.1). */
  readonly known: readonly PassageWithFreshness[]
}

export function MemoriseScreen() {
  const userId = useUserId()
  const today = todayOf()
  const toast = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  // Told once. The release itself only ever happens once, so a second read of
  // the same day finds nothing to say; this guards the re-render in between.
  const told = useRef(false)

  const loaded = useAsyncValue<Loaded>(async () => {
    // Scope 8.6: focus releases automatically on expiry, and tells the user. The
    // release runs before the queue is built so the day is drawn already whole.
    const released = await releaseExpiredFocus(userId, today)
    const [queue, listed, recitable, streak, known] = await Promise.all([
      getTodaysQueue(userId, today),
      listPassagesOnList(userId),
      listRecitablePassages(userId, today),
      getStreak(userId, today),
      listPassageFreshness(userId, today),
    ])
    return {
      queue,
      listed,
      recitable,
      streak,
      known,
      released: released.map((passage) => passage.title),
    }
  }, `${userId}:${today}`)

  const releasedCount = loaded?.released.length ?? 0
  const show = toast.show
  useEffect(() => {
    if (releasedCount === 0 || told.current) return
    told.current = true
    show({ text: strings.memorise.focusEnded, undo: null })
  }, [releasedCount, show])

  /**
   * The reader is back from a recital. What happened is said here rather than
   * there, for the reason decision D4.10 gives about the add: there is where it
   * happened, here is where the reader is - and here is the screen the outcome
   * has changed, because a promoted passage's work tomorrow is a different
   * shape.
   *
   * The state is cleared as it is read, so stepping back onto this entry later
   * does not announce a recital from ten minutes ago.
   */
  useEffect(() => {
    const text = milestoneMessage(location.state)
    if (text === null) return
    void navigate(location.pathname, { replace: true, state: null })
    show({ text, undo: null })
  }, [location, navigate, show])

  const focused = (loaded?.listed ?? []).filter((entry) => isFocusActive(focusOf(entry), today))

  return (
    <Screen
      header={<TallHeader eyebrow={strings.appNameEyebrow} title={strings.screenTitles.memorise} />}
      footer={<Toast toast={toast.toast} onDismiss={toast.dismiss} />}
    >
      {loaded !== undefined && (
        <div style={SURFACE}>
          {focused.length > 0 && <FocusLine focused={focused} />}

          {/* Scope 11.4's streak, said once and quietly. Nothing at nought. */}
          {loaded.streak.current > 0 && <StreakLine days={loaded.streak.current} />}

          <SectionHeader
            label={strings.memorise.todaySection}
            count={
              loaded.queue.items.length === 0
                ? undefined
                : strings.memorise.lineCount(loaded.queue.items.length)
            }
          />

          {loaded.queue.passages.length === 0 ? (
            <Quiet
              text={loaded.queue.listIsEmpty ? strings.memorise.emptyList : strings.memorise.done}
            />
          ) : (
            <ul aria-label={strings.accessibility.queueList}>
              {loaded.queue.passages.map((entry) => (
                <li key={entry.passage.id}>
                  {/* A promoted passage's work today is the whole of it, so the
                      row opens the recital rather than the line walk and says
                      so (scope 8.7). Everything else is unchanged. */}
                  <QueueRow
                    to={entry.whole ? recitePath(entry.passage.id) : reviewPath(entry.passage.id)}
                    title={entry.passage.title}
                    secondary={passageAttribution(entry.passage)}
                    trailing={
                      entry.whole
                        ? strings.memorise.wholePassage
                        : strings.memorise.lineCount(entry.lineCount)
                    }
                    ariaLabel={
                      entry.whole
                        ? strings.accessibility.reciteRow(entry.passage.title)
                        : strings.accessibility.queueRow(
                            entry.passage.title,
                            strings.memorise.lineCount(entry.lineCount),
                          )
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Scope 9.5's deliberate attempt, decision D9.1. Drawn only when
              there is a whole passage to attempt, so on an ordinary morning this
              screen holds exactly what it held before. */}
          {loaded.recitable.length > 0 && (
            <>
              <SectionHeader label={strings.memorise.reciteSection} />
              <ul aria-label={strings.accessibility.reciteList}>
                {loaded.recitable.map((entry) => (
                  <li key={entry.passage.id}>
                    <QueueRow
                      to={recitePath(entry.passage.id)}
                      title={entry.passage.title}
                      secondary={passageAttribution(entry.passage)}
                      trailing={strings.memorise.wholePassage}
                      ariaLabel={strings.accessibility.reciteRow(entry.passage.title)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Scope 11.1's progress per passage. The only place a passage with
              no work today appears at all, which is what makes a gold star
              reachable: today's queue holds the lines that are slipping, so a
              star drawn only there would never be anything but dim. Decision
              D11.1, Safa's call. Not drawn on an empty list, so a reader who
              has added nothing sees exactly the tab they saw before. */}
          {loaded.known.length > 0 && (
            <>
              <SectionHeader label={strings.memorise.knownSection} />
              <ul aria-label={strings.accessibility.knownList}>
                {loaded.known.map((entry) => (
                  <li key={entry.passage.id}>
                    <KnownRow entry={entry} />
                  </li>
                ))}
              </ul>
            </>
          )}

          <SectionRule />
          <ListRow
            to={MY_LIST_PATH}
            title={strings.memorise.myListRow}
            trailing={
              loaded.listed.length === 0
                ? undefined
                : strings.memorise.passageCount(loaded.listed.length)
            }
          />
          <ListRow to={SETTINGS_PATH} title={strings.settings.open} />

          <ScrollTail />
        </div>
      )}
    </Screen>
  )
}

/**
 * What to say about a recital that has just happened, or `null` when the reader
 * arrived here some other way.
 *
 * Four outcomes and four plain sentences, none of which congratulates: principle
 * 7.1 forbids the arcade and principle 7.5 forbids encouragement made out of
 * scripture. Each one says what changed about how the passage will come round,
 * which is the only thing the reader could not work out for themselves.
 *
 * The state is read defensively because it is a router value and can be
 * anything at all: a restored tab, a hand-typed history entry, a future screen
 * that navigates here with something else in it.
 */
function milestoneMessage(state: unknown): string | null {
  const outcome =
    typeof state === 'object' && state !== null && 'milestone' in state
      ? (state as { milestone?: unknown }).milestone
      : undefined

  switch (outcome) {
    case 'promoted':
      return strings.memorise.milestoneReached
    case 'scheduled':
      return strings.memorise.milestoneScheduled
    case 'demoted':
      return strings.memorise.milestoneDemoted
    case 'unchanged':
      return strings.memorise.milestoneUnchanged
    default:
      return null
  }
}

function focusOf(entry: ListedPassage) {
  return { isFocus: entry.userPrayer.is_focus, focusUntil: entry.userPrayer.focus_until }
}

/**
 * **The streak.** Scope 11.4, and scope 11.5's own words for it, "Days in a row".
 *
 * One line, in the same italic the focus line uses: a sentence the app says
 * rather than a banner it puts up. There is no flame, no best-ever, no count of
 * what a missed day would cost, and **no notification about a streak at risk,
 * ever**, which scope 11.4 forbids by name.
 *
 * **It is absent at nought rather than showing a zero.** A reader who has not
 * started, and a reader whose streak has just gone, are both met with the screen
 * they had before. Principle 7.1: this app is opened at six in the morning to
 * pray, and a nought on it every morning is a reproach delivered slowly.
 *
 * A paused streak says the same number it said before the missed day, because
 * scope 11.4 says a missed day pauses rather than resets and the reader has lost
 * nothing yet. Nothing marks it as paused: that would be the risk notification
 * in another form.
 */
function StreakLine({ days }: { days: number }) {
  return (
    <p className="text-on-paper-50" style={{ ...typeStyle('bylineItalic'), padding: '22px 0 0' }}>
      {strings.memorise.streakLine(days)}
    </p>
  )
}

/**
 * **One passage on the list, with its star.** Scope 11.1 and design-tokens 4.
 *
 * Design-tokens 5.3's list row with its optional 15px leading icon, which is
 * exactly the size the star is drawn at. The secondary line is the author and
 * the state, which is the shape My list already uses (`passageStateAttribution`)
 * - the author because principle 7.10 admits no exception, and the state because
 * **the star is a drawing and the word is its name**. Design-tokens 4 bans a
 * second measure of freshness (a number, a bar, a percentage), not the four
 * words scope 11.5 supplies precisely so the states can be said.
 *
 * The row opens the passage detail view of scope 11.3, which is the one screen
 * that answers "how well do I know this, and am I done?". My list keeps its own
 * job and its own door: arranging the list, taking things off it, and setting
 * how often a passage comes round.
 */
function KnownRow({ entry }: { entry: PassageWithFreshness }) {
  const state = strings.freshness[entry.freshness]
  return (
    <Link
      to={passageDetailPath(entry.passage.id)}
      aria-label={strings.accessibility.knownRow(entry.passage.title, state)}
      className="flex items-center border-b border-rule last:border-b-0"
      style={{ gap: 13, padding: '11px 0', minHeight: MINIMUM_ROW_HEIGHT }}
    >
      <FreshnessStar freshness={entry.freshness} />
      <span className="min-w-0 flex-1">
        <span className="block text-deep" style={typeStyle('listRowTitle')}>
          {entry.passage.title}
        </span>
        <span
          className="block text-on-paper-44"
          style={{ ...typeStyle('rowAttribution'), marginTop: 3 }}
        >
          {passageStateAttribution(entry.passage, capsCase(state))}
        </span>
      </span>
    </Link>
  )
}

/**
 * Scope 8.6: "While active, a persistent line on the Memorise tab states what is
 * paused and when focus lifts. Never on Discover (7.6)."
 *
 * Named where there is one focused passage and counted where there are several,
 * because a line that lists five titles has stopped being a line. It is set in
 * the same italic the add moment's note uses: a sentence the app says, not a
 * banner it puts up.
 */
function FocusLine({ focused }: { focused: readonly ListedPassage[] }) {
  const [first] = focused
  if (first === undefined) return null
  const what =
    focused.length === 1 ? first.passage.title : strings.memorise.focusPassageCount(focused.length)
  return (
    <p className="text-on-paper-50" style={{ ...typeStyle('bylineItalic'), padding: '22px 0 0' }}>
      {strings.memorise.focusLine(what, formatDay(first.userPrayer.focus_until ?? ''))}
    </p>
  )
}

/**
 * One passage with work behind it, and the door into it. Design-tokens 5.3's
 * list row, with what it holds on the right.
 *
 * Three sections use it: today's lines, today's promoted passages, and the
 * standing invitation of decision D9.1. They are one row because they are one
 * thing to the reader - a prayer with something to do - and because the door
 * behind it is the only thing that differs.
 *
 * It is a link rather than `ListRow` because the row carries three pieces of
 * text where that component carries two, and because its accessible name has to
 * be the prayer and its count rather than the prayer, the author and the count
 * read as one run-on phrase.
 */
function QueueRow({
  to,
  title,
  secondary,
  trailing,
  ariaLabel,
}: {
  to: string
  title: string
  secondary: string
  /** What the row holds, in the caps slot: a count of lines, or the whole of it. */
  trailing: string
  ariaLabel: string
}) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className="flex items-center border-b border-rule last:border-b-0"
      style={{ gap: 13, padding: '11px 0', minHeight: MINIMUM_ROW_HEIGHT }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-deep" style={typeStyle('listRowTitle')}>
          {title}
        </span>
        <span
          className="block text-on-paper-44"
          style={{ ...typeStyle('rowAttribution'), marginTop: 3 }}
        >
          {secondary}
        </span>
      </span>
      <span className="flex-none text-on-paper-40" style={typeStyle('rowAttribution')}>
        {trailing}
      </span>
    </Link>
  )
}

/**
 * The finished day, and the empty list. One sentence, in the same italic as the
 * focus line, with nothing offered after it: scope 8.3 forbids a "study more"
 * prompt by name, and principle 7.1 forbids anything that would make a quiet day
 * feel like a failure.
 */
function Quiet({ text }: { text: string }) {
  return (
    <p className="text-on-paper-50" style={{ ...typeStyle('bylineItalic'), padding: '4px 0 8px' }}>
      {text}
    </p>
  )
}
