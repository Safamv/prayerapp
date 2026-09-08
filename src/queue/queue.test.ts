import { describe, expect, it } from 'vitest'
import { buildQueue } from './queue'
import type { QueueCandidatePassage, QueueCandidateSegment, QueueInput, QueueItem } from './types'
import type { Day, PassageProgress, SegmentProgress, UpkeepState } from '../scheduler'

/**
 * **Queue construction.** CLAUDE.md section 11 names it mandatory unit tested,
 * beside the scheduler and segmentation, because a silent bug in any of them
 * invalidates the V0 data rather than announcing itself.
 *
 * The requirement under test is principle 7.3, which the scope calls the single
 * most important one in the document: the queue is capped, always, and what the
 * cap leaves out rolls forward with nothing said about it.
 */

const TODAY: Day = '2026-09-07'

function progress(dueDate: Day, overrides: Partial<SegmentProgress> = {}): SegmentProgress {
  return {
    easeFactor: 2.5,
    intervalDays: 6,
    repetitions: 2,
    dueDate,
    lastReviewedAt: '2026-09-01',
    lapses: 0,
    ...overrides,
  }
}

/** A passage whose lines are described by their due dates: a day, or `null` for never seen. */
function passage(
  passageId: string,
  listOrder: number,
  dueDates: readonly (Day | null)[],
  overrides: Partial<QueueCandidatePassage> = {},
): QueueCandidatePassage {
  const segments: QueueCandidateSegment[] = dueDates.map((dueDate, orderIndex) => ({
    segmentId: `${passageId}-${String(orderIndex)}`,
    orderIndex,
    progress: dueDate === null ? null : progress(dueDate),
  }))
  return {
    passageId,
    upkeepState: 'active',
    // Not promoted. Scope 8.7's whole-passage card has its own tests below.
    passage: null,
    isFocus: false,
    focusUntil: null,
    listOrder,
    segments,
    ...overrides,
  }
}

function build(
  passages: readonly QueueCandidatePassage[],
  caps: QueueInput['caps'] = { reviews: 15, new: 2 },
  today: Day = TODAY,
): readonly QueueItem[] {
  return buildQueue({ today, passages, caps })
}

/** The lines of a queue. A whole-passage card has none, and reads as its passage. */
function ids(items: readonly QueueItem[]): string[] {
  return items.map((item) => item.segmentId ?? item.passageId)
}

describe('what is due', () => {
  it('takes a line whose day has come, and one that is overdue', () => {
    const queue = build([passage('p', 0, ['2026-09-07', '2026-08-01'])])
    expect(ids(queue)).toEqual(['p-0', 'p-1'])
    expect(queue.every((item) => item.kind === 'due')).toBe(true)
  })

  it('leaves a line whose day has not come', () => {
    const queue = build([passage('p', 0, ['2026-09-08'])])
    expect(ids(queue)).toEqual([])
  })

  it('is empty for a user with nothing on their list, and that is the whole answer', () => {
    // Scope 8.3: "When the queue is done, it is done. No study more prompt."
    expect(build([])).toEqual([])
  })
})

describe('the caps, scope 8.3', () => {
  it('takes no more due lines than the review cap allows', () => {
    const due = Array.from({ length: 40 }, (): Day => '2026-09-01')
    const queue = build([passage('p', 0, due)], { reviews: 15, new: 0 })
    expect(queue).toHaveLength(15)
  })

  it('takes no more new lines than the new cap allows', () => {
    const queue = build([passage('p', 0, [null, null, null, null])], { reviews: 15, new: 2 })
    expect(ids(queue)).toEqual(['p-0', 'p-1'])
  })

  it('counts new and due against their own caps rather than one shared total', () => {
    const passages = [
      passage('a', 0, ['2026-09-01', '2026-09-01', '2026-09-01']),
      passage('b', 1, [null, null, null]),
    ]
    const queue = build(passages, { reviews: 3, new: 2 })
    expect(ids(queue)).toEqual(['a-0', 'a-1', 'a-2', 'b-0', 'b-1'])
  })

  it('honours a cap the user has raised, and one they have lowered', () => {
    const due = Array.from({ length: 40 }, (): Day => '2026-09-01')
    expect(build([passage('p', 0, due)], { reviews: 30, new: 0 })).toHaveLength(30)
    expect(build([passage('p', 0, due)], { reviews: 5, new: 0 })).toHaveLength(5)
  })

  it('takes no new lines at all when the user has set that cap to nought', () => {
    // A day of consolidation and nothing started, which is a thing a user may
    // legitimately want and which the cap being user-adjustable has to allow.
    const queue = build([passage('p', 0, ['2026-09-01', null])], { reviews: 15, new: 0 })
    expect(ids(queue)).toEqual(['p-0'])
  })

  it('treats a cap that has gone missing or negative as none of that kind', () => {
    const passages = [passage('p', 0, ['2026-09-01', null])]
    expect(build(passages, { reviews: Number.NaN, new: -3 })).toEqual([])
  })
})

