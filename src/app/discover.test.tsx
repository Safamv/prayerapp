// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { putPassages, putPassageTags, putTags } from '../data/corpus'
import { db, resetDatabase } from '../data/db'
import { makePassage, makeRuhiPassage, makeTag } from '../data/fixtures'
import { forgetCorpusLoad } from '../data/loadCorpus'
import { forgetAnonymousUserId } from '../data/userId'
import { strings } from '../strings'
import { FLEURON } from '../theme'

/**
 * Discover, driven through the real shell. Scope 6.1, 6.2, 6.6.
 *
 * These render `App` rather than a screen on its own, because half of what this
 * session built is the route: category, then passage list, then the passage, and
 * the chevron coming back one step. A test that mounted one screen in isolation
 * would not touch any of it.
 *
 * The last block is the one to keep: principle 7.6 checked against what is
 * actually on screen. `discover-isolation.test.ts` proves the folder cannot
 * reach memorisation state; this proves that what it does reach comes out
 * looking like a prayer book.
 *
 * ## Why this file is in `src/app/` and not in `src/features/discover/`
 *
 * It reads `db` directly, to prove that tapping "add to my list" really did
 * write a `user_prayers` row and really did not segment anything. Both walls
 * around Discover forbid that import, and both are right to: they police the
 * folder, and a component that could read `db` could render anything in it.
 * A test driving the app from the outside is not part of that folder, so it
 * sits beside `shell.test.tsx`, which mounts the same `App` for the same reason.
 */

const HEALING = makeTag('Healing')
const MORNING = makeTag('Morning')

/** An untagged passage in another collection: unreachable by category, on purpose. */
const hiddenWord = makePassage({
  title: 'O SON OF SPIRIT! My first counsel',
  author: "Bahá'u'lláh",
  collection: 'hidden-words',
  source_feed: 'hidden-words',
  text_type: 'hidden-word',
  source_work: 'The Hidden Words',
  word_count: 26,
})

const blessed = makePassage({
  title: 'Blessed is the spot',
  display_title: 'Blessed Is\nthe Spot',
  author: "Bahá'u'lláh",
  text: 'Blessed is the spot, and the house.\n\nAnd the place, and the city.',
  word_count: 12,
  collection: 'prayers',
  text_type: 'prayer',
})

const remover = makePassage({
  title: 'Is there any Remover of difficulties',
  author: 'The Báb',
  word_count: 32,
  source_work: 'Súrih of the Pen',
})

/** D1.10: a Ruhi quotation carrying the same tag must never appear in Discover. */
const ruhi = makeRuhiPassage({ title: 'A Ruhi quotation', author: "Bahá'u'lláh" })

async function seed() {
  await putTags([HEALING, MORNING])
  await putPassages([blessed, remover, ruhi, hiddenWord])
  await putPassageTags([
    { passage_id: blessed.id, tag_id: HEALING.id },
    { passage_id: remover.id, tag_id: HEALING.id },
    { passage_id: ruhi.id, tag_id: HEALING.id },
    { passage_id: remover.id, tag_id: MORNING.id },
  ])
}

/**
 * The anonymous id this test's render created (scope 13.1). Each test forgets
 * the previous one's, so a row written by a test that had not finished writing
 * when the database was reset belongs to a different device than this one.
 */
function thisDevice(): string {
  return localStorage.getItem('by-heart.anonymous-user-id') ?? ''
}

/** Rows this device owns for one passage. */
async function listOwnPrayerRows(passageId: string) {
  const rows = await db.user_prayers.toArray()
  return rows.filter((row) => row.user_id === thisDevice() && row.passage_id === passageId)
}

async function listOwnBookmarks(passageId: string) {
  const rows = await db.bookmarks.toArray()
  return rows.filter((row) => row.user_id === thisDevice() && row.passage_id === passageId)
}

function renderApp(at = '/discover') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <App />
    </MemoryRouter>,
  )
}

/** The browse is a hierarchy now: a collection, then one of its categories. */
async function openCategory(name: string) {
  renderApp()
  fireEvent.click(await screen.findByRole('link', { name: /Prayers/ }))
  fireEvent.click(await screen.findByRole('link', { name: new RegExp(name) }))
}

async function openCollection(name: string) {
  renderApp()
  fireEvent.click(await screen.findByRole('link', { name: new RegExp(name) }))
}

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetCorpusLoad()
  await resetDatabase()
  await seed()
})

afterEach(cleanup)

