import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { addToListPath, DISCOVER_PATH } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { CompactActionHeader } from '../../components/NavyHeader'
import { Screen } from '../../components/Screen'
import { Toast, useToast } from '../../components/Toast'
import { AddToListIcon, BookmarkIcon, OnListIcon } from '../../components/ToolbarIcons'
import { addBookmark, isBookmarked, removeBookmark } from '../../data/bookmarks'
import { getDevotionalPassage, isOnList, removePassageFromList } from '../../data/passages'
import type { PassageRow } from '../../data/types'
import { strings } from '../../strings'
import { collectionLabel, passageAttribution, textTypeLabel } from '../../strings/attribution'
import { FLEURON, FLEURON_SIZE, typeStyle } from '../../theme'
import { splitDropCap } from './dropCap'

/**
 * The reading view. Scope 6.6, design-tokens 5.4.
 *
 * > Any passage in full, typographically well set, adjustable text size,
 * > attribution and copyright notice present, **no quiz furniture whatsoever.**
 * > This is a devotional surface.
 *
 * The body is design-tokens 5.4 in order: eyebrow, title, byline, twin rules,
 * the passage with its drop cap, the fleuron, the attribution block. Every
 * measurement is the table's. The text size control (scope 7.9) reaches all of
 * it for free, because every size here is a `typeStyle` role and the roles are
 * CSS variables the theme provider rewrites.
 *
 * ## What "no quiz furniture" rules out
 *
 * Everything memorisation knows about this passage. Not the due date, not the
 * freshness star (design-tokens 4 bans it from here by name), not the upkeep
 * state, not the streak, not whether today's queue contains it. Principle 7.6,
 * and it is a failing build rather than a review comment: nothing in this folder
 * can import a module that holds any of it.
 *
 * The single exception the principle spells out is the add button: *"a passage
 * already on your list shows nothing in the reading view except that the add
 * button reads as already added"*. That is a boolean, it comes from `isOnList`
 * which returns nothing else, and it is the whole of what this screen knows.
 *
 * ## The two toolbar actions
 *
 * Scope 6.6 makes them different intents, so they are different marks and
 * neither is in a menu. **Bookmark** is a toggle: keeping a place and letting it
 * go are both devotional and both cost nothing.
 *
 * **Add to my list** stays one way from the mark itself, because taking a
 * passage off the list also throws away everything you have learnt of it. What
 * it gains is an undo in the moment (decision D4.10): a band at the foot of the
 * screen saying what happened, with a way back for as long as it is there. A
 * passage added seconds ago has nothing learnt of it to lose, so undoing inside
 * that window is safe in a way that a permanently live remove control is not.
 *
 * ## The mark opens a screen rather than writing a row
 *
 * Scope 8.4 splits a passage into the lines it will be learnt in at the moment
 * it is added, proposed by the app and confirmed by the user. That screen is
 * memorisation and lives under `/memorise/add/` (decision D5.1), so this mark
 * navigates to it and writes nothing itself. Nothing is on the list until the
 * lines are confirmed there, and the band below arrives with the reader coming
 * back.
 */

/** Design-tokens 5.4: `34px 32px 0`, over paper. */
const READING_PADDING = '34px 32px 0'

interface Reading {
  readonly passage: PassageRow | undefined
  readonly bookmarked: boolean
  readonly onList: boolean
}

