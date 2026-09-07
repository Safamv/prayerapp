import { beforeEach, describe, expect, it } from 'vitest'
import {
  addBookmark,
  getBookmark,
  isBookmarked,
  listBookmarkedPassages,
  listBookmarks,
  removeBookmark,
  reorderBookmarks,
} from './bookmarks'
import { putPassages } from './corpus'
import { db, resetDatabase } from './db'
import { makePassage, makeRuhiPassage } from './fixtures'

/**
 * Bookmarks. Scope 14 lists "Bookmark, and separately Add to my list" as two
 * distinct actions, so these tests check that they stay separate: a bookmark
 * carries no memorisation state and belongs to exactly one user.
 */

const USER = 'user-1'
const OTHER = 'user-2'

beforeEach(async () => {
  await resetDatabase()
})

describe('bookmarks', () => {
  it('adds one and reads it back', async () => {
    await addBookmark(USER, 'passage-1', '2026-08-24T06:00:00.000Z')

    const stored = await getBookmark(USER, 'passage-1')
    expect(stored?.user_id).toBe(USER)
    expect(stored?.passage_id).toBe('passage-1')
    expect(stored?.created_at).toBe('2026-08-24T06:00:00.000Z')
  })

  it('is idempotent, so bookmarking twice keeps the original moment', async () => {
    const first = await addBookmark(USER, 'passage-1', '2026-08-24T06:00:00.000Z')
    const second = await addBookmark(USER, 'passage-1', '2026-08-25T06:00:00.000Z')

    expect(second).toEqual(first)
    expect(await listBookmarks(USER)).toHaveLength(1)
  })

  it('removes one', async () => {
    await addBookmark(USER, 'passage-1')
    await removeBookmark(USER, 'passage-1')

    expect(await isBookmarked(USER, 'passage-1')).toBe(false)
  })

  it('removing one that is not there is not an error', async () => {
    await expect(removeBookmark(USER, 'never-bookmarked')).resolves.toBeUndefined()
  })

  it('answers whether a passage is bookmarked', async () => {
    await addBookmark(USER, 'passage-1')

    expect(await isBookmarked(USER, 'passage-1')).toBe(true)
    expect(await isBookmarked(USER, 'passage-2')).toBe(false)
  })

  it('keeps one user bookmarks out of another list', async () => {
    await addBookmark(USER, 'passage-1')
    await addBookmark(OTHER, 'passage-2')

    expect(await isBookmarked(USER, 'passage-2')).toBe(false)
    expect((await listBookmarks(OTHER)).map((row) => row.passage_id)).toEqual(['passage-2'])
  })

  it('lists newest first', async () => {
    await addBookmark(USER, 'first', '2026-08-20T00:00:00.000Z')
    await addBookmark(USER, 'second', '2026-08-22T00:00:00.000Z')
    await addBookmark(USER, 'third', '2026-08-21T00:00:00.000Z')

    expect((await listBookmarks(USER)).map((row) => row.passage_id)).toEqual([
      'second',
      'third',
      'first',
    ])
  })
})

/**
 * `sort_order` (scope 6.7, 18.30). Written from the first bookmark, read by
 * nothing until session 7 builds the screen that lets a user drag them.
 */
describe('the hand-arranged order', () => {
  it('puts each new bookmark at the end, so keeping a place moves nothing', async () => {
    const first = await addBookmark('user-1', 'passage-1')
    const second = await addBookmark('user-1', 'passage-2')
    const third = await addBookmark('user-1', 'passage-3')

    expect([first.sort_order, second.sort_order, third.sort_order]).toEqual([0, 1, 2])
  })

  it('counts each device separately, as every user table does', async () => {
    await addBookmark('user-1', 'passage-1')
    await addBookmark('user-1', 'passage-2')
    const other = await addBookmark('user-2', 'passage-1')

    expect(other.sort_order).toBe(0)
  })

  it('does not renumber when a bookmark in the middle is removed', async () => {
    await addBookmark('user-1', 'passage-1')
    await addBookmark('user-1', 'passage-2')
    await removeBookmark('user-1', 'passage-1')

    // The gap is harmless: the order is read by sorting, not by counting. What
    // would not be harmless is a renumber racing a drag on the same screen.
    const remaining = await getBookmark('user-1', 'passage-2')
    expect(remaining?.sort_order).toBe(1)
  })

  it('never reuses an order already taken, even after a removal', async () => {
    await addBookmark('user-1', 'passage-1')
    await addBookmark('user-1', 'passage-2')
    await removeBookmark('user-1', 'passage-1')
    const next = await addBookmark('user-1', 'passage-3')

    expect(next.sort_order).toBe(2)
  })
})

