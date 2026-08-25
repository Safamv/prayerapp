import { beforeEach, describe, expect, it } from 'vitest'
import { addToList } from './userPrayers'
import { putPassageSegments, putPassages, putPassageTags, putTags } from './corpus'
import { resetDatabase } from './db'
import { makePassage, makeRuhiPassage, makeSegment, makeTag } from './fixtures'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  addPassageToList,
  countDevotionalPassages,
  countDevotionalPassagesByCollection,
  DEVOTIONAL_COLLECTIONS,
  getDevotionalPassage,
  isDevotional,
  isOnList,
  listDevotionalPassages,
  listDevotionalPassagesByCollection,
  listDevotionalPassagesByCollectionAndTag,
  listDevotionalPassagesByTag,
  listSegmentsForDevotionalPassage,
  removePassageFromList,
} from './passages'

/**
 * The devotional surface, and the exclusion that makes it one.
 *
 * The Ruhi tests here are the behavioural half of decision D1.10. The other half
 * is `src/principles/discover-isolation.test.ts`, which stops Discover reaching
 * the Ruhi module at all. This half proves that even the door Discover *is*
 * given cannot hand it a quotation.
 */

const USER = 'user-1'

beforeEach(async () => {
  await resetDatabase()
})

describe('devotional reads', () => {
  it('returns a passage by id', async () => {
    const passage = makePassage({ title: 'Remove not' })
    await putPassages([passage])

    expect(await getDevotionalPassage(passage.id)).toEqual(passage)
  })

  it('returns undefined for an id that is not there', async () => {
    expect(await getDevotionalPassage('nothing')).toBeUndefined()
  })

  it('lists alphabetically by title', async () => {
    await putPassages([
      makePassage({ title: 'Create in me' }),
      makePassage({ title: 'Blessed is the spot' }),
      makePassage({ title: 'O Son of Spirit' }),
    ])

    const titles = (await listDevotionalPassages()).map((passage) => passage.title)
    expect(titles).toEqual(['Blessed is the spot', 'Create in me', 'O Son of Spirit'])
  })

  it('lists by tag', async () => {
    const morning = makeTag('Morning')
    const evening = makeTag('Evening')
    const dawn = makePassage({ title: 'At dawn' })
    const dusk = makePassage({ title: 'At dusk' })
    await putTags([morning, evening])
    await putPassages([dawn, dusk])
    await putPassageTags([
      { passage_id: dawn.id, tag_id: morning.id },
      { passage_id: dusk.id, tag_id: evening.id },
    ])

    const found = await listDevotionalPassagesByTag(morning.id)
    expect(found.map((passage) => passage.title)).toEqual(['At dawn'])
  })

  it('lists by collection', async () => {
    await putPassages([
      makePassage({ title: 'A prayer', collection: 'prayers' }),
      makePassage({ title: 'A hidden word', collection: 'hidden-words' }),
    ])

    const found = await listDevotionalPassagesByCollection('hidden-words')
    expect(found.map((passage) => passage.title)).toEqual(['A hidden word'])
  })

  it('reads a passage segments in order', async () => {
    const passage = makePassage()
    await putPassages([passage])
    await putPassageSegments([
      makeSegment(passage.id, 1, 'and the house'),
      makeSegment(passage.id, 0, 'Blessed is the spot,'),
    ])

    const segments = await listSegmentsForDevotionalPassage(passage.id)
    expect(segments.map((segment) => segment.text)).toEqual([
      'Blessed is the spot,',
      'and the house',
    ])
  })
})

describe('decision D1.10 - Discover never surfaces a Ruhi quotation', () => {
  it('recognises a Ruhi passage by its collection', () => {
    expect(isDevotional(makePassage())).toBe(true)
    expect(isDevotional(makeRuhiPassage())).toBe(false)
  })

  it('never returns one by id, even when the id is correct', async () => {
    const quotation = makeRuhiPassage({ title: 'A quotation' })
    await putPassages([quotation])

    expect(await getDevotionalPassage(quotation.id)).toBeUndefined()
  })

  it('never returns one in the full list', async () => {
    await putPassages([makePassage({ title: 'A prayer' }), makeRuhiPassage({ title: 'AAA first' })])

    const titles = (await listDevotionalPassages()).map((passage) => passage.title)
    expect(titles).toEqual(['A prayer'])
  })

  it('never returns one under a tag it shares with a prayer', async () => {
    const tag = makeTag('Steadfastness')
    const prayer = makePassage({ title: 'A prayer' })
    const quotation = makeRuhiPassage({ title: 'A quotation' })
    await putTags([tag])
    await putPassages([prayer, quotation])
    await putPassageTags([
      { passage_id: prayer.id, tag_id: tag.id },
      { passage_id: quotation.id, tag_id: tag.id },
    ])

    const titles = (await listDevotionalPassagesByTag(tag.id)).map((passage) => passage.title)
    expect(titles).toEqual(['A prayer'])
  })

  it('returns nothing when asked for the Ruhi collection by name', async () => {
    await putPassages([makeRuhiPassage()])
    expect(await listDevotionalPassagesByCollection('ruhi')).toEqual([])
  })

  it('does not count one', async () => {
    await putPassages([makePassage(), makeRuhiPassage(), makeRuhiPassage()])
    expect(await countDevotionalPassages()).toBe(1)
  })

  it('will not read one text through the devotional door', async () => {
    const quotation = makeRuhiPassage()
    await putPassages([quotation])
    await putPassageSegments([makeSegment(quotation.id, 0, 'the text of a quotation')])

    expect(await listSegmentsForDevotionalPassage(quotation.id)).toEqual([])
  })
})

