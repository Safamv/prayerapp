// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { addBookmark } from '../data/bookmarks'
import { putPassages } from '../data/corpus'
import { db, resetDatabase } from '../data/db'
import { makePassage } from '../data/fixtures'
import { forgetCorpusLoad, rememberCorpusLoaded } from '../data/loadCorpus'
import { confirmSegmentation } from '../data/segmentation'
import { forgetAnonymousUserId } from '../data/userId'
import { strings } from '../strings'

/**
 * **The two ordered screens, driven through the real shell.** Scope 6.5 and 6.7.
 *
 * > They are the same interaction on different material.
 *
 * The arithmetic of the sorts is unit tested in `bookmarkView.test.ts` and the
 * two writes in `src/data/`. This is what neither can reach: whether a person
 * dragging a row on a phone gets what the scope promises, and in particular
 * whether choosing a sort can destroy an arrangement.
 *
 * It lives in `src/app/` rather than beside either screen because it drives both
 * of them plus the tab bar, and because it writes progress rows directly to set
 * a passage up - which the walls around `src/features/discover/` forbid a file
 * in that folder from doing.
 */

const apex = makePassage({
  title: 'Apex',
  author: "Bahá'u'lláh",
  collection: 'prayers',
  word_count: 10,
  text: 'Apex, first line.\nApex, second line.',
})
const middle = makePassage({
  title: 'Middle',
  author: "'Abdu'l-Bahá",
  collection: 'prayers',
  word_count: 100,
  text: 'Middle, first line.\nMiddle, second line.',
})
const zenith = makePassage({
  title: 'Zenith',
  author: 'The Báb',
  collection: 'gleanings',
  word_count: 300,
  text: 'Zenith, first line.\nZenith, second line.',
})

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetCorpusLoad()
  await resetDatabase()
  await putPassages([apex, middle, zenith])
  rememberCorpusLoaded()
})

afterEach(cleanup)

function renderApp(at: string) {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <App />
    </MemoryRouter>,
  )
}

function thisDevice(): string {
  return localStorage.getItem('by-heart.anonymous-user-id') ?? ''
}

/**
 * Renders, then writes as the app's own anonymous user, then renders again. The
 * id only exists once something has rendered (scope 13.1).
 */
async function asThisDevice(write: () => Promise<void>): Promise<void> {
  renderApp('/discover')
  await waitFor(() => {
    expect(thisDevice()).not.toBe('')
  })
  await write()
  cleanup()
}

/** The titles on the list, in the order they are drawn. */
function titlesIn(list: HTMLElement): string[] {
  return [...list.querySelectorAll('li')].map(
    (row) => row.querySelector('a > span')?.textContent ?? '',
  )
}

/**
 * One chip. Scoped to its group where a name is shared: both filter rows carry an
 * ALL, and a screen reader tells them apart by the label on the radiogroup
 * around them, which is exactly what `within` is doing here.
 */
function chip(label: string, group?: string): HTMLElement {
  const scope =
    group === undefined ? screen : within(screen.getByRole('radiogroup', { name: group }))
  return scope.getByRole('radio', { name: label })
}

/**
 * The stored arrangement, read the way the app reads it.
 *
 * Sorted here rather than with `orderBy`, because the schema indexes
 * `[user_id+sort_order]` and `[user_id+list_order]` rather than either column on
 * its own, and a test that reached for a bare index would be asserting against a
 * database shape the app does not have.
 */
async function storedBookmarkOrder(): Promise<string[]> {
  const rows = await db.bookmarks.toArray()
  return rows.sort((a, b) => a.sort_order - b.sort_order).map((row) => row.passage_id)
}

async function storedListOrder(): Promise<string[]> {
  const rows = await db.user_prayers.toArray()
  return rows.sort((a, b) => a.list_order - b.list_order).map((row) => row.passage_id)
}

