import { describe, expect, it } from 'vitest'
import * as scheduler from './index'

/**
 * This is the swap contract. Anything listed here is what session 6's queue and
 * session 8's milestone screen are allowed to depend on, and therefore what an
 * FSRS replacement would have to provide. Adding to it is a decision; removing
 * from it breaks a caller.
 */
const PUBLIC_SURFACE = [
  'DEFAULT_SCHEDULER_CONFIG',
  'addDays',
  'daysBetween',
  'effectiveIntervalDays',
  'isOnOrBefore',
  'isPassageDue',
  'isQueueable',
  'isSegmentDue',
  'newSegmentProgress',
  'promoteToPassage',
  'reviewPassage',
  'reviewSegment',
]

describe('the scheduler’s public surface', () => {
  it('exports exactly the agreed contract, and nothing incidental', () => {
    expect(Object.keys(scheduler).sort()).toEqual(PUBLIC_SURFACE)
  })

  it('can schedule a segment through the public entry point alone', () => {
    const fresh = scheduler.newSegmentProgress('2026-08-24')
    const reviewed = scheduler.reviewSegment(fresh, 'good', '2026-08-24')
    expect(reviewed.dueDate).toBe('2026-08-25')
  })
})
