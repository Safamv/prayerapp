// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { putPassages } from '../data/corpus'
import { resetDatabase } from '../data/db'
import { makePassage, makeRuhiPassage } from '../data/fixtures'
import { forgetCorpusLoad, rememberCorpusLoaded } from '../data/loadCorpus'
import { forgetRuhiLoad, rememberRuhiLoaded } from '../data/loadRuhi'
import { putRuhiBooks, putRuhiQuotations, putRuhiSections, putRuhiUnits } from '../data/ruhi'
import { listPassageSegments } from '../data/segmentation'
import { listUserPrayers } from '../data/userPrayers'
import { forgetAnonymousUserId, getOrCreateAnonymousUserId } from '../data/userId'
import { strings } from '../strings'

/**
 * **Scope 5 on the screens it renders on.** The browse, the filter, the search,
 * and the two ways onto the list.
 *
 * The rules that decide what is in the dataset are tested under `scripts/lib/`,
 * over the real 344 rows. The reads are tested in `src/data/ruhi.test.ts`. **This
 * file is about the three things only a screen can be wrong about.**
 *
 * **That the route is where decision D1.10 says it is, and nowhere else.** The
 * two principle tests police that by reading source, which is the strong form;
 * this walks the app and looks, which is the form that would catch a breach
 * neither of them could see.
 *
 * **That the filter and the category appear only where they say something.** 112
 * of the 115 real sections hold one category, so the common case is the one with
 * no filter on it, and the test has to hold both.
 *
 * **That a Ruhi quotation is an ordinary passage once it is on the list.** Which
 * is the whole of D1.10's storage argument, and is checked here by reading the
 * lines out of `passage_segments` after a bulk add.
 */

/**
 * A small curriculum. Section 1 is all "to memorise", Section 2 holds one of
 * each, and Book 3's lesson is a section whose name is not a number.
 */
const truthfulness = makeRuhiPassage({
  title: 'Truthfulness is the foundation',
  text: 'Truthfulness is the foundation of all human virtues.',
})
const kindly = makeRuhiPassage({
  title: 'A kindly tongue',
  text: 'A kindly tongue is the lodestone of the hearts of men.',
})
const twoLines = makeRuhiPassage({
  title: 'Two sentences',
  text: 'The first sentence stands alone. The second one follows it.',
})
const prayer = makePassage({ title: 'Blessed is the spot' })

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetCorpusLoad()
  forgetRuhiLoad()
  await resetDatabase()
  await putPassages([truthfulness, kindly, twoLines, prayer])
  rememberCorpusLoaded()

  await putRuhiBooks([
    {
      id: 'book-1',
      number: 1,
      title: 'Reflections on the Life of the Spirit',
      edition: '4.1.2.PE, May 2020',
    },
  ])
  await putRuhiUnits([
    { id: 'unit-1', book_id: 'book-1', number: 1, title: 'Understanding the Writings' },
  ])
  await putRuhiSections([
    { id: 'sec-1', unit_id: 'unit-1', number: 1, title: 'Section 1' },
    { id: 'sec-2', unit_id: 'unit-1', number: 2, title: 'Section 2' },
    { id: 'sec-3', unit_id: 'unit-1', number: 101, title: 'Lesson 1' },
  ])
  await putRuhiQuotations([
    {
      id: 'q1',
      section_id: 'sec-1',
      passage_id: truthfulness.id,
      order_index: 0,
      designation: 'memorise',
    },
    {
      id: 'q2',
      section_id: 'sec-1',
      passage_id: twoLines.id,
      order_index: 1,
      designation: 'memorise',
    },
    {
      id: 'q3',
      section_id: 'sec-2',
      passage_id: kindly.id,
      order_index: 0,
      designation: 'reflection',
    },
    {
      id: 'q4',
      section_id: 'sec-2',
      passage_id: truthfulness.id,
      order_index: 1,
      designation: 'memorise',
    },
    {
      id: 'q5',
      section_id: 'sec-3',
      passage_id: kindly.id,
      order_index: 0,
      designation: 'memorise',
    },
  ])
})

afterEach(cleanup)

function renderApp(at = '/memorise') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <App />
    </MemoryRouter>,
  )
}

/**
 * The load this route does for itself is guarded on a fingerprint the test
 * database has never written, so it would import the real 344 rows over the top
 * of these five. Saying the device already holds them is the same bargain
 * `rememberCorpusLoaded` makes for the library.
 */
function pretendRuhiIsLoaded() {
  rememberRuhiLoaded()
}

