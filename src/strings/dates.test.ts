import { describe, expect, it } from 'vitest'
import { formatDay, formatInterval } from './dates'

describe('a day, written the way a person says it', () => {
  it('puts the day before the month and spells the month out', () => {
    expect(formatDay('2026-09-14')).toBe('14 September')
  })

  it('does not shift the date for a reader west of Greenwich', () => {
    // A calendar day is parsed and rendered in the same zone. Without that,
    // '2026-09-14' is midnight UTC and renders as the 13th in Los Angeles.
    expect(formatDay('2026-01-01')).toBe('1 January')
    expect(formatDay('2026-12-31')).toBe('31 December')
  })

  it('spells September out in full, which the build stamp abbreviates', () => {
    // The build stamp's own format renders it as 'Sept'. The two are separate on
    // purpose: one is a sentence and the other is a serial number.
    expect(formatDay('2026-09-01')).toBe('1 September')
  })

  it('renders nothing at all rather than the words Invalid Date', () => {
    expect(formatDay('')).toBe('')
    expect(formatDay('not a day')).toBe('')
  })
})

describe('formatInterval', () => {
  it('says short spans in days', () => {
    expect(formatInterval(1)).toBe('1 day')
    expect(formatInterval(6)).toBe('6 days')
  })

  it('says the scope 11.3 example in weeks', () => {
    // "you last recalled this after 3 weeks"
    expect(formatInterval(21)).toBe('3 weeks')
  })

  it('says a week as a week rather than as seven days', () => {
    expect(formatInterval(7)).toBe('1 week')
    expect(formatInterval(14)).toBe('2 weeks')
    expect(formatInterval(30)).toBe('4 weeks')
  })

  it('moves to months once weeks stop being natural', () => {
    expect(formatInterval(31)).toBe('1 month')
    expect(formatInterval(60)).toBe('2 months')
    expect(formatInterval(180)).toBe('6 months')
  })

  it('says the schedulers ceiling as a year, and stays in months below it', () => {
    // `maximumIntervalDays` is 365, so nothing longer than a year is reachable
    // and eleven months is said as eleven months rather than rounded up to one.
    expect(formatInterval(365)).toBe('1 year')
    expect(formatInterval(340)).toBe('11 months')
  })

  it('never says nought days', () => {
    expect(formatInterval(0)).toBe('1 day')
  })
})
