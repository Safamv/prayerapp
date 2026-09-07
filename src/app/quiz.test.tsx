// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from './App'
import { putPassages } from '../data/corpus'
import { db, resetDatabase } from '../data/db'
import { makePassage } from '../data/fixtures'
import { forgetCorpusLoad, rememberCorpusLoaded } from '../data/loadCorpus'
import { listReviewLog } from '../data/reviewLog'
import { confirmSegmentation, listPassageSegments } from '../data/segmentation'
import { getSegmentProgress, putSegmentProgress } from '../data/segmentProgress'
import { forgetAnonymousUserId } from '../data/userId'
import { strings } from '../strings'
import type { PassageRow } from '../data/types'

/**
 * **The chip quiz, driven through the real shell.** Scope 9.1, 9.3, 9.4 and 9.6.
 *
 * CLAUDE.md section 11 names exactly one interaction as needing a component
 * test, and this is it:
 *
 * > **Component tested:** chip cloze only. Chip selection and
 * > match-after-normalisation is the one interaction where a subtle bug looks
 * > like correct behaviour.
 *
 * The bug it exists to catch is a single character. The line says `God,` and the
 * chip says `God`, because a chip carrying the comma would give away where in
 * the line the word belongs. Compare the two raw strings and the reader taps the
 * right word and is told, gently and immediately, that it was the wrong one -
 * with the right one appearing in its place, which is exactly what a correct
 * answer looks like too. Nothing on screen, in any log, or in the stored data
 * distinguishes that from working perfectly.
 *
 * ## The puzzle is arranged rather than guessed
 *
 * Which words a line gives up is seeded on the segment's id, which is a fresh
 * uuid in every test run, so a test cannot name them. So the lines here are
 * built with **exactly one word long enough to take out**: `O my God,` has one
 * word of three letters and two of fewer, and `src/quiz/cloze.ts` will not blank
 * a word shorter than three. The blank is therefore always `God,` and the chip
 * for it always reads `God`.
 *
 * The rules underneath are unit tested without a screen in
 * `src/quiz/cloze.test.ts` and `src/text/normalise.test.ts`.
 */

/** One word of three letters, two below the floor. The blank is always `God,`. */
const ONE_BLANK_LINE = 'O my God,'
/** Five words, two of them long enough, and the same word twice. Two blanks. */
const TWO_BLANK_LINE = 'O my God, my God,'

const prayer = makePassage({ title: 'The Short Obligatory Prayer' })
const long = makePassage({ title: 'Remover of difficulties' })

/** A day well in the past, so anything written with it is overdue. */
const LONG_AGO = '2020-01-01'
/** A day well ahead, so a line written with it is not in today's queue. */
const FAR_OFF = '2099-01-01'