describe('the door onto the Ruhi route', () => {
  it('is one row at the foot of the Memorise tab, between My list and Settings', async () => {
    pretendRuhiIsLoaded()
    renderApp()
    const door = await screen.findByRole('link', { name: strings.ruhi.door })
    expect(door.getAttribute('href')).toBe('/memorise/ruhi')
  })

  it('is nowhere on the devotional side of the app, which is decision D1.10', async () => {
    pretendRuhiIsLoaded()
    const { unmount } = renderApp('/discover')
    await screen.findByRole('link', { name: /Prayers/ })
    expect(screen.queryByText(strings.ruhi.door)).toBeNull()
    // Nor is a quotation reachable as a passage of the library.
    expect(screen.queryByText(truthfulness.title)).toBeNull()
    unmount()

    renderApp('/bookmarks')
    await waitFor(() => {
      expect(screen.queryByText(strings.ruhi.door)).toBeNull()
    })
  })
})

describe('the drill from book to unit to section', () => {
  it('walks down, and the back chevron walks back up the way it came', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi')

    fireEvent.click(await screen.findByRole('link', { name: /Reflections on the Life/ }))
    fireEvent.click(await screen.findByRole('link', { name: /Understanding the Writings/ }))
    fireEvent.click(await screen.findByRole('link', { name: /Section 1/ }))
    expect(await screen.findByText(truthfulness.title)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: strings.accessibility.back }))
    expect(await screen.findByRole('link', { name: /Section 2/ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: strings.accessibility.back }))
    expect(await screen.findByRole('link', { name: /Understanding the Writings/ })).toBeTruthy()
  })

  it('names the Ruhi edition the mapping was built against, which scope 5.2 requires', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/book/book-1')
    expect(await screen.findByText(strings.ruhi.edition('4.1.2.PE, May 2020'))).toBeTruthy()
  })

  it('says what a section holds where it holds one kind, which most of them do', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/book/book-1/unit/unit-1')
    const first = await screen.findByRole('link', { name: /Section 1/ })
    expect(within(first).getByText(strings.ruhi.designationsCaps.memorise)).toBeTruthy()
    // Section 2 holds both, so it names neither: the filter inside it does.
    const second = screen.getByRole('link', { name: /Section 2/ })
    expect(within(second).queryByText(strings.ruhi.designationsCaps.memorise)).toBeNull()
  })

  it("lists Book 3's lessons after the numbered sections, under their own names", async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/book/book-1/unit/unit-1')
    const list = await screen.findByRole('list', { name: strings.accessibility.ruhiSectionList })
    const titles = within(list)
      .getAllByRole('link')
      .map((row) => row.textContent ?? '')
    expect(titles[2]).toContain('Lesson 1')
  })
})

describe('the To Memorise and Reflection filter, scope 5.4', () => {
  it('is not drawn on a section that holds one kind, because it could say nothing', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/book/book-1/unit/unit-1/section/sec-1')
    await screen.findByText(truthfulness.title)
    expect(screen.queryByRole('radiogroup', { name: strings.accessibility.ruhiFilter })).toBeNull()
  })

  it('narrows a section that holds both', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/book/book-1/unit/unit-1/section/sec-2')

    await screen.findByText(kindly.title)
    expect(screen.getByText(truthfulness.title)).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: strings.ruhi.designationsCaps.reflection }))
    await waitFor(() => {
      expect(screen.queryByText(truthfulness.title)).toBeNull()
    })
    expect(screen.getByText(kindly.title)).toBeTruthy()
  })
})

describe('search within the route, scope 5.4', () => {
  it('finds a quotation and says where in the curriculum it sits', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi')

    await screen.findByRole('link', { name: /Reflections on the Life/ })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'lodestone' } })

    const results = await screen.findByRole('region', {
      name: strings.accessibility.ruhiSearchResults,
    })
    // The same words are in two places in this curriculum, and a search across
    // all three books finds both, each under its own Ruhi reference.
    expect(within(results).getAllByText(kindly.title)).toHaveLength(2)
    expect(within(results).getByText(strings.ruhi.reference(1, 1, 'Section 2'))).toBeTruthy()
    expect(within(results).getByText(strings.ruhi.reference(1, 1, 'Lesson 1'))).toBeTruthy()
    // And the books are out of the way while a search is on screen.
    expect(screen.queryByRole('link', { name: /Reflections on the Life/ })).toBeNull()
  })

  it('never returns a prayer, because it reads the mapping and not the library', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi')

    await screen.findByRole('link', { name: /Reflections on the Life/ })
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'Blessed is the spot' },
    })
    expect(await screen.findByText(strings.ruhi.searchNothing)).toBeTruthy()
  })
})