describe('the collection browse (scope 6.1, decision D4.1)', () => {
  it('offers every collection that holds something, in the order scope 6.1 lists them', async () => {
    renderApp()

    await screen.findByRole('link', { name: /Prayers/ })
    const list = screen.getByRole('navigation', { name: strings.accessibility.collectionList })
    const rows = [...list.querySelectorAll('a')].map((row) => row.textContent ?? '')

    expect(rows).toEqual(['Prayers2 PASSAGES', 'The Hidden Words1 PASSAGE'])
  })

  it('reaches a collection the tag feed never tagged, which is why it exists', async () => {
    await openCollection('The Hidden Words')

    // No category level: nothing in this collection carries a tag. The passage
    // list is shown directly, and the passage is reachable at last.
    await waitFor(() => {
      expect(screen.getByText(hiddenWord.title)).toBeDefined()
    })
    expect(screen.queryByText(strings.discover.categoriesSection)).toBeNull()
  })

  it('counts the devotional passages only, never a Ruhi quotation (D1.10)', async () => {
    renderApp()

    // Three prayers are in the database under `prayers` and one of them is Ruhi.
    await waitFor(() => {
      expect(screen.getByText(strings.discover.passageCount(2))).toBeDefined()
    })
  })

  it('carries the app name and the screen title in the tall header', async () => {
    renderApp()

    await waitFor(() => {
      expect(screen.getByText(strings.discover.eyebrow)).toBeDefined()
    })
    expect(screen.getByRole('heading', { name: strings.screenTitles.discover })).toBeDefined()
  })

  it('offers no search field, which is scope 6.3 and [v1.0]', async () => {
    renderApp()

    await waitFor(() => {
      expect(screen.getByText(strings.discover.eyebrow)).toBeDefined()
    })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })
})

describe('the category browse, inside a collection (scope 6.1)', () => {
  it("lists a collection's categories alphabetically, each with its passage count", async () => {
    await openCollection('Prayers')

    await screen.findByRole('link', { name: /Morning/ })
    const list = screen.getByRole('navigation', { name: strings.accessibility.categoryList })
    const rows = [...list.querySelectorAll('a')].map((row) => row.textContent ?? '')

    expect(rows).toEqual(['Healing2 PASSAGES', 'Morning1 PASSAGE'])
  })
})

describe('the passage list (scope 6.2)', () => {
  it('shows the title, the author and the word count on every row', async () => {
    await openCategory('Healing')

    await screen.findByRole('link', { name: /Remover/ })
    const list = screen.getByRole('navigation', { name: strings.accessibility.passageList })
    const rows = [...list.querySelectorAll('a')].map((row) => row.textContent ?? '')

    expect(rows).toEqual([
      'Blessed is the spotBAHÁ’U’LLÁH · 12 WORDS'.replace(/’/g, "'"),
      'Is there any Remover of difficultiesTHE BÁB · 32 WORDS',
    ])
  })

  it('titles the screen with the category and never shows a Ruhi quotation', async () => {
    await openCategory('Healing')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Healing' })).toBeDefined()
    })
    expect(screen.queryByText(ruhi.title)).toBeNull()
  })

  it('comes back one step at a time, category to collection to library', async () => {
    await openCategory('Healing')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Healing' })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: strings.accessibility.back }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: strings.collectionTitles.prayers })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: strings.accessibility.back }))
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: strings.screenTitles.discover })).toBeDefined()
    })
  })
})

