import { beforeEach, describe, expect, it } from 'vitest'
import { putPassages } from './corpus'
import { getTodaysQueue, readQueueInput } from './dailyQueue'
import { resetDatabase } from './db'
import { makePassage } from './fixtures'
import { confirmSegmentation, listPassageSegments } from './segmentation'
import { putSegmentProgress } from './segmentProgress'
import { setUpkeepState, startFocus } from './upkeep'
import { updateUserSettings } from './userSettings'
import type { PassageRow } from './types'

/**
 * Today's queue, read out of a real database.
 *
 * The rules are unit tested next door in `src/queue/`, against plain values and
 * no database at all. What this suite is for is the join: that a confirmed
 * passage's lines are found, that the progress against them is matched to the
 * right line, that the caps come from `user_settings` rather than from a
 * constant, and that a passage the queue names can still be drawn.
 */

const USER = 'user-1'
const TODAY = '2026-09-07'

async function addWithLines(passage: PassageRow, lines: number): Promise<string[]> {
  await putPassages([passage])
  await confirmSegmentation(
    USER,
    passage.id,
    Array.from({ length: lines }, (_, index) => `Line ${String(index + 1)}`),
  )
  const segments = await listPassageSegments(passage.id)
  return segments.map((segment) => segment.id)
}

const state = (dueDate: string) => ({
  ease_factor: 2.5,
  interval_days: 6,
  repetitions: 2,
  due_date: dueDate,
  last_reviewed_at: '2026-09-01',
  lapses: 0,
})

beforeEach(async () => {
  await resetDatabase()
})

describe('reading what the queue needs', () => {
  it('takes the caps from the user settings rather than from a constant', async () => {
    await updateUserSettings(USER, { daily_review_limit: 7, daily_new_limit: 4 })
    const input = await readQueueInput(USER, TODAY)
    expect(input.caps).toEqual({ reviews: 7, new: 4 })
  })

  it('falls back to the scope defaults for a user who has changed nothing', async () => {
    const input = await readQueueInput(USER, TODAY)
    expect(input.caps).toEqual({ reviews: 15, new: 2 })
  })

  it('finds the lines under a confirmed passage, in order', async () => {
    const passage = makePassage({ title: 'Blessed is the spot' })
    await addWithLines(passage, 3)

    const input = await readQueueInput(USER, TODAY)
    expect(input.passages).toHaveLength(1)
    expect(input.passages[0]?.segments.map((segment) => segment.orderIndex)).toEqual([0, 1, 2])
    expect(input.passages[0]?.segments.every((segment) => segment.progress === null)).toBe(true)
  })

  it('matches stored progress to the line it belongs to', async () => {
    const passage = makePassage()
    const [, second] = await addWithLines(passage, 3)
    await putSegmentProgress(USER, second ?? '', state('2026-08-01'))

    const input = await readQueueInput(USER, TODAY)
    const segments = input.passages[0]?.segments ?? []
    expect(segments[0]?.progress).toBeNull()
    expect(segments[1]?.progress?.dueDate).toBe('2026-08-01')
    expect(segments[2]?.progress).toBeNull()
  })
})

describe("today's queue", () => {
  it('is empty, and says the list is empty, for a user who has added nothing', async () => {
    const queue = await getTodaysQueue(USER, TODAY)
    expect(queue.items).toEqual([])
    expect(queue.passages).toEqual([])
    expect(queue.listIsEmpty).toBe(true)
  })

  it('starts the first lines of a passage just added', async () => {
    const passage = makePassage({ title: 'Blessed is the spot' })
    await addWithLines(passage, 5)

    const queue = await getTodaysQueue(USER, TODAY)
    expect(queue.items).toHaveLength(2)
    expect(queue.items.every((item) => item.kind === 'new')).toBe(true)
    expect(queue.listIsEmpty).toBe(false)
  })

  it('gathers the lines under the passage they belong to, with a count', async () => {
    const first = makePassage({ title: 'Blessed is the spot' })
    const second = makePassage({ title: 'Remover of difficulties' })
    const firstLines = await addWithLines(first, 3)
    const secondLines = await addWithLines(second, 2)
    for (const id of [...firstLines, ...secondLines]) {
      await putSegmentProgress(USER, id, state('2026-09-01'))
    }

    const queue = await getTodaysQueue(USER, TODAY)
    expect(queue.passages.map((entry) => [entry.passage.title, entry.lineCount])).toEqual([
      ['Blessed is the spot', 3],
      ['Remover of difficulties', 2],
    ])
  })

  it('holds no count of what the cap left out, anywhere in what it returns', async () => {
    // Principle 7.3. There is no field for it, and this is the test that says so
    // to a session that has forgotten why.
    const passage = makePassage()
    const lines = await addWithLines(passage, 40)
    for (const id of lines) await putSegmentProgress(USER, id, state('2026-07-01'))

    const queue = await getTodaysQueue(USER, TODAY)
    expect(queue.items).toHaveLength(15)
    expect(Object.keys(queue).sort()).toEqual(['items', 'listIsEmpty', 'passages'])
  })

  it('shows nothing for a resting passage, and does not pretend the list is empty', async () => {
    const passage = makePassage()
    await addWithLines(passage, 3)
    await setUpkeepState(USER, passage.id, 'resting')

    const queue = await getTodaysQueue(USER, TODAY)
    expect(queue.items).toEqual([])
    expect(queue.listIsEmpty).toBe(false)
  })

  it('suppresses everything but the focused passage while focus is in force', async () => {
    const kept = makePassage({ title: 'Remover of difficulties' })
    const paused = makePassage({ title: 'Blessed is the spot' })
    await addWithLines(paused, 3)
    await addWithLines(kept, 3)
    await startFocus(USER, kept.id, TODAY)

    const queue = await getTodaysQueue(USER, TODAY)
    expect(queue.passages.map((entry) => entry.passage.title)).toEqual(['Remover of difficulties'])
  })

  it('leaves out a passage the corpus has withdrawn rather than naming a title it cannot read', async () => {
    // Decision D5.9 already takes the list row with the record. This is the
    // belt to that brace: a queue that named a passage it cannot draw would
    // render a blank row.
    const passage = makePassage()
    const lines = await addWithLines(passage, 2)
    for (const id of lines) await putSegmentProgress(USER, id, state('2026-09-01'))
    const { db } = await import('./db')
    await db.passages.delete(passage.id)

    const queue = await getTodaysQueue(USER, TODAY)
    expect(queue.passages).toEqual([])
  })
})
