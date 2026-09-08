// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { putPassages } from '../data/corpus'
import { resetDatabase } from '../data/db'
import { makePassage } from '../data/fixtures'
import { forgetCorpusLoad, rememberCorpusLoaded } from '../data/loadCorpus'
import { listReviewLog } from '../data/reviewLog'
import { confirmSegmentation, listPassageSegments } from '../data/segmentation'
import { putSegmentProgress } from '../data/segmentProgress'
import { forgetAnonymousUserId } from '../data/userId'
import { getUserPrayer } from '../data/userPrayers'
import { firstLetters } from '../quiz'
import { strings } from '../strings'
import type { PassageRow } from '../data/types'

/**
 * **Reciting, and the milestone, driven through the real shell.** Scope 9.1,
 * 9.4, 9.5, 9.6 and 8.7.
 *
 * Session 8's `quiz.test.tsx` is the component test CLAUDE.md section 11 names
 * by name, and it covers the chip cloze. This is its companion for the top of
 * the ladder, and it exists for a different reason: **nothing at levels 5 and 6
 * is checked by the app**, so there is no wrong answer for a test to catch and
 * the only things that can be wrong are what is on the screen and what is
 * written down afterwards. Both are here.
 *
 * The two shapes that would look like correct behaviour if they broke:
 *
 * **A reveal that shows too much.** The whole point of levels 5 and 6 is that
 * the words are not there. A progressive reveal that quietly showed the next
 * line early, or a milestone that showed more than its opening, would be a
 * pleasant screen that had stopped asking anything.
 *
 * **A promotion that leaves the lines running.** Scope 8.7 retains segment state
 * and stops surfacing it. If it stopped only one of the two, a reader who
 * reached a milestone would get the whole passage *and* all of its lines every
 * morning, which reads as a scheduling bug rather than a missing rule.
 */

const prayer = makePassage({ title: 'Remove not, O Lord' })

const LINES = ['Remove not, O Lord, the lamp,', 'nor the light of Thy guidance,', 'O my God.']

/** A day well in the past, so anything written with it is overdue. */
const LONG_AGO = '2020-01-01'

/** Decision D8.2: repetitions decide the rung. Four is level 5, five is level 6. */
const SCAFFOLD_RUNG = 4
const FREE_RECALL_RUNG = 5

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetCorpusLoad()
  await resetDatabase()
  await putPassages([prayer])
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

function thisDevice(): string {
  return localStorage.getItem('by-heart.anonymous-user-id') ?? ''
}

/**
 * The app writes the anonymous id on its first render, so the shell is rendered
 * once and thrown away before the rows are written against it.
 */
async function withList(prepare: () => Promise<void>): Promise<void> {
  const first = renderApp()
  await screen.findByRole('heading', { name: strings.screenTitles.memorise })
  first.unmount()
  await prepare()
}

async function addToList(passage: PassageRow, lines: readonly string[]): Promise<string[]> {
  await confirmSegmentation(thisDevice(), passage.id, lines)
  return (await listPassageSegments(passage.id)).map((segment) => segment.id)
}

async function met(segmentId: string, repetitions: number, dueDate = LONG_AGO): Promise<void> {
  await putSegmentProgress(thisDevice(), segmentId, {
    ease_factor: 2.5,
    interval_days: 6,
    repetitions,
    due_date: dueDate,
    last_reviewed_at: LONG_AGO,
    lapses: 0,
  })
}

/** Every line of the prayer, at the same rung. */
async function allLinesAt(repetitions: number, dueDate = LONG_AGO): Promise<string[]> {
  const segmentIds = await addToList(prayer, LINES)
  for (const segmentId of segmentIds) await met(segmentId, repetitions, dueDate)
  return segmentIds
}

/** Opens the prayer's lines for today, from its row in TODAY. */
async function openWork(): Promise<void> {
  const today = await screen.findByLabelText(strings.accessibility.queueList)
  fireEvent.click(within(today).getByRole('link', { name: new RegExp(prayer.title) }))
}

/** Opens the whole passage, from wherever the row offering it is. */
async function openRecital(label: string): Promise<void> {
  const section = await screen.findByLabelText(label)
  fireEvent.click(within(section).getByRole('link', { name: new RegExp(prayer.title) }))
}

function recited(): HTMLElement {
  return screen.getByLabelText(strings.accessibility.reciteLines)
}

function ratings(): HTMLElement | null {
  return screen.queryByRole('group', { name: strings.accessibility.selfRating })
}