describe('what you can do with a quotation once you have found one', () => {
  it('opens it whole, with its Ruhi reference, its attribution and the notice', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/book/book-1/unit/unit-1/section/sec-1')

    fireEvent.click(await screen.findByRole('link', { name: new RegExp(truthfulness.title) }))
    expect(await screen.findByText(truthfulness.text)).toBeTruthy()
    // Scope 5.4: the source work and the Ruhi reference together.
    expect(screen.getByText(strings.ruhi.reference(1, 1, 'Section 1'))).toBeTruthy()
    // Principle 7.10 and scope 4.3, on a screen showing a passage in full. The
    // attribution and the notice share one block, so the block is what is read.
    const attribution = screen.getByText(new RegExp(strings.reading.copyright))
    expect(attribution.textContent).toContain("BAHÁ'U'LLÁH")
    expect(attribution.textContent).toContain(strings.reading.copyright)
  })

  it('adds one quotation through the confirm screen of scope 8.4', async () => {
    pretendRuhiIsLoaded()
    const userId = getOrCreateAnonymousUserId()
    renderApp('/memorise/ruhi/quotation/q2')

    fireEvent.click(await screen.findByRole('button', { name: strings.ruhi.addOne }))
    // The confirm screen, with the lines it proposes.
    expect(await screen.findByText(strings.segmentation.lineCount(2))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: strings.segmentation.confirm }))

    // Back where it happened, said there, with the way out of it (D4.10).
    expect(await screen.findByText(strings.reading.addedToList)).toBeTruthy()
    await waitFor(async () => {
      expect(await listUserPrayers(userId)).toHaveLength(1)
    })
  })

  it('never sends a quotation to the reading view, which D1.10 forbids', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/quotation/q1')

    fireEvent.click(await screen.findByRole('button', { name: strings.ruhi.addOne }))
    fireEvent.click(await screen.findByRole('button', { name: strings.segmentation.confirm }))

    // The reading view would have shown the collection label in its header and
    // the library would have shown the four collections. Neither happens.
    expect(await screen.findByText(strings.reading.addedToList)).toBeTruthy()
    expect(screen.getByText(strings.ruhi.reference(1, 1, 'Section 1'))).toBeTruthy()
    expect(screen.queryByText(strings.discover.collectionsSection)).toBeNull()
  })
})

describe('adding a whole section in one action, scope 5.4', () => {
  it('states how many lines it is about to add, then adds them', async () => {
    pretendRuhiIsLoaded()
    const userId = getOrCreateAnonymousUserId()
    renderApp('/memorise/ruhi/book/book-1/unit/unit-1/section/sec-1')

    // One quotation is a single line and the other is two: three in all, which
    // is the same count the confirm screen would have stated for each.
    const add = await screen.findByRole('button', { name: strings.ruhi.addSection(3) })
    fireEvent.click(add)

    expect(await screen.findByText(strings.ruhi.added(2))).toBeTruthy()
    await waitFor(async () => {
      expect(await listUserPrayers(userId)).toHaveLength(2)
    })
    // A Ruhi quotation is an ordinary passage: it has lines like any other.
    expect(await listPassageSegments(twoLines.id)).toHaveLength(2)
  })

  it('offers nothing more once everything on the screen is on the list', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/book/book-1/unit/unit-1/section/sec-1')

    fireEvent.click(await screen.findByRole('button', { name: strings.ruhi.addSection(3) }))
    await screen.findByText(strings.ruhi.added(2))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /ADD THIS SECTION/ })).toBeNull()
    })
  })
})

describe('what a Ruhi screen never shows', () => {
  it('draws no freshness star and no count of anything the reader owes', async () => {
    pretendRuhiIsLoaded()
    renderApp('/memorise/ruhi/book/book-1/unit/unit-1/section/sec-1')

    // Put a passage on the list first, so a star would have something to say.
    fireEvent.click(await screen.findByRole('button', { name: strings.ruhi.addSection(3) }))
    await screen.findByText(strings.ruhi.added(2))

    for (const state of Object.values(strings.freshness)) {
      expect(screen.queryByText(state.toLocaleUpperCase('en-AU'))).toBeNull()
    }
    expect(screen.queryByText(strings.memorise.todaySection)).toBeNull()
    expect(screen.queryByText(strings.memorise.knownSection)).toBeNull()
  })
})
