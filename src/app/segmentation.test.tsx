// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { putPassages } from '../data/corpus'
import { db, resetDatabase } from '../data/db'
import { makePassage } from '../data/fixtures'
import { forgetCorpusLoad } from '../data/loadCorpus'
import { listPassageSegments } from '../data/segmentation'
import { forgetAnonymousUserId } from '../data/userId'
import { strings } from '../strings'
import { passageAttribution } from '../strings/attribution'

/**
 * **The add moment, driven through the real shell.** Scope 8.4 and 6.2.
 *
 * The splitter has its own unit tests against all 976 committed passages, and
 * the write has its own against the database. This is the part neither of them
 * can reach: tapping the list mark on a prayer, seeing the lines the app
 * proposes, changing them, and finding the passage on the list afterwards with
 * exactly those lines under it.
 *
 * It lives in `src/app/` for the same reason `discover.test.tsx` does: it reads
 * `db` directly to prove what was written, and both walls around Discover
 * forbid a file in that folder from importing it.
 */

/**
 * Three proposed lines: a line ending, then a paragraph. The last line holds a
 * semicolon, which is found but never proposed, so there is something to split.
 * The first holds no punctuation at all, so there is nothing to split in it.
 */
const blessed = makePassage({
  title: 'Blessed is the spot',
  text:
    'Blessed is the spot and the house.\nAnd the place, and the city.\n\n' +
    'Blessed is the heart; and the mountain.',
  word_count: 20,
})

const PROPOSED = [
  'Blessed is the spot and the house.',
  'And the place, and the city.',
  'Blessed is the heart; and the mountain.',
]

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetCorpusLoad()
  await resetDatabase()
  await putPassages([blessed])
})

afterEach(cleanup)

function renderApp(at: string) {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <App />
    </MemoryRouter>,
  )
}

/** The anonymous id this render created (scope 13.1). */
function thisDevice(): string {
  return localStorage.getItem('by-heart.anonymous-user-id') ?? ''
}

async function listOwnPrayerRows(passageId: string) {
  const rows = await db.user_prayers.toArray()
  return rows.filter((row) => row.user_id === thisDevice() && row.passage_id === passageId)
}

/** Opens a passage and taps the list mark, which is the only way in. */
async function openTheAddMoment() {
  renderApp(`/discover/passage/${blessed.id}`)
  fireEvent.click(await screen.findByRole('button', { name: strings.reading.listAdd }))
  await screen.findByRole('button', { name: strings.segmentation.confirm })
}

/** The lines as drawn, with the two control words taken off the ends of them. */
function linesOnScreen(): string[] {
  return within(screen.getByRole('list', { name: strings.accessibility.lineList }))
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '')
    .map((text) =>
      text.replace(strings.segmentation.join, '').replace(strings.segmentation.split, '').trim(),
    )
}

describe('the lines the app proposes (scope 8.4)', () => {
  it('breaks the passage at its line ending and its paragraph, and not at its semicolon', async () => {
    await openTheAddMoment()

    expect(linesOnScreen()).toEqual(PROPOSED)
  })

  it('states how many lines and how many words, and nothing else about the size of it', async () => {
    await openTheAddMoment()

    expect(screen.getByText(strings.segmentation.lineCount(3))).toBeDefined()
    expect(screen.getByText(strings.segmentation.wordCount(20))).toBeDefined()
  })

  /**
   * Scope 6.2 forbids this by name: "No estimated time to learn. Pace-based
   * estimates are invented precision, and the moment of commitment is the worst
   * possible place to invent it." The fixture carries no such word itself, so
   * anything found here would have been put there by the app.
   */
  it('offers no estimate of how long it will take', async () => {
    await openTheAddMoment()

    expect(document.body.textContent ?? '').not.toMatch(/minute|hour|week|second/i)
  })

  /** Principle 7.10 and design-tokens 7: every surface that shows a passage. */
  it('carries the attribution, composed the way every other surface composes it', async () => {
    await openTheAddMoment()

    expect(screen.getByText(passageAttribution(blessed))).toBeDefined()
  })

  /**
   * Decision D5.1: this screen is memorisation, so it is on the Memorise tab.
   * The reader has left the library, and the tab bar says so.
   */
  it('is on the Memorise tab, not in Discover', async () => {
    await openTheAddMoment()

    const memorise = screen.getByRole('link', { name: strings.tabs.memorise })
    expect(memorise.getAttribute('aria-current')).toBe('page')
    const discover = screen.getByRole('link', { name: strings.tabs.discover })
    expect(discover.getAttribute('aria-current')).toBeNull()
  })
})