describe('level 5, first letters as a scaffold', () => {
  it('shows the first letter of each word and none of the words', async () => {
    await withList(async () => {
      await allLinesAt(SCAFFOLD_RUNG)
    })

    renderApp()
    await openWork()

    await screen.findByText(strings.review.reciteScaffold)
    const shown = recited().textContent ?? ''
    expect(shown).toContain(firstLetters(LINES[0] ?? ''))
    // The scaffold is not the line. If this ever passes, the rung has stopped
    // asking for anything.
    expect(shown).not.toContain(LINES[0])
  })

  it('does not ask for the rating until every line has been shown', async () => {
    await withList(async () => {
      await allLinesAt(SCAFFOLD_RUNG)
    })

    renderApp()
    await screen.findByRole('heading', { name: strings.screenTitles.memorise })
    await openWork()
    await screen.findByText(strings.review.reciteScaffold)

    // The first line of the day has one line before it and itself, so two.
    expect(ratings()).toBeNull()
    fireEvent.click(screen.getByText(strings.review.showNextLine))
    expect(ratings()).not.toBeNull()
  })
})

describe('level 6, free recall', () => {
  it('shows no words at all before the reveal', async () => {
    await withList(async () => {
      await allLinesAt(FREE_RECALL_RUNG)
    })

    renderApp()
    await openWork()

    await screen.findByText(strings.review.reciteFree)
    for (const line of LINES) expect(recited().textContent).not.toContain(line)
  })

  it('reveals one line at a time, so you can check yourself as you go', async () => {
    // Scope 9.4. The third line of the passage is served with the two before it,
    // so this is a run of three revealed one at a time.
    await withList(async () => {
      const segmentIds = await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
      await met(segmentIds[2] ?? '', FREE_RECALL_RUNG, LONG_AGO)
    })

    renderApp()
    await openWork()
    await screen.findByText(strings.review.reciteFree)

    for (const [index, line] of LINES.entries()) {
      expect(recited().textContent).not.toContain(line)
      fireEvent.click(screen.getByText(strings.review.showNextLine))
      expect(recited().textContent).toContain(line)
      // Everything after it is still hidden, which is the whole of the rung.
      for (const later of LINES.slice(index + 1)) {
        expect(recited().textContent).not.toContain(later)
      }
    }

    expect(ratings()).not.toBeNull()
    // Twice over: the sentence above the lines, and the live region that says
    // the same thing to anyone who cannot see it change.
    expect(screen.getAllByText(strings.review.reciteRevealed)).toHaveLength(2)
  })

  it('records the rung it was served at, and rates the line the queue served', async () => {
    let served = ''
    await withList(async () => {
      const segmentIds = await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
      served = segmentIds[1] ?? ''
      await met(served, FREE_RECALL_RUNG, LONG_AGO)
    })

    renderApp()
    await openWork()
    await screen.findByText(strings.review.reciteFree)
    fireEvent.click(screen.getByText(strings.review.showNextLine))
    fireEvent.click(screen.getByText(strings.review.showNextLine))
    fireEvent.click(screen.getByText(strings.review.ratingGood))

    await waitFor(async () => {
      const log = await listReviewLog(thisDevice())
      expect(log).toHaveLength(1)
      expect(log[0]?.quiz_type).toBe('level6')
      expect(log[0]?.segment_id).toBe(served)
      expect(log[0]?.passage_id).toBe(prayer.id)
    })
  })
})

describe('the door to the milestone', () => {
  it('is not there until every line of the passage has been met', async () => {
    await withList(async () => {
      const segmentIds = await addToList(prayer, LINES)
      await met(segmentIds[0] ?? '', 2)
    })

    renderApp()
    await screen.findByRole('heading', { name: strings.screenTitles.memorise })
    expect(screen.queryByLabelText(strings.accessibility.reciteList)).toBeNull()
    expect(screen.queryByText(strings.memorise.reciteSection)).toBeNull()
  })

  it('appears once it has, offering the whole passage', async () => {
    await withList(async () => {
      await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
    })

    renderApp()
    const section = await screen.findByLabelText(strings.accessibility.reciteList)
    expect(within(section).getByText(prayer.title)).toBeDefined()
    expect(within(section).getByText(strings.memorise.wholePassage)).toBeDefined()
  })
})

