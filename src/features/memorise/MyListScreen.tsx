import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { MEMORISE_PATH, upkeepPath } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { ListSurface, ScrollTail } from '../../components/ListSurface'
import { CompactTitleHeader } from '../../components/NavyHeader'
import { ReorderableList, type ReorderableRow } from '../../components/Reorderable'
import { Screen } from '../../components/Screen'
import { Toast, useToast } from '../../components/Toast'
import { today as todayOf } from '../../data/clock'
import type { UserPrayerRow } from '../../data/types'
import { listPassagesOnList, type ListedPassage } from '../../data/upkeep'
import { putBackOnList, reorderList, takeOffList } from '../../data/userPrayers'
import { isFocusActive } from '../../queue'
import { strings } from '../../strings'
import { capsCase, passageStateAttribution } from '../../strings/attribution'
import { typeStyle } from '../../theme'

/**
 * **My list.** Scope 6.5: the ordered list of what the user intends to memorise.
 *
 * > Reorderable by hand, under the ordering rule in 6.7, which governs this list
 * > and Bookmarks identically. They are the same interaction on different
 * > material. Removable at any time, permanently, with no penalty or friction.
 *
 * The interaction is literally the same: both screens hand their rows to
 * `ReorderableList`, so the two cannot drift apart in what a drag does.
 *
 * ## It absorbed the roll call
 *
 * Session 6 put an UPKEEP section on the Memorise tab listing every passage on
 * the list with the state it was in, purely as a door to the upkeep screen, and
 * said session 7 should feel free to fold it in (decision D6.3). This is that
 * fold: **the word beside each row is the roll call's word**, ACTIVE,
 * OCCASIONAL, RESTING or FOCUS, and tapping the row still opens the same screen.
 * Nothing was lost and there is no longer the same list of passages on two
 * screens one tap apart. See decision D7.3.
 *
 * ## Why there is no sort control here
 *
 * Scope 6.5 asks for one order and one only: the order the user arranged, which
 * is also the order the queue reads when it decides what comes first (decision
 * D6.2). Bookmarks are a shelf you browse; the list is a queue you have arranged,
 * and a sort over it would be a view of a thing whose whole point is its order.
 *
 * ## Removing
 *
 * One tap, permanent, no confirmation - scope 6.5 asks for no friction by name.
 * What stands behind it is the band of decision D4.10 with an Undo in it, and
 * the Undo genuinely restores the lines, the progress and the review history,
 * because `takeOffList` hands back everything it destroyed. A person taking a
 * passage off after three weeks can see on this screen what they are giving up,
 * which is the reason D4.3 kept this control off the reading view.
 */
export function MyListScreen() {
  const userId = useUserId()
  const back = useBack(MEMORISE_PATH)
  const today = todayOf()
  const toast = useToast()

  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => {
    setRevision((previous) => previous + 1)
  }, [])
  const loaded = useAsyncValue<ListedPassage[]>(
    () => listPassagesOnList(userId),
    `${userId}:${String(revision)}`,
  )

  /** The reader's own arrangement, until the re-read catches up. See `arrange`. */
  const [dragged, setDragged] = useState<readonly string[] | null>(null)
  /** A row taken off, held out of the list while the band is up. */
  const [removed, setRemoved] = useState<readonly string[]>([])

  const onReorder = useCallback(
    (orderedPassageIds: readonly string[]) => {
      setDragged(orderedPassageIds)
      void reorderList(userId, orderedPassageIds).then(reload, (error: unknown) => {
        console.error('Failed to save the list order', error)
      })
    },
    [userId, reload],
  )

  const show = toast.show
  const onRemove = useCallback(
    (passageId: string) => {
      setRemoved((previous) => [...previous, passageId])
      void takeOffList(userId, passageId).then(
        (snapshot) => {
          reload()
          if (snapshot === null) return
          show({
            text: strings.myList.removed,
            undo: {
              label: strings.myList.undo,
              onUndo: () => {
                setRemoved((previous) => previous.filter((id) => id !== passageId))
                void putBackOnList(snapshot).then(() => {
                  reload()
                  show({ text: strings.myList.removeUndone, undo: null })
                }, onWriteFailed)
              },
            },
          })
        },
        (error: unknown) => {
          setRemoved((previous) => previous.filter((id) => id !== passageId))
          onWriteFailed(error)
        },
      )
    },
    [userId, reload, show],
  )

  const shown = arrange(loaded ?? [], dragged).filter(
    (entry) => !removed.includes(entry.passage.id),
  )

  return (
    <Screen
      header={<CompactTitleHeader title={strings.screenTitles.myList} onBack={back} />}
      footer={<Toast toast={toast.toast} onDismiss={toast.dismiss} />}
    >
      <ListSurface>
        {loaded !== undefined &&
          (shown.length === 0 ? (
            <p
              className="text-on-paper-50"
              style={{ ...typeStyle('bylineItalic'), padding: '26px 0 8px' }}
            >
              {strings.myList.empty}
            </p>
          ) : (
            <div style={{ paddingTop: 22 }}>
              <ReorderableList
                label={strings.accessibility.myList}
                rows={shown.map((entry) => toRow(entry, today, onRemove))}
                canReorder
                onReorder={onReorder}
              />
            </div>
          ))}
      </ListSurface>
      <ScrollTail />
    </Screen>
  )
}