describe('merging and splitting before starting (scope 8.4)', () => {
  it('joins a line with the one above it, and says there is one line fewer', async () => {
    await openTheAddMoment()

    fireEvent.click(screen.getByRole('button', { name: strings.segmentation.joinLine(2) }))

    expect(linesOnScreen()).toEqual([
      'Blessed is the spot and the house.\nAnd the place, and the city.',
      'Blessed is the heart; and the mountain.',
    ])
    expect(screen.getByText(strings.segmentation.lineCount(2))).toBeDefined()
  })

  it('splits a line at the boundary it did not propose', async () => {
    await openTheAddMoment()

    fireEvent.click(screen.getByRole('button', { name: strings.segmentation.splitLine(3) }))

    expect(linesOnScreen()).toEqual([
      'Blessed is the spot and the house.',
      'And the place, and the city.',
      'Blessed is the heart;',
      'and the mountain.',
    ])
  })

  it('offers nothing to split on a line with no boundary left inside it', async () => {
    await openTheAddMoment()

    expect(screen.queryByRole('button', { name: strings.segmentation.splitLine(1) })).toBeNull()
    expect(screen.getByRole('button', { name: strings.segmentation.splitLine(3) })).toBeDefined()
  })

  it('has nothing to join above the first line', async () => {
    await openTheAddMoment()

    expect(screen.queryByRole('button', { name: strings.segmentation.joinLine(1) })).toBeNull()
  })
})

describe('confirming', () => {
  it('writes the lines as they were confirmed, in order, and puts the passage on the list', async () => {
    await openTheAddMoment()
    fireEvent.click(screen.getByRole('button', { name: strings.segmentation.joinLine(2) }))

    fireEvent.click(screen.getByRole('button', { name: strings.segmentation.confirm }))

    await waitFor(async () => {
      expect(await listOwnPrayerRows(blessed.id)).toHaveLength(1)
    })
    const segments = await listPassageSegments(blessed.id)
    expect(segments.map((segment) => segment.text)).toEqual([
      'Blessed is the spot and the house.\nAnd the place, and the city.',
      'Blessed is the heart; and the mountain.',
    ])
    expect(segments.map((segment) => segment.order_index)).toEqual([0, 1])
    expect((await db.passages.get(blessed.id))?.segment_count).toBe(2)
  })

  it('comes back to the passage, with the band that says what happened', async () => {
    await openTheAddMoment()

    fireEvent.click(screen.getByRole('button', { name: strings.segmentation.confirm }))

    const band = await screen.findByRole('status')
    expect(band.textContent).toContain(strings.reading.addedToList)
    expect(within(band).getByRole('button', { name: strings.reading.undo })).toBeDefined()
    // Back on the reading view, with the mark reading as already added.
    expect(screen.getByRole('button', { name: strings.reading.listAlreadyAdded })).toBeDefined()
  })

  it('undoes the whole of it, lines included, and offers to add again', async () => {
    await openTheAddMoment()
    fireEvent.click(screen.getByRole('button', { name: strings.segmentation.confirm }))
    const band = await screen.findByRole('status')

    fireEvent.click(within(band).getByRole('button', { name: strings.reading.undo }))

    await waitFor(async () => {
      expect(await listOwnPrayerRows(blessed.id)).toHaveLength(0)
    })
    expect(await listPassageSegments(blessed.id)).toEqual([])
    expect((await db.passages.get(blessed.id))?.segment_count).toBe(0)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: strings.reading.listAdd })).toBeDefined()
    })
  })

  it('writes nothing at all when the reader goes back instead', async () => {
    await openTheAddMoment()

    fireEvent.click(screen.getByRole('button', { name: strings.accessibility.back }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: strings.reading.listAdd })).toBeDefined()
    })
    expect(await listOwnPrayerRows(blessed.id)).toHaveLength(0)
    expect(await listPassageSegments(blessed.id)).toEqual([])
  })

  /**
   * There is no way to reach this screen for a passage already on the list, and
   * a typed URL or a restored tab should not become a second chance to segment
   * something already being learnt.
   */
  it('goes back to the passage when it is already on the list', async () => {
    await openTheAddMoment()
    fireEvent.click(screen.getByRole('button', { name: strings.segmentation.confirm }))
    await screen.findByRole('status')

    cleanup()
    renderApp(`/memorise/add/${blessed.id}`)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: strings.reading.listAlreadyAdded })).toBeDefined()
    })
    expect(screen.queryByRole('button', { name: strings.segmentation.confirm })).toBeNull()
  })
})
