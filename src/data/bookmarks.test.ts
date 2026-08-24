import { beforeEach, describe, expect, it } from 'vitest'
import { addBookmark, getBookmark, isBookmarked, listBookmarks, removeBookmark } from './bookmarks'
import { resetDatabase } from './db'

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
