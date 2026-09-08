// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { passageDetailPath } from './routes'
import { today as todayOf } from '../data/clock'
import { putPassages } from '../data/corpus'
import { resetDatabase } from '../data/db'
import { makePassage } from '../data/fixtures'
import { forgetCorpusLoad, rememberCorpusLoaded } from '../data/loadCorpus'
import { recordMilestone } from '../data/milestone'
import { appendReviewLog } from '../data/reviewLog'
import { confirmSegmentation, listPassageSegments } from '../data/segmentation'
import { putSegmentProgress } from '../data/segmentProgress'
import { setUpkeepState } from '../data/upkeep'
import { forgetAnonymousUserId, getOrCreateAnonymousUserId } from '../data/userId'
import { addDays } from '../scheduler'
import { strings } from '../strings'
import type { Day } from '../data/types'

/**
 * **Scope 11 on the screens it renders on.** The streak, the stars, and the
 * passage detail view.
 *
 * The arithmetic is tested next door in `src/progress/`, over synthetic state
 * and at every boundary; the joining is tested in `src/data/progress.test.ts`.
 * **This file is about the two things only a screen can be wrong about.**
 *
 * **That the chrome is where it is meant to be and nowhere else.** Principle 7.6
 * is the principle protecting the devotional half of the product, and the star
 * is memorisation chrome. `discover-isolation.test.ts` and `one-star.test.ts`
 * both police it by reading source, which is the strong form; this walks the
 * three tabs and looks, which is the form that would catch a breach neither of
 * them could see.
 *
 * **That the quiet things are quiet.** A streak of nought says nothing at all, a
 * new reader's tab is the tab they had before, and nothing anywhere counts what
 * the reader has failed to do. Those are all absences, and an absence is exactly
 * what a component test is for.
 */

const prayer = makePassage({ title: 'Remove not, O Lord' })
const other = makePassage({ title: 'Blessed is the spot' })

const LINES = ['Remove not, O Lord, the lamp,', 'nor the light of Thy guidance,', 'O my God.']

const TODAY: Day = todayOf()

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetCorpusLoad()
  await resetDatabase()
  await putPassages([prayer, other])
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

/**
 * This device's anonymous id (scope 13.1), minted here rather than waited for.
 *
 * The shell writes it on its first render, so a test that seeded rows before
 * rendering would write them against a different reader than the one the screen
 * then reads for. Calling this first puts the id in `localStorage`, and the
 * shell finds it there.
 */
function userId(): string {
  return getOrCreateAnonymousUserId()
}

async function onList(row = prayer, texts = LINES): Promise<string[]> {
  await confirmSegmentation(userId(), row.id, texts)
  return (await listPassageSegments(row.id)).map((segment) => segment.id)
}

/** One line with a settled history: last reviewed `reviewedAgo` days ago. */
async function reviewed(segmentId: string, interval: number, reviewedAgo: number): Promise<void> {
  await putSegmentProgress(userId(), segmentId, {
    ease_factor: 2.5,
    interval_days: interval,
    repetitions: 3,
    due_date: addDays(TODAY, interval - reviewedAgo),
    last_reviewed_at: addDays(TODAY, -reviewedAgo),
    lapses: 0,
  })
}

async function reviewOn(day: Day): Promise<void> {
  await appendReviewLog(
    userId(),
    { passageId: prayer.id, segmentId: 'segment-1', quizType: 'level2', selfRating: 'good' },
    new Date(`${day}T12:00:00`).toISOString(),
  )
}

/** The section of the Memorise tab that holds every passage with its star. */
function knownList(): HTMLElement {
  return screen.getByLabelText(strings.accessibility.knownList)
}