describe('the reading view (scope 6.6, design-tokens 5.4)', () => {
  it('shows the passage in full, in the order design-tokens 5.4 sets out', async () => {
    renderApp(`/discover/passage/${blessed.id}`)

    const article = await waitFor(() => screen.getByRole('article'))
    const text = article.textContent ?? ''

    expect(text.indexOf(strings.textTypes.prayer)).toBeLessThan(text.indexOf('Blessed Is'))
    expect(text).toContain(blessed.author)
    expect(text).toContain('Blessed is the spot, and the house.')
    // Both paragraphs, so a passage is never truncated at a blank line.
    expect(text).toContain('And the place, and the city.')
    expect(text).toContain(FLEURON)
  })

  it('renders the attribution and the copyright line, which principle 7.10 requires', async () => {
    renderApp(`/discover/passage/${blessed.id}`)

    const article = await waitFor(() => screen.getByRole('article'))
    expect(article.textContent).toContain("BAHÁ'U'LLÁH · PRAYERS")
    expect(article.textContent).toContain(strings.reading.copyright)
  })

  it('names the work a passage comes from where it has one', async () => {
    renderApp(`/discover/passage/${remover.id}`)

    const article = await waitFor(() => screen.getByRole('article'))
    expect(article.textContent).toContain('THE BÁB · SÚRIH OF THE PEN')
  })

  it('honours the authored line break in the title (design-tokens 8.2)', async () => {
    renderApp(`/discover/passage/${blessed.id}`)

    const heading = await waitFor(() => screen.getByRole('heading', { level: 1 }))
    expect(heading.querySelectorAll('br')).toHaveLength(1)
  })

  it('sets the first letter as a drop cap without losing it from the text', async () => {
    renderApp(`/discover/passage/${blessed.id}`)

    const article = await waitFor(() => screen.getByRole('article'))
    const cap = [...article.querySelectorAll('span')].find((span) => span.style.float === 'left')
    expect(cap?.textContent).toBe('B')
    expect(article.textContent).toContain('Blessed is the spot, and the house.')
  })

  it('will not open a Ruhi quotation, however the URL was reached (D1.10)', async () => {
    renderApp(`/discover/passage/${ruhi.id}`)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: strings.accessibility.back })).toBeDefined()
    })
    expect(screen.queryByText(ruhi.title)).toBeNull()
  })
})

describe('bookmark (scope 6.6)', () => {
  it('keeps the place, and gives it back', async () => {
    renderApp(`/discover/passage/${blessed.id}`)

    fireEvent.click(await screen.findByRole('button', { name: strings.reading.bookmarkAdd }))

    await waitFor(async () => {
      expect(await listOwnBookmarks(blessed.id)).toHaveLength(1)
    })
    const set = screen.getByRole('button', { name: strings.reading.bookmarkRemove })
    expect(set.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(set)
    await waitFor(async () => {
      expect(await listOwnBookmarks(blessed.id)).toHaveLength(0)
    })
  })

  it('shows a bookmark already set when the passage is opened again', async () => {
    renderApp(`/discover/passage/${blessed.id}`)
    fireEvent.click(await screen.findByRole('button', { name: strings.reading.bookmarkAdd }))
    await waitFor(async () => {
      expect(await listOwnBookmarks(blessed.id)).toHaveLength(1)
    })

    cleanup()
    renderApp(`/discover/passage/${blessed.id}`)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: strings.reading.bookmarkRemove })).toBeDefined()
    })
  })
})

describe('add to my list (scope 6.6, 6.5)', () => {
  it('writes the row, and nothing more than the row', async () => {
    renderApp(`/discover/passage/${blessed.id}`)

    fireEvent.click(await screen.findByRole('button', { name: strings.reading.listAdd }))

    const row = await waitFor(async () => {
      const found = await listOwnPrayerRows(blessed.id)
      expect(found).toHaveLength(1)
      return found[0]
    })
    expect(row?.status).toBe('list')

    // Scope 8.4: segmentation is suggested and confirmed at add time, and that
    // is session 5's screen. Adding from here must not have split anything.
    expect(await db.passage_segments.count()).toBe(0)
    expect(await db.segment_progress.count()).toBe(0)
  })

  it('reads as already added afterwards, and does not offer to add again', async () => {
    renderApp(`/discover/passage/${blessed.id}`)

    fireEvent.click(await screen.findByRole('button', { name: strings.reading.listAdd }))

    const added = await screen.findByRole('button', { name: strings.reading.listAlreadyAdded })
    expect(added.hasAttribute('disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: strings.reading.listAdd })).toBeNull()

    // Settled before the test ends. A write still in flight when the next test
    // resets the database lands in the new one, under the previous test's
    // device id, and shows up there as a row nobody wrote.
    await waitFor(async () => {
      expect(await listOwnPrayerRows(blessed.id)).toHaveLength(1)
    })
  })

  it('is still marked as added when the passage is opened again', async () => {
    renderApp(`/discover/passage/${blessed.id}`)
    fireEvent.click(await screen.findByRole('button', { name: strings.reading.listAdd }))
    await waitFor(async () => {
      expect(await listOwnPrayerRows(blessed.id)).toHaveLength(1)
    })

    cleanup()
    renderApp(`/discover/passage/${blessed.id}`)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: strings.reading.listAlreadyAdded })).toBeDefined()
    })
  })
})

