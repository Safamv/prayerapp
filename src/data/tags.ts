import { db } from './db'
import { isDevotional } from './passages'
import type { TagRow } from './types'

/** A tag together with how many devotional passages carry it. */
export interface TagWithCount {
  readonly tag: TagRow
  readonly count: number
}

/**
 * Tags, which are the app's categories (scope 4.1).
 *
 * `listDevotionalTagsWithCounts` is the devotional surface's read and excludes
 * Ruhi passages from the counts for the same reason `passages.ts` excludes them
 * from the lists (D1.10). A count of 41 that becomes 38 when you open the
 * category would be the exclusion leaking through the arithmetic.
 *
 * Session 4 builds the alphabetical category browse of scope 6.1 on top of this.
 */

export async function listTags(): Promise<TagRow[]> {
  const rows = await db.tags.toArray()
  return rows.sort((a, b) => a.name.localeCompare(b.name, 'en-AU'))
}

export async function getTag(id: string): Promise<TagRow | undefined> {
  return db.tags.get(id)
}

export async function listDevotionalTagsWithCounts(): Promise<TagWithCount[]> {
  const [tags, links, passages] = await Promise.all([
    listTags(),
    db.passage_tags.toArray(),
    db.passages.toArray(),
  ])

  const devotionalIds = new Set(passages.filter(isDevotional).map((passage) => passage.id))
  const counts = new Map<string, number>()
  for (const link of links) {
    if (!devotionalIds.has(link.passage_id)) continue
    counts.set(link.tag_id, (counts.get(link.tag_id) ?? 0) + 1)
  }

  return tags.map((tag) => ({ tag, count: counts.get(tag.id) ?? 0 }))
}

/**
 * The categories within one collection, with how many of that collection's
 * passages carry each. Categories with none are left out entirely.
 *
 * This is what makes the browse a hierarchy rather than two flat lists. Today
 * every tag belongs to a prayer, so `prayers` returns all 63 and the other three
 * collections return none - which is exactly how the collection screen knows to
 * show passages instead of categories, without anything being hard-coded about
 * which collection is which.
 */
export async function listDevotionalTagsWithCountsForCollection(
  collection: string,
): Promise<TagWithCount[]> {
  const [tags, links, passages] = await Promise.all([
    listTags(),
    db.passage_tags.toArray(),
    db.passages.toArray(),
  ])

  const inCollection = new Set(
    passages
      .filter((passage) => isDevotional(passage) && passage.collection === collection)
      .map((passage) => passage.id),
  )
  const counts = new Map<string, number>()
  for (const link of links) {
    if (!inCollection.has(link.passage_id)) continue
    counts.set(link.tag_id, (counts.get(link.tag_id) ?? 0) + 1)
  }

  return tags
    .filter((tag) => counts.has(tag.id))
    .map((tag) => ({ tag, count: counts.get(tag.id) ?? 0 }))
}

export async function listTagIdsForPassage(passageId: string): Promise<string[]> {
  const links = await db.passage_tags.where('passage_id').equals(passageId).toArray()
  return links.map((link) => link.tag_id)
}