export function ReadingScreen() {
  const { passageId = '' } = useParams()
  const userId = useUserId()
  const navigate = useNavigate()
  const location = useLocation()
  const back = useBack(DISCOVER_PATH)

  const loaded = useAsyncValue<Reading>(async () => {
    const passage = await getDevotionalPassage(passageId)
    if (passage === undefined) return { passage: undefined, bookmarked: false, onList: false }
    const [bookmarked, onList] = await Promise.all([
      isBookmarked(userId, passageId),
      isOnList(userId, passageId),
    ])
    return { passage, bookmarked, onList }
  }, passageId)

  const [bookmarked, setBookmarked] = useMark(passageId, loaded?.bookmarked)
  const [onList, setOnList] = useMark(passageId, loaded?.onList)
  const write = useTapOrderedWrites()
  const { toast, show, dismiss } = useToast()

  const passage = loaded?.passage

  const toggleBookmark = () => {
    if (passage === undefined) return
    const next = !bookmarked
    setBookmarked(next)
    write(
      () => (next ? addBookmark(userId, passage.id) : removeBookmark(userId, passage.id)),
      'Failed to write the bookmark',
    )
    // No undo offered: the mark that set it is 44px away and toggles.
    show({
      text: next ? strings.reading.bookmarked : strings.reading.bookmarkUndone,
      undo: null,
    })
  }

  const addToMyList = () => {
    if (passage === undefined || onList) return
    void navigate(addToListPath(passage.id))
  }

  /**
   * The reader is back from confirming the lines, and the passage is on the list
   * now. The band says so here rather than there, because there is where it
   * happened but here is where the reader is (decision D4.10).
   *
   * The state is cleared as it is read, so a later step back onto this entry
   * does not announce an add that happened ten minutes ago.
   */
  useEffect(() => {
    const state: unknown = location.state
    const added =
      typeof state === 'object' && state !== null && 'addedPassageId' in state
        ? (state as { addedPassageId?: unknown }).addedPassageId
        : undefined
    if (added !== passageId) return

    setOnList(true)
    void navigate(location.pathname, { replace: true, state: null })
    show({
      text: strings.reading.addedToList,
      undo: {
        label: strings.reading.undo,
        onUndo: () => {
          setOnList(false)
          write(() => removePassageFromList(userId, passageId), 'Failed to undo the add')
          show({ text: strings.reading.addUndone, undo: null })
        },
      },
    })
  }, [location, navigate, passageId, userId, show, setOnList, write])

  return (
    <Screen
      header={
        <CompactActionHeader
          label={passage === undefined ? '' : collectionLabel(passage.collection)}
          onBack={back}
        >
          {/* Not drawn until the passage is in hand. A toolbar that appears
              before what it acts on is a control that answers the first tap by
              doing nothing, on the two actions scope 6.6 says are one tap. */}
          {passage !== undefined && (
            <>
              <ToolbarButton
                label={bookmarked ? strings.reading.bookmarkRemove : strings.reading.bookmarkAdd}
                pressed={bookmarked}
                onClick={toggleBookmark}
              >
                <BookmarkIcon />
              </ToolbarButton>
              <ToolbarButton
                label={onList ? strings.reading.listAlreadyAdded : strings.reading.listAdd}
                pressed={onList}
                disabled={onList}
                onClick={addToMyList}
              >
                {onList ? <OnListIcon /> : <AddToListIcon />}
              </ToolbarButton>
            </>
          )}
        </CompactActionHeader>
      }
      footer={<Toast toast={toast} onDismiss={dismiss} />}
    >
      {passage !== undefined && <ReadingSurface passage={passage} />}
    </Screen>
  )
}

/**
 * Design-tokens 5.4, step by step. Each block below is one numbered item of that
 * table, in its order, with its own measurements.
 */
function ReadingSurface({ passage }: { passage: PassageRow }) {
  return (
    <article style={{ padding: READING_PADDING }}>
      {/* 1. Caps eyebrow in `label`, margin-bottom 16px */}
      <p className="text-label" style={{ ...typeStyle('eyebrowReading'), marginBottom: 16 }}>
        {textTypeLabel(passage.text_type)}
      </p>

      {/* 2. Display title, 40px, `ink`, carrying its authored line break */}
      <h1 className="text-ink" style={typeStyle('readingTitle')}>
        <AuthoredTitle title={passage.display_title} />
      </h1>

      {/* 3. Byline, body italic 16.5px, `ink-soft`, margin-top 10px */}
      <p className="text-ink-soft" style={{ ...typeStyle('bylineItalic'), marginTop: 10 }}>
        {passage.author}
      </p>

      {/* 4. Twin rules */}
      <div className="h-px bg-hair" style={{ margin: '22px 0 3px' }} />
      <div className="h-px bg-hair-lt" style={{ marginBottom: 24 }} />

      {/* 5. The passage, with its drop cap */}
      <PassageText text={passage.text} />

      {/* 6. Fleuron, centred, margin `26px 0` */}
      <p
        aria-hidden="true"
        className="text-accent-md"
        style={{ clear: 'both', textAlign: 'center', fontSize: FLEURON_SIZE, margin: '26px 0' }}
      >
        {FLEURON}
      </p>

      {/* 7. Attribution. Mandatory: principle 7.10, design-tokens 7. */}
      <p className="text-faint" style={typeStyle('attribution')}>
        {passageAttribution(passage)}
        <br />
        {strings.reading.copyright}
      </p>

      <div style={{ height: 34 }} />
    </article>
  )
}

/**
 * A title carrying an authored line break. Scope 18.23 and design-tokens 8.2:
 * `display_title` may hold a break the reading-surface layout wants and a plain
 * corpus title would lose. Every title in the committed corpus is a single line,
 * so today this renders exactly `title` does.
 */
