import { describe, expect, it } from 'vitest'
import { focusUntilDay, isFocusActive, isFocusExpired } from './focus'
import type { Day } from '../scheduler'

/**
 * Focus mode's one boolean and one date. Scope 8.6.
 *
 * The date is the point of the feature rather than a detail of it: "the failure
 * case is the person who turns focus on for a meeting, the meeting is postponed,
 * and four months later they open the app to a log full of dormant passages."
 */

const TODAY: Day = '2026-09-07'

describe('whether focus is in force', () => {
  it('is not, for a passage nobody focused', () => {
    expect(isFocusActive({ isFocus: false, focusUntil: null }, TODAY)).toBe(false)
  })

  it('is not, for a passage with an end date but the flag off', () => {
    expect(isFocusActive({ isFocus: false, focusUntil: '2026-12-01' }, TODAY)).toBe(false)
  })

  it('is, on the day focus was turned on', () => {
    expect(isFocusActive({ isFocus: true, focusUntil: '2026-09-14' }, TODAY)).toBe(true)
  })

  it('is, on the last day before it lifts', () => {
    expect(isFocusActive({ isFocus: true, focusUntil: '2026-09-14' }, '2026-09-13')).toBe(true)
  })

  it('is not, on the day it lifts', () => {
    // The stored day is the day focus lifts, not the last day it holds, so
    // "paused until the 14th" is a true sentence rather than a nearly true one.
    expect(isFocusActive({ isFocus: true, focusUntil: '2026-09-14' }, '2026-09-14')).toBe(false)
  })

  it('is not, four months after the meeting that was postponed', () => {
    expect(isFocusActive({ isFocus: true, focusUntil: '2026-09-14' }, '2027-01-14')).toBe(false)
  })

  it('is, for a focus with no end date, which the app never writes', () => {
    expect(isFocusActive({ isFocus: true, focusUntil: null }, TODAY)).toBe(true)
  })
})

describe('whether focus has run out and is waiting to be released', () => {
  it('has, once the day it lifts has arrived', () => {
    expect(isFocusExpired({ isFocus: true, focusUntil: '2026-09-07' }, TODAY)).toBe(true)
  })

  it('has not, while it is still in force', () => {
    expect(isFocusExpired({ isFocus: true, focusUntil: '2026-09-14' }, TODAY)).toBe(false)
  })

  it('has not, for a passage that was never focused', () => {
    expect(isFocusExpired({ isFocus: false, focusUntil: null }, TODAY)).toBe(false)
  })
})

describe('the day focus lifts', () => {
  it('is seven days out for the default the scope names', () => {
    expect(focusUntilDay(TODAY, 7)).toBe('2026-09-14')
  })

  it('is one day out for the shortest focus the user can set', () => {
    expect(focusUntilDay(TODAY, 1)).toBe('2026-09-08')
  })

  it('never lands in the past, whatever it is handed', () => {
    expect(focusUntilDay(TODAY, 0)).toBe('2026-09-08')
    expect(focusUntilDay(TODAY, -5)).toBe('2026-09-08')
  })

  it('crosses a month end correctly', () => {
    expect(focusUntilDay('2026-09-28', 7)).toBe('2026-10-05')
  })
})
