// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { putPassages } from '../data/corpus'
import { db, resetDatabase } from '../data/db'
import { makePassage } from '../data/fixtures'
import { forgetCorpusLoad, rememberCorpusLoaded } from '../data/loadCorpus'
import { confirmSegmentation, listPassageSegments } from '../data/segmentation'
import { putSegmentProgress } from '../data/segmentProgress'
import { forgetAnonymousUserId } from '../data/userId'
import { strings } from '../strings'
import { formatDay } from '../strings/dates'
import type { PassageRow } from '../data/types'

/**
 * **Today's queue, driven through the real shell.** Scope 8.3, 8.5 and 8.6.
 *
 * The rules are unit tested in `src/queue/` against plain values, and the reads
 * in `src/data/`. This is the part neither can reach: what a person actually
 * sees on the Memorise tab, and in particular what they never see.
 *
 * It lives in `src/app/` for the same reason `discover.test.tsx` and
 * `segmentation.test.tsx` do: it writes progress rows directly to prove what the
 * screen is drawn from, and the walls around Discover forbid a file in that
 * folder from importing any of it.
 */

const blessed = makePassage({
  title: 'Blessed is the spot',
  text: 'Blessed is the spot and the house.\nAnd the place, and the city.',
})
const remover = makePassage({
  title: 'Remover of difficulties',
  text: 'Is there any Remover of difficulties.\nSave God, say.',
})

/** A day well in the past, so everything written with it is overdue. */
const LONG_AGO = '2020-01-01'

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetCorpusLoad()
  await resetDatabase()
  await putPassages([blessed, remover])
  rememberCorpusLoaded()
})

afterEach(cleanup)

function renderApp(at = '/memorise') {
  return render(
    <MemoryRouter initialEntries={[at]}>
      <App />
    </MemoryRouter>,
  )
}

/** The anonymous id a render creates (scope 13.1), read the way the app stores it. */
function thisDevice(): string {
  return localStorage.getItem('by-heart.anonymous-user-id') ?? ''
}

/**
 * Puts a passage on the list with the given lines, as though the add moment had
 * been confirmed, and returns the ids of those lines.
 */
async function addToList(passage: PassageRow, lines: number): Promise<string[]> {
  await confirmSegmentation(
    thisDevice(),
    passage.id,
    Array.from({ length: lines }, (_, index) => `Line ${String(index + 1)}`),
  )
  return (await listPassageSegments(passage.id)).map((segment) => segment.id)
}

/**
 * Opens My list from the Memorise tab. Session 6 listed every passage on the
 * Memorise screen itself; My list absorbed that roll call (decision D7.3), so
 * upkeep is now reached through here.
 */
async function openMyList(): Promise<HTMLElement> {
  // The row carries the count beside its title, so the accessible name is the
  // two together. Matched loosely for that reason.
  fireEvent.click(await screen.findByRole('link', { name: /My list/ }))
  return screen.findByRole('list', { name: strings.accessibility.myList })
}

/** Marks lines as seen before and overdue, so they are due rather than new. */
async function makeOverdue(segmentIds: readonly string[], dueDate = LONG_AGO): Promise<void> {
  for (const id of segmentIds) {
    await putSegmentProgress(thisDevice(), id, {
      ease_factor: 2.5,
      interval_days: 6,
      repetitions: 2,
      due_date: dueDate,
      last_reviewed_at: dueDate,
      lapses: 0,
    })
  }
}

/**
 * The app writes the anonymous id on its first render, and the tests need it
 * before they can write rows against it. So the shell is rendered once, thrown
 * away, and rendered again with the data in place.
 */
async function withList(prepare: () => Promise<void>): Promise<void> {
  const first = renderApp()
  await screen.findByRole('heading', { name: strings.screenTitles.memorise })
  first.unmount()
  await prepare()
}

function queueRows(): string[] {
  const list = screen.queryByRole('list', { name: strings.accessibility.queueList })
  if (list === null) return []
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '')
}