describe('the confirmation band (decision D4.9)', () => {
  it('says what happened when a passage is added, and offers a way back', async () => {
    renderApp(`/discover/passage/${blessed.id}`)
    fireEvent.click(await screen.findByRole('button', { name: strings.reading.listAdd }))

    const band = await screen.findByRole('status')
    expect(band.textContent).toContain(strings.reading.addedToList)
    expect(within(band).getByRole('button', { name: strings.reading.undo })).toBeDefined()

    await waitFor(async () => {
      expect(await listOwnPrayerRows(blessed.id)).toHaveLength(1)
    })
  })

  it('undoes the add, in the database and on the mark', async () => {
    renderApp(`/discover/passage/${blessed.id}`)
    fireEvent.click(await screen.findByRole('button', { name: strings.reading.listAdd }))
    await waitFor(async () => {
      expect(await listOwnPrayerRows(blessed.id)).toHaveLength(1)
    })

    fireEvent.click(
      within(await screen.findByRole('status')).getByRole('button', {
        name: strings.reading.undo,
      }),
    )

    await waitFor(async () => {
      expect(await listOwnPrayerRows(blessed.id)).toHaveLength(0)
    })
    // And the mark offers to add again, rather than staying ticked.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: strings.reading.listAdd })).toBeDefined()
    })
  })

  it('confirms a bookmark without offering an undo, because the mark toggles', async () => {
    renderApp(`/discover/passage/${blessed.id}`)
    fireEvent.click(await screen.findByRole('button', { name: strings.reading.bookmarkAdd }))

    const band = await screen.findByRole('status')
    expect(band.textContent).toContain(strings.reading.bookmarked)
    expect(within(band).queryByRole('button', { name: strings.reading.undo })).toBeNull()

    await waitFor(async () => {
      expect(await listOwnBookmarks(blessed.id)).toHaveLength(1)
    })
  })

  it('says so when a bookmark is taken off again', async () => {
    renderApp(`/discover/passage/${blessed.id}`)
    fireEvent.click(await screen.findByRole('button', { name: strings.reading.bookmarkAdd }))
    fireEvent.click(await screen.findByRole('button', { name: strings.reading.bookmarkRemove }))

    await waitFor(() => {
      expect(screen.getByRole('status').textContent).toContain(strings.reading.bookmarkUndone)
    })
    await waitFor(async () => {
      expect(await listOwnBookmarks(blessed.id)).toHaveLength(0)
    })
  })
})

/**
 * **Principle 7.6, checked against the rendered screen.**
 *
 * The isolation test proves this folder cannot import the scheduler or a
 * progress table. It cannot prove that what does get rendered is free of
 * memorisation chrome, because a due date typed as a literal would import
 * nothing at all. This is the other half.
 */
describe('principle 7.6 - no memorisation chrome anywhere in Discover', () => {
  it('shows no vocabulary of freshness, streaks or the queue on any screen', async () => {
    const forbidden = [
      strings.vocabulary.freshnessStrong,
      strings.vocabulary.freshnessFading,
      strings.vocabulary.freshnessNeedsReview,
      strings.vocabulary.upkeepResting,
      strings.vocabulary.streak,
      strings.vocabulary.dailyQueue,
      strings.vocabulary.learning,
      strings.vocabulary.memorised,
    ]

    for (const path of [
      '/discover',
      '/discover/collection/prayers',
      '/discover/collection/hidden-words',
      `/discover/collection/prayers/category/${HEALING.id}`,
      `/discover/passage/${blessed.id}`,
    ]) {
      cleanup()
      renderApp(path)
      await waitFor(() => {
        expect(
          screen.getByRole('navigation', { name: strings.accessibility.primaryNavigation }),
        ).toBeDefined()
      })

      const body = document.body.textContent ?? ''
      for (const word of forbidden) expect(body).not.toContain(word)
    }
  })

  it('draws no freshness star on the reading view, which design-tokens 4 bans by name', async () => {
    renderApp(`/discover/passage/${blessed.id}`)
    const article = await waitFor(() => screen.getByRole('article'))

    // The star is the only nine-pointed polygon in the app's icon set.
    expect(article.querySelectorAll('polygon')).toHaveLength(0)
    expect(article.querySelectorAll('svg')).toHaveLength(0)
  })

  it('shows no number on the reading view except through the text itself', async () => {
    renderApp(`/discover/passage/${blessed.id}`)
    const article = await waitFor(() => screen.getByRole('article'))

    // Blessed is the spot carries no digit, so any digit here would be chrome:
    // a due count, a day number, a percentage, an interval.
    expect(article.textContent ?? '').not.toMatch(/\d/)
  })
})
