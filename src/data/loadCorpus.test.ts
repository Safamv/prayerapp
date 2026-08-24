import { beforeEach, describe, expect, it } from 'vitest'
import { countAllPassages } from './corpus'
import { db, resetDatabase } from './db'
import { loadCorpusIfNeeded } from './loadCorpus'

/**
 * The first-run load, against the real committed dataset (scope 4.2). If
 * `npm run fetch:corpus` has not been run yet, `src/data/corpus-data/` is
 * empty and this suite fails on the missing JSON files — that failure is the
 * point: it means the dataset is not actually committed.
 */

beforeEach(async () => {
  await resetDatabase()
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
