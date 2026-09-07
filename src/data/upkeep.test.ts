import { beforeEach, describe, expect, it } from 'vitest'
import { putPassages } from './corpus'
import { resetDatabase } from './db'
import { makePassage } from './fixtures'
import { confirmSegmentation } from './segmentation'
import {
  endFocus,
  getListedPassage,
  listFocusedPassages,
  listPassagesOnList,
  releaseExpiredFocus,
  setUpkeepState,
  startFocus,
} from './upkeep'
import type { PassageRow } from './types'

/**
 * Upkeep and focus, as writes against `user_prayers`. Scope 8.5 and 8.6.
 *
 * The rules about what they mean for the queue are tested in `src/queue/`. What
 * matters here is that exactly three columns move, that focus always gets an end
 * date, and that an expired focus releases and says which passages it released,
 * because scope 8.6 requires the user to be told.
 */

const USER = 'user-1'
const TODAY = '2026-09-07'

async function add(passage: PassageRow, lines = 2): Promise<PassageRow> {
  await putPassages([passage])
  await confirmSegmentation(
    USER,
    passage.id,
    Array.from({ length: lines }, (_, index) => `Line ${String(index + 1)}`),
  )
  return passage
}

beforeEach(async () => {
  await resetDatabase()
})

describe('the list, with what is known about each passage', () => {
  it('comes back in the order the user arranged it', async () => {
    const first = await add(makePassage({ title: 'Blessed is the spot' }))
    const second = await add(makePassage({ title: 'Remover of difficulties' }))

    const listed = await listPassagesOnList(USER)
    expect(listed.map((entry) => entry.passage.id)).toEqual([first.id, second.id])
    expect(listed[0]?.userPrayer.upkeep_state).toBe('active')
  })

  it('is empty for a user who has added nothing', async () => {
    expect(await listPassagesOnList(USER)).toEqual([])
  })

  it('leaves out a row whose passage the corpus has withdrawn', async () => {
    const passage = await add(makePassage())
    const { db } = await import('./db')
    await db.passages.delete(passage.id)
    expect(await listPassagesOnList(USER)).toEqual([])
  })

  it('reads one passage on its own', async () => {
    const passage = await add(makePassage({ title: 'Blessed is the spot' }))
    const listed = await getListedPassage(USER, passage.id)
    expect(listed?.passage.title).toBe('Blessed is the spot')
    expect(await getListedPassage(USER, 'not-on-the-list')).toBeUndefined()
  })
})

describe('upkeep, scope 8.5', () => {
  it('starts active, which is the default the scope names', async () => {
    const passage = await add(makePassage())
    const listed = await getListedPassage(USER, passage.id)
    expect(listed?.userPrayer.upkeep_state).toBe('active')
  })

  it('moves a passage to occasional and back without touching anything else', async () => {
    const passage = await add(makePassage())
    const before = await getListedPassage(USER, passage.id)

    await setUpkeepState(USER, passage.id, 'occasional')
    const during = await getListedPassage(USER, passage.id)
    expect(during?.userPrayer.upkeep_state).toBe('occasional')
    // Decision D1.1: the multiplier is applied to a date and never stored, so
    // moving between states can lose nothing. Every other column stands still.
    expect({ ...during?.userPrayer, upkeep_state: 'active' }).toEqual(before?.userPrayer)

    await setUpkeepState(USER, passage.id, 'active')
    expect((await getListedPassage(USER, passage.id))?.userPrayer).toEqual(before?.userPrayer)
  })

  it('puts a passage to rest', async () => {
    const passage = await add(makePassage())
    await setUpkeepState(USER, passage.id, 'resting')
    expect((await getListedPassage(USER, passage.id))?.userPrayer.upkeep_state).toBe('resting')
  })

  it('does nothing at all for a passage that is not on the list', async () => {
    await expect(setUpkeepState(USER, 'not-on-the-list', 'resting')).resolves.toBeUndefined()
  })
})