describe('the streak, on the Memorise tab', () => {
  it('says nothing at all to a reader with no history', async () => {
    renderApp()
    await screen.findByText(strings.memorise.todaySection)
    expect(screen.queryByText(/day in a row/)).toBeNull()
    expect(screen.queryByText(/days in a row/)).toBeNull()
  })

  it('says one day in the singular', async () => {
    await reviewOn(TODAY)
    renderApp()
    expect(await screen.findByText(strings.memorise.streakLine(1))).toBeTruthy()
  })

  it('counts a run of days', async () => {
    await reviewOn(addDays(TODAY, -2))
    await reviewOn(addDays(TODAY, -1))
    await reviewOn(TODAY)
    renderApp()
    expect(await screen.findByText(strings.memorise.streakLine(3))).toBeTruthy()
  })

  it('keeps saying the same number through a paused day, and marks nothing', async () => {
    // Scope 11.4: one missed day pauses the streak and does not reset it. The
    // reader is not told that it is at risk - that is forbidden by name - so
    // the line reads exactly as it read the day before.
    await reviewOn(addDays(TODAY, -3))
    await reviewOn(addDays(TODAY, -2))
    renderApp()
    expect(await screen.findByText(strings.memorise.streakLine(2))).toBeTruthy()
  })

  it('goes quiet rather than showing a nought once it is gone', async () => {
    await reviewOn(addDays(TODAY, -5))
    await reviewOn(addDays(TODAY, -4))
    renderApp()
    await screen.findByText(strings.memorise.todaySection)
    expect(screen.queryByText(/in a row/)).toBeNull()
  })
})

describe('the freshness stars, on the Memorise tab', () => {
  it('draws no section at all for a reader with an empty list', async () => {
    renderApp()
    await screen.findByText(strings.memorise.todaySection)
    expect(screen.queryByText(strings.memorise.knownSection)).toBeNull()
  })

  it('lists every passage on the list with the state it is in', async () => {
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 30, 0)
    await onList(other, ['Blessed is the spot,', 'and the house.'])

    renderApp()
    await screen.findByText(strings.memorise.knownSection)

    const rows = within(knownList()).getAllByRole('link')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.getAttribute('aria-label')).toBe(
      strings.accessibility.knownRow(prayer.title, strings.freshness.strong),
    )
    // The second was only just added, so none of its lines has been shown.
    expect(rows[1]?.getAttribute('aria-label')).toBe(
      strings.accessibility.knownRow(other.title, strings.freshness.needsReview),
    )
  })

  it('shows a passage that has no work today, which today s queue never would', async () => {
    // This is the reason the section exists (decision D11.1). A star drawn only
    // on today's rows could never be gold, because today's rows are the lines
    // that are slipping.
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 30, 0)

    renderApp()
    await screen.findByText(strings.memorise.knownSection)
    expect(screen.getByText(strings.memorise.done)).toBeTruthy()
    expect(within(knownList()).getAllByRole('link')).toHaveLength(1)
  })

  it('draws the star as a drawing and names the state in words', async () => {
    // Design-tokens 4: the star is the only thing that encodes freshness. It is
    // aria-hidden, and the word beside it is what a screen reader is given, so
    // nothing is announced twice and nothing is announced as a shape.
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 30, 0)

    const { container } = renderApp()
    await screen.findByText(strings.memorise.knownSection)

    const star = within(knownList()).getAllByRole('link')[0]?.querySelector('svg')
    expect(star?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('polygon')).toBeTruthy()
  })

  it('counts nothing, anywhere, about what is left undone', async () => {
    // Principle 7.3 and design-tokens 4: no numbers, no bars, no percentages.
    const segmentIds = await onList()
    await reviewed(segmentIds[0] ?? '', 6, 9)

    renderApp()
    await screen.findByText(strings.memorise.knownSection)
    expect(screen.queryByText(/%/)).toBeNull()
  })
})