describe('Bookmarks, scope 6.7', () => {
  async function threeBookmarks(): Promise<void> {
    await asThisDevice(async () => {
      await addBookmark(thisDevice(), zenith.id, '2026-01-01T00:00:00.000Z')
      await addBookmark(thisDevice(), apex.id, '2026-03-01T00:00:00.000Z')
      await addBookmark(thisDevice(), middle.id, '2026-02-01T00:00:00.000Z')
    })
  }

  async function openBookmarks(): Promise<HTMLElement> {
    renderApp('/bookmarks')
    return screen.findByRole('list', { name: strings.accessibility.bookmarkList })
  }

  it('shows every bookmark with its author and word count', async () => {
    await threeBookmarks()

    const list = await openBookmarks()
    expect(titlesIn(list)).toEqual(['Zenith', 'Apex', 'Middle'])
    expect(within(list).getByText(/300 WORDS/)).toBeTruthy()
  })

  it('opens the reading view when a row is tapped', async () => {
    await threeBookmarks()

    const list = await openBookmarks()
    const link = within(list).getByRole('link', { name: /Apex/ })
    expect(link.getAttribute('href')).toBe(`/discover/passage/${apex.id}`)
  })

  it('says so calmly when nothing has been bookmarked', async () => {
    renderApp('/bookmarks')
    expect(await screen.findByText(strings.bookmarks.empty)).toBeTruthy()
  })

  it('sorts by title, by recency and by length without touching the hand order', async () => {
    await threeBookmarks()
    const list = await openBookmarks()

    fireEvent.click(chip(strings.bookmarks.sortTitle))
    expect(titlesIn(list)).toEqual(['Apex', 'Middle', 'Zenith'])

    fireEvent.click(chip(strings.bookmarks.sortRecent))
    expect(titlesIn(list)).toEqual(['Apex', 'Middle', 'Zenith'])

    fireEvent.click(chip(strings.bookmarks.sortShortest))
    expect(titlesIn(list)).toEqual(['Apex', 'Middle', 'Zenith'])

    // Scope 6.7: "returning to the manual sort restores it exactly as it was".
    fireEvent.click(chip(strings.bookmarks.sortManual))
    expect(titlesIn(list)).toEqual(['Zenith', 'Apex', 'Middle'])

    // And nothing was written while any of that happened.
    expect(await storedBookmarkOrder()).toEqual([zenith.id, apex.id, middle.id])
  })

  it('offers a handle only in the hand order, so no other sort can be dragged', async () => {
    await threeBookmarks()
    const list = await openBookmarks()

    expect(within(list).getAllByRole('button', { name: /Reorder/ })).toHaveLength(3)

    fireEvent.click(chip(strings.bookmarks.sortTitle))
    expect(within(list).queryByRole('button', { name: /Reorder/ })).toBeNull()
  })

  it('moves a row with the arrow keys and remembers it', async () => {
    await threeBookmarks()
    const list = await openBookmarks()

    fireEvent.keyDown(within(list).getByRole('button', { name: /Reorder Middle/ }), {
      key: 'ArrowUp',
    })
    await waitFor(async () => {
      expect(await storedBookmarkOrder()).toEqual([zenith.id, middle.id, apex.id])
    })

    // And the screen is showing what it wrote, without waiting for a re-read.
    expect(titlesIn(list)).toEqual(['Zenith', 'Middle', 'Apex'])
  })

  it('keeps the arrangement across a fresh visit to the tab', async () => {
    await threeBookmarks()
    const list = await openBookmarks()
    fireEvent.keyDown(within(list).getByRole('button', { name: /Reorder Middle/ }), {
      key: 'ArrowUp',
    })
    await waitFor(async () => {
      expect(await storedBookmarkOrder()).toEqual([zenith.id, middle.id, apex.id])
    })
    cleanup()

    const again = await openBookmarks()
    expect(titlesIn(again)).toEqual(['Zenith', 'Middle', 'Apex'])
  })

  it('filters by collection and by author, and both at once', async () => {
    await threeBookmarks()
    const list = await openBookmarks()

    fireEvent.click(chip(strings.collections.gleanings))
    expect(titlesIn(list)).toEqual(['Zenith'])

    fireEvent.click(chip(strings.bookmarks.filterAll, strings.accessibility.collectionFilter))
    expect(titlesIn(list)).toEqual(['Zenith', 'Apex', 'Middle'])

    fireEvent.click(chip("BAHÁ'U'LLÁH"))
    expect(titlesIn(list)).toEqual(['Apex'])

    // Both axes at once. This pair matches nothing, so the list is replaced by
    // the sentence rather than drawn empty.
    fireEvent.click(chip(strings.collections.gleanings))
    expect(screen.queryByRole('list', { name: strings.accessibility.bookmarkList })).toBeNull()
    expect(screen.getByText(strings.bookmarks.noneMatch)).toBeTruthy()
  })

  it('says so when the filters leave nothing, rather than showing an empty screen', async () => {
    await threeBookmarks()
    await openBookmarks()

    fireEvent.click(chip(strings.collections.gleanings))
    fireEvent.click(chip("BAHÁ'U'LLÁH"))
    expect(screen.getByText(strings.bookmarks.noneMatch)).toBeTruthy()
  })

  it('draws no filter row while every bookmark shares its collection and author', async () => {
    await asThisDevice(async () => {
      await addBookmark(thisDevice(), apex.id)
    })

    await openBookmarks()
    expect(screen.getByText(strings.bookmarks.sortLabel)).toBeTruthy()
    expect(screen.queryByText(strings.bookmarks.collectionLabel)).toBeNull()
    expect(screen.queryByText(strings.bookmarks.authorLabel)).toBeNull()
  })
})

