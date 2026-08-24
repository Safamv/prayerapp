import { describe, expect, it } from 'vitest'
import { DEFAULT_SCHEDULER_CONFIG } from './config'
import { effectiveIntervalDays, isQueueable } from './upkeep'

describe('the upkeep multipliers of scope 8.5', () => {
  it('leaves an active interval alone', () => {
    expect(effectiveIntervalDays(7, 'active')).toBe(7)
  })

  it('triples an occasional interval', () => {
    expect(effectiveIntervalDays(7, 'occasional')).toBe(21)
  })

  it('stores a resting interval unmultiplied, because resting is not a slow interval', () => {
    expect(effectiveIntervalDays(7, 'resting')).toBe(7)
  })

  it('rounds to a whole day', () => {
    expect(effectiveIntervalDays(5, 'occasional')).toBe(15)
    expect(effectiveIntervalDays(1, 'occasional')).toBe(3)
  })

  it('never returns less than one day', () => {
    expect(effectiveIntervalDays(0, 'active')).toBe(1)
    expect(effectiveIntervalDays(0, 'occasional')).toBe(1)
  })

  it('caps at the maximum interval, so nothing is ever scheduled unboundedly far out', () => {
    const max = DEFAULT_SCHEDULER_CONFIG.maximumIntervalDays
    expect(effectiveIntervalDays(max, 'occasional')).toBe(max)
    expect(effectiveIntervalDays(max, 'active')).toBe(max)
  })

  it('honours a caller-supplied multiplier instead of the default', () => {
    const config = {
      ...DEFAULT_SCHEDULER_CONFIG,
      upkeepIntervalMultipliers: { active: 1, occasional: 2, resting: null },
    }
    expect(effectiveIntervalDays(10, 'occasional', config)).toBe(20)
  })
})

describe('isQueueable', () => {
  it('queues active and occasional material', () => {
    expect(isQueueable('active')).toBe(true)
    expect(isQueueable('occasional')).toBe(true)
  })

  it('never queues resting material', () => {
    expect(isQueueable('resting')).toBe(false)
  })
})

describe('DEFAULT_SCHEDULER_CONFIG', () => {
  it('states the three upkeep states of scope 8.5, with resting having no interval at all', () => {
    expect(DEFAULT_SCHEDULER_CONFIG.upkeepIntervalMultipliers).toEqual({
      active: 1,
      occasional: 3,
      resting: null,
    })
  })

  it('starts an ease factor at 2.5 and floors it at 1.3', () => {
    expect(DEFAULT_SCHEDULER_CONFIG.initialEaseFactor).toBe(2.5)
    expect(DEFAULT_SCHEDULER_CONFIG.minimumEaseFactor).toBe(1.3)
  })

  it('cannot be mutated by a caller, because it is shared', () => {
    const mutable = DEFAULT_SCHEDULER_CONFIG as { minimumEaseFactor: number }
    expect(() => {
      mutable.minimumEaseFactor = 0
    }).toThrow(TypeError)
    expect(DEFAULT_SCHEDULER_CONFIG.minimumEaseFactor).toBe(1.3)
  })
})