/**
 * One passage on the list. Design-tokens 5.3's list row, with the roll call's
 * own secondary line: the state this passage is in, or that focus is on it.
 *
 * The title is the link to the upkeep screen and the Remove control is beside
 * it, so neither can be hit by aiming at the other. Remove is held off the drag
 * handle as well, because the two sit next to each other and one of them throws
 * away three weeks of work.
 *
 * **The author is on the row.** Principle 7.10: every surface that names a
 * passage names who wrote it. Session 6's roll call showed only the state, and
 * that came here and was fixed rather than inherited.
 */
function toRow(
  entry: ListedPassage,
  today: string,
  onRemove: (passageId: string) => void,
): ReorderableRow {
  return {
    id: entry.passage.id,
    title: entry.passage.title,
    content: (
      <Link to={upkeepPath(entry.passage.id)} className="block">
        <span className="block text-deep" style={typeStyle('listRowTitle')}>
          {entry.passage.title}
        </span>
        <span
          className="block text-on-paper-44"
          style={{ ...typeStyle('rowAttribution'), marginTop: 3 }}
        >
          {passageStateAttribution(entry.passage, upkeepLabel(entry.userPrayer, today))}
        </span>
      </Link>
    ),
    trailing: (
      <button
        type="button"
        aria-label={strings.myList.removeNamed(entry.passage.title)}
        onClick={() => {
          onRemove(entry.passage.id)
        }}
        className="-my-3 flex flex-none items-center text-on-paper-40"
        style={{ ...typeStyle('rowAttribution'), minHeight: 44, paddingLeft: 10, marginRight: 6 }}
      >
        {strings.myList.remove}
      </button>
    ),
  }
}

/**
 * What the row says about a passage: the state it is in, or that focus is on it.
 * The caps slot, like every other secondary row line (design-tokens 5.3).
 *
 * Lifted from `MemoriseScreen` unchanged when the roll call moved here, so the
 * word beside a passage did not change on the day its screen did.
 */
function upkeepLabel(row: UserPrayerRow, today: string): string {
  if (isFocusActive({ isFocus: row.is_focus, focusUntil: row.focus_until }, today)) {
    return capsCase(strings.upkeep.focusSection)
  }
  if (row.upkeep_state === 'resting') return capsCase(strings.upkeep.resting)
  if (row.upkeep_state === 'occasional') return capsCase(strings.upkeep.occasional)
  return capsCase(strings.upkeep.active)
}

/** The reader's own arrangement wins over the read for as long as it is newer. */
function arrange(
  entries: readonly ListedPassage[],
  dragged: readonly string[] | null,
): ListedPassage[] {
  if (dragged === null) return [...entries]
  const rank = new Map(dragged.map((id, index) => [id, index]))
  return [...entries].sort(
    (a, b) => (rank.get(a.passage.id) ?? Infinity) - (rank.get(b.passage.id) ?? Infinity),
  )
}

function onWriteFailed(error: unknown) {
  console.error('Failed to change the list', error)
}