describe('the empty day', () => {
  it('says nothing is on the list yet, for a user who has added nothing', async () => {
    renderApp()
    expect(await screen.findByText(strings.memorise.emptyList)).toBeTruthy()
  })

  it('says the day is done, once the list has something on it and nothing is due', async () => {
    await withList(async () => {
      const lines = await addToList(blessed, 2)
      // Seen, and not due again until next year.
      await makeOverdue(lines, '2099-01-01')
    })

    renderApp()
    expect(await screen.findByText(strings.memorise.done)).toBeTruthy()
  })

  it('offers nothing further to do, which scope 8.3 forbids by name', async () => {
    // "When the queue is done, it is done. No study more prompt."
    await withList(async () => {
      const lines = await addToList(blessed, 2)
      await makeOverdue(lines, '2099-01-01')
    })

    renderApp()
    await screen.findByText(strings.memorise.done)
    // The only controls on a finished day are the three tabs and the upkeep
    // rows. Nothing invites the user to do more.
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe("today's work", () => {
  it('names each passage today touches, once, with how many of its lines', async () => {
    await withList(async () => {
      const first = await addToList(blessed, 3)
      const second = await addToList(remover, 2)
      await makeOverdue(first)
      await makeOverdue(second)
    })

    renderApp()
    await waitFor(() => {
      expect(queueRows()).toHaveLength(2)
    })
    const rows = queueRows()
    expect(rows[0]).toContain('Blessed is the spot')
    expect(rows[0]).toContain(strings.memorise.lineCount(3))
    expect(rows[1]).toContain('Remover of difficulties')
    expect(rows[1]).toContain(strings.memorise.lineCount(2))
  })

  it('shows every passage its author, because principle 7.10 admits no exception', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
    })

    renderApp()
    await waitFor(() => {
      expect(queueRows()).toHaveLength(1)
    })
    expect(queueRows()[0]?.toUpperCase()).toContain("BAHÁ'U'LLÁH")
  })

  it('never shows the text of a line, which is what the quiz is about to ask for', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
    })

    renderApp()
    await waitFor(() => {
      expect(queueRows()).toHaveLength(1)
    })
    expect(screen.queryByText('Line 1')).toBeNull()
    expect(screen.queryByText('Line 2')).toBeNull()
  })

  it('opens that prayer, and only that prayer, when a row is tapped', async () => {
    // Session 6 asserted the opposite here, because the quiz ladder did not
    // exist and a row that responded to a tap would have had to be unbuilt.
    // Session 8 makes the row the one door into the ladder (decision D8.1).
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
    })

    renderApp()
    await waitFor(() => {
      expect(queueRows()).toHaveLength(1)
    })
    const list = screen.getByRole('list', { name: strings.accessibility.queueList })
    const rows = within(list).getAllByRole('link')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.getAttribute('href')).toBe(`/memorise/review/${blessed.id}`)
  })
})

describe('the cap, principle 7.3', () => {
  it('holds the day to fifteen lines however far behind the user is', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 40))
    })

    renderApp()
    await waitFor(() => {
      expect(queueRows()).toHaveLength(1)
    })
    expect(queueRows()[0]).toContain(strings.memorise.lineCount(15))
  })

  it('shows no count of the twenty five lines it left out', async () => {
    // Principle 7.3: overdue rolls forward silently and no discouraging count is
    // ever displayed. Two numbers may appear on this screen: 15, which is
    // today's work already capped, and 1, which is how many passages are on the
    // list. Neither is a backlog, and the backlog's own number is nowhere,
    // because `src/queue/queue.ts` never works it out.
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 40))
    })

    renderApp()
    await waitFor(() => {
      expect(queueRows()).toHaveLength(1)
    })
    const drawn = document.body.textContent ?? ''
    const numbers = [...drawn.matchAll(/\d+/g)].map((match) => match[0])
    expect(new Set(numbers)).toEqual(new Set(['15', '1']))
    expect(numbers).not.toContain('25')
    expect(numbers).not.toContain('40')
  })
})

describe('upkeep, scope 8.5', () => {
  it('lists everything on the list with the state it is in, on My list', async () => {
    await withList(async () => {
      await addToList(blessed, 2)
    })

    renderApp()
    const list = await openMyList()
    expect(within(list).getByText(new RegExp(strings.upkeep.active.toUpperCase()))).toBeTruthy()
  })

  it('puts a passage to rest, and it leaves the day without leaving the list', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 3))
    })

    renderApp()
    await waitFor(() => {
      expect(queueRows()).toHaveLength(1)
    })

    await openMyList()
    fireEvent.click(await screen.findByRole('link', { name: /Blessed is the spot/ }))
    fireEvent.click(await screen.findByRole('radio', { name: new RegExp(strings.upkeep.resting) }))
    await waitFor(async () => {
      const row = await db.user_prayers.where('passage_id').equals(blessed.id).first()
      expect(row?.upkeep_state).toBe('resting')
    })

    // Back to Memorise: the day is done and the passage is still on the list,
    // shown as resting. Scope 8.5: it never decays into "needs review".
    fireEvent.click(screen.getByRole('link', { name: strings.tabs.memorise }))
    expect(await screen.findByText(strings.memorise.done)).toBeTruthy()
    const list = await openMyList()
    expect(within(list).getByText(new RegExp(strings.upkeep.resting.toUpperCase()))).toBeTruthy()
  })

  it('moves a passage to occasional without disturbing anything the app has learnt', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
    })

    renderApp()
    await openMyList()
    fireEvent.click(await screen.findByRole('link', { name: /Blessed is the spot/ }))
    const before = await db.segment_progress.toArray()

    fireEvent.click(
      await screen.findByRole('radio', { name: new RegExp(strings.upkeep.occasional) }),
    )
    await waitFor(async () => {
      const row = await db.user_prayers.where('passage_id').equals(blessed.id).first()
      expect(row?.upkeep_state).toBe('occasional')
    })

    // Decision D1.1: the multiplier is applied to a date and never stored, so
    // there is nothing here for the switch to have damaged.
    expect(await db.segment_progress.toArray()).toEqual(before)
  })
})

