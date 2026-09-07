import { beforeEach, describe, expect, it } from 'vitest'
import { addBookmark } from './bookmarks'
import { countAllPassages, putPassages, removePassagesNotIn } from './corpus'
import { db, resetDatabase } from './db'
import { makePassage } from './fixtures'
import { loadCorpusIfNeeded } from './loadCorpus'
import { confirmSegmentation } from './segmentation'

/**
 * The first-run load, against the real committed dataset (scope 4.2). If
 * `npm run fetch:corpus` has not been run yet, `src/data/corpus-data/` is
 * empty and this suite fails on the missing JSON files — that failure is the
 * point: it means the dataset is not actually committed.
 */

beforeEach(async () => {
  await resetDatabase()
  localStorage.removeItem('by-heart.corpus-fingerprint')
})

describe('loadCorpusIfNeeded', () => {
  it('loads the committed prayers, Hidden Words, Gleanings, Prayers and Meditations, and their tags', async () => {
    await loadCorpusIfNeeded()

    const count = await countAllPassages()
    expect(count).toBeGreaterThan(0)
    expect(await db.tags.count()).toBeGreaterThan(0)
    expect(await db.passage_tags.count()).toBeGreaterThan(0)

    const feeds = new Set((await db.passages.toArray()).map((passage) => passage.source_feed))
    expect(feeds).toEqual(
      new Set(['prayers', 'hidden-words', 'gleanings', 'prayers-and-meditations']),
    )
  })

  it('does not double the library when the app opens a second time', async () => {
    await loadCorpusIfNeeded()
    const firstCount = await countAllPassages()

    await loadCorpusIfNeeded()

    expect(await countAllPassages()).toBe(firstCount)
    expect(await db.tags.count()).toBeGreaterThan(0)
  })
})

/**
 * A corpus correction reaching a device that already loaded the old one.
 *
 * Session 5 withdrew a record (decision D5.7) and found that a device which had
 * already opened the app kept it for ever, because the load ran once and never
 * again. These are the tests that stop that being true a second time.
 */
describe('a passage the corpus no longer carries', () => {
  const USER = 'user-1'

  it('is removed from a device that already had it, with everything that pointed at it', async () => {
    const withdrawn = makePassage({ title: 'A record later withdrawn', source_feed: 'prayers' })
    const kept = makePassage({ title: 'A record still committed', source_feed: 'prayers' })
    await putPassages([withdrawn, kept])
    await addBookmark(USER, withdrawn.id)
    await confirmSegmentation(USER, withdrawn.id, ['One line.', 'Two lines.'])

    const removed = await removePassagesNotIn([kept])

    expect(removed).toEqual([withdrawn.id])
    expect(await db.passages.get(withdrawn.id)).toBeUndefined()
    expect(await db.passages.get(kept.id)).toBeDefined()
    expect(await db.passage_segments.where('passage_id').equals(withdrawn.id).count()).toBe(0)
    expect(await db.bookmarks.count()).toBe(0)
    expect(await db.user_prayers.count()).toBe(0)
  })

  it('leaves alone anything from a feed the committed set does not carry', async () => {
    // The personal library of scope 4.4, and the Ruhi collection until session 11
    // commits it: neither is this loader's to withdraw.
    const mine = makePassage({ title: 'Something I added myself', visibility: 'private' })
    const ruhi = makePassage({ title: 'A Ruhi quotation', source_feed: 'ruhi', collection: 'ruhi' })
    const kept = makePassage({ title: 'A committed prayer', source_feed: 'prayers' })
    await putPassages([mine, ruhi, kept])

    expect(await removePassagesNotIn([kept])).toEqual([])
    expect(await countAllPassages()).toBe(3)
  })

  it('empties nothing when the load produced nothing', async () => {
    await loadCorpusIfNeeded()
    const before = await countAllPassages()

    expect(await removePassagesNotIn([])).toEqual([])
    expect(await countAllPassages()).toBe(before)
  })

  // Longer than the default: this loads the whole committed corpus twice, and
  // `fake-indexeddb` is a full implementation rather than a fast one.
  it('reloads when the committed dataset has changed, and not when it has not', async () => {
    await loadCorpusIfNeeded()
    const stray = makePassage({ title: 'Not in the committed corpus', source_feed: 'prayers' })
    await putPassages([stray])

    // The fingerprint still matches, so the load stays out of the way and the
    // stray record survives.
    await loadCorpusIfNeeded()
    expect(await db.passages.get(stray.id)).toBeDefined()

    // A different committed dataset, which is what a corpus correction looks
    // like from here: the load runs again and the stray record goes.
    localStorage.setItem('by-heart.corpus-fingerprint', 'an older dataset')
    await loadCorpusIfNeeded()
    expect(await db.passages.get(stray.id)).toBeUndefined()
  }, 30000)
})