describe('overflow rolls forward silently, principle 7.3', () => {
  it('says nothing at all about the lines it left out', () => {
    const due = Array.from({ length: 90 }, (): Day => '2026-07-01')
    const queue = build([passage('p', 0, due)], { reviews: 15, new: 0 })

    // The queue is an array of exactly what to do today. There is nowhere for a
    // count of the other 75 to live, which is the point: principle 7.3 says no
    // discouraging count is ever displayed, and a number that does not exist
    // cannot be rendered by a later session that has forgotten why.
    expect(Array.isArray(queue)).toBe(true)
    expect(queue).toHaveLength(15)
    for (const item of queue) {
      expect(Object.keys(item).sort()).toEqual(['kind', 'orderIndex', 'passageId', 'segmentId'])
    }
  })

  it('gives a user who missed four days the same sized day as everyone else', () => {
    const away = ['2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'] as const
    const passages = away.map((day, index) =>
      passage(
        `p${String(index)}`,
        index,
        Array.from({ length: 10 }, (): Day => day),
      ),
    )
    expect(build(passages, { reviews: 15, new: 0 })).toHaveLength(15)
  })

  it('gives the cap to the most overdue lines wherever on the list they sit', () => {
    // Without this, a long passage at the top of the list would eat every
    // review for ever and everything below it would decay untouched.
    const passages = [
      passage('a', 0, ['2026-09-07', '2026-09-07', '2026-09-07']),
      passage('b', 1, ['2026-06-01', '2026-06-01']),
    ]
    const queue = build(passages, { reviews: 2, new: 0 })
    expect(ids(queue)).toEqual(['b-0', 'b-1'])
  })
})

describe('new and due are mixed, not separated into modes', () => {
  it('returns one queue in which a new line sits among the due ones', () => {
    const passages = [passage('a', 0, ['2026-09-01', null]), passage('b', 1, ['2026-09-01'])]
    const queue = build(passages)
    expect(queue.map((item) => `${item.segmentId}:${item.kind}`)).toEqual([
      'a-0:due',
      'a-1:new',
      'b-0:due',
    ])
  })

  it('arranges the day by the list, and each passage by its own line order', () => {
    const passages = [
      passage('second', 1, ['2026-06-01', '2026-06-01']),
      passage('first', 0, ['2026-09-07']),
    ]
    expect(ids(build(passages))).toEqual(['first-0', 'second-0', 'second-1'])
  })
})

describe('cumulative line building, scope 8.1', () => {
  it('offers the first line of a passage nobody has started', () => {
    expect(ids(build([passage('p', 0, [null, null, null])], { reviews: 15, new: 1 }))).toEqual([
      'p-0',
    ])
  })

  it('never offers a line before the ones above it in the same passage', () => {
    // Line three has somehow been reviewed and line two has not. Only line two
    // is offered: there is no sense in being asked for line four of a prayer
    // whose second line you have never met.
    const p = passage('p', 0, ['2026-09-08', null, '2026-09-08', null])
    expect(ids(build([p], { reviews: 15, new: 5 }))).toEqual(['p-1'])
  })

  it('takes new lines from the top of the list downward, not one from each', () => {
    // Scope 6.5: the list "feeds the queue when current material is finished".
    const passages = [passage('a', 0, [null, null, null]), passage('b', 1, [null, null])]
    expect(ids(build(passages, { reviews: 0, new: 2 }))).toEqual(['a-0', 'a-1'])
  })

  it('moves on to the next passage once the first has no unstarted lines left', () => {
    const passages = [passage('a', 0, ['2026-09-08']), passage('b', 1, [null, null])]
    expect(ids(build(passages, { reviews: 0, new: 2 }))).toEqual(['b-0', 'b-1'])
  })
})

