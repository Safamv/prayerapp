import { beforeEach, describe, expect, it } from 'vitest'
import { putPassages, putPassageTags, putTags } from './corpus'
import { resetDatabase } from './db'
import { makePassage, makeRuhiPassage, makeTag } from './fixtures'
import { getTag, listDevotionalTagsWithCounts, listTagIdsForPassage, listTags } from './tags'

/**
 * Tags, which are the app's categories. Scope 6.1's browse is alphabetical with
 * counts, and the counts have to honour decision D1.10 as well: a category
 * showing 3 that opens onto 2 prayers would be the Ruhi exclusion leaking
 * through the arithmetic.
 */

beforeEach(async () => {
  await resetDatabase()
})

describe('tags', () => {
  it('lists alphabetically', async () => {
    await putTags([makeTag('Protection'), makeTag('Assistance'), makeTag('Morning')])

    expect((await listTags()).map((tag) => tag.name)).toEqual([
      'Assistance',
      'Morning',
      'Protection',
    ])
  })

  it('returns a tag by id, and undefined for one that is not there', async () => {
    const tag = makeTag('Healing')
    await putTags([tag])

    expect((await getTag(tag.id))?.name).toBe('Healing')
    expect(await getTag('nothing')).toBeUndefined()
  })

  it('counts the passages under each tag', async () => {
    const morning = makeTag('Morning')
    const evening = makeTag('Evening')
    const first = makePassage()
    const second = makePassage()
    await putTags([morning, evening])
    await putPassages([first, second])
    await putPassageTags([
      { passage_id: first.id, tag_id: morning.id },
      { passage_id: second.id, tag_id: morning.id },
    ])

    const counts = await listDevotionalTagsWithCounts()
    expect(counts.map((entry) => [entry.tag.name, entry.count])).toEqual([
      ['Evening', 0],
      ['Morning', 2],
    ])
  })

  it('does not count a Ruhi quotation towards a category, per decision D1.10', async () => {
    const tag = makeTag('Steadfastness')
    const prayer = makePassage()
    const quotation = makeRuhiPassage()
    await putTags([tag])
    await putPassages([prayer, quotation])
    await putPassageTags([
      { passage_id: prayer.id, tag_id: tag.id },
      { passage_id: quotation.id, tag_id: tag.id },
    ])

    expect((await listDevotionalTagsWithCounts())[0]?.count).toBe(1)
  })

  it('lists the tags on a passage', async () => {
    const morning = makeTag('Morning')
    const healing = makeTag('Healing')
    const passage = makePassage()
    await putTags([morning, healing])
    await putPassages([passage])
    await putPassageTags([
      { passage_id: passage.id, tag_id: morning.id },
      { passage_id: passage.id, tag_id: healing.id },
    ])

    const found = await listTagIdsForPassage(passage.id)
    expect(found.sort()).toEqual([healing.id, morning.id].sort())
  })
})