describe('focus mode, scope 8.6', () => {
  async function turnFocusOn(): Promise<void> {
    await openMyList()
    fireEvent.click(await screen.findByRole('link', { name: /Blessed is the spot/ }))
    fireEvent.click(await screen.findByRole('switch', { name: strings.upkeep.focusStart }))
    await waitFor(async () => {
      const row = await db.user_prayers.where('passage_id').equals(blessed.id).first()
      expect(row?.is_focus).toBe(true)
    })
  }

  it('defaults to seven days, and says on screen which day it lifts', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
      await makeOverdue(await addToList(remover, 2))
    })

    renderApp()
    await turnFocusOn()

    const row = await db.user_prayers.where('passage_id').equals(blessed.id).first()
    expect(row?.focus_until).toBeTruthy()
    expect(
      screen.getByText(strings.upkeep.focusUntil(formatDay(row?.focus_until ?? ''))),
    ).toBeTruthy()
  })

  it('suppresses everything else, and says what is paused and when it lifts', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
      await makeOverdue(await addToList(remover, 2))
    })

    renderApp()
    await turnFocusOn()
    fireEvent.click(screen.getByRole('link', { name: strings.tabs.memorise }))

    await waitFor(() => {
      expect(queueRows()).toHaveLength(1)
    })
    expect(queueRows()[0]).toContain('Blessed is the spot')

    const row = await db.user_prayers.where('passage_id').equals(blessed.id).first()
    expect(
      screen.getByText(
        strings.memorise.focusLine('Blessed is the spot', formatDay(row?.focus_until ?? '')),
      ),
    ).toBeTruthy()
  })

  it('ends when the user says so, and the rest of the list comes straight back', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
      await makeOverdue(await addToList(remover, 2))
    })

    renderApp()
    await turnFocusOn()
    fireEvent.click(await screen.findByRole('switch', { name: strings.upkeep.focusEnd }))
    await waitFor(async () => {
      const row = await db.user_prayers.where('passage_id').equals(blessed.id).first()
      expect(row?.is_focus).toBe(false)
    })

    fireEvent.click(screen.getByRole('link', { name: strings.tabs.memorise }))
    await waitFor(() => {
      expect(queueRows()).toHaveLength(2)
    })
  })

  it('releases itself on expiry and tells the user, once', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
      await makeOverdue(await addToList(remover, 2))
      // A focus whose day has already come, as though the app had not been
      // opened since. Scope 8.6's postponed meeting.
      const row = await db.user_prayers.where('passage_id').equals(blessed.id).first()
      await db.user_prayers.update(row?.id ?? '', { is_focus: true, focus_until: LONG_AGO })
    })

    renderApp()
    expect(await screen.findByText(strings.memorise.focusEnded)).toBeTruthy()
    await waitFor(() => {
      expect(queueRows()).toHaveLength(2)
    })
    // Nothing on screen still claims focus is on.
    expect(screen.queryByText(new RegExp(strings.memorise.focusPassageCount(2)))).toBeNull()

    // Told once: coming back finds nothing left to release.
    fireEvent.click(screen.getByRole('link', { name: strings.tabs.discover }))
    fireEvent.click(screen.getByRole('link', { name: strings.tabs.memorise }))
    await waitFor(() => {
      expect(queueRows()).toHaveLength(2)
    })
    expect(screen.queryByText(strings.memorise.focusEnded)).toBeNull()
  })

  it('never appears in Discover, which is principle 7.6 seen rather than imported', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 2))
    })

    renderApp()
    await turnFocusOn()
    fireEvent.click(screen.getByRole('link', { name: strings.tabs.discover }))
    await screen.findByRole('heading', { name: strings.screenTitles.discover })

    const drawn = document.body.textContent ?? ''
    expect(drawn).not.toContain(strings.memorise.todaySection)
    expect(drawn).not.toContain(strings.upkeep.focusSection)
    expect(drawn.toLowerCase()).not.toContain('paused')
  })
})

describe('the caps in Settings, scope 8.3', () => {
  it('shows the defaults the scope names', async () => {
    renderApp('/settings')
    expect(
      await screen.findByRole('button', {
        name: strings.upkeep.more(strings.settings.dailyReviewLimit),
      }),
    ).toBeTruthy()
    expect(screen.getByText('15')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('changes the queue when the user lowers the review cap', async () => {
    await withList(async () => {
      await makeOverdue(await addToList(blessed, 40))
    })

    renderApp('/settings')
    const fewer = await screen.findByRole('button', {
      name: strings.upkeep.fewer(strings.settings.dailyReviewLimit),
    })
    // 15 to 10 to 5, a step of five each time. The second tap waits for the
    // first to have been written and read back, because the control draws the
    // stored number rather than a copy of it.
    fireEvent.click(fewer)
    await screen.findByText('10')
    fireEvent.click(fewer)
    await waitFor(async () => {
      const settings = await db.user_settings.get(thisDevice())
      expect(settings?.daily_review_limit).toBe(5)
    })

    fireEvent.click(screen.getByRole('link', { name: strings.tabs.memorise }))
    await waitFor(() => {
      expect(queueRows()).toHaveLength(1)
    })
    expect(queueRows()[0]).toContain(strings.memorise.lineCount(5))
  })
})