describe('principle 7.6 - isOnList answers a yes or no and nothing more', () => {
  it('is false before the passage is added', async () => {
    const passage = makePassage()
    await putPassages([passage])

    expect(await isOnList(USER, passage.id)).toBe(false)
  })

  it('is true after it is added', async () => {
    const passage = makePassage()
    await putPassages([passage])
    await addToList(USER, passage.id)

    expect(await isOnList(USER, passage.id)).toBe(true)
  })

  it('is false for a different user, because the list is per user', async () => {
    const passage = makePassage()
    await putPassages([passage])
    await addToList('somebody-else', passage.id)

    expect(await isOnList(USER, passage.id)).toBe(false)
  })

  it('returns a boolean rather than a row, so no due date can leak into Discover', async () => {
    const passage = makePassage()
    await putPassages([passage])
    await addToList(USER, passage.id)

    expect(typeof (await isOnList(USER, passage.id))).toBe('boolean')
  })
})

/**
 * The collections, which decision D4.1 turned from a `[v1.0]` idea into the
 * library's first screen.
 */
describe('the collections', () => {
  it('lists them in the order scope 6.1 lists them, and excludes Ruhi', () => {
    expect(DEVOTIONAL_COLLECTIONS).toEqual([
      'prayers',
      'hidden-words',
      'gleanings',
      'prayers-and-meditations',
    ])
    expect(DEVOTIONAL_COLLECTIONS).not.toContain('ruhi')
  })

  it('names every collection the committed corpus actually contains', () => {
    // A fifth feed added to the corpus fails here rather than quietly becoming
    // unreachable, which is the failure this constant exists to prevent.
    const dir = join(import.meta.dirname, 'corpus-data')
    const found = new Set<string>()
    for (const file of [
      'prayers.json',
      'hidden-words.json',
      'gleanings.json',
      'prayers-and-meditations.json',
    ]) {
      for (const row of JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
        collection: string
      }[]) {
        found.add(row.collection)
      }
    }
    expect([...found].sort()).toEqual([...DEVOTIONAL_COLLECTIONS].sort())
  })

  it('counts a collection without reading it', async () => {
    await putPassages([
      makePassage({ collection: 'prayers' }),
      makePassage({ collection: 'prayers' }),
      makePassage({ collection: 'gleanings' }),
      makeRuhiPassage(),
    ])

    expect(await countDevotionalPassagesByCollection('prayers')).toBe(2)
    expect(await countDevotionalPassagesByCollection('gleanings')).toBe(1)
    expect(await countDevotionalPassagesByCollection('ruhi')).toBe(0)
  })
})

describe('listDevotionalPassagesByCollectionAndTag', () => {
  it('returns only the passages of that collection carrying that tag', async () => {
    const tag = makeTag('Healing')
    const prayer = makePassage({ title: 'A prayer', collection: 'prayers' })
    const gleaning = makePassage({ title: 'A gleaning', collection: 'gleanings' })
    await putTags([tag])
    await putPassages([prayer, gleaning])
    await putPassageTags([
      { passage_id: prayer.id, tag_id: tag.id },
      { passage_id: gleaning.id, tag_id: tag.id },
    ])

    const found = await listDevotionalPassagesByCollectionAndTag('prayers', tag.id)
    expect(found.map((row) => row.title)).toEqual(['A prayer'])
  })

  it('returns nothing for the Ruhi collection, however it is asked', async () => {
    const tag = makeTag('Healing')
    const quotation = makeRuhiPassage()
    await putTags([tag])
    await putPassages([quotation])
    await putPassageTags([{ passage_id: quotation.id, tag_id: tag.id }])

    expect(await listDevotionalPassagesByCollectionAndTag('ruhi', tag.id)).toEqual([])
  })
})

describe('addPassageToList and removePassageFromList', () => {
  it('adds, and reports nothing that could become chrome on a reading screen', async () => {
    const passage = makePassage()
    await putPassages([passage])

    const result = await addPassageToList('user-1', passage.id)

    expect(result).toBeUndefined()
    expect(await isOnList('user-1', passage.id)).toBe(true)
  })

  it('adds once however many times it is called', async () => {
    const passage = makePassage()
    await putPassages([passage])

    await addPassageToList('user-1', passage.id)
    await addPassageToList('user-1', passage.id)

    expect(await isOnList('user-1', passage.id)).toBe(true)
  })

  it("undoes an add, and leaves another device's list alone", async () => {
    const passage = makePassage()
    await putPassages([passage])
    await addPassageToList('user-1', passage.id)
    await addPassageToList('user-2', passage.id)

    await removePassageFromList('user-1', passage.id)

    expect(await isOnList('user-1', passage.id)).toBe(false)
    expect(await isOnList('user-2', passage.id)).toBe(true)
  })
})
