import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCorpus,
  countAllPassages,
  findPassageBySource,
  putPassages,
  putPassageSegments,
  putPassageTags,
  putTags,
} from './corpus'
import { db, resetDatabase } from './db'
import { makePassage, makeSegment, makeTag } from './fixtures'

/**
 * Ingestion. Scope 4.2: the corpus is a committed dataset loaded once, and
 * re-running the load must upsert rather than duplicate, because a corrected
 * translation has to replace the old text rather than appear beside it.
 */

beforeEach(async () => {
  await resetDatabase()
})

describe('loading the corpus', () => {
  it('writes passages, segments, tags and links', async () => {
    const passage = makePassage()
    const tag = makeTag('Morning')
    await putPassages([passage])
    await putPassageSegments([makeSegment(passage.id, 0)])
    await putTags([tag])
    await putPassageTags([{ passage_id: passage.id, tag_id: tag.id }])

    expect(await countAllPassages()).toBe(1)
    expect(await db.passage_segments.count()).toBe(1)
    expect(await db.tags.count()).toBe(1)
    expect(await db.passage_tags.count()).toBe(1)
  })

  it('is idempotent, so running the load twice leaves one copy', async () => {
    const passage = makePassage()
    await putPassages([passage])
    await putPassages([passage])

    expect(await countAllPassages()).toBe(1)
  })

  it('replaces the text when a translation is corrected', async () => {
    const passage = makePassage({ first_line: 'the old translation' })
    await putPassages([passage])
    await putPassages([{ ...passage, first_line: 'the newer translation' }])

    const stored = await findPassageBySource(passage.source_feed, passage.source_id)
    expect(stored?.first_line).toBe('the newer translation')
    expect(await countAllPassages()).toBe(1)
  })

  it('finds a row again by its feed and source id, which is what makes that possible', async () => {
    const passage = makePassage({ source_feed: 'gleanings', source_id: 'g-118' })
    await putPassages([passage])

    expect((await findPassageBySource('gleanings', 'g-118'))?.id).toBe(passage.id)
  })

  it('does not confuse the same source id in two different feeds', async () => {
    const prayer = makePassage({ source_feed: 'prayers', source_id: '7', title: 'A prayer' })
    const gleaning = makePassage({ source_feed: 'gleanings', source_id: '7', title: 'A gleaning' })
    await putPassages([prayer, gleaning])

    expect((await findPassageBySource('prayers', '7'))?.title).toBe('A prayer')
    expect((await findPassageBySource('gleanings', '7'))?.title).toBe('A gleaning')
  })

  it('returns undefined for a source id that was never loaded', async () => {
    expect(await findPassageBySource('prayers', 'never')).toBeUndefined()
  })

  it('clears the corpus without touching what the user owns', async () => {
    const passage = makePassage()
    await putPassages([passage])
    await db.bookmarks.put({
      id: 'b1',
      user_id: 'user-1',
      passage_id: passage.id,
      created_at: '2026-08-24T00:00:00.000Z',
    })

    await clearCorpus()

    expect(await countAllPassages()).toBe(0)
    expect(await db.bookmarks.count()).toBe(1)
  })
})