describe('upkeep states, scope 8.5', () => {
  function withUpkeep(upkeepState: UpkeepState): QueueCandidatePassage {
    return passage('p', 0, ['2026-06-01', null], { upkeepState })
  }

  it('queues an active passage at its normal intervals', () => {
    expect(ids(build([withUpkeep('active')]))).toEqual(['p-0', 'p-1'])
  })

  it('queues an occasional passage exactly as it queues an active one', () => {
    // Decision D1.1: the multiplier of three is applied when the due date is
    // chosen and never stored in the interval, so by the time the queue sees a
    // date the tripling has already happened. There is nothing left to do here,
    // and doing it again would triple it a second time.
    expect(ids(build([withUpkeep('occasional')]))).toEqual(['p-0', 'p-1'])
  })

  it('never queues a resting passage, however overdue it looks', () => {
    expect(ids(build([withUpkeep('resting')]))).toEqual([])
  })

  it('does not start a new line of a resting passage either', () => {
    const resting = passage('p', 0, [null, null], { upkeepState: 'resting' })
    expect(ids(build([resting]))).toEqual([])
  })

  it('leaves the rest of the list alone when one passage is resting', () => {
    const passages = [
      passage('a', 0, ['2026-06-01'], { upkeepState: 'resting' }),
      passage('b', 1, ['2026-06-01']),
    ]
    expect(ids(build(passages))).toEqual(['b-0'])
  })

  it('gives a resting passage back its place the moment it is woken', () => {
    // Decision D1.2: a resting passage still carries a coherent due date, so
    // waking it surfaces what is genuinely overdue rather than pushing it away.
    const asleep = passage('p', 0, ['2026-06-01'], { upkeepState: 'resting' })
    expect(ids(build([asleep]))).toEqual([])
    expect(ids(build([{ ...asleep, upkeepState: 'active' }]))).toEqual(['p-0'])
  })
})

describe('focus mode, scope 8.6', () => {
  const focused: Partial<QueueCandidatePassage> = { isFocus: true, focusUntil: '2026-09-14' }

  it('suppresses every non-focused passage, both new and due', () => {
    const passages = [
      passage('a', 0, ['2026-06-01', null]),
      passage('b', 1, ['2026-06-01', null], focused),
    ]
    expect(ids(build(passages))).toEqual(['b-0', 'b-1'])
  })

  it('suppresses nothing at all when focus is off', () => {
    const passages = [passage('a', 0, ['2026-06-01']), passage('b', 1, ['2026-06-01'])]
    expect(ids(build(passages))).toEqual(['a-0', 'b-0'])
  })

  it('keeps more than one focused passage', () => {
    const passages = [
      passage('a', 0, ['2026-06-01'], focused),
      passage('b', 1, ['2026-06-01']),
      passage('c', 2, ['2026-06-01'], focused),
    ]
    expect(ids(build(passages))).toEqual(['a-0', 'c-0'])
  })

  it('still caps the focused material, so focus is not a way past the cap', () => {
    const due = Array.from({ length: 40 }, (): Day => '2026-09-01')
    const passages = [passage('a', 0, due, focused), passage('b', 1, due)]
    expect(build(passages, { reviews: 15, new: 0 })).toHaveLength(15)
  })

  it('still never queues a focused passage that is also resting', () => {
    const passages = [
      passage('a', 0, ['2026-06-01'], { ...focused, upkeepState: 'resting' }),
      passage('b', 1, ['2026-06-01']),
    ]
    // Focus is on, so b is suppressed; a is resting, so a is not queued either.
    // The day is empty, and it says so calmly rather than quietly waking a
    // passage the user put to rest.
    expect(ids(build(passages))).toEqual([])
  })

  it('releases the list on the day focus lifts, without anything having to write', () => {
    // The stored date is the day focus lifts, not the last day it holds. An app
    // that has not been opened for a month must not still be suppressing a
    // list because nothing got round to clearing a column.
    const passages = [passage('a', 0, ['2026-06-01']), passage('b', 1, ['2026-06-01'], focused)]
    expect(ids(build(passages, { reviews: 15, new: 2 }, '2026-09-13'))).toEqual(['b-0'])
    expect(ids(build(passages, { reviews: 15, new: 2 }, '2026-09-14'))).toEqual(['a-0', 'b-0'])
    expect(ids(build(passages, { reviews: 15, new: 2 }, '2026-11-01'))).toEqual(['a-0', 'b-0'])
  })
})

describe('the same input gives the same queue', () => {
  it('does not depend on the order the passages were handed over in', () => {
    const a = passage('a', 0, ['2026-09-01', null])
    const b = passage('b', 1, ['2026-06-01'])
    const c = passage('c', 2, ['2026-09-07'])
    expect(ids(build([a, b, c]))).toEqual(ids(build([c, a, b])))
  })

  it('does not depend on the order the lines of a passage were handed over in', () => {
    const forwards = passage('p', 0, ['2026-09-01', '2026-09-01', null])
    const backwards: QueueCandidatePassage = {
      ...forwards,
      segments: [...forwards.segments].reverse(),
    }
    expect(ids(build([forwards]))).toEqual(ids(build([backwards])))
  })

  it('mutates nothing it was given', () => {
    const passages = [passage('p', 0, ['2026-09-01', '2026-06-01', null])]
    const before = JSON.stringify(passages)
    build(passages)
    expect(JSON.stringify(passages)).toBe(before)
  })
})