describe('principle 7.6 - Bookmarks is a devotional screen', () => {
  it('shows nothing about memorisation, even for a passage on the list', async () => {
    await asThisDevice(async () => {
      await addBookmark(thisDevice(), apex.id)
      await confirmSegmentation(thisDevice(), apex.id, ['Apex, first line.', 'Apex, second line.'])
    })

    renderApp('/bookmarks')
    await screen.findByRole('list', { name: strings.accessibility.bookmarkList })

    const drawn = document.body.textContent ?? ''
    for (const forbidden of [
      strings.vocabulary.list,
      strings.vocabulary.learning,
      strings.vocabulary.memorised,
      strings.vocabulary.freshnessStrong,
      strings.vocabulary.freshnessNeedsReview,
      strings.upkeep.active.toUpperCase(),
      strings.memorise.todaySection,
    ]) {
      expect(drawn).not.toContain(forbidden)
    }
  })
})

describe('My list, scope 6.5', () => {
  async function twoOnTheList(): Promise<void> {
    await asThisDevice(async () => {
      await confirmSegmentation(thisDevice(), apex.id, ['Apex, first line.', 'Apex, second line.'])
      await confirmSegmentation(thisDevice(), middle.id, ['Middle, first line.'])
    })
  }

  async function openMyList(): Promise<HTMLElement> {
    renderApp('/memorise/list')
    return screen.findByRole('list', { name: strings.accessibility.myList })
  }

  it('lists what is on it, in the order it was arranged, with the upkeep word', async () => {
    await twoOnTheList()

    const list = await openMyList()
    expect(titlesIn(list)).toEqual(['Apex', 'Middle'])
    // Principle 7.10: the author is on every row that names a passage, and the
    // upkeep word shares the line with it.
    expect(within(list).getByText(/BAHÁ'U'LLÁH · ACTIVE/)).toBeTruthy()
    expect(within(list).getByText(/'ABDU'L-BAHÁ · ACTIVE/)).toBeTruthy()
  })

  it('opens the upkeep screen behind every row, which is where the roll call went', async () => {
    await twoOnTheList()

    const list = await openMyList()
    const link = within(list).getByRole('link', { name: /Apex/ })
    expect(link.getAttribute('href')).toBe(`/memorise/upkeep/${apex.id}`)
  })

  it('reorders by hand, under the same rule Bookmarks uses', async () => {
    await twoOnTheList()
    const list = await openMyList()

    fireEvent.keyDown(within(list).getByRole('button', { name: /Reorder Middle/ }), {
      key: 'ArrowUp',
    })
    await waitFor(async () => {
      expect(await storedListOrder()).toEqual([middle.id, apex.id])
    })
    expect(titlesIn(list)).toEqual(['Middle', 'Apex'])
  })

  it('removes in one tap, with no question in front of it', async () => {
    await twoOnTheList()
    const list = await openMyList()

    fireEvent.click(within(list).getByRole('button', { name: /Remove Apex/ }))

    // Scope 6.5: permanently, with no penalty or friction. There is no dialogue
    // between the tap and the deletion.
    await waitFor(async () => {
      expect(await db.user_prayers.count()).toBe(1)
    })
    expect(await db.passage_segments.where('passage_id').equals(apex.id).count()).toBe(0)
    expect(titlesIn(await openMyList())).toEqual(['Middle'])
  })

  it('says what it did, with a way back, and the way back really works', async () => {
    await twoOnTheList()
    const list = await openMyList()

    fireEvent.click(within(list).getByRole('button', { name: /Remove Apex/ }))
    expect(await screen.findByText(strings.myList.removed)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: strings.myList.undo }))

    // Decision D5.4: the lines go with the row, so an undo that did not bring
    // them back would leave a passage on the list with nothing under it.
    await waitFor(async () => {
      expect(await db.user_prayers.count()).toBe(2)
    })
    expect(await db.passage_segments.where('passage_id').equals(apex.id).count()).toBe(2)
    expect(await screen.findByText(strings.myList.removeUndone)).toBeTruthy()
    expect(
      titlesIn(await screen.findByRole('list', { name: strings.accessibility.myList })),
    ).toEqual(['Apex', 'Middle'])
  })

  it('says so calmly when there is nothing on it', async () => {
    renderApp('/memorise/list')
    expect(await screen.findByText(strings.myList.empty)).toBeTruthy()
  })

  it('offers no sort control, because the list is its order', async () => {
    await twoOnTheList()
    await openMyList()

    expect(screen.queryByText(strings.bookmarks.sortLabel)).toBeNull()
  })
})