beforeEach(async () => {
  forgetAnonymousUserId()
  forgetCorpusLoad()
  await resetDatabase()
  await putPassages([prayer, long])
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

/** Puts a passage on the list with the given lines, and returns their ids. */
async function addToList(passage: PassageRow, lines: readonly string[]): Promise<string[]> {
  await confirmSegmentation(thisDevice(), passage.id, lines)
  return (await listPassageSegments(passage.id)).map((segment) => segment.id)
}

/**
 * Marks a line as met before, so the ladder serves it above level 1.
 * `repetitions` is what decides the rung (decision D8.2).
 */
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

/** Opens the prayer's work from its row on the Memorise tab. */
async function openWork(title: string): Promise<void> {
  fireEvent.click(await screen.findByRole('link', { name: new RegExp(title) }))
}

function theLine(): HTMLElement {
  return screen.getByLabelText(strings.accessibility.quizLine)
}

function chips(): HTMLElement[] {
  return within(screen.getByLabelText(strings.accessibility.chipBank)).getAllByRole('button')
}

function ratings(): HTMLElement | null {
  return screen.queryByRole('group', { name: strings.accessibility.selfRating })
}

function announced(): string {
  return screen.getByRole('status').textContent ?? ''
}

describe('the door into the ladder', () => {
  it('opens one prayer from its row, and shows its first line of the day', async () => {
    await withList(async () => {
      const [first] = await addToList(prayer, [ONE_BLANK_LINE, 'Praise be to Thee.'])
      await met(first ?? '', 1)
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')

    // Principle 7.10: a surface that shows a passage shows its attribution.
    expect(await screen.findByText("BAHÁ'U'LLÁH · PRAYERS")).toBeDefined()
    // Two lines today: the one that came round, and the one never met, which
    // scope 8.3 mixes in rather than separating into a mode of its own.
    expect(screen.getByText(strings.review.lineOfDay(1, 2))).toBeDefined()
  })

  it('goes back to the tab for a prayer with nothing due today', async () => {
    await withList(async () => {
      const [first] = await addToList(prayer, [ONE_BLANK_LINE])
      await met(first ?? '', 1, FAR_OFF)
    })

    renderApp(`/memorise/review/${prayer.id}`)
    expect(
      await screen.findByRole('heading', { name: strings.screenTitles.memorise }),
    ).toBeDefined()
  })
})

describe('level 1, a line you have not met', () => {
  it('shows the line whole and asks for the rating straight away', async () => {
    await withList(async () => {
      await addToList(prayer, [ONE_BLANK_LINE])
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')

    await waitFor(() => {
      expect(theLine().textContent).toBe(ONE_BLANK_LINE)
    })
    expect(screen.getByText(strings.review.readNew)).toBeDefined()
    expect(screen.queryByLabelText(strings.accessibility.chipBank)).toBeNull()
    expect(ratings()).not.toBeNull()
  })

  it('records the rating against the line and the rung it was served at', async () => {
    let segmentId = ''
    await withList(async () => {
      const [first] = await addToList(prayer, [ONE_BLANK_LINE])
      segmentId = first ?? ''
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')
    fireEvent.click(await screen.findByText(strings.review.ratingGood))

    await waitFor(async () => {
      const log = await listReviewLog(thisDevice())
      expect(log).toHaveLength(1)
      expect(log[0]?.quiz_type).toBe('level1')
      expect(log[0]?.self_rating).toBe('good')
      expect(log[0]?.segment_id).toBe(segmentId)
    })

    // Scope 9.6: the rating is the only input to SM-2, and this is the scheduler
    // having been given it. One correct review, so the line comes back tomorrow.
    const progress = await getSegmentProgress(thisDevice(), segmentId)
    expect(progress?.repetitions).toBe(1)
    expect(progress?.interval_days).toBe(1)
  })
})

describe('levels 2 and 3, the chip cloze', () => {
  async function openCloze(repetitions: number): Promise<void> {
    await withList(async () => {
      const [first] = await addToList(prayer, [
        ONE_BLANK_LINE,
        'the Compassionate, the Merciful.',
        'Praise be to Thee.',
      ])
      await met(first ?? '', repetitions)
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')
    await screen.findByLabelText(strings.accessibility.chipBank)
  }

  it('takes a word out of the line and offers it back as a chip', async () => {
    await openCloze(1)

    expect(theLine().textContent).toBe(`O my ${strings.review.missingWord}`)
    expect(chips().map((chip) => chip.textContent)).toContain('God')
  })

  it('draws the chip without the punctuation the line had', async () => {
    await openCloze(1)

    // A chip reading `God,` would say where in the line the word belongs.
    expect(chips().map((chip) => chip.textContent)).not.toContain('God,')
  })

  it('offers distractors from elsewhere in the same passage', async () => {
    // Scope 9.3: "Distractors come free from other words in the same passage."
    await openCloze(1)

    const elsewhere = 'the Compassionate, the Merciful. Praise be to Thee.'
    const distractors = chips()
      .map((chip) => chip.textContent ?? '')
      .filter((word) => word !== 'God')

    expect(distractors.length).toBeGreaterThan(0)
    for (const word of distractors) expect(elsewhere).toContain(word)
  })

  it('accepts the chip although the line has a comma the chip does not', async () => {
    /**
     * **The test this whole file exists for.** The chip says `God` and the line
     * says `God,`. Matching is `isSameWords`, which normalises both sides
     * (scope 9.7). A comparison of the raw strings would fail here and would
     * look, on screen and in the stored data, exactly like the reader having
     * chosen the wrong word.
     */
    await openCloze(1)

    fireEvent.click(chips().find((chip) => chip.textContent === 'God') as HTMLElement)

    expect(announced()).toBe(strings.review.wordPlaced('God'))
    expect(theLine().textContent).toBe(ONE_BLANK_LINE)
  })

  it('puts the correct word in place when the reader chooses another, and says so calmly', async () => {
    await openCloze(1)

    const wrong = chips().find((chip) => chip.textContent !== 'God') as HTMLElement
    const chosen = wrong.textContent ?? ''
    fireEvent.click(wrong)

    // Principle 7.2: the correct text is always shown after an attempt. The line
    // reads as the corpus wrote it whichever chip was tapped.
    expect(theLine().textContent).toBe(ONE_BLANK_LINE)
    expect(announced()).toBe(strings.review.wordCorrected(chosen, 'God'))
  })

  it('spends the chip that was tapped and the one that was right', async () => {
    // Two words long enough to take out, and they are the same word, so the
    // bank opens with two chips reading `God`. A wrong tap on the first blank
    // must spend one of them: the answer to a blank already filled cannot still
    // be needed, and a chip left in the bank says that it is.
    await withList(async () => {
      const [first] = await addToList(prayer, [TWO_BLANK_LINE, 'Praise be to Thee.'])
      await met(first ?? '', 2)
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')
    await screen.findByLabelText(strings.accessibility.chipBank)

    const usableGods = () =>
      chips().filter((chip) => chip.textContent === 'God' && !chip.hasAttribute('disabled'))
    expect(usableGods()).toHaveLength(2)

    const wrong = chips().find((chip) => chip.textContent !== 'God') as HTMLElement
    fireEvent.click(wrong)

    expect(usableGods()).toHaveLength(1)
    expect(wrong.hasAttribute('disabled')).toBe(true)
  })

  it('loses neither answer when two chips are tapped in the same frame', async () => {
    /**
     * A double tap, or a second finger. Both taps are handled before React
     * re-renders, so a handler written against the state this render saw would
     * aim both at the first blank and overwrite the first answer with the
     * second. Found by clicking twice in one task in a real browser.
     */
    await withList(async () => {
      const [first] = await addToList(prayer, [TWO_BLANK_LINE, 'Praise be to Thee.'])
      await met(first ?? '', 2)
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')
    await screen.findByLabelText(strings.accessibility.chipBank)

    const gods = chips().filter((chip) => chip.textContent === 'God')
    act(() => {
      gods[0]?.click()
      gods[1]?.click()
    })

    expect(theLine().textContent).toBe(TWO_BLANK_LINE)
    expect(ratings()).not.toBeNull()
  })

  it('asks for no rating until every blank is filled', async () => {
    await openCloze(1)

    expect(ratings()).toBeNull()
    fireEvent.click(chips().find((chip) => chip.textContent === 'God') as HTMLElement)
    expect(ratings()).not.toBeNull()
  })

  it('takes more words out at the heavier rung', async () => {
    // Scope 9.1: about 15% blanked at level 2, about 40% at level 3. A line of
    // three words with one eligible gives one blank either way, so the count is
    // asserted on a longer line built for it.
    await withList(async () => {
      const line = 'Blessed is the spot and the house and the place and the city and the heart'
      const [first] = await addToList(long, [line, 'and the mountain and the refuge'])
      await met(first ?? '', 2)
    })

    renderApp()
    await openWork('Remover of difficulties')
    await screen.findByLabelText(strings.accessibility.chipBank)

    // 15 words. 40% is six blanks, and there is a chip for each of them.
    const text = theLine().textContent ?? ''
    const blanks = text.split(strings.review.missingWord).length - 1
    expect(blanks).toBe(6)
  })

  it('records the rung the line was served at', async () => {
    await openCloze(2)

    fireEvent.click(chips().find((chip) => chip.textContent === 'God') as HTMLElement)
    fireEvent.click(screen.getByText(strings.review.ratingHard))

    await waitFor(async () => {
      const log = await listReviewLog(thisDevice())
      expect(log[0]?.quiz_type).toBe('level3')
    })
  })
})

describe('level 4, putting the lines in order', () => {
  const LINES = ['Blessed is the spot,', 'and the house,', 'and the place,', 'and the city.']

  async function openOrdering(): Promise<string[]> {
    let ids: string[] = []
    await withList(async () => {
      ids = await addToList(long, LINES)
      for (const [index, id] of ids.entries()) {
        await met(id, 3, index === ids.length - 1 ? LONG_AGO : FAR_OFF)
      }
    })

    renderApp()
    await openWork('Remover of difficulties')
    await screen.findByRole('list', { name: strings.accessibility.orderLines })
    return ids
  }

  function shownLines(): string[] {
    const list = screen.getByRole('list', { name: strings.accessibility.orderLines })
    return within(list)
      .getAllByRole('listitem')
      .map((row) => row.textContent?.replace(/\s+/g, ' ').trim() ?? '')
  }

  it('shows the lines leading up to the one served, out of order', async () => {
    await openOrdering()

    expect(shownLines()).toHaveLength(4)
    // A puzzle that arrives finished is not a puzzle.
    expect(shownLines()).not.toEqual(LINES)
    expect([...shownLines()].sort()).toEqual([...LINES].sort())
  })

  it('can be moved with the arrow keys, which is session 7 unchanged', async () => {
    await openOrdering()

    const before = shownLines()
    const handles = screen.getAllByRole('button', { name: /Reorder/ })
    fireEvent.keyDown(handles[0] as HTMLElement, { key: 'ArrowDown' })

    expect(shownLines()[1]).toBe(before[0])
  })

  it('shows the order they run in, and takes the handles away', async () => {
    await openOrdering()

    expect(ratings()).toBeNull()
    fireEvent.click(screen.getByText(strings.review.showOrder))

    // Principle 7.2: the correct text is always shown after an attempt.
    expect(shownLines()).toEqual(LINES)
    expect(screen.queryAllByRole('button', { name: /Reorder/ })).toHaveLength(0)
    // Said twice on purpose: once above the lines, and once in the live region
    // for anyone who cannot see them move.
    expect(screen.getAllByText(strings.review.orderRevealed).length).toBeGreaterThan(0)
    expect(announced()).toBe(strings.review.orderRevealed)
    expect(ratings()).not.toBeNull()
  })

  it('records the rung, and only against the line the queue served', async () => {
    const ids = await openOrdering()

    fireEvent.click(screen.getByText(strings.review.showOrder))
    fireEvent.click(screen.getByText(strings.review.ratingGood))

    await waitFor(async () => {
      const log = await listReviewLog(thisDevice())
      expect(log).toHaveLength(1)
      expect(log[0]?.quiz_type).toBe('level4')
      expect(log[0]?.segment_id).toBe(ids[3])
    })
  })
})

describe('a finished line, and a finished day', () => {
  it('goes straight to the next line with nothing said in between', async () => {
    await withList(async () => {
      const ids = await addToList(prayer, [ONE_BLANK_LINE, 'Praise be to Thee.'])
      for (const id of ids) await met(id, 0)
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')

    expect(await screen.findByText(strings.review.lineOfDay(1, 2))).toBeDefined()
    fireEvent.click(screen.getByText(strings.review.ratingGood))

    // No interstitial, no tally, no word of encouragement: principle 7.1, and
    // principle 7.5, which forbids congratulation built out of scripture.
    expect(await screen.findByText(strings.review.lineOfDay(2, 2))).toBeDefined()
  })

  it('returns to the tab when the prayer is done, with its row gone', async () => {
    await withList(async () => {
      const [first] = await addToList(prayer, [ONE_BLANK_LINE])
      await met(first ?? '', 0)
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')
    fireEvent.click(await screen.findByText(strings.review.ratingGood))

    expect(
      await screen.findByRole('heading', { name: strings.screenTitles.memorise }),
    ).toBeDefined()
    // Scope 8.3: "When the queue is done, it is done. No study more prompt."
    expect(await screen.findByText(strings.memorise.done)).toBeDefined()
  })

  it('moves the passage from something you intend to learn to something you are learning', async () => {
    await withList(async () => {
      const [first] = await addToList(prayer, [ONE_BLANK_LINE])
      await met(first ?? '', 0)
    })

    renderApp()
    await openWork('The Short Obligatory Prayer')
    fireEvent.click(await screen.findByText(strings.review.ratingGood))

    await waitFor(async () => {
      const row = await db.user_prayers.where('passage_id').equals(prayer.id).first()
      expect(row?.status).toBe('learning')
    })
  })
})
