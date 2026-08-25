import { beforeEach, describe, expect, it } from 'vitest'
import { putPassages } from './corpus'
import { db, resetDatabase } from './db'
import { makePassage } from './fixtures'
import { confirmSegmentation, listPassageSegments } from './segmentation'
import { putSegmentProgress } from './segmentProgress'
import { getUserPrayer, removeFromList } from './userPrayers'

/**
 * The write at the end of the confirm screen. Scope 8.4 and scope 10's
 * `passage_segments`.
 *
 * One function, because the four writes it makes are one act: the lines, the
 * count on the passage, and the row that says the passage is on the list. A
 * passage on the list with no lines under it would be a passage session 6's
 * queue could reach and find nothing in.
 */

const USER = 'user-1'

const passage = makePassage({
  title: 'Blessed is the spot',
  text: 'Blessed is the spot, and the house.\nAnd the place, and the city.',
})

beforeEach(async () => {
  await resetDatabase()
  await putPassages([passage])
})

describe('confirming a segmentation', () => {
  it('writes the lines in the order they were confirmed', async () => {
    await confirmSegmentation(USER, passage.id, [
      'Blessed is the spot, and the house.',
      'And the place, and the city.',
    ])

    const segments = await listPassageSegments(passage.id)
    expect(segments.map((segment) => segment.text)).toEqual([
      'Blessed is the spot, and the house.',
      'And the place, and the city.',
    ])
    expect(segments.map((segment) => segment.order_index)).toEqual([0, 1])
  })

  it('writes the number of lines back onto the passage', async () => {
    await confirmSegmentation(USER, passage.id, ['One line.', 'Two lines.', 'Three lines.'])

    const row = await db.passages.get(passage.id)
    expect(row?.segment_count).toBe(3)
  })

  it('puts the passage on the list, at the start of the ladder', async () => {
    await confirmSegmentation(USER, passage.id, ['One line.'])

    const row = await getUserPrayer(USER, passage.id)
    expect(row?.status).toBe('list')
    expect(row?.upkeep_state).toBe('active')
  })

  /**
   * Confirming again replaces what was there rather than adding to it. Writing
   * over the top would leave the tail of a longer previous segmentation behind,
   * and those orphaned lines would be queued in session 6 as though they were
   * part of the passage.
   */
  it('replaces a previous segmentation rather than adding to it', async () => {
    await confirmSegmentation(USER, passage.id, ['One.', 'Two.', 'Three.'])
    await confirmSegmentation(USER, passage.id, ['One and two.', 'Three.'])

    const segments = await listPassageSegments(passage.id)
    expect(segments.map((segment) => segment.text)).toEqual(['One and two.', 'Three.'])
    expect((await db.passages.get(passage.id))?.segment_count).toBe(2)
  })

  it('leaves the lines of another passage alone', async () => {
    const other = makePassage({ title: 'Is there any Remover of difficulties' })
    await putPassages([other])
    await confirmSegmentation(USER, other.id, ['Is there any Remover of difficulties save God?'])

    await confirmSegmentation(USER, passage.id, ['One.', 'Two.'])

    expect(await listPassageSegments(other.id)).toHaveLength(1)
  })

  it('refuses to confirm a passage with no lines in it', async () => {
    await expect(confirmSegmentation(USER, passage.id, [])).rejects.toThrow(/no lines/)
    expect(await getUserPrayer(USER, passage.id)).toBeUndefined()
  })
})

describe('undoing the add', () => {
  /**
   * The undo of decision D4.10, and the permanent remove session 7 will put on
   * the list screen, are the same function. Both have to leave the passage the
   * way the library ships it: unsegmented (scope 8.4). Leaving the lines behind
   * would leave `segment_count` claiming a segmentation the user has thrown
   * away, and would hand a re-added passage somebody else's breaks.
   */
  it('takes the lines and the count away with the row', async () => {
    await confirmSegmentation(USER, passage.id, ['One.', 'Two.'])

    await removeFromList(USER, passage.id)

    expect(await listPassageSegments(passage.id)).toEqual([])
    expect((await db.passages.get(passage.id))?.segment_count).toBe(0)
    expect(await getUserPrayer(USER, passage.id)).toBeUndefined()
  })

  it('takes the progress made against those lines with them', async () => {
    await confirmSegmentation(USER, passage.id, ['One.', 'Two.'])
    const [first] = await listPassageSegments(passage.id)
    await putSegmentProgress(USER, first?.id ?? '', {
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 1,
      due_date: '2026-08-26',
      last_reviewed_at: '2026-08-25',
      lapses: 0,
    })

    await removeFromList(USER, passage.id)

    expect(await db.segment_progress.count()).toBe(0)
  })
})
