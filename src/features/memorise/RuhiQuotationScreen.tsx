import { Fragment, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { addToListPath, ruhiQuotationPath, RUHI_PATH } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { ScrollTail } from '../../components/ListSurface'
import { CompactActionHeader } from '../../components/NavyHeader'
import { PinnedButtons, PrimaryButton } from '../../components/PinnedButtons'
import { Screen } from '../../components/Screen'
import { Toast, useToast } from '../../components/Toast'
import { ruhiReady } from '../../data/loadRuhi'
import { getRuhiQuotation, type RuhiQuotationDetail } from '../../data/ruhi'
import { getUserPrayer, removeFromList } from '../../data/userPrayers'
import { strings } from '../../strings'
import { passageAttribution } from '../../strings/attribution'
import { typeStyle } from '../../theme'

/**
 * **One quotation, whole.** Scope 5.4, principle 7.10, scope 4.3.
 *
 * > Every quotation shows its source work and its Ruhi reference together.
 *
 * The end of the Ruhi route, and the only place a quotation can be read rather
 * than merely listed. The reading view of scope 6.6 could not do this job: it is
 * a Discover screen, and decision D1.10 forbids a Ruhi quotation appearing there
 * at all. `getDevotionalPassage` already returns nothing for one, so this is not
 * a rule anybody has to remember - it is what the data layer does.
 *
 * ## Why the whole text and not a link into the library
 *
 * 290 of the 315 distinct quotations are not in the devotional corpus, because
 * they are excerpts of Gleanings, of Tablets, of talks and of messages that the
 * corpus has no record of. There is nowhere else to read them.
 *
 * ## What it carries, and what it must never carry
 *
 * The Ruhi reference and the category, the quotation, the attribution and the
 * copyright notice - scope 4.3's three obligations met on the one screen in this
 * route that shows a passage in full. **No star and no progress**, though this
 * file sits in the folder where the star lives and could import it. A book of
 * quotations is a reading surface, and design-tokens 4's second hard rule is
 * about what a reading surface may say.
 *
 * ## The door onto the list
 *
 * The add moment of scope 8.4, unchanged: the same screen a prayer goes through,
 * where the proposed lines are shown and can be joined or split before starting.
 * A Ruhi quotation is an ordinary passage (D1.10), so nothing in the scheduler,
 * the queue or the quiz ladder knows it is one, and this button proves it: it
 * links to the same path the reading view's list mark does.
 */

/** Design-tokens 5.4's reading surface, at its own padding. */
const SURFACE = { padding: '34px 32px 0' }

interface Loaded {
  readonly found: RuhiQuotationDetail | undefined
  readonly onList: boolean
}

export function RuhiQuotationScreen() {
  const { quotationId = '' } = useParams()
  const userId = useUserId()
  const navigate = useNavigate()
  const location = useLocation()
  const back = useBack(RUHI_PATH)
  const { toast, show, dismiss } = useToast()

  const loaded = useAsyncValue<Loaded>(async () => {
    await ruhiReady()
    const found = await getRuhiQuotation(quotationId)
    if (found === undefined) return { found: undefined, onList: false }
    return { found, onList: (await getUserPrayer(userId, found.passage.id)) !== undefined }
  }, `${quotationId}:${userId}`)

  /**
   * The reader is back from the add moment. Held here rather than read straight
   * off the load, so that undoing takes the button back to ADD without a second
   * trip to the database.
   */
  const [onList, setOnList] = useState<boolean | null>(null)
  const already = onList ?? loaded?.onList ?? false

  /**
   * What just happened, said on the screen it happened from, with the way out of
   * it. Decision D4.10, and the same band the reading view puts up for a prayer:
   * a Ruhi quotation is an ordinary passage, so adding one feels the same.
   *
   * The state is cleared as it is read, so stepping back onto this entry later
   * does not announce an add from ten minutes ago.
   */
  const passageId = loaded?.found?.passage.id
  useEffect(() => {
    const state: unknown = location.state
    const added =
      typeof state === 'object' && state !== null && 'addedPassageId' in state
        ? (state as { addedPassageId?: unknown }).addedPassageId
        : undefined
    if (added === undefined || added !== passageId || passageId === undefined) return

    setOnList(true)
    void navigate(location.pathname, { replace: true, state: null })
    show({
      text: strings.reading.addedToList,
      undo: {
        label: strings.reading.undo,
        onUndo: () => {
          setOnList(false)
          void removeFromList(userId, passageId).catch((error: unknown) => {
            console.error('Failed to undo the add', error)
          })
          show({ text: strings.reading.addUndone, undo: null })
        },
      },
    })
  }, [location, navigate, passageId, userId, show])

  // An address that is not in the mapping - hand-typed, or a link made against
  // an older dataset - goes back to the three books rather than sitting on a
  // blank screen. The same fallback the confirm screen makes to the library.
  useEffect(() => {
    if (loaded !== undefined && loaded.found === undefined) {
      void navigate(RUHI_PATH, { replace: true })
    }
  }, [loaded, navigate])

  const found = loaded?.found
  const place = found?.place

  return (
    <Screen
      header={
        <CompactActionHeader
          label={
            place === undefined
              ? ''
              : strings.ruhi.reference(place.book.number, place.unit.number, place.section.title)
          }
          onBack={back}
        />
      }
      footer={
        <>
          {found !== undefined && (
            <PinnedButtons>
              <PrimaryButton
                label={already ? strings.ruhi.addOneAlready : strings.ruhi.addOne}
                disabled={already}
                onClick={() => {
                  void navigate(addToListPath(found.passage.id), {
                    state: { from: ruhiQuotationPath(quotationId) },
                  })
                }}
              />
            </PinnedButtons>
          )}
          <Toast toast={toast} onDismiss={dismiss} />
        </>
      }
    >
      {found !== undefined && (
        <article style={SURFACE}>
          {/* Design-tokens 5.4's caps eyebrow. What the curriculum asks of this
              quotation, which is the one thing the header above does not say. */}
          <p className="text-label" style={{ ...typeStyle('eyebrowReading'), marginBottom: 16 }}>
            {strings.ruhi.designationsCaps[found.quotation.designation]}
          </p>

          {/* Design-tokens 5.4's twin rules. There is no display title above
              them: a quotation's title is a truncation of its own opening words,
              so printing it here would be the passage said twice. */}
          <div className="h-px bg-hair" style={{ margin: '0 0 3px' }} />
          <div className="h-px bg-hair-lt" style={{ marginBottom: 24 }} />

          <div className="text-ink" style={typeStyle('passageBody')}>
            {found.passage.text.split('\n\n').map((paragraph, index) => (
              <Fragment key={paragraph.slice(0, 24) + String(index)}>
                <p style={{ marginTop: index === 0 ? 0 : 18 }}>{paragraph}</p>
              </Fragment>
            ))}
          </div>

          {/* Principle 7.10 and scope 4.3: the attribution and the notice, on a
              screen that shows a passage in full. */}
          <p className="text-faint" style={{ ...typeStyle('attribution'), marginTop: 26 }}>
            {passageAttribution(found.passage)}
            <br />
            {strings.reading.copyright}
          </p>

          <ScrollTail />
        </article>
      )}
    </Screen>
  )
}