describe('the milestone screen', () => {
  async function openIt(): Promise<void> {
    renderApp()
    await openRecital(strings.accessibility.reciteList)
    await screen.findByText(strings.milestone.recite)
  }

  it('shows the opening words and hides everything else', async () => {
    await withList(async () => {
      await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
    })
    await openIt()

    // Scope 9.5: "First five words or so visible, so you know which passage you
    // are reciting. Everything else hidden."
    const shown = recited().textContent ?? ''
    expect(shown).toContain('Remove not, O Lord, the')
    expect(shown).not.toContain('lamp')
    for (const line of LINES.slice(1)) expect(shown).not.toContain(line)
  })

  it('shows the passage its attribution, which every surface must', async () => {
    // Principle 7.10 and design-tokens 7.1, which names the milestone screen.
    await withList(async () => {
      await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
    })
    await openIt()

    expect(screen.getByText("BAHÁ'U'LLÁH · PRAYERS")).toBeDefined()
  })

  it('reveals the whole of it in one movement, not line by line', async () => {
    // Scope 9.4: "the milestone reveals in one movement because it is a single
    // honest moment and a staged reveal turns it into an exam."
    await withList(async () => {
      await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
    })
    await openIt()

    expect(ratings()).toBeNull()
    fireEvent.click(screen.getByText(strings.milestone.reveal))

    const shown = recited().textContent ?? ''
    for (const line of LINES) expect(shown).toContain(line)
    expect(ratings()).not.toBeNull()
    expect(screen.getAllByText(strings.milestone.revealed)).toHaveLength(2)
  })

  it('promotes the passage and says so, back on the tab it came from', async () => {
    await withList(async () => {
      await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
    })
    await openIt()

    fireEvent.click(screen.getByText(strings.milestone.reveal))
    fireEvent.click(screen.getByText(strings.review.ratingGood))

    expect(await screen.findByText(strings.memorise.milestoneReached)).toBeDefined()
    const row = await getUserPrayer(thisDevice(), prayer.id)
    expect(row?.status).toBe('memorised')
    expect(row?.milestone_reached_at).not.toBeNull()
  })

  it('leaves everything as it was when the reader rates it Again', async () => {
    await withList(async () => {
      await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
    })
    await openIt()

    fireEvent.click(screen.getByText(strings.milestone.reveal))
    fireEvent.click(screen.getByText(strings.review.ratingAgain))

    expect(await screen.findByText(strings.memorise.milestoneUnchanged)).toBeDefined()
    expect((await getUserPrayer(thisDevice(), prayer.id))?.passage_due_date).toBeNull()
    // The invitation is still standing. Nothing was taken away for trying.
    expect(await screen.findByLabelText(strings.accessibility.reciteList)).toBeDefined()
  })
})

describe('after the milestone', () => {
  async function promote(): Promise<void> {
    await withList(async () => {
      await allLinesAt(FREE_RECALL_RUNG, '2099-01-01')
    })
    renderApp()
    await openRecital(strings.accessibility.reciteList)
    await screen.findByText(strings.milestone.recite)
    fireEvent.click(screen.getByText(strings.milestone.reveal))
    fireEvent.click(screen.getByText(strings.review.ratingGood))
    await screen.findByText(strings.memorise.milestoneReached)
  }

  it('the whole passage comes round as one row, and its lines do not', async () => {
    await promote()

    // The card was scheduled forward, so bring it back by hand: the passage's
    // own scheduling is `src/scheduler/passage.test.ts`'s business, not this
    // file's, and what is under test here is the shape of the morning.
    const row = await getUserPrayer(thisDevice(), prayer.id)
    const { db } = await import('../data/db')
    await db.user_prayers.update(row?.id ?? '', { passage_due_date: LONG_AGO })

    cleanup()
    renderApp()

    const today = await screen.findByLabelText(strings.accessibility.queueList)
    expect(within(today).getByText(strings.memorise.wholePassage)).toBeDefined()
    // One row, and it is the whole passage. Not one row per line as well.
    expect(within(today).getAllByRole('link')).toHaveLength(1)
    // And the standing invitation has gone, because this is a review now.
    expect(screen.queryByLabelText(strings.accessibility.reciteList)).toBeNull()
  })

  it('that row opens the milestone screen rather than the line walk', async () => {
    await promote()
    const row = await getUserPrayer(thisDevice(), prayer.id)
    const { db } = await import('../data/db')
    await db.user_prayers.update(row?.id ?? '', { passage_due_date: LONG_AGO })

    cleanup()
    renderApp()
    await openRecital(strings.accessibility.queueList)

    expect(await screen.findByText(strings.milestone.recite)).toBeDefined()
  })

  it('a rating of Again puts the passage back on its lines', async () => {
    // Scope 8.7's demotion, through the screen the reader actually meets.
    await promote()
    const row = await getUserPrayer(thisDevice(), prayer.id)
    const { db } = await import('../data/db')
    await db.user_prayers.update(row?.id ?? '', { passage_due_date: LONG_AGO })

    cleanup()
    renderApp()
    await openRecital(strings.accessibility.queueList)
    await screen.findByText(strings.milestone.recite)
    fireEvent.click(screen.getByText(strings.milestone.reveal))
    fireEvent.click(screen.getByText(strings.review.ratingAgain))

    expect(await screen.findByText(strings.memorise.milestoneDemoted)).toBeDefined()
    const after = await getUserPrayer(thisDevice(), prayer.id)
    expect(after?.status).toBe('learning')
    expect(after?.passage_due_date).toBeNull()
    // The date it happened is kept: scope 11.3 shows it on the passage detail.
    expect(after?.milestone_reached_at).not.toBeNull()
  })

  it('records the recital against the passage and no line', async () => {
    await promote()

    const log = await listReviewLog(thisDevice())
    expect(log).toHaveLength(1)
    expect(log[0]?.quiz_type).toBe('milestone')
    expect(log[0]?.passage_id).toBe(prayer.id)
    expect(log[0]?.segment_id).toBeNull()
  })
})
