import { useEffect, useRef } from 'react'
import { MY_LIST_PATH, SETTINGS_PATH } from '../../app/routes'
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
import { listPassagesOnList, releaseExpiredFocus, type ListedPassage } from '../../data/upkeep'
import { isFocusActive } from '../../queue'
import { strings } from '../../strings'
import { passageAttribution } from '../../strings/attribution'
import { formatDay } from '../../strings/dates'
import { typeStyle } from '../../theme'

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
 * screen as today's work rather than a tab away from it, and session 10 builds
 * them between TODAY and the doors below. Settings came with it, which is Safa
 * answering the question decision D2.4 left open.
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
 * **Tapping a row does nothing yet.** The quiz ladder is sessions 8 and 9. The
 * rows are drawn but inert on purpose, rather than opening a screen that would
 * have to be unbuilt.
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
  readonly released: readonly string[]
}

export function MemoriseScreen() {
  const userId = useUserId()
  const today = todayOf()
  const toast = useToast()
  // Told once. The release itself only ever happens once, so a second read of
  // the same day finds nothing to say; this guards the re-render in between.
  const told = useRef(false)

  const loaded = useAsyncValue<Loaded>(async () => {
    // Scope 8.6: focus releases automatically on expiry, and tells the user. The
    // release runs before the queue is built so the day is drawn already whole.
    const released = await releaseExpiredFocus(userId, today)
    const [queue, listed] = await Promise.all([
      getTodaysQueue(userId, today),
      listPassagesOnList(userId),
    ])
    return { queue, listed, released: released.map((passage) => passage.title) }
  }, `${userId}:${today}`)

  const releasedCount = loaded?.released.length ?? 0
  const show = toast.show
  useEffect(() => {
    if (releasedCount === 0 || told.current) return
    told.current = true
    show({ text: strings.memorise.focusEnded, undo: null })
  }, [releasedCount, show])

  const focused = (loaded?.listed ?? []).filter((entry) => isFocusActive(focusOf(entry), today))

  return (
    <Screen
      header={<TallHeader eyebrow={strings.appNameEyebrow} title={strings.screenTitles.memorise} />}
      footer={<Toast toast={toast.toast} onDismiss={toast.dismiss} />}
    >
      {loaded !== undefined && (
        <div style={SURFACE}>
          {focused.length > 0 && <FocusLine focused={focused} />}

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
                  <QueueRow
                    title={entry.passage.title}
                    secondary={passageAttribution(entry.passage)}
                    lines={entry.lineCount}
                  />
                </li>
              ))}
            </ul>
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

function focusOf(entry: ListedPassage) {
  return { isFocus: entry.userPrayer.is_focus, focusUntil: entry.userPrayer.focus_until }
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
 * One passage today touches. Design-tokens 5.3's list row, with the number of
 * its lines on the secondary caps line after the author.
 *
 * Not a link and not a button: the quiz ladder is sessions 8 and 9, and a row
 * that responded to a tap today would have to be unbuilt then.
 */
function QueueRow({
  title,
  secondary,
  lines,
}: {
  title: string
  secondary: string
  lines: number
}) {
  return (
    <div
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
        {strings.memorise.lineCount(lines)}
      </span>
    </div>
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