function AuthoredTitle({ title }: { title: string }) {
  const lines = title.split('\n')
  return (
    <>
      {lines.map((line, index) => (
        <Fragment key={line + String(index)}>
          {index > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </>
  )
}

/**
 * The passage body. Design-tokens 5.4 step 5: 20px body at 1.58, `ink`, the
 * ink-bleed shadow, `text-wrap: pretty`, and a floated display drop cap at 64px,
 * line-height .82, padding `6px 10px 0 0`, in `accent-dk`.
 *
 * Paragraphs come from the blank lines the corpus carries (decision D3.1 put the
 * whole passage in one column; `\n` between paragraphs is how it stores them).
 * The drop cap belongs to the first paragraph, and `splitDropCap` decides
 * whether there is one at all - see `dropCap.ts` for the fallback and why.
 */
function PassageText({ text }: { text: string }) {
  const paragraphs = text.split(/\n+/).filter((paragraph) => paragraph.trim() !== '')
  const first = splitDropCap(paragraphs[0] ?? '')

  return (
    <div
      className="text-ink"
      style={{ ...typeStyle('passageBody'), textShadow: '0 0 .5px var(--ink-shadow)' }}
    >
      {paragraphs.map((paragraph, index) => (
        <p key={String(index)} style={index === 0 ? undefined : { marginTop: '1em' }}>
          {index === 0 && first !== null ? (
            <>
              <span
                className="text-accent-dk"
                style={{
                  ...typeStyle('dropCap'),
                  float: 'left',
                  padding: '6px 10px 0 0',
                }}
              >
                {first.cap}
              </span>
              {first.rest}
            </>
          ) : (
            paragraph
          )}
        </p>
      ))}
    </div>
  )
}

/**
 * Writes that land in the order they were tapped.
 *
 * A tap on a mark starts a write and does not wait for it, because the mark has
 * to redraw immediately and a local write lands in a millisecond or two. Two
 * taps in quick succession therefore start two writes that are free to overtake
 * each other, and when they do the mark on screen and the row in the database
 * disagree: bookmark, then remove the bookmark, and the remove can finish first,
 * leaving a bookmark that the mark says is not there.
 *
 * This is a genuine race rather than a test artefact, and a test caught it. Each
 * write waits for the one before it, so the last tap is the one that decides. A
 * failed write is logged and does not stop the next: the queue is about order,
 * not about atomicity.
 */
function useTapOrderedWrites(): (run: () => Promise<unknown>, message: string) => void {
  const pending = useRef<Promise<unknown>>(Promise.resolve())

  return useCallback((run: () => Promise<unknown>, message: string) => {
    pending.current = pending.current.then(run).catch((error: unknown) => {
      console.error(message, error)
    })
  }, [])
}

/**
 * What a mark shows: whatever the database said, until the reader taps it, and
 * whatever they tapped from then on.
 *
 * ## Why it is not simply state copied out of the read
 *
 * It was, and there was a race in it that a test caught about one run in five.
 * Copying the read into state takes an effect, and an effect runs after the
 * render that revealed the toolbar. A tap landing in that gap set the mark, and
 * then the effect ran and set it straight back to what the database had said a
 * moment earlier: the tap was drawn and then silently undone, and the write it
 * started stayed. Rare on a phone, but "rare" on the two actions scope 6.6 makes
 * one tap each is not good enough.
 *
 * So the value is worked out while rendering rather than copied by an effect,
 * and the reader's own tap simply wins from the moment it happens. The passage
 * id is held beside it so that opening a different prayer starts again from what
 * that prayer's read said, rather than from the last one's tap.
 */
function useMark(
  passageId: string,
  loaded: boolean | undefined,
): [boolean, (value: boolean) => void] {
  const [tapped, setTapped] = useState<{ passageId: string; value: boolean } | null>(null)

  const set = useCallback(
    (value: boolean) => {
      setTapped({ passageId, value })
    },
    [passageId],
  )

  return [tapped?.passageId === passageId ? tapped.value : (loaded ?? false), set]
}

/**
 * One toolbar action. A 17px mark in a 44px touch target (design-tokens 5.3's
 * production minimum), gold when the state is on and `on-field-66` when it is
 * not, per design-tokens 5.1's trailing icon.
 *
 * `aria-pressed` is what carries the state to a screen reader; the label changes
 * with it as well, because "Bookmark, pressed" and "Remove bookmark" are both
 * true and only one of them is a sentence.
 */
function ToolbarButton({
  label,
  pressed,
  disabled = false,
  onClick,
  children,
}: {
  label: string
  pressed: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      className="-my-3 flex flex-none items-center justify-center"
      style={{ width: 44, height: 44, color: pressed ? 'var(--accent)' : 'var(--on-field-66)' }}
    >
      {children}
    </button>
  )
}