describe('focus, scope 8.6', () => {
  it('defaults to seven days, and the date is the day it lifts', async () => {
    const passage = await add(makePassage())
    await startFocus(USER, passage.id, TODAY)

    const listed = await getListedPassage(USER, passage.id)
    expect(listed?.userPrayer.is_focus).toBe(true)
    expect(listed?.userPrayer.focus_until).toBe('2026-09-14')
  })

  it('takes a count of days the user set', async () => {
    const passage = await add(makePassage())
    await startFocus(USER, passage.id, TODAY, 3)
    expect((await getListedPassage(USER, passage.id))?.userPrayer.focus_until).toBe('2026-09-10')
  })

  it('measures a changed count from today rather than adding it to what was there', async () => {
    const passage = await add(makePassage())
    await startFocus(USER, passage.id, TODAY, 7)
    await startFocus(USER, passage.id, TODAY, 10)
    expect((await getListedPassage(USER, passage.id))?.userPrayer.focus_until).toBe('2026-09-17')
  })

  it('keeps a count outside the range inside it', async () => {
    const passage = await add(makePassage())
    await startFocus(USER, passage.id, TODAY, 400)
    expect((await getListedPassage(USER, passage.id))?.userPrayer.focus_until).toBe('2026-10-07')
  })

  it('ends early when the user says so, and clears the date with it', async () => {
    const passage = await add(makePassage())
    await startFocus(USER, passage.id, TODAY)
    await endFocus(USER, passage.id)

    const listed = await getListedPassage(USER, passage.id)
    expect(listed?.userPrayer.is_focus).toBe(false)
    expect(listed?.userPrayer.focus_until).toBeNull()
  })

  it('names what focus is in force on today', async () => {
    const kept = await add(makePassage({ title: 'Remover of difficulties' }))
    await add(makePassage({ title: 'Blessed is the spot' }))
    await startFocus(USER, kept.id, TODAY)

    const focused = await listFocusedPassages(USER, TODAY)
    expect(focused.map((entry) => entry.passage.title)).toEqual(['Remover of difficulties'])
  })

  it('names nothing once the day it lifts has come, even before anything is written', async () => {
    const passage = await add(makePassage())
    await startFocus(USER, passage.id, TODAY)
    expect(await listFocusedPassages(USER, '2026-09-14')).toEqual([])
  })
})

describe('the automatic release, scope 8.6', () => {
  it('releases a focus whose day has come, and says which passage it was', async () => {
    const passage = await add(makePassage({ title: 'Blessed is the spot' }))
    await startFocus(USER, passage.id, TODAY)

    const released = await releaseExpiredFocus(USER, '2026-09-14')
    expect(released.map((row) => row.title)).toEqual(['Blessed is the spot'])

    const listed = await getListedPassage(USER, passage.id)
    expect(listed?.userPrayer.is_focus).toBe(false)
    expect(listed?.userPrayer.focus_until).toBeNull()
  })

  it('releases nothing while focus is still in force', async () => {
    const passage = await add(makePassage())
    await startFocus(USER, passage.id, TODAY)
    expect(await releaseExpiredFocus(USER, '2026-09-13')).toEqual([])
    expect((await getListedPassage(USER, passage.id))?.userPrayer.is_focus).toBe(true)
  })

  it('says nothing on the second open, so the user is told once', async () => {
    const passage = await add(makePassage())
    await startFocus(USER, passage.id, TODAY)
    expect(await releaseExpiredFocus(USER, '2026-09-20')).toHaveLength(1)
    expect(await releaseExpiredFocus(USER, '2026-09-20')).toEqual([])
  })

  it('releases every expired focus at once, four months late', async () => {
    // The failure scope 8.6 names: the meeting was postponed and the app was
    // not opened again until January.
    const first = await add(makePassage({ title: 'Blessed is the spot' }))
    const second = await add(makePassage({ title: 'Remover of difficulties' }))
    await startFocus(USER, first.id, TODAY)
    await startFocus(USER, second.id, TODAY)

    const released = await releaseExpiredFocus(USER, '2027-01-14')
    expect(released.map((row) => row.title).sort()).toEqual([
      'Blessed is the spot',
      'Remover of difficulties',
    ])
  })

  it('costs nothing for a user who has never used focus', async () => {
    await add(makePassage())
    expect(await releaseExpiredFocus(USER, TODAY)).toEqual([])
  })
})
