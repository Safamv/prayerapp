import { beforeEach, describe, expect, it } from 'vitest'
import { db, resetDatabase } from './db'
import { makePassage, makeSegment, makeTag } from './fixtures'

/**
 * The schema itself, round-tripped through a real IndexedDB.
 *
 * `fake-indexeddb` is a full implementation of the specification, not a mock, so
 * a compound index declared in the wrong order fails here exactly as it would on
 * a phone. That is the one class of mistake in this layer that reads perfectly
 * well in review.
 */

beforeEach(async () => {
  await resetDatabase()
})

describe('the schema', () => {
  it('declares every table scope section 10 puts in V0', () => {
    const names = db.tables.map((table) => table.name).sort()
    expect(names).toEqual([
      'bookmarks',
      'passage_segments',
      'passage_tags',
      'passages',
      'review_log',
      'ruhi_books',
      'ruhi_quotations',
      'ruhi_sections',
      'ruhi_units',
      'segment_progress',
      'tags',
      'user_prayers',
      'user_settings',
      'user_stats',
    ])
  })

  it('declares no table the scope tags [v1.0]', () => {
    const names = db.tables.map((table) => table.name)
    expect(names).not.toContain('users')
    expect(names).not.toContain('reading_history')
    expect(names).not.toContain('ingestion_runs')
  })

  it('declares the four ruhi tables and leaves them empty, per decision D1.10', async () => {
    const counts = await Promise.all([
      db.ruhi_books.count(),
      db.ruhi_units.count(),
      db.ruhi_sections.count(),
      db.ruhi_quotations.count(),
    ])
    expect(counts).toEqual([0, 0, 0, 0])
  })

  it('stores a passage with every scope section 10 column intact', async () => {
    const passage = makePassage({ word_count: 91, length_band: 'medium' })
    await db.passages.put(passage)

    const stored = await db.passages.get(passage.id)
    expect(stored).toEqual(passage)
  })

  it('keys passage_tags on the pair, so the same link cannot be written twice', async () => {
    const passage = makePassage()
    const tag = makeTag('Morning')
    await db.passages.put(passage)
    await db.tags.put(tag)
    await db.passage_tags.put({ passage_id: passage.id, tag_id: tag.id })
    await db.passage_tags.put({ passage_id: passage.id, tag_id: tag.id })

    expect(await db.passage_tags.count()).toBe(1)
  })

  it('indexes segments on passage and order together, so they read back in order', async () => {
    const passage = makePassage()
    await db.passage_segments.bulkPut([
      makeSegment(passage.id, 2, 'third'),
      makeSegment(passage.id, 0, 'first'),
      makeSegment(passage.id, 1, 'second'),
    ])

    const inOrder = await db.passage_segments
      .where('[passage_id+order_index]')
      .between([passage.id, -Infinity], [passage.id, Infinity])
      .toArray()

    expect(inOrder.map((segment) => segment.text)).toEqual(['first', 'second', 'third'])
  })

  it('empties every table between tests, so no test inherits another test data', async () => {
    await db.passages.put(makePassage())
    await resetDatabase()
    expect(await db.passages.count()).toBe(0)
  })
})