describe('the Memorise tab after My list absorbed the roll call', () => {
  it('carries no roll call of its own, and no second door to upkeep', async () => {
    await asThisDevice(async () => {
      await confirmSegmentation(thisDevice(), apex.id, ['Apex, first line.'])
    })

    renderApp('/memorise')
    const listRow = await screen.findByRole('link', { name: /My list/ })
    expect(listRow.getAttribute('href')).toBe('/memorise/list')
    expect(screen.getByRole('link', { name: strings.settings.open })).toBeTruthy()

    // **What decision D7.3 removed, and what session 11 did not put back.**
    // Session 6 listed every passage here purely as a door to the upkeep
    // screen, which was the same rows My list already carried one tap away.
    // Session 11 added WHAT YOU KNOW (decision D11.1, Safa's call), which names
    // passages again - but for a different question and behind a different
    // door. So the assertion that still holds is the one D7.3 was actually
    // about: **nothing on this tab opens the upkeep screen.** Setting how often
    // a passage comes round is reached from My list, and from the passage
    // detail view that these rows open.
    const queue = screen.getByRole('list', { name: strings.accessibility.queueList })
    expect(within(queue).getAllByText('Apex')).toHaveLength(1)

    const upkeepDoors = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/memorise/upkeep/') === true)
    expect(upkeepDoors).toEqual([])

    // Every row of the new section opens the detail view of scope 11.3.
    const known = screen.getByRole('list', { name: strings.accessibility.knownList })
    for (const row of within(known).getAllByRole('link')) {
      expect(row.getAttribute('href')).toContain('/memorise/passage/')
    }
  })

  it('counts what is on the list, and nothing else', async () => {
    await asThisDevice(async () => {
      await confirmSegmentation(thisDevice(), apex.id, ['Apex, first line.'])
      await confirmSegmentation(thisDevice(), middle.id, ['Middle, first line.'])
    })

    renderApp('/memorise')
    expect(await screen.findByText(strings.memorise.passageCount(2))).toBeTruthy()
  })

  it('shows no count on the row while the list is empty', async () => {
    renderApp('/memorise')
    const listRow = await screen.findByRole('link', { name: /My list/ })
    expect(listRow.textContent).toBe(strings.memorise.myListRow)
  })
})