describe('reading the screen of scope 6.7', () => {
  const first = makePassage({ title: 'Apex' })
  const second = makePassage({ title: 'Middle' })
  const third = makePassage({ title: 'Zenith' })

  beforeEach(async () => {
    await putPassages([first, second, third])
  })

  it('reads bookmarks back in the hand order, not the order they were made', async () => {
    await addBookmark(USER, first.id)
    await addBookmark(USER, second.id)
    await addBookmark(USER, third.id)
    await reorderBookmarks(USER, [third.id, first.id, second.id])

    const shown = await listBookmarkedPassages(USER)
    expect(shown.map((entry) => entry.passage.title)).toEqual(['Zenith', 'Apex', 'Middle'])
  })

  it('carries the passage beside each bookmark, so a row can be drawn from one read', async () => {
    await addBookmark(USER, first.id)

    const [only] = await listBookmarkedPassages(USER)
    expect(only?.passage.title).toBe('Apex')
    expect(only?.bookmark.passage_id).toBe(first.id)
  })

  it('drops a bookmark whose passage has left the corpus, rather than showing a gap', async () => {
    // Decision D5.9: a withdrawn record is removed from a device that had it,
    // and this is the belt to that brace.
    await addBookmark(USER, first.id)
    await addBookmark(USER, 'a-passage-that-was-withdrawn')

    const shown = await listBookmarkedPassages(USER)
    expect(shown).toHaveLength(1)
  })

  it('never returns a Ruhi quotation, because the read goes through the devotional door', async () => {
    // Decision D1.10. A Ruhi passage cannot be bookmarked from anywhere in the
    // app today, and if it ever could this read still would not surface it.
    const ruhi = makeRuhiPassage({ title: 'A quotation to memorise' })
    await putPassages([ruhi])
    await addBookmark(USER, ruhi.id)
    await addBookmark(USER, first.id)

    const shown = await listBookmarkedPassages(USER)
    expect(shown.map((entry) => entry.passage.title)).toEqual(['Apex'])
  })

  it('draws one row per passage even if the table somehow holds two', async () => {
    // `addBookmark` cannot make a second row for the same passage, and nothing in
    // the app can. v1.0 sync merging two devices could, and a screen with two
    // rows for one prayer would have two rows with one identity: the one you
    // dragged would not be the one that moved.
    await addBookmark(USER, first.id)
    await db.bookmarks.put({
      id: 'a-second-row-for-the-same-passage',
      user_id: USER,
      passage_id: first.id,
      created_at: '2026-01-01T00:00:00.000Z',
      sort_order: 9,
    })

    const shown = await listBookmarkedPassages(USER)
    expect(shown).toHaveLength(1)
    // The earliest place in the arrangement wins: it is the one the user put there.
    expect(shown[0]?.bookmark.sort_order).toBe(0)
  })

  it('reads only this user\u2019s bookmarks', async () => {
    await addBookmark(USER, first.id)
    await addBookmark(OTHER, second.id)

    expect(await listBookmarkedPassages(USER)).toHaveLength(1)
  })
})

describe('reordering, scope 6.7', () => {
  const first = makePassage({ title: 'Apex' })
  const second = makePassage({ title: 'Middle' })
  const third = makePassage({ title: 'Zenith' })

  beforeEach(async () => {
    await putPassages([first, second, third])
    await addBookmark(USER, first.id)
    await addBookmark(USER, second.id)
    await addBookmark(USER, third.id)
  })

  it('writes the given sequence into sort_order', async () => {
    await reorderBookmarks(USER, [third.id, second.id, first.id])

    expect((await getBookmark(USER, third.id))?.sort_order).toBe(0)
    expect((await getBookmark(USER, second.id))?.sort_order).toBe(1)
    expect((await getBookmark(USER, first.id))?.sort_order).toBe(2)
  })

  it('keeps bookmarks that were not named, in their relative order, behind', async () => {
    // A filtered screen is the case: a drag there names only what is on screen,
    // and the rows behind the filter must not be shuffled by it. `reorderList`
    // behaves identically, because scope 6.7 governs both.
    await reorderBookmarks(USER, [third.id])

    expect((await getBookmark(USER, third.id))?.sort_order).toBe(0)
    expect((await getBookmark(USER, first.id))?.sort_order).toBe(1)
    expect((await getBookmark(USER, second.id))?.sort_order).toBe(2)
  })

  it('leaves another user\u2019s arrangement alone', async () => {
    await addBookmark(OTHER, first.id)
    await reorderBookmarks(USER, [third.id, second.id, first.id])

    expect((await getBookmark(OTHER, first.id))?.sort_order).toBe(0)
  })

  it('ignores a passage id that is not bookmarked', async () => {
    await reorderBookmarks(USER, [second.id, 'not-bookmarked', first.id])

    expect((await getBookmark(USER, second.id))?.sort_order).toBe(0)
    expect(await listBookmarks(USER)).toHaveLength(3)
  })
})