/**
 * **The promoted whole-passage card.** Scope 8.7.
 *
 * > On reaching the milestone, the passage is promoted to a single whole-passage
 * > card, scheduled on the slowest of its segments' intervals. Segment state is
 * > retained but not surfaced.
 *
 * The assertion that carries the most weight is the second one: the lines are
 * still there, with their due dates, and the queue offers none of them. Without
 * it, a reader who reached a milestone would get the whole passage *and* every
 * one of its lines, which is the worst of both and would look like a scheduling
 * bug rather than a missing rule.
 */
function promoted(dueDate: Day, overrides: Partial<PassageProgress> = {}): PassageProgress {
  return {
    passageEaseFactor: 2.5,
    passageIntervalDays: 6,
    passageRepetitions: 3,
    passageDueDate: dueDate,
    ...overrides,
  }
}

describe('a passage that has reached its milestone', () => {
  it('comes as one card when its day has come', () => {
    const queue = build([passage('p', 0, ['2026-09-01'], { passage: promoted('2026-09-07') })])
    expect(ids(queue)).toEqual(['p'])
    expect(queue.map((item) => item.kind)).toEqual(['passage'])
    expect(queue[0]?.segmentId).toBeNull()
  })

  it('offers none of its lines, although they are all still due', () => {
    const lines: Day[] = ['2026-06-01', '2026-06-02', '2026-06-03']
    const queue = build([passage('p', 0, lines, { passage: promoted('2026-09-07') })])
    expect(ids(queue)).toEqual(['p'])
  })

  it('offers nothing at all until its card comes round', () => {
    const lines: Day[] = ['2026-06-01', '2026-06-02']
    expect(build([passage('p', 0, lines, { passage: promoted('2026-12-25') })])).toEqual([])
  })

  it('offers no new lines either, even where one was never started', () => {
    const queue = build([passage('p', 0, [null, null], { passage: promoted('2026-09-07') })])
    expect(ids(queue)).toEqual(['p'])
  })

  it('is one piece of work against the review cap, like any other review', () => {
    const passages = [
      passage('a', 0, ['2026-06-01'], { passage: promoted('2026-06-01') }),
      passage('b', 1, ['2026-06-02'], { passage: promoted('2026-06-02') }),
      passage('c', 2, ['2026-06-03'], { passage: promoted('2026-06-03') }),
    ]
    expect(ids(build(passages, { reviews: 2, new: 2 }))).toEqual(['a', 'b'])
  })

  it('is never queued while the passage is resting', () => {
    // Scope 8.5: resting is an absence of an interval, not a slow one, and it
    // has to hold for the whole passage as it holds for a line.
    const resting = passage('p', 0, ['2026-06-01'], {
      passage: promoted('2026-06-01'),
      upkeepState: 'resting',
    })
    expect(build([resting])).toEqual([])
  })

  it('is queued on an occasional passage exactly as on an active one', () => {
    // Decision D1.1 again, and it holds for the whole-passage card for the same
    // reason it holds for a line: the multiplier of three was applied when the
    // date was chosen, so by the time the queue sees a date it has already
    // happened, and applying it here would triple it twice.
    const occasional = passage('p', 0, ['2026-06-01'], {
      passage: promoted('2026-09-07'),
      upkeepState: 'occasional',
    })
    expect(ids(build([occasional]))).toEqual(['p'])
  })

  it('sits among the lines of everything else, in list order', () => {
    const passages = [
      passage('a', 0, ['2026-09-01']),
      passage('b', 1, ['2026-06-01'], { passage: promoted('2026-06-01') }),
      passage('c', 2, ['2026-09-01']),
    ]
    expect(ids(build(passages))).toEqual(['a-0', 'b', 'c-0'])
  })

  it('is suppressed by focus on something else, like everything else', () => {
    const passages = [
      passage('a', 0, ['2026-09-01'], { isFocus: true, focusUntil: '2026-09-30' }),
      passage('b', 1, ['2026-06-01'], { passage: promoted('2026-06-01') }),
    ]
    expect(ids(build(passages))).toEqual(['a-0'])
  })
})
