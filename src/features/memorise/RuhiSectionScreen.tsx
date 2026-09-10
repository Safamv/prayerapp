import { useState } from 'react'
import { useParams } from 'react-router'
import { ruhiUnitPath } from '../../app/routes'
import { useAsyncValue } from '../../app/useAsyncValue'
import { useBack } from '../../app/useBack'
import { useUserId } from '../../app/userContext'
import { ChipRow, type ChipChoice } from '../../components/Chips'
import { ScrollTail, SectionHeader } from '../../components/ListSurface'
import { CompactTitleHeader } from '../../components/NavyHeader'
import { PinnedButtons, PrimaryButton } from '../../components/PinnedButtons'
import { Screen } from '../../components/Screen'
import { Toast, useToast } from '../../components/Toast'
import { ruhiReady } from '../../data/loadRuhi'
import {
  addRuhiSectionToList,
  getRuhiPlace,
  listRuhiQuotations,
  type RuhiPlace,
  type RuhiQuotationWithPassage,
} from '../../data/ruhi'
import type { RuhiDesignation } from '../../data/types'
import { listUserPrayers } from '../../data/userPrayers'
import { strings } from '../../strings'
import { proposeLines } from '../../text/segmentation'
import { holdsBothDesignations, RuhiQuotationRow } from './RuhiRows'

/**
 * **A section's quotations, the filter, and adding the lot.** Scope 5.4.
 *
 * The end of the drill: book, unit, section, quotations. The whole path is in
 * the address, so the back chevron walks back up the way the reader came.
 *
 * ## The filter, and why it is usually not drawn
 *
 * Scope 5.4: "filter a section's quotations by To Memorise or Reflection." It is
 * built, and it appears only where a section holds both categories, which is 3
 * of the 115 sections. That is not the filter being half-finished, it is the
 * curriculum having already sorted its own material: a Ruhi section is usually
 * a run of quotations under one instruction. Decision D7.2 set this rule for the
 * Bookmarks screen and it is the same rule here: a control that can only ever
 * have one answer is chrome, and this app has a screen it is opened on at six in
 * the morning to protect from exactly that.
 *
 * ## Adding a whole section
 *
 * Scope 5.4 asks for a section on the list "in one action", and scope 8.4 says
 * segmentation is suggested then confirmed at add time. The two meet on the
 * button: it states how many lines it is about to add, which is the same number
 * the confirm screen states above its own list, and it takes the app's proposal
 * for each. `addProposedSegmentation` in `src/data/segmentation.ts` carries the
 * whole of that argument.
 *
 * The count is of what is **not already on the list**, so a reader who adds a
 * section, then one more quotation, then the section again is told the truth
 * both times and never has a schedule thrown away.
 *
 * **The filter narrows the add.** What the button adds is what the screen shows,
 * because a button that added something the reader had filtered out would be
 * doing something they did not ask for.
 */

const SURFACE = { padding: '0 26px' }

/** The filter's third choice is no filter, which is what the reader arrives with. */
type Filter = RuhiDesignation | 'all'

interface Loaded {
  readonly place: RuhiPlace | undefined
  readonly quotations: readonly RuhiQuotationWithPassage[]
  readonly onList: ReadonlySet<string>
}

export function RuhiSectionScreen() {
  const { bookId = '', unitId = '', sectionId = '' } = useParams()
  const userId = useUserId()
  const back = useBack(ruhiUnitPath(bookId, unitId))
  const { toast, show, dismiss } = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [reload, setReload] = useState(0)

  const loaded = useAsyncValue<Loaded>(
    async () => {
      await ruhiReady()
      const [place, quotations, mine] = await Promise.all([
        getRuhiPlace(sectionId),
        listRuhiQuotations(sectionId),
        listUserPrayers(userId),
      ])
      return { place, quotations, onList: new Set(mine.map((row) => row.passage_id)) }
    },
    `${sectionId}:${userId}:${String(reload)}`,
  )

  const all = loaded?.quotations ?? []
  const bothKinds = holdsBothDesignations(all)
  const shown = all.filter((entry) => filter === 'all' || entry.quotation.designation === filter)

  const toAdd = shown.filter((entry) => !(loaded?.onList.has(entry.passage.id) ?? false))
  const linesToAdd = countLines(toAdd)

  const addSection = () => {
    void addRuhiSectionToList(userId, sectionId, filter === 'all' ? undefined : filter).then(
      (result) => {
        // Said here, on the screen the reader is standing on, which is decision
        // D4.10's shape: there is where it happened and here is where they are.
        show({
          text: result.added === 0 ? strings.ruhi.addedNone : strings.ruhi.added(result.added),
          undo: null,
        })
        setReload((count) => count + 1)
      },
      (error: unknown) => {
        console.error('Failed to add a Ruhi section to the list', error)
      },
    )
  }

  const place = loaded?.place

  return (
    <Screen
      header={<CompactTitleHeader title={place?.section.title ?? ''} onBack={back} />}
      footer={
        <>
          {toAdd.length > 0 && (
            <PinnedButtons>
              <PrimaryButton label={strings.ruhi.addSection(linesToAdd)} onClick={addSection} />
            </PinnedButtons>
          )}
          <Toast toast={toast} onDismiss={dismiss} />
        </>
      }
    >
      {loaded !== undefined && place !== undefined && (
        <div style={SURFACE}>
          {/* Where the reader is, said once, in design-tokens 5.3's own header
              row. Scope 5.4 wants a quotation's Ruhi reference beside its source
              work, and on this screen the reference is the screen. */}
          <SectionHeader
            label={strings.ruhi.reference(place.book.number, place.unit.number, place.unit.title)}
            count={strings.ruhi.quotationCount(shown.length)}
          />

          {bothKinds && (
            <div style={{ paddingBottom: 12 }}>
              <ChipRow<Filter>
                label={strings.ruhi.filterLabel}
                ariaLabel={strings.accessibility.ruhiFilter}
                choices={FILTERS}
                selected={filter}
                onSelect={setFilter}
              />
            </div>
          )}

          <ul aria-label={strings.accessibility.ruhiQuotationList}>
            {shown.map((entry) => (
              <li key={entry.quotation.id}>
                <RuhiQuotationRow entry={entry} showDesignation={bothKinds} />
              </li>
            ))}
          </ul>
          <ScrollTail />
        </div>
      )}
    </Screen>
  )
}

const FILTERS: readonly ChipChoice<Filter>[] = [
  { value: 'all', label: strings.ruhi.filterAll },
  { value: 'memorise', label: strings.ruhi.designationsCaps.memorise },
  { value: 'reflection', label: strings.ruhi.designationsCaps.reflection },
]

/**
 * How many lines adding these would put on the list.
 *
 * The app's own proposal, run over each passage: the same function the confirm
 * screen's first render uses, so the number on the button is the number the
 * confirm screen would have shown. A passage the curriculum prints twice in one
 * section is counted once, because it is added once.
 */
function countLines(entries: readonly RuhiQuotationWithPassage[]): number {
  const seen = new Set<string>()
  let lines = 0
  for (const entry of entries) {
    if (seen.has(entry.passage.id)) continue
    seen.add(entry.passage.id)
    lines += proposeLines(entry.passage.text).length
  }
  return lines
}