describe('the passage detail view', () => {
  it('answers how well you know it, and what has happened to it', async () => {
    const segmentIds = await onList()
    await putSegmentProgress(userId(), segmentIds[0] ?? '', {
      ease_factor: 2.5,
      interval_days: 21,
      repetitions: 4,
      due_date: addDays(TODAY, 21),
      last_reviewed_at: TODAY,
      lapses: 2,
    })
    await reviewed(segmentIds[1] ?? '', 6, 5)

    renderApp(passageDetailPath(prayer.id))

    expect(await screen.findByText(prayer.title)).toBeTruthy()
    // Scope 11.3's five facts.
    expect(screen.getByText(strings.progress.freshnessSection)).toBeTruthy()
    expect(screen.getByText(strings.progress.longestInterval('3 weeks'))).toBeTruthy()
    expect(screen.getByText(strings.progress.lapses(2))).toBeTruthy()
    // How many lines sit at each state.
    const lines = screen.getByLabelText(strings.accessibility.lineStates)
    expect(within(lines).getAllByRole('listitem')).toHaveLength(3)
  })

  it('says plainly when there is nothing to report yet', async () => {
    await onList()
    renderApp(passageDetailPath(prayer.id))
    expect(await screen.findByText(strings.progress.noInterval)).toBeTruthy()
    expect(screen.getByText(strings.progress.noLapses)).toBeTruthy()
  })

  it('states the milestone date and drops the line breakdown once promoted', async () => {
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 30, 0)
    await recordMilestone(userId(), { passageId: prayer.id, rating: 'good' }, TODAY)

    renderApp(passageDetailPath(prayer.id))
    expect(await screen.findByText(strings.progress.comesRoundWhole)).toBeTruthy()
    // Scope 8.7 keeps the line state and stops surfacing it. None of those lines
    // has been reviewed since, so a breakdown would report a passage the reader
    // finished as needing review.
    expect(screen.queryByLabelText(strings.accessibility.lineStates)).toBeNull()
  })

  it('shows a resting passage at rest, and never as needing review', async () => {
    // Scope 8.5: "A resting passage shows as deliberately at rest and never
    // decays into needs review. The app does not guilt users for choices it
    // offered them."
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 6, 90)
    await setUpkeepState(userId(), prayer.id, 'resting')

    renderApp(passageDetailPath(prayer.id))
    await screen.findByText(prayer.title)
    expect(screen.getAllByText(strings.freshness.resting).length).toBeGreaterThan(0)
    expect(screen.queryByText(strings.freshness.needsReview)).toBeNull()
  })

  it('carries a door down to how often it comes round, and no control of its own', async () => {
    await onList()
    renderApp(passageDetailPath(prayer.id))
    const door = await screen.findByText(strings.progress.upkeepRow)
    expect(door.closest('a')?.getAttribute('href')).toContain('/memorise/upkeep/')
    // The three upkeep states are set on that screen, not on this one.
    expect(screen.queryByLabelText(strings.accessibility.upkeepOptions)).toBeNull()
  })

  it('sends a reader back to the Memorise tab for a passage not on the list', async () => {
    renderApp(passageDetailPath(prayer.id))
    await screen.findByLabelText(strings.accessibility.back)
    expect(screen.queryByText(strings.progress.freshnessSection)).toBeNull()
  })
})

describe('principle 7.6 - none of it appears in the prayer book', () => {
  beforeEach(async () => {
    const segmentIds = await onList()
    for (const segmentId of segmentIds) await reviewed(segmentId, 6, 9)
    await reviewOn(TODAY)
  })

  it('draws no star and no streak on Devotions', async () => {
    const { container } = renderApp('/discover')
    await screen.findByText(strings.screenTitles.discover)
    expect(container.querySelector('polygon')).toBeNull()
    expect(screen.queryByText(/in a row/)).toBeNull()
  })

  it('draws no star and no streak on a category list', async () => {
    const { container } = renderApp(`/discover/collection/${prayer.collection}`)
    await waitFor(() => {
      expect(screen.getByText(prayer.title)).toBeTruthy()
    })
    expect(container.querySelector('polygon')).toBeNull()
  })

  it('draws no star and no freshness word in the reading view', async () => {
    const { container } = renderApp(`/discover/passage/${prayer.id}`)
    await waitFor(() => {
      expect(screen.getAllByText(prayer.title).length).toBeGreaterThan(0)
    })
    expect(container.querySelector('polygon')).toBeNull()
    expect(screen.queryByText(strings.freshness.needsReview)).toBeNull()
    expect(screen.queryByText(strings.freshness.fading)).toBeNull()
  })

  it('draws no star on Bookmarks', async () => {
    const { container } = renderApp('/bookmarks')
    await screen.findByText(strings.screenTitles.bookmarks)
    expect(container.querySelector('polygon')).toBeNull()
  })
})
